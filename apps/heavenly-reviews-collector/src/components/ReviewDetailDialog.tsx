import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Progress,
} from '@sui-chrome-extensions/ui';
import { REVIEW_LABELS } from '../constants';
import type { ReviewData } from '../types';

type ReviewDetailDialogProps = {
  review: ReviewData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// スコアを0-100に変換するヘルパー (想定: 5点満点)
const normalizeScore = (scoreVal: string | number) => {
  const score =
    typeof scoreVal === 'string' ? Number.parseFloat(scoreVal) : scoreVal;
  return Number.isNaN(score) ? 0 : (score / 5) * 100;
};

// スコア表示用コンポーネント
const ScoreItem = ({
  label,
  value,
  colorClass = 'bg-primary',
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) => (
  <div className='bg-white/50 p-3 rounded-lg border border-white/20'>
    <div className='flex justify-between items-center mb-2'>
      <span className='text-sm font-medium text-muted-foreground'>{label}</span>
      <span className='text-lg font-bold text-foreground'>{value}</span>
    </div>
    <Progress
      value={normalizeScore(value)}
      className='h-2 bg-muted/50'
      indicatorClassName={colorClass}
    />
  </div>
);

export default function ReviewDetailDialog({
  review,
  open,
  onOpenChange,
}: ReviewDetailDialogProps) {
  if (!review) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-5xl max-h-[85vh] overflow-y-auto glass-panel border-white/20 sm:rounded-2xl p-0'>
        <div className='p-8'>
          <DialogHeader className='border-b border-border/50 pb-6 mb-6'>
            <div className='flex justify-between items-start gap-4'>
              <div>
                <DialogTitle className='text-2xl font-bold leading-tight mb-2'>
                  {review.title}
                </DialogTitle>
                <DialogDescription className='flex items-center gap-2 text-base'>
                  <span className='font-medium text-foreground'>
                    {review.girlName}
                  </span>
                  <span className='text-muted-foreground'>•</span>
                  <span>{review.visitDate}</span>
                </DialogDescription>
              </div>
              <div className='text-center bg-primary/10 px-6 py-3 rounded-xl min-w-30'>
                <div className='text-xs text-muted-foreground font-medium uppercase tracking-wider whitespace-nowrap'>
                  {REVIEW_LABELS.TOTAL_SCORE}
                </div>
                <div className='text-4xl font-black text-primary mt-1'>
                  {review.totalScore}
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className='grid grid-cols-1 md:grid-cols-5 gap-8'>
            {/* 左カラム: 本文 */}
            <div className='md:col-span-3 space-y-6'>
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  Review Body
                </h4>
                <div className='prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap bg-white/30 p-6 rounded-xl border border-white/10'>
                  {review.body}
                </div>
              </div>
            </div>

            {/* 右カラム: スコア詳細 */}
            <div className='md:col-span-2 space-y-4'>
              <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                Detailed Scores
              </h4>
              <div className='space-y-3'>
                <ScoreItem
                  label={REVIEW_LABELS.SCORE_GIRL}
                  value={review.scores.girl}
                  colorClass='bg-pink-500'
                />
                <ScoreItem
                  label={REVIEW_LABELS.SCORE_PLAY}
                  value={review.scores.play}
                  colorClass='bg-purple-500'
                />
                <ScoreItem
                  label={REVIEW_LABELS.SCORE_PRICE}
                  value={review.scores.price}
                  colorClass='bg-green-500'
                />
                <ScoreItem
                  label={REVIEW_LABELS.SCORE_STAFF}
                  value={review.scores.staff}
                  colorClass='bg-blue-500'
                />
                <ScoreItem
                  label={REVIEW_LABELS.SCORE_PHOTO}
                  value={review.scores.photo}
                  colorClass='bg-orange-500'
                />
              </div>
            </div>
          </div>

          <div className='mt-8 pt-4 border-t border-border/50 text-xs text-muted-foreground text-right'>
            {REVIEW_LABELS.POST_DATE}: {review.postDate}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
