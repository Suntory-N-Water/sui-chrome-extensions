import { getLogger } from '@sui-chrome-extensions/common';
import retry from 'async-retry';
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

// リトライ設定
const MAX_RETRIES = 3; // 初回 + 2回のリトライ
const RETRY_DELAY_MS = 2 * 1000; // 2秒

// 処理中のタブIDを追跡（強制停止時のクリーンアップ用）
let currentProcessingTabId: number | null = null;

let state: CollectionState = {
  status: 'idle',
  currentPage: 0,
  expectedTotalReviews: 0,
  collectedReviewsCount: 0,
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

    if (response.type === 'ERROR') {
      throw new Error(response.error);
    }

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

  if (response.type === 'PAGE_INFO_RESPONSE') {
    return {
      totalReviews: response.totalReviews,
      reviewsPerPage: response.reviewsPerPage,
      totalPages: response.totalPages,
    };
  }

  if (response.type === 'ERROR') {
    throw new Error(response.error);
  }

  throw new Error('ページ情報の取得に失敗しました');
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

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        logger.warn('ページ読み込みタイムアウト');
        reject(new Error('Page load timeout'));
      }
    }, 30 * 1000);
  });
}

/**
 * 最初のページから総ページ数を取得し、全ページのURLリストを生成してストレージに保存する
 */
async function collectPageUrls(startUrl: string): Promise<boolean> {
  logger.info({ startUrl }, 'URL収集を開始');

  state.status = 'url_collecting';
  await saveStateToStorage(state);
  await sendProgressToPopup();

  let tab: chrome.tabs.Tab | undefined;

  try {
    await retry(
      async (bail, attemptNumber) => {
        logger.debug({ attempt: attemptNumber }, 'URL収集試行開始');

        try {
          // タブ作成（初回）またはリロード（2回目以降）
          if (attemptNumber === 1) {
            tab = await chrome.tabs.create({ url: startUrl, active: false });
            if (!tab.id) {
              throw new Error('タブIDが取得できません');
            }
          } else {
            // リトライ時はタブをリロード
            if (!tab?.id) {
              throw new Error('リトライ時にタブIDが存在しません');
            }
            logger.debug({ tabId: tab.id }, 'タブをリロード');
            await chrome.tabs.reload(tab.id);
          }

          logger.debug(
            { tabId: tab.id },
            'タブ作成完了、ページ読み込み待機開始',
          );
          await waitForPageLoad(tab.id);

          // ページ情報を取得
          logger.debug({ tabId: tab.id }, 'ページ情報取得開始');
          const pageInfo = await getPageInfoFromTab(tab.id);
          logger.info(
            {
              totalReviews: pageInfo.totalReviews,
              totalPages: pageInfo.totalPages,
              attempt: attemptNumber,
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

          state.expectedTotalReviews = pageInfo.totalReviews;
          state.totalPageCount = pageInfo.totalPages;
          state.status = 'review_collecting';

          await saveStateToStorage(state);
          await sendProgressToPopup();

          logger.info('URL収集完了、レビュー収集フェーズへ移行');
        } catch (error) {
          // リトライ可能なエラーかチェック
          const errorMessage = String(error);
          const isRetryableError =
            errorMessage.includes('timeout') ||
            errorMessage.includes('Page load timeout') ||
            errorMessage.includes('タブIDが取得できません') ||
            errorMessage.includes('ページ情報の取得に失敗しました');

          if (isRetryableError) {
            logger.warn(
              {
                attempt: attemptNumber,
                error: errorMessage,
              },
              'リトライ可能なエラーが発生',
            );
            throw error; // リトライを続行
          }

          // リトライ不可能なエラーの場合は即座に失敗
          logger.error(
            {
              error: errorMessage,
            },
            'リトライ不可能なエラー、処理を中断',
          );
          bail(error); // リトライを中断
          return; // TypeScript型チェックのため
        }
      },
      {
        retries: MAX_RETRIES - 1, // 初回 + 2回のリトライ = 合計3回
        minTimeout: RETRY_DELAY_MS,
        maxTimeout: RETRY_DELAY_MS,
        onRetry: (error, attempt) => {
          logger.info(
            {
              attempt,
              maxRetries: MAX_RETRIES,
              error: String(error),
            },
            'URL収集リトライ実行中',
          );
        },
      },
    );

    return true;
  } catch (error) {
    logger.error({ error }, 'URL収集エラー（最大リトライ回数到達）');
    state.status = 'error';
    state.error = `URL収集エラー: ${error}`;
    await saveStateToStorage(state);
    await sendProgressToPopup();
    return false;
  } finally {
    if (tab?.id) {
      await chrome.tabs.remove(tab.id).catch(() => {});
    }
  }
}

/**
 * 単一ページのタスクを処理し、レビューを抽出してstateに追加する
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
    // async-retryでラップ
    await retry(
      async (bail, attemptNumber) => {
        logger.debug(
          { pageNumber: task.pageNumber, attempt: attemptNumber },
          'ページ処理試行開始',
        );

        try {
          // タブ作成（初回）またはリロード（2回目以降）
          if (attemptNumber === 1) {
            tab = await chrome.tabs.create({ url: task.url, active: false });
            if (!tab.id) {
              throw new Error('タブIDが取得できません');
            }
            currentProcessingTabId = tab.id;
          } else {
            // リトライ時はタブをリロード
            if (!tab?.id) {
              throw new Error('リトライ時にタブIDが存在しません');
            }
            logger.debug({ tabId: tab.id }, 'タブをリロード');
            await chrome.tabs.reload(tab.id);
          }

          logger.debug(
            { tabId: tab.id },
            'タブ作成完了、ページ読み込み待機開始',
          );
          await waitForPageLoad(tab.id);

          logger.debug({ tabId: tab.id }, 'レビュー抽出開始');
          const { reviews } = await extractReviewsFromTab(tab.id);

          // レビューを追加
          state.reviews.push(...reviews);
          state.collectedReviewsCount = state.reviews.length;

          logger.info(
            {
              pageNumber: task.pageNumber,
              reviewCount: reviews.length,
              totalReviews: state.reviews.length,
              attempt: attemptNumber,
            },
            'レビュー抽出完了',
          );

          // タスクを完了にマーク
          task.status = 'completed';

          // サーバー負荷軽減のため待機
          await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
        } catch (error) {
          // リトライ可能なエラーかチェック
          const errorMessage = String(error);
          const isRetryableError =
            errorMessage.includes('timeout') ||
            errorMessage.includes('Page load timeout') ||
            errorMessage.includes('タブIDが取得できません');

          if (isRetryableError) {
            logger.warn(
              {
                pageNumber: task.pageNumber,
                attempt: attemptNumber,
                error: errorMessage,
              },
              'リトライ可能なエラーが発生',
            );
            throw error; // リトライを続行
          }

          // リトライ不可能なエラーの場合は即座に失敗
          logger.error(
            {
              pageNumber: task.pageNumber,
              error: errorMessage,
            },
            'リトライ不可能なエラー、処理を中断',
          );
          bail(error); // リトライを中断
          return; // TypeScript型チェックのため
        }
      },
      {
        retries: MAX_RETRIES - 1, // 初回 + 2回のリトライ = 合計3回
        minTimeout: RETRY_DELAY_MS,
        maxTimeout: RETRY_DELAY_MS,
        onRetry: (error, attempt) => {
          logger.info(
            {
              pageNumber: task.pageNumber,
              attempt,
              maxRetries: MAX_RETRIES,
              error: String(error),
            },
            'リトライ実行中',
          );
        },
      },
    );
  } catch (error) {
    logger.error(
      {
        pageNumber: task.pageNumber,
        error,
      },
      'ページ処理エラー（最大リトライ回数到達）',
    );
    task.status = 'error';
    task.errorMessage = String(error);
  } finally {
    if (tab?.id) {
      await chrome.tabs.remove(tab.id).catch(() => {});
    }
    currentProcessingTabId = null;
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

  // 処理中のタブがあれば強制的に閉じる
  if (currentProcessingTabId) {
    try {
      await chrome.tabs.remove(currentProcessingTabId);
    } catch {
      // 既に閉じられていても無視
    }
    currentProcessingTabId = null;
  }

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
        .catch((error) => {
          logger.error({ error }, 'Failed to load state in GET_STATE');
          // エラー時は初期状態などを維持、必要に応じてリセット処理
        })
        .finally(() => {
          sendResponse(state);
        });
      return true;
    } else if (message.type === 'CLEAR_DATA') {
      state = {
        status: 'idle',
        currentPage: 0,
        expectedTotalReviews: 0,
        collectedReviewsCount: 0,
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
