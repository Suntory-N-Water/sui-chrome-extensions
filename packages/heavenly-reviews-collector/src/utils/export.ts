import { REVIEW_HEADERS } from '../constants';
import type { ReviewData } from '../types';

/**
 * レビューデータを行配列にマッピングする（共通処理）
 */
function mapReviewsToRows(reviews: ReviewData[]): string[][] {
  return reviews.map((r) => [
    r.reviewId,
    r.visitDate,
    r.girlName,
    r.totalScore.toString(),
    r.scores.girl.toString(),
    r.scores.play.toString(),
    r.scores.price.toString(),
    r.scores.staff.toString(),
    r.scores.photo.toString(),
    r.title,
    r.body,
    r.postDate,
  ]);
}

/**
 * CSV形式でエクスポートする
 */
export function exportToCsv(reviews: ReviewData[]): string {
  const rows = mapReviewsToRows(reviews);
  const csvContent = [[...REVIEW_HEADERS], ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');
  return csvContent;
}

/**
 * TSV形式でエクスポートする
 */
export function exportToTsv(reviews: ReviewData[]): string {
  const rows = mapReviewsToRows(reviews);
  const tsvContent = [[...REVIEW_HEADERS], ...rows]
    .map((row) =>
      row
        .map((cell) => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' '))
        .join('\t'),
    )
    .join('\n');
  return tsvContent;
}

/**
 * JSON形式でエクスポートする
 */
export function exportToJson(reviews: ReviewData[]): string {
  return JSON.stringify(reviews, null, 2);
}
