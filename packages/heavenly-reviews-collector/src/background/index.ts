import { getLogger } from '@sui-chrome-extensions/common';
import { notifyPopup, sendMessageToContent } from '../services/messaging';
import {
  loadState as loadStateFromStorage,
  saveState as saveStateToStorage,
} from '../services/storage';
import type {
  CollectionState,
  MessageType,
  PageTask,
  ReviewData,
} from '../types';
import { buildPageUrls } from '../utils/url-builder';

const logger = getLogger('background');

// 各ページ読み込み後の待機時間（ミリ秒）
const PAGE_DELAY_MS = 1 * 1000;

let state: CollectionState = {
  status: 'idle',
  currentPage: 0,
  totalReviews: 0,
  reviews: [],
  pageTasks: [],
};

let shouldStop = false;

/**
 * ポップアップに進捗状態を通知する
 */
async function sendProgressToPopup(): Promise<void> {
  notifyPopup({
    type: 'COLLECTION_PROGRESS',
    state,
  });
}

/**
 * タブのContent Scriptにレビューデータ抽出を依頼する
 */
async function extractReviewsFromTab(tabId: number): Promise<{
  reviews: ReviewData[];
  nextPageUrl: string | null;
}> {
  try {
    const response = await sendMessageToContent({
      tabId,
      message: { type: 'EXTRACT_REVIEWS' },
    });

    if (response.type === 'REVIEWS_EXTRACTED') {
      return {
        reviews: response.reviews,
        nextPageUrl: response.nextPageUrl,
      };
    }
    return { reviews: [], nextPageUrl: null };
  } catch (error) {
    logger.error({ tabId, error }, 'レビュー抽出失敗');
    return { reviews: [], nextPageUrl: null };
  }
}

/**
 * タブのContent Scriptにページ情報（総レビュー数、1ページあたりのレビュー数、総ページ数）を要求して取得する
 */
async function getPageInfoFromTab(tabId: number): Promise<{
  totalReviews: number;
  reviewsPerPage: number;
  totalPages: number;
}> {
  const response = await sendMessageToContent({
    tabId,
    message: { type: 'GET_PAGE_INFO' },
  });

  if (response.type !== 'PAGE_INFO_RESPONSE') {
    throw new Error('ページ情報の取得に失敗しました');
  }

  return {
    totalReviews: response.totalReviews,
    reviewsPerPage: response.reviewsPerPage,
    totalPages: response.totalPages,
  };
}

/**
 * タブのページ読み込み完了を待機する
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
          logger.debug({ tabId }, 'status:complete検出、追加待機開始');
          // DOMの準備とAjaxの完了を待つための適度な待機時間
          setTimeout(() => {
            logger.debug({ tabId }, '追加待機完了');
            resolve();
          }, 1 * 1000);
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // タイムアウト処理（30秒）
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        logger.error('ページ読み込みタイムアウト');
        reject(new Error('Page load timeout'));
      }
    }, 30 * 1000);
  });
}

/**
 * 最初のページから総ページ数を取得し、全ページのURLリストを生成してストレージに保存する
 *
 * @param startUrl - 収集を開始するURL
 * @returns 成功した場合true、失敗した場合false
 */
async function collectPageUrls(startUrl: string): Promise<boolean> {
  logger.info({ startUrl }, 'URL収集を開始');

  state.status = 'url_collecting';
  await saveStateToStorage(state);
  await sendProgressToPopup();

  let tab: chrome.tabs.Tab | undefined;

  try {
    // タブを開いて最初のページにアクセス
    tab = await chrome.tabs.create({ url: startUrl, active: false });
    if (!tab.id) {
      throw new Error('タブIDが取得できません');
    }

    logger.debug({ tabId: tab.id }, 'タブ作成完了、ページ読み込み待機開始');
    await waitForPageLoad(tab.id);

    // ページ情報を取得
    logger.debug({ tabId: tab.id }, 'ページ情報取得開始');
    const pageInfo = await getPageInfoFromTab(tab.id);
    logger.info(
      {
        totalReviews: pageInfo.totalReviews,
        totalPages: pageInfo.totalPages,
      },
      'ページ情報を取得',
    );

    // URLリストを生成
    const urls = buildPageUrls({
      baseUrl: startUrl,
      totalPages: pageInfo.totalPages,
    });
    logger.debug({ urlCount: urls.length }, 'URL生成完了');

    // PageTasksを初期化
    state.pageTasks = urls.map((url, index) => ({
      url,
      pageNumber: index + 1,
      status: 'idle',
    }));

    state.totalReviewCount = pageInfo.totalReviews;
    state.totalPageCount = pageInfo.totalPages;
    state.status = 'review_collecting';

    await saveStateToStorage(state);
    await sendProgressToPopup();

    logger.info('URL収集完了、レビュー収集フェーズへ移行');
    return true;
  } catch (error) {
    logger.error({ error }, 'URL収集エラー');
    state.status = 'error';
    state.error = `URL収集エラー: ${error}`;
    await saveStateToStorage(state);
    await sendProgressToPopup();
    return false;
  } finally {
    if (tab?.id) {
      await chrome.tabs.remove(tab.id);
    }
  }
}

/**
 * 単一ページのタスクを処理し、レビューを抽出してstateに追加する
 *
 * @param task - 処理対象のPageTask（statusが更新される）
 */
async function processSinglePageTask(task: PageTask): Promise<void> {
  logger.info(
    {
      pageNumber: task.pageNumber,
      url: task.url,
    },
    'ページ処理開始',
  );

  task.status = 'processing';
  state.currentPage = task.pageNumber;
  await saveStateToStorage(state);
  await sendProgressToPopup();

  let tab: chrome.tabs.Tab | undefined;

  try {
    // タブを開いてレビュー抽出
    tab = await chrome.tabs.create({ url: task.url, active: false });
    if (!tab.id) {
      throw new Error('タブIDが取得できません');
    }

    logger.debug({ tabId: tab.id }, 'タブ作成完了、ページ読み込み待機開始');
    await waitForPageLoad(tab.id);

    logger.debug({ tabId: tab.id }, 'レビュー抽出開始');
    const { reviews } = await extractReviewsFromTab(tab.id);

    // レビューを追加
    state.reviews.push(...reviews);
    state.totalReviews = state.reviews.length;

    logger.info(
      {
        pageNumber: task.pageNumber,
        reviewCount: reviews.length,
        totalReviews: state.reviews.length,
      },
      'レビュー抽出完了',
    );

    // タスクを完了にマーク
    task.status = 'completed';

    // サーバー負荷軽減のため待機
    await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
  } catch (error) {
    logger.error(
      {
        pageNumber: task.pageNumber,
        error,
      },
      'ページ処理エラー',
    );
    task.status = 'error';
    task.errorMessage = String(error);
  } finally {
    if (tab?.id) {
      await chrome.tabs.remove(tab.id);
    }
  }

  await saveStateToStorage(state);
  await sendProgressToPopup();
}

/**
 * state.pageTasksのidleタスクを順次処理してレビューデータを収集する
 * 全タスク完了またはshouldStopがtrueになるまで継続する
 */
async function collectReviewsFromTasks(): Promise<void> {
  const idleTasks = state.pageTasks.filter((t) => t.status === 'idle');
  logger.info({ taskCount: idleTasks.length }, 'レビュー収集タスク開始');

  for (const task of idleTasks) {
    if (shouldStop) {
      logger.info('停止要求を受信、収集を中断');
      break;
    }
    await processSinglePageTask(task);
  }

  state.status = shouldStop ? 'idle' : 'completed';
  await saveStateToStorage(state);
  await sendProgressToPopup();

  if (state.status === 'completed') {
    logger.info(
      { totalReviews: state.reviews.length },
      'レビュー収集が完了しました',
    );
  }
}

/**
 * メインエントリーポイント - 収集全体を制御
 */
async function startCollectionWorkflow(startUrl: string): Promise<void> {
  shouldStop = false;

  // フェーズ1: URL収集
  const success = await collectPageUrls(startUrl);
  if (!success || shouldStop) {
    return;
  }

  // フェーズ2: レビュー収集
  await collectReviewsFromTasks();
}

/**
 * レビュー収集を停止する
 */
async function stopCollection(): Promise<void> {
  shouldStop = true;
  state.status = 'idle';
  await saveStateToStorage(state);
  await sendProgressToPopup();
}

chrome.runtime.onMessage.addListener(
  (
    message: MessageType,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: CollectionState | { success: boolean }) => void,
  ) => {
    if (message.type === 'START_COLLECTION') {
      startCollectionWorkflow(message.url);
      sendResponse({ success: true });
    } else if (message.type === 'STOP_COLLECTION') {
      stopCollection();
      sendResponse({ success: true });
    } else if (message.type === 'GET_STATE') {
      loadStateFromStorage()
        .then((savedState) => {
          if (savedState) {
            state = savedState;
          }
        })
        .finally(() => {
          sendResponse(state);
        });
      return true;
    } else if (message.type === 'CLEAR_DATA') {
      state = {
        status: 'idle',
        currentPage: 0,
        totalReviews: 0,
        reviews: [],
        pageTasks: [],
      };
      saveStateToStorage(state)
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }));
      return true;
    }
    return true;
  },
);

loadStateFromStorage().then((savedState) => {
  if (savedState) {
    state = savedState;
  }
});
