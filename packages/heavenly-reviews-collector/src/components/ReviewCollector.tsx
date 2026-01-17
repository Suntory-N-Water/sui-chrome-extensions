import { getLogger } from '@sui-chrome-extensions/common';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Progress,
} from '@sui-chrome-extensions/ui';
import { useEffect, useState } from 'react';
import type { CollectionState, MessageType } from '../types';
import { downloadFile } from '../utils/download';
import { exportToCsv, exportToJson, exportToTsv } from '../utils/export';

const INITIAL_STATE: CollectionState = {
  status: 'idle',
  currentPage: 0,
  expectedTotalReviews: 0,
  collectedReviewsCount: 0,
  reviews: [],
  pageTasks: [],
};

const logger = getLogger('review-collector');

export default function ReviewCollector() {
  const [url, setUrl] = useState<string>('');
  const [state, setState] = useState<CollectionState>(INITIAL_STATE);

  useEffect(() => {
    // ポップアップ表示時に保存済みの状態を復元する
    chrome.runtime.sendMessage(
      { type: 'GET_STATE' } satisfies MessageType,
      (response) => {
        if (chrome.runtime.lastError) {
          logger.warn(
            { error: chrome.runtime.lastError },
            'Failed to get state',
          );
          return;
        }
        if (response) {
          setState(response);
        }
      },
    );

    // Backgroundからの進捗更新メッセージを受信する
    const listener = (message: MessageType) => {
      if (message.type === 'COLLECTION_PROGRESS') {
        setState(message.state);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    // コンポーネントのクリーンアップ時にリスナーを削除する
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleStart = () => {
    chrome.runtime.sendMessage({
      type: 'START_COLLECTION',
      url,
    } satisfies MessageType);
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({
      type: 'STOP_COLLECTION',
    } satisfies MessageType);
  };

  const handleClear = () => {
    chrome.runtime.sendMessage(
      { type: 'CLEAR_DATA' } satisfies MessageType,
      () => {
        setState(INITIAL_STATE);
      },
    );
  };

  const handleDownloadCsv = () => {
    downloadFile({
      content: exportToCsv(state.reviews),
      filename: 'reviews.csv',
      mimeType: 'text/csv;charset=utf-8',
    });
  };

  const handleDownloadTsv = () => {
    downloadFile({
      content: exportToTsv(state.reviews),
      filename: 'reviews.tsv',
      mimeType: 'text/tab-separated-values;charset=utf-8',
    });
  };

  const handleDownloadJson = () => {
    downloadFile({
      content: exportToJson(state.reviews),
      filename: 'reviews.json',
      mimeType: 'application/json;charset=utf-8',
    });
  };

  const isCollecting =
    state.status === 'url_collecting' || state.status === 'review_collecting';
  const hasReviews = state.reviews.length > 0;

  return (
    <Card className='w-100 border-0 shadow-none'>
      <CardHeader className='pb-4'>
        <CardTitle className='text-lg'>H Reviews Collector</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <label htmlFor='url-input' className='text-sm font-medium'>
            レビューページURL
          </label>
          <Input
            id='url-input'
            type='url'
            value={url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setUrl(e.target.value)
            }
            placeholder='https://www.cityheaven.net/...'
            disabled={isCollecting}
          />
        </div>

        <div className='flex gap-2'>
          <Button
            onClick={handleStart}
            disabled={isCollecting || !url}
            className='flex-1'
          >
            収集開始
          </Button>
          <Button
            onClick={handleStop}
            disabled={!isCollecting}
            variant='destructive'
            className='flex-1'
          >
            停止
          </Button>
        </div>

        {isCollecting && (
          <div className='space-y-2'>
            <div className='text-sm text-muted-foreground'>
              進捗: {state.currentPage} ページ目 ({state.collectedReviewsCount}
              件収集済み)
            </div>
            <Progress
              value={
                state.totalPageCount && state.totalPageCount > 0
                  ? (state.currentPage / state.totalPageCount) * 100
                  : 0
              }
              className='animate-pulse'
            />
          </div>
        )}

        {state.status === 'completed' && (
          <div className='text-sm text-green-600'>
            収集完了: {state.collectedReviewsCount}件のレビューを取得しました
          </div>
        )}

        {state.status === 'error' && (
          <div className='text-sm text-red-600'>エラー: {state.error}</div>
        )}

        {hasReviews && (
          <div className='space-y-2'>
            <div className='text-sm font-medium'>
              ダウンロード ({state.collectedReviewsCount}件)
            </div>
            <div className='flex gap-2'>
              <Button
                onClick={handleDownloadCsv}
                variant='outline'
                size='sm'
                className='flex-1'
              >
                CSV
              </Button>
              <Button
                onClick={handleDownloadTsv}
                variant='outline'
                size='sm'
                className='flex-1'
              >
                TSV
              </Button>
              <Button
                onClick={handleDownloadJson}
                variant='outline'
                size='sm'
                className='flex-1'
              >
                JSON
              </Button>
            </div>
            <Button
              onClick={handleClear}
              variant='ghost'
              size='sm'
              className='w-full text-muted-foreground'
            >
              データをクリア
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
