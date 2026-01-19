import { getLogger } from '@sui-chrome-extensions/common';
import { wait } from './utils';

const logger = getLogger('member-collector');

/**
 * Xリストページからメンバーのユーザー名リストを収集
 */
export async function collectMembers(): Promise<string[]> {
  logger.info('メンバー収集を開始');

  const userUrls = new Set<string>();
  let previousCount = 0;
  let stableCount = 0;
  const maxStableChecks = 3; // 3秒間変化がなければ完了とみなす

  // IntersectionObserverでスクロール位置を監視し、自動スクロール
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // 最後の要素が見えたらスクロール
          window.scrollTo(0, document.body.scrollHeight);
        }
      }
    },
    { threshold: 0.1 },
  );

  // メンバーセルを監視する関数
  const collectVisibleMembers = () => {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    for (const cell of cells) {
      const links = cell.querySelectorAll('a[role="link"][href^="/"]');
      for (const link of links) {
        const href = (link as HTMLAnchorElement).href;
        // /i/ で始まるURLは除外（設定ページなど）
        if (!href.includes('/i/')) {
          const url = new URL(href);
          const username = url.pathname.split('/')[1];
          if (username) {
            userUrls.add(username);
          }
        }
      }
    }

    // 最後の要素を監視対象に追加
    if (cells.length > 0) {
      observer.disconnect();
      observer.observe(cells[cells.length - 1]);
    }
  };

  // 定期的にメンバーを収集
  while (stableCount < maxStableChecks) {
    collectVisibleMembers();

    const currentCount = userUrls.size;
    if (currentCount === previousCount) {
      stableCount++;
    } else {
      stableCount = 0;
      previousCount = currentCount;
    }

    logger.info({ count: currentCount, stableCount }, 'メンバー収集中');
    await wait(1 * 1000);
  }

  observer.disconnect();

  const urls = Array.from(userUrls).map(
    (username) => `https://x.com/${username}`,
  );
  logger.info({ count: urls.length }, 'メンバー収集完了');
  return urls;
}
