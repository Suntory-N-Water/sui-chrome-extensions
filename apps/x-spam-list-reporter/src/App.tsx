import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@sui-chrome-extensions/ui';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { MessageType, ReportState } from './types';

export default function App() {
  const [state, setState] = useState<ReportState>({
    status: 'idle',
    totalMembers: 0,
    processedMembers: 0,
  });
  const [isListPage, setIsListPage] = useState<boolean>(false);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);

  useEffect(() => {
    // Background Scriptから現在の状態を取得
    chrome.runtime
      .sendMessage<{ type: 'GET_STATE' }, MessageType>({
        type: 'GET_STATE',
      })
      .then((response) => {
        if (response?.type === 'PROGRESS_UPDATE') {
          setState(response.state);
        }
      })
      .catch((error) => {
        console.error('状態取得エラー:', error);
      });

    // 現在のタブ情報を取得
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]) => {
        if (tab?.id) {
          setCurrentTabId(tab.id);

          // リストページかどうかチェック
          chrome.tabs
            .sendMessage<{ type: 'CHECK_LIST_PAGE' }, MessageType>(tab.id, {
              type: 'CHECK_LIST_PAGE',
            })
            .then((response) => {
              if (response?.type === 'LIST_PAGE_CHECK_RESULT') {
                setIsListPage(response.isListPage);
              }
            })
            .catch((error) => {
              console.error('リストページチェックエラー:', error);
            });
        }
      })
      .catch((error) => {
        console.error('タブ情報取得エラー:', error);
      });

    // Background Scriptからの進捗更新を受信
    const handleMessage = (message: MessageType) => {
      if (message.type === 'PROGRESS_UPDATE') {
        setState(message.state);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleStart = () => {
    if (!currentTabId) {
      return;
    }

    chrome.runtime
      .sendMessage<{ type: 'START_COLLECTION'; tabId: number }, void>({
        type: 'START_COLLECTION',
        tabId: currentTabId,
      })
      .catch((error) => {
        console.error('収集開始エラー:', error);
      });
  };

  const handleStop = () => {
    chrome.runtime
      .sendMessage<{ type: 'STOP_COLLECTION' }, void>({
        type: 'STOP_COLLECTION',
      })
      .catch((error) => {
        console.error('停止エラー:', error);
      });
  };

  const getStatusBadge = () => {
    switch (state.status) {
      case 'idle':
        return <Badge variant='outline'>待機中</Badge>;
      case 'collecting':
        return <Badge variant='default'>メンバー収集中</Badge>;
      case 'reporting':
        return <Badge variant='default'>スパム報告中</Badge>;
      case 'completed':
        return <Badge variant='default'>完了</Badge>;
      case 'error':
        return <Badge variant='destructive'>エラー</Badge>;
    }
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'collecting':
      case 'reporting':
        return <Loader2 className='h-4 w-4 animate-spin' />;
      case 'completed':
        return <CheckCircle2 className='h-4 w-4' />;
      case 'error':
        return <AlertCircle className='h-4 w-4' />;
      default:
        return null;
    }
  };

  const isProcessing =
    state.status === 'collecting' || state.status === 'reporting';
  const canStart = isListPage && !isProcessing;

  return (
    <Card className='w-96 border-0 shadow-none'>
      <CardHeader className='pb-4'>
        <CardTitle className='text-lg flex items-center gap-2'>
          X Lists User Spam Reporter
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* ステータス表示 */}
        <div className='flex items-center justify-between'>
          <span className='text-sm text-muted-foreground'>ステータス:</span>
          {getStatusBadge()}
        </div>

        {/* リストページチェック */}
        {!isListPage && state.status === 'idle' && (
          <div className='p-3 bg-yellow-50 border border-yellow-200 rounded-md'>
            <p className='text-sm text-yellow-800'>
              Xのリストメンバーページで開いてください
            </p>
            <p className='text-xs text-yellow-700 mt-1'>
              例: https://x.com/i/lists/[list_id]/members
            </p>
          </div>
        )}

        {/* 進捗表示 */}
        {state.totalMembers > 0 && (
          <div className='space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>進捗:</span>
              <span className='font-medium'>
                {state.processedMembers} / {state.totalMembers}
              </span>
            </div>
            <div className='w-full bg-gray-200 rounded-full h-2'>
              <div
                className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                style={{
                  width: `${(state.processedMembers / state.totalMembers) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* 現在処理中のユーザー */}
        {state.currentUserUrl && isProcessing && (
          <div className='text-xs text-muted-foreground truncate'>
            処理中: {state.currentUserUrl}
          </div>
        )}

        {/* エラーメッセージ */}
        {state.error && (
          <div className='p-3 bg-red-50 border border-red-200 rounded-md'>
            <p className='text-sm text-red-800'>{state.error}</p>
          </div>
        )}

        {/* 完了メッセージ */}
        {state.status === 'completed' && (
          <div className='p-3 bg-green-50 border border-green-200 rounded-md'>
            <p className='text-sm text-green-800'>
              {state.totalMembers}人のスパム報告が完了しました
            </p>
          </div>
        )}

        {/* アクションボタン */}
        <div className='flex gap-2'>
          {!isProcessing && (
            <Button
              onClick={handleStart}
              disabled={!canStart}
              className='flex-1'
            >
              開始
            </Button>
          )}
          {isProcessing && (
            <Button
              onClick={handleStop}
              variant='destructive'
              className='flex-1'
            >
              キャンセル
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
