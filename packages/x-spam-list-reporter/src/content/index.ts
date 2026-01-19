import { getLogger } from '@sui-chrome-extensions/common';
import type { MessageType } from '../types';
import { collectMembers } from './member-collector';
import { reportUserAsSpam } from './spam-reporter';

const logger = getLogger('content-script');

logger.info('Content Script loaded');

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener(
  (
    message: MessageType,
    _sender,
    sendResponse: (response: MessageType) => void,
  ) => {
    logger.info({ message }, 'メッセージを受信');

    if (message.type === 'CHECK_LIST_PAGE') {
      // リストページかどうか確認
      const isListPage = window.location.pathname.includes('/lists/');
      sendResponse({ type: 'LIST_PAGE_CHECK_RESULT', isListPage });
      return true;
    }

    if (message.type === 'COLLECT_MEMBERS') {
      // メンバー収集を実行
      collectMembers()
        .then((userUrls) => {
          sendResponse({ type: 'MEMBERS_COLLECTED', userUrls });
        })
        .catch((error) => {
          logger.error({ error }, 'メンバー収集中にエラーが発生');
          sendResponse({ type: 'ERROR', error: String(error) });
        });
      return true;
    }

    if (message.type === 'REPORT_SPAM') {
      // スパム報告を実行
      reportUserAsSpam()
        .then((success) => {
          sendResponse({ type: 'SPAM_REPORT_RESULT', success });
        })
        .catch((error) => {
          logger.error({ error }, 'スパム報告中にエラーが発生');
          sendResponse({ type: 'ERROR', error: String(error) });
        });
      return true;
    }

    return false;
  },
);
