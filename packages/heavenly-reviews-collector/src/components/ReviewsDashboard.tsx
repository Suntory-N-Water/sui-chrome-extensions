import { Button, DataTable } from '@sui-chrome-extensions/ui';
import {
  FileJson,
  FileSpreadsheet,
  FileType,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CollectionState, MessageType, ReviewData } from '../types';
import { downloadFile } from '../utils/download';
import { exportToCsv, exportToJson, exportToTsv } from '../utils/export';
import ReviewDetailDialog from './ReviewDetailDialog';
import { reviewColumns } from './reviewColumns';

type ReviewsDashboardProps = {
  reviews: ReviewData[];
  onNewCollection: () => void;
};

export default function ReviewsDashboard({
  reviews,
  onNewCollection,
}: ReviewsDashboardProps) {
  const [selectedReview, setSelectedReview] = useState<ReviewData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 統計データの計算
  const stats = useMemo(() => {
    if (reviews.length === 0) {
      return null;
    }

    const totalScoreAvg =
      reviews.reduce((acc, r) => acc + r.totalScore, 0) / reviews.length;
    const girlScoreAvg =
      reviews.reduce((acc, r) => acc + Number(r.scores.girl || 0), 0) /
      reviews.length;
    const playScoreAvg =
      reviews.reduce((acc, r) => acc + Number(r.scores.play || 0), 0) /
      reviews.length;

    return {
      count: reviews.length,
      totalScore: totalScoreAvg.toFixed(2),
      girlScore: girlScoreAvg.toFixed(2),
      playScore: playScoreAvg.toFixed(2),
    };
  }, [reviews]);

  const handleRowClick = (review: ReviewData) => {
    setSelectedReview(review);
    setIsDialogOpen(true);
  };

  const handleDownload = (format: 'csv' | 'tsv' | 'json') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'csv') {
      content = exportToCsv(reviews);
      filename = 'reviews.csv';
      mimeType = 'text/csv;charset=utf-8';
    } else if (format === 'tsv') {
      content = exportToTsv(reviews);
      filename = 'reviews.tsv';
      mimeType = 'text/tab-separated-values;charset=utf-8';
    } else {
      content = exportToJson(reviews);
      filename = 'reviews.json';
      mimeType = 'application/json;charset=utf-8';
    }

    downloadFile({ content, filename, mimeType });
  };

  const handleClear = () => {
    if (confirm('すべてのデータを削除しますか？この操作は取り消せません。')) {
      chrome.runtime.sendMessage<MessageType, CollectionState>(
        { type: 'CLEAR_DATA' },
        () => {
          onNewCollection();
        },
      );
    }
  };

  return (
    <div className='space-y-6'>
      {/* Summary Cards */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          <div className='glass-card p-6 animate-in zoom-in-50 duration-300 delay-0'>
            <p className='text-sm text-muted-foreground font-medium'>
              Total Reviews
            </p>
            <p className='text-3xl font-bold text-primary mt-2'>
              {stats.count}
            </p>
          </div>
          <div className='glass-card p-6 animate-in zoom-in-50 duration-300 delay-75'>
            <p className='text-sm text-muted-foreground font-medium'>
              Avg Total Score
            </p>
            <p className='text-3xl font-bold text-foreground mt-2'>
              {stats.totalScore}
            </p>
          </div>
          <div className='glass-card p-6 animate-in zoom-in-50 duration-300 delay-150'>
            <p className='text-sm text-muted-foreground font-medium'>
              Avg Girl Score
            </p>
            <p className='text-3xl font-bold text-pink-500 mt-2'>
              {stats.girlScore}
            </p>
          </div>
          <div className='glass-card p-6 animate-in zoom-in-50 duration-300 delay-200'>
            <p className='text-sm text-muted-foreground font-medium'>
              Avg Play Score
            </p>
            <p className='text-3xl font-bold text-purple-500 mt-2'>
              {stats.playScore}
            </p>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className='flex flex-wrap justify-end gap-2 p-4 glass-card'>
        <Button
          onClick={() => handleDownload('csv')}
          variant='ghost'
          size='sm'
          className='hover:bg-primary/10 hover:text-primary'
        >
          <FileSpreadsheet size={16} className='mr-2' /> CSV
        </Button>
        <Button
          onClick={() => handleDownload('tsv')}
          variant='ghost'
          size='sm'
          className='hover:bg-primary/10 hover:text-primary'
        >
          <FileType size={16} className='mr-2' /> TSV
        </Button>
        <Button
          onClick={() => handleDownload('json')}
          variant='ghost'
          size='sm'
          className='hover:bg-primary/10 hover:text-primary'
        >
          <FileJson size={16} className='mr-2' /> JSON
        </Button>
        <div className='w-px h-6 bg-border mx-2' />
        <Button
          onClick={handleClear}
          variant='ghost'
          size='sm'
          className='text-destructive hover:bg-destructive/10 hover:text-destructive'
        >
          <Trash2 size={16} className='mr-2' /> クリア
        </Button>
        <Button onClick={onNewCollection} variant='default' size='sm'>
          <RotateCcw size={16} className='mr-2' /> 新規収集
        </Button>
      </div>

      {/* Data Table */}
      <div className='glass-panel rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-500'>
        <div className='p-1'>
          <DataTable
            columns={reviewColumns}
            data={reviews}
            searchKey='body'
            placeholder='レビュー本文を検索...'
            onRowClick={handleRowClick}
          />
        </div>
      </div>

      <ReviewDetailDialog
        review={selectedReview}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
