import {
  Badge,
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@sui-chrome-extensions/ui';
import {
  FileJson,
  FileSpreadsheet,
  FileType,
  Filter,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CollectionState, MessageType, ReviewData } from '../types';
import { downloadFile } from '../utils/download';
import { exportToCsv, exportToJson, exportToTsv } from '../utils/export';
import { getUniqueGirlNames, isPerfectScore } from '../utils/reviewFilter';
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
  const [excludePerfectScores, setExcludePerfectScores] = useState(false);
  const [selectedGirlName, setSelectedGirlName] = useState<string>('all');

  // 女の子のリストを取得
  const girlNames = useMemo(() => getUniqueGirlNames(reviews), [reviews]);

  // フィルタリング処理
  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    // 女の子でフィルタ
    if (selectedGirlName !== 'all') {
      filtered = filtered.filter(
        (review) => review.girlName === selectedGirlName,
      );
    }

    // オール5でフィルタ
    if (excludePerfectScores) {
      filtered = filtered.filter((review) => !isPerfectScore(review));
    }

    return filtered;
  }, [reviews, selectedGirlName, excludePerfectScores]);

  // アクティブなフィルタ数の計算
  const activeFilterCount = useMemo(() => {
    let count = 0;

    // 女の子フィルタがアクティブ（'all' 以外が選択されている）
    if (selectedGirlName !== 'all') {
      count++;
    }

    // オール5除外フィルタがアクティブ
    if (excludePerfectScores) {
      count++;
    }

    return count;
  }, [selectedGirlName, excludePerfectScores]);

  // 統計データの計算
  const stats = useMemo(() => {
    if (filteredReviews.length === 0) {
      return null;
    }

    const totalScoreAvg =
      filteredReviews.reduce((acc, r) => acc + r.totalScore, 0) /
      filteredReviews.length;
    const girlScoreAvg =
      filteredReviews.reduce((acc, r) => acc + Number(r.scores.girl || 0), 0) /
      filteredReviews.length;
    const playScoreAvg =
      filteredReviews.reduce((acc, r) => acc + Number(r.scores.play || 0), 0) /
      filteredReviews.length;

    return {
      count: filteredReviews.length,
      totalScore: totalScoreAvg.toFixed(2),
      girlScore: girlScoreAvg.toFixed(2),
      playScore: playScoreAvg.toFixed(2),
    };
  }, [filteredReviews]);

  const handleRowClick = (review: ReviewData) => {
    setSelectedReview(review);
    setIsDialogOpen(true);
  };

  const handleClearFilters = () => {
    setSelectedGirlName('all');
    setExcludePerfectScores(false);
  };

  const handleDownload = (format: 'csv' | 'tsv' | 'json') => {
    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'csv') {
      content = exportToCsv(filteredReviews);
      filename = 'reviews.csv';
      mimeType = 'text/csv;charset=utf-8';
    } else if (format === 'tsv') {
      content = exportToTsv(filteredReviews);
      filename = 'reviews.tsv';
      mimeType = 'text/tab-separated-values;charset=utf-8';
    } else {
      content = exportToJson(filteredReviews);
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
      {/* Filter Controls */}
      <div className='mb-4 flex items-center gap-2'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm'>
              <Filter className='h-4 w-4 mr-2' />
              フィルタ
              {activeFilterCount > 0 && (
                <Badge variant='secondary' className='ml-2 h-5 px-1.5 text-xs'>
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-80' align='start'>
            {/* 女の子選択（ラジオボタン） */}
            <DropdownMenuLabel>女の子で絞込</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuRadioGroup
              value={selectedGirlName}
              onValueChange={setSelectedGirlName}
            >
              <DropdownMenuRadioItem value='all'>すべて</DropdownMenuRadioItem>

              <div className='max-h-60 overflow-y-auto'>
                {girlNames.map((name) => (
                  <DropdownMenuRadioItem key={name} value={name}>
                    {name}
                  </DropdownMenuRadioItem>
                ))}
              </div>
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />

            {/* オール5除外（チェックボックス） */}
            <DropdownMenuLabel>その他のフィルタ</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={excludePerfectScores}
              onCheckedChange={setExcludePerfectScores}
            >
              オール5のレビューを除外
            </DropdownMenuCheckboxItem>

            {activeFilterCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleClearFilters}>
                  フィルタをクリア
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* フィルタ適用状態の表示 */}
        {activeFilterCount > 0 && (
          <span className='text-sm text-muted-foreground'>
            {filteredReviews.length}件のレビューを表示中
          </span>
        )}
      </div>

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
            data={filteredReviews}
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
