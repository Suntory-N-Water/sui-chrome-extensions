import type { CollectionState } from '../types';

const STORAGE_KEY = 'collectionState';

/**
 * Chrome Storage APIから状態を読み込み
 */
export async function loadState(): Promise<CollectionState | null> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as CollectionState | undefined) || null;
}

/**
 * Chrome Storage APIに状態を保存
 */
export async function saveState(state: CollectionState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

/**
 * Chrome Storage APIから状態をクリア
 */
export async function clearState(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEY]);
}
