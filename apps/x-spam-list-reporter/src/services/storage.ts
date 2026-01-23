import { getLogger } from '@sui-chrome-extensions/common';
import type { ReportState } from '../types';

const logger = getLogger('storage');
const STORAGE_KEY = 'reportState';

type AppStorage = {
  reportState: ReportState;
};

export async function saveState(state: ReportState): Promise<void> {
  await chrome.storage.local.set<AppStorage>({ reportState: state });
  logger.debug({ state }, '状態を保存');
}

export async function loadState(): Promise<ReportState | null> {
  const result = await chrome.storage.local.get<AppStorage>([STORAGE_KEY]);
  const state = result.reportState;
  if (state) {
    logger.debug({ state }, '状態を読み込み');
    return state;
  }
  return null;
}

export async function clearState(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
  logger.debug('状態をクリア');
}
