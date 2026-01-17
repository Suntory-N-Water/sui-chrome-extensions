import type { MessageType } from '../types';

/**
 * Background Scriptへメッセージを送信
 */
export async function sendMessageToBackground(
  message: MessageType,
): Promise<MessageType> {
  return chrome.runtime.sendMessage<MessageType, MessageType>(message);
}

/**
 * Content Scriptへメッセージを送信
 */
export async function sendMessageToContent({
  tabId,
  message,
}: {
  tabId: number;
  message: MessageType;
}): Promise<MessageType> {
  return chrome.tabs.sendMessage<MessageType, MessageType>(tabId, message);
}

/**
 * ポップアップへ通知
 */
export function notifyPopup(message: MessageType): void {
  chrome.runtime.sendMessage(message).catch(() => {
    // ポップアップが閉じている場合は無視
  });
}
