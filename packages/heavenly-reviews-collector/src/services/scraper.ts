import type { ReviewData } from '../types';

/**
 * 現在のページからレビューデータを抽出する
 */
export function extractReviews(): ReviewData[] {
  const reviews: ReviewData[] = [];
  const reviewItems = document.querySelectorAll(
    'ul.review-list li.review-item',
  );

  for (const item of reviewItems) {
    const reviewId = item.getAttribute('data-review-id') ?? '';

    const visitDateEl = item.querySelector('.visit-time dd');
    const visitDate = visitDateEl?.textContent?.trim() ?? '';

    const girlNameEl = item.querySelector('dd.name');
    const girlName = girlNameEl?.textContent?.trim() ?? '';

    const totalRateEl = item.querySelector('.total_rate');
    const totalScore = Number.parseFloat(
      totalRateEl?.textContent?.trim() ?? '0',
    );

    const scores = {
      girl: 0,
      play: 0,
      price: 0,
      staff: 0,
      photo: 0,
    };

    const rateItems = item.querySelectorAll('ul.review-item-rate li');
    for (const rateItem of rateItems) {
      const text = rateItem.textContent?.trim() ?? '';
      const match = text.match(/(.+?)\s+(\d+(?:\.\d+)?)/);
      if (match) {
        const [, label, value] = match;
        const score = Number.parseFloat(value);
        if (label.includes('女の子')) {
          scores.girl = score;
        } else if (label.includes('プレイ')) {
          scores.play = score;
        } else if (label.includes('料金')) {
          scores.price = score;
        } else if (label.includes('スタッフ')) {
          scores.staff = score;
        } else if (label.includes('写真')) {
          scores.photo = score;
        }
      }
    }

    const titleEl = item.querySelector('.review-item-title .review_bold');
    const title = titleEl?.textContent?.trim() ?? '';

    const bodyEl = item.querySelector('p.review-item-post');
    const body = bodyEl?.textContent?.trim() ?? '';

    const postDateEl = item.querySelector('p.review-item-post-date');
    const postDateText = postDateEl?.textContent?.trim() ?? '';
    const postDateMatch = postDateText.match(/掲載日：(.+)/);
    const postDate = postDateMatch ? postDateMatch[1] : '';

    reviews.push({
      reviewId,
      visitDate,
      girlName,
      totalScore,
      scores,
      title,
      body,
      postDate,
    });
  }

  return reviews;
}

/**
 * 次ページのURLを取得する
 */
export function getNextPageUrl(): string | null {
  const nextLink =
    document.querySelector<HTMLAnchorElement>('ul.paging a.next');
  return nextLink?.href ?? null;
}

/**
 * ページ情報（総レビュー数、1ページあたりのレビュー数、総ページ数）を取得する
 */
export function getPageInfo(): {
  totalReviews: number;
  reviewsPerPage: number;
  totalPages: number;
} {
  const reviewTotalEl = document.querySelector<HTMLDivElement>('.review-total');
  const totalReviews = reviewTotalEl
    ? Number.parseInt(reviewTotalEl.textContent?.trim() ?? '0', 10)
    : 0;

  const reviewsPerPage = document.querySelectorAll<HTMLLIElement>(
    'ul.review-list li.review-item',
  ).length;
  const totalPages =
    reviewsPerPage > 0 ? Math.ceil(totalReviews / reviewsPerPage) : 0;

  return { totalReviews, reviewsPerPage, totalPages };
}
