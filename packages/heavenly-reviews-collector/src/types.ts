export type ReviewData = {
  reviewId: string;
  visitDate: string;
  girlName: string;
  totalScore: number;
  scores: {
    girl: number;
    play: number;
    price: number;
    staff: number;
    photo: number;
  };
  title: string;
  body: string;
  postDate: string;
};

export type PageTask = {
  url: string;
  pageNumber: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
};

export type CollectionState = {
  status:
    | 'idle'
    | 'url_collecting'
    | 'review_collecting'
    | 'completed'
    | 'error';

  // フェーズ1で取得する情報
  totalReviewCount?: number;
  totalPageCount?: number;

  // フェーズ2で使用するタスクキュー
  pageTasks: PageTask[];

  // 収集済みレビュー
  reviews: ReviewData[];
  totalReviews: number;

  // 進捗情報
  currentPage: number;

  error?: string;
};

export type MessageType =
  | { type: 'START_COLLECTION'; url: string }
  | { type: 'STOP_COLLECTION' }
  | { type: 'GET_STATE' }
  | { type: 'EXTRACT_REVIEWS' }
  | {
      type: 'REVIEWS_EXTRACTED';
      reviews: ReviewData[];
      nextPageUrl: string | null;
    }
  | { type: 'GET_PAGE_INFO' }
  | {
      type: 'PAGE_INFO_RESPONSE';
      totalReviews: number;
      reviewsPerPage: number;
      totalPages: number;
    }
  | { type: 'COLLECTION_PROGRESS'; state: CollectionState }
  | { type: 'CLEAR_DATA' };
