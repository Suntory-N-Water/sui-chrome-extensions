import type { ReviewData } from '../types';

/**
 * レビューがオール5（満点）かどうかを判定
 */
export function isPerfectScore(review: ReviewData): boolean {
  return (
    review.scores.girl === 5 &&
    review.scores.play === 5 &&
    review.scores.price === 5 &&
    review.scores.staff === 5 &&
    review.scores.photo === 5
  );
}

/**
 * レビューから女の子の名前のユニークなリストを取得
 * アルファベット順にソートして返す
 */
export function getUniqueGirlNames(reviews: ReviewData[]): string[] {
  const uniqueNames = new Set(reviews.map((review) => review.girlName));
  return Array.from(uniqueNames).sort();
}
