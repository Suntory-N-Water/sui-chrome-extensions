import {
  extractReviews,
  getNextPageUrl,
  getPageInfo,
} from '../services/scraper';
import type { MessageType } from '../types';

chrome.runtime.onMessage.addListener(
  (
    message: MessageType,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: MessageType) => void,
  ) => {
    if (message.type === 'EXTRACT_REVIEWS') {
      const reviews = extractReviews();
      const nextPageUrl = getNextPageUrl();
      sendResponse({
        type: 'REVIEWS_EXTRACTED',
        reviews,
        nextPageUrl,
      });
    } else if (message.type === 'GET_PAGE_INFO') {
      const pageInfo = getPageInfo();
      sendResponse({
        type: 'PAGE_INFO_RESPONSE',
        totalReviews: pageInfo.totalReviews,
        reviewsPerPage: pageInfo.reviewsPerPage,
        totalPages: pageInfo.totalPages,
      });
    }
    return true;
  },
);
