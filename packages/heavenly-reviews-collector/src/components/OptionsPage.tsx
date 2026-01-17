import { useEffect, useState } from 'react';
import type { CollectionState, MessageType, ReviewData } from '../types';
import CollectionView from './CollectionView';
import ReviewsDashboard from './ReviewsDashboard';
import Sidebar from './Sidebar';

type ViewType = 'collection' | 'dashboard';

export default function OptionsPage() {
  const [view, setView] = useState<ViewType>('collection');
  const [reviews, setReviews] = useState<ReviewData[]>([]);

  useEffect(() => {
    // 初期状態のロード
    chrome.storage.local.get(['collectionState'], (result) => {
      const savedState = result.collectionState as CollectionState | undefined;
      if (savedState?.status === 'completed' && savedState.reviews.length > 0) {
        setView('dashboard');
        setReviews(savedState.reviews);
      }
    });

    // メッセージリスナー
    const listener = (message: MessageType) => {
      if (message.type === 'COLLECTION_PROGRESS') {
        if (message.state.status === 'completed') {
          setView('dashboard');
          setReviews(message.state.reviews);
        }
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  return (
    <div className='flex min-h-screen bg-background text-foreground transition-colors duration-300'>
      <Sidebar currentView={view} onViewChange={setView} />

      <main className='flex-1 ml-64 p-8 overflow-y-auto h-screen scroll-smooth'>
        <div className='max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500'>
          <header className='mb-8'>
            <h2 className='text-3xl font-bold text-foreground'>
              {view === 'collection'
                ? 'レビュー収集'
                : 'レビューダッシュボード'}
            </h2>
            <p className='text-muted-foreground mt-2'>
              {view === 'collection'
                ? 'Heavenからレビューデータを自動収集します'
                : '収集したレビューデータの閲覧・分析・エクスポートが可能です'}
            </p>
          </header>

          {view === 'collection' ? (
            <CollectionView />
          ) : (
            <ReviewsDashboard
              reviews={reviews}
              onNewCollection={() => setView('collection')}
            />
          )}
        </div>
      </main>
    </div>
  );
}
