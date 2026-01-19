export type ReportState = {
  status: 'idle' | 'collecting' | 'reporting' | 'completed' | 'error';
  totalMembers: number;
  processedMembers: number;
  currentUserUrl?: string;
  error?: string;
};

export type UserTask = {
  url: string;
  username: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
};

export type MessageType =
  | { type: 'START_COLLECTION'; tabId: number }
  | { type: 'STOP_COLLECTION' }
  | { type: 'GET_STATE' }
  | { type: 'CHECK_LIST_PAGE' }
  | { type: 'LIST_PAGE_CHECK_RESULT'; isListPage: boolean }
  | { type: 'COLLECT_MEMBERS' }
  | { type: 'MEMBERS_COLLECTED'; userUrls: string[] }
  | { type: 'REPORT_SPAM' }
  | { type: 'SPAM_REPORT_RESULT'; success: boolean }
  | { type: 'PROGRESS_UPDATE'; state: ReportState }
  | { type: 'ERROR'; error: string };
