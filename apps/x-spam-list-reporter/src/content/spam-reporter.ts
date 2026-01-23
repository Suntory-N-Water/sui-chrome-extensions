import { getLogger } from '@sui-chrome-extensions/common';
import { wait, waitForElement } from './utils';

const logger = getLogger('spam-reporter');

/**
 * ユーザーページでスパム報告を実行
 * Background Scriptがページ遷移済みの前提で実行
 */
export async function reportUserAsSpam(): Promise<boolean> {
  logger.info('スパム報告を開始');

  try {
    // 1. 3点リーダーを待機してクリック
    const moreButton = await waitForElement({
      selector: '[data-testid="userActions"]',
      timeout: 5 * 1000,
    });
    if (!moreButton) {
      logger.error('3点リーダーが見つかりません');
      return false;
    }
    (moreButton as HTMLElement).click();
    await wait(500);

    // 2. 「報告」をクリック
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    const reportItem = Array.from(menuItems).find((item) =>
      item.textContent?.includes('報告'),
    );
    if (!reportItem) {
      logger.error('報告ボタンが見つかりません');
      return false;
    }
    (reportItem as HTMLElement).click();
    await wait(1000);

    // 3. 「スパム」を選択
    const radioGroup = await waitForElement({
      selector: 'div[role="radiogroup"]',
      timeout: 5 * 1000,
    });
    if (!radioGroup) {
      logger.error('ラジオグループが見つかりません');
      return false;
    }

    const labels = radioGroup.querySelectorAll('label');
    const spamLabel = Array.from(labels).find((label) => {
      const titleElement = label.querySelector('div[dir="ltr"] span');
      return titleElement?.textContent?.trim().includes('スパム');
    });

    if (!spamLabel) {
      logger.error('スパムオプションが見つかりません');
      return false;
    }
    (spamLabel as HTMLElement).click();
    await wait(500);

    // 4. 「次へ」をクリック
    const nextButton = document.querySelector(
      '[data-testid="ChoiceSelectionNextButton"]',
    );
    if (!nextButton) {
      logger.error('次へボタンが見つかりません');
      return false;
    }
    (nextButton as HTMLElement).click();
    await wait(1000);

    logger.info('スパム報告完了');
    return true;
  } catch (error) {
    logger.error({ error }, 'スパム報告中にエラーが発生');
    return false;
  }
}
