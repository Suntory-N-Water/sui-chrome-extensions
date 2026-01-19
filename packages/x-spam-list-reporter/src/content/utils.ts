import { getLogger } from '@sui-chrome-extensions/common';

const logger = getLogger('utils');

/**
 * setIntervalで要素の出現を待つ
 */
export async function waitForElement(
  selector: string,
  timeout: number = 5 * 1000,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(interval);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        logger.warn({ selector, timeout }, '要素が見つかりませんでした');
        resolve(null);
      }
    }, 100); // 100ms間隔でポーリング
  });
}

/**
 * 固定時間待機
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
