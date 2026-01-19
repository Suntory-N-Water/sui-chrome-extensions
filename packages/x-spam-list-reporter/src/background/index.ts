import { getLogger } from '@sui-chrome-extensions/common';
import { clearState, loadState, saveState } from '../services/storage';
import type { MessageType, ReportState } from '../types';

const logger = getLogger('background');

let state: ReportState = {
  status: 'idle',
  totalMembers: 0,
  processedMembers: 0,
};

// 停止フラグ
let shouldStop = false;

// 処理中のタブID
let processingTabId: number | null = null;

/**
 * Popupに進捗を通知
 */
function notifyProgress(): void {
  chrome.runtime.sendMessage<MessageType, MessageType>({
    type: 'PROGRESS_UPDATE',
    state,
  });
}

/**
 * Content Scriptにメッセージを送信
 */
async function sendToContentScript<
  M extends MessageType,
  R extends MessageType,
>(tabId: number, message: M): Promise<R> {
  try {
    const response = await chrome.tabs.sendMessage<M, R>(tabId, message);
    return response;
  } catch (error) {
    logger.error({ tabId, message, error }, 'メッセージ送信エラー');
    throw error;
  }
}

/**
 * タブのページ読み込み完了を待機
 */
async function waitForPageLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(listener);
    };

    const listener = (
      updatedTabId: number,
      changeInfo: { status?: string },
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        if (!resolved) {
          resolved = true;
          cleanup();
          logger.debug({ tabId }, 'ページ読み込み完了');
          // DOMの準備を待つ
          setTimeout(() => {
            resolve();
          }, 1 * 1000);
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // タイムアウト設定
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        reject(new Error('Page load timeout'));
      }
    }, 30 * 1000);
  });
}

/**
 * メンバー収集フェーズ
 */
async function collectMembers(tabId: number): Promise<string[]> {
  logger.info('メンバー収集を開始');

  // リストページかどうか確認
  const checkResponse = await sendToContentScript<
    { type: 'CHECK_LIST_PAGE' },
    MessageType
  >(tabId, {
    type: 'CHECK_LIST_PAGE',
  });

  if (
    checkResponse.type === 'LIST_PAGE_CHECK_RESULT' &&
    !checkResponse.isListPage
  ) {
    throw new Error(
      'リストメンバーページ（/i/lists/[list_id]/members）で実行してください',
    );
  }

  state.status = 'collecting';
  await saveState(state);
  notifyProgress();

  const response = await sendToContentScript<
    { type: 'COLLECT_MEMBERS' },
    MessageType
  >(tabId, {
    type: 'COLLECT_MEMBERS',
  });

  if (response.type === 'MEMBERS_COLLECTED') {
    logger.info({ count: response.userUrls.length }, 'メンバー収集完了');
    return response.userUrls;
  }

  if (response.type === 'ERROR') {
    throw new Error(response.error);
  }

  throw new Error('メンバー収集に失敗しました');
}

/**
 * スパム報告フェーズ
 */
async function reportMembers(userUrls: string[]): Promise<void> {
  logger.info({ count: userUrls.length }, 'スパム報告を開始');

  state.status = 'reporting';
  state.totalMembers = userUrls.length;
  state.processedMembers = 0;
  await saveState(state);
  notifyProgress();

  for (const userUrl of userUrls) {
    if (shouldStop) {
      logger.info('停止要求を受信、報告を中断');
      break;
    }

    state.currentUserUrl = userUrl;
    notifyProgress();

    let tab: chrome.tabs.Tab | undefined;

    try {
      // ユーザーページに遷移
      tab = await chrome.tabs.create({ url: userUrl, active: false });
      if (!tab.id) {
        throw new Error('タブIDが取得できません');
      }
      processingTabId = tab.id;

      // ページ読み込み完了を待機
      await waitForPageLoad(tab.id);

      // スパム報告を実行
      const response = await sendToContentScript<
        { type: 'REPORT_SPAM' },
        MessageType
      >(tab.id, {
        type: 'REPORT_SPAM',
      });

      if (response.type === 'SPAM_REPORT_RESULT') {
        if (response.success) {
          logger.info({ userUrl }, 'スパム報告成功');
        } else {
          logger.warn({ userUrl }, 'スパム報告失敗');
        }
      } else if (response.type === 'ERROR') {
        logger.error({ userUrl, error: response.error }, 'スパム報告エラー');
      }
    } catch (error) {
      logger.error({ userUrl, error }, 'スパム報告処理でエラーが発生');
    } finally {
      // タブを閉じる
      if (tab?.id) {
        await chrome.tabs.remove(tab.id).catch(() => {});
      }
      processingTabId = null;
    }

    state.processedMembers++;
    await saveState(state);
    notifyProgress();

    // サーバー負荷軽減のため待機
    await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
  }

  state.status = shouldStop ? 'idle' : 'completed';
  await saveState(state);
  notifyProgress();

  logger.info('スパム報告処理完了');
}

/**
 * 収集・報告ワークフロー全体を実行
 */
async function startReportWorkflow(tabId: number): Promise<void> {
  shouldStop = false;

  // 状態を初期化
  state.status = 'idle';
  state.totalMembers = 0;
  state.processedMembers = 0;
  state.currentUserUrl = undefined;
  state.error = undefined;
  await saveState(state);

  try {
    // フェーズ1: メンバー収集
    const userUrls = await collectMembers(tabId);

    if (shouldStop) {
      logger.info('停止要求により処理を中断');
      return;
    }

    // フェーズ2: スパム報告
    await reportMembers(userUrls);
  } catch (error) {
    logger.error({ error }, 'ワークフローでエラーが発生');
    state.status = 'error';
    state.error = String(error);
    await saveState(state);
    notifyProgress();
  }
}

/**
 * 処理を停止
 */
async function stopReporting(): Promise<void> {
  shouldStop = true;
  state.status = 'idle';

  // 処理中のタブを閉じる
  if (processingTabId) {
    chrome.tabs.remove(processingTabId).catch(() => {});
    processingTabId = null;
  }

  await clearState();
  notifyProgress();
}

// メッセージリスナー
chrome.runtime.onMessage.addListener(
  (message: MessageType, _sender, sendResponse) => {
    logger.info({ type: message.type }, 'メッセージを受信');

    if (message.type === 'START_COLLECTION') {
      startReportWorkflow(message.tabId);
      sendResponse({ success: true });
      return true;
    }

    if (message.type === 'STOP_COLLECTION') {
      stopReporting().then(() => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (message.type === 'GET_STATE') {
      sendResponse({ type: 'PROGRESS_UPDATE', state });
      return true;
    }

    return false;
  },
);

// スクリプト起動時に状態を復元
loadState().then((loadedState) => {
  if (loadedState) {
    state = loadedState;
    logger.info({ state }, '状態を復元しました');
  }
  logger.info('Background Script loaded');
});
