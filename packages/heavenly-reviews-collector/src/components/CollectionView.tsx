import { getLogger } from '@sui-chrome-extensions/common';
import { Button, Input, Progress } from '@sui-chrome-extensions/ui';
import {
  AlertCircle,
  CheckCircle2,
  Link,
  Play,
  StopCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CollectionState, MessageType } from '../types';

const INITIAL_STATE: CollectionState = {
  status: 'idle',
  currentPage: 0,
  expectedTotalReviews: 0,
  collectedReviewsCount: 0,
  reviews: [],
  pageTasks: [],
};

const logger = getLogger('collection-view');

export default function CollectionView() {
  const [url, setUrl] = useState<string>('');
  const [state, setState] = useState<CollectionState>(INITIAL_STATE);

  useEffect(() => {
    chrome.runtime.sendMessage<MessageType, CollectionState>(
      { type: 'GET_STATE' },
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

    const listener = (message: MessageType) => {
      if (message.type === 'COLLECTION_PROGRESS') {
        setState(message.state);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleStart = () => {
    chrome.runtime.sendMessage<MessageType, CollectionState>({
      type: 'START_COLLECTION',
      url,
    });
  };

  const handleStop = () => {
    chrome.runtime.sendMessage<MessageType, CollectionState>({
      type: 'STOP_COLLECTION',
    });
  };

  const isCollecting =
    state.status === 'url_collecting' || state.status === 'review_collecting';

  return (
    <div className='flex items-center justify-center h-[calc(100vh-200px)]'>
      <div className='w-full max-w-xl glass-panel p-8 rounded-2xl animate-in zoom-in-95 duration-500'>
        <div className='text-center mb-8'>
          <h3 className='text-2xl font-bold bg-linear-to-br from-primary to-secondary-foreground bg-clip-text text-transparent mb-2'>
            Start Collection
          </h3>
          <p className='text-muted-foreground text-sm'>
            レビューを収集したいページURLを入力してください
          </p>
        </div>

        <div className='space-y-6'>
          <div className='relative'>
            <div className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground'>
              <Link size={18} />
            </div>
            <Input
              id='url-input'
              type='url'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder='https://www.cityheaven.net/...'
              disabled={isCollecting}
              className='pl-10 h-12 focus:ring-primary/30 focus:border-primary transition-all'
            />
          </div>

          <div className='flex gap-4'>
            <Button
              onClick={handleStart}
              disabled={isCollecting || !url}
              className='flex-1 h-12 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90'
            >
              {isCollecting ? (
                <span className='animate-pulse'>Wait...</span>
              ) : (
                <>
                  <Play size={18} className='mr-2' /> 収集開始
                </>
              )}
            </Button>

            {isCollecting && (
              <Button
                onClick={handleStop}
                variant='destructive'
                className='h-12 px-6 shadow-lg shadow-destructive/20 hover:shadow-destructive/40 transition-all active:scale-95'
              >
                <StopCircle size={18} />
              </Button>
            )}
          </div>

          {isCollecting && (
            <div className='space-y-3 bg-white/40 p-4 rounded-xl border border-white/30 animate-in fade-in slide-in-from-top-2'>
              <div className='flex justify-between text-sm'>
                <span className='font-medium text-foreground/80'>
                  Collecting...
                </span>
                <span className='text-muted-foreground'>
                  {state.collectedReviewsCount} reviews
                </span>
              </div>
              <Progress
                value={
                  state.totalPageCount && state.totalPageCount > 0
                    ? (state.currentPage / state.totalPageCount) * 100
                    : 0
                }
                className='h-2 bg-white/50'
              />
              <p className='text-xs text-muted-foreground text-right'>
                Page {state.currentPage} / {state.totalPageCount || '?'}
              </p>
            </div>
          )}

          {state.status === 'completed' && (
            <div className='flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 animate-in fade-in'>
              <CheckCircle2 size={20} />
              <span className='font-medium'>
                収集完了しました！ダッシュボードへ移動します...
              </span>
            </div>
          )}

          {state.status === 'error' && (
            <div className='flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in'>
              <AlertCircle size={20} />
              <span className='font-medium'>エラー: {state.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
