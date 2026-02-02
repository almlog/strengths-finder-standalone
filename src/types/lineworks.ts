/**
 * LINE WORKS Webhook連携の型定義
 *
 * @module types/lineworks
 * @description LINE WORKS Webhook Bot APIを使用した通知機能の型定義
 */

/**
 * LINE WORKS Webhook設定
 */
export interface LineWorksConfig {
  /** Webhook URL */
  webhookUrl: string;
  /** 設定日時（Unix timestamp） */
  configuredAt: number;
  /** 最終送信日時（Unix timestamp） */
  lastSentAt?: number;
}

/**
 * LINE WORKS Webhook メッセージ形式
 * @see https://developers.worksmobile.com/jp/docs/bot-send-text
 */
export interface LineWorksMessage {
  content: {
    type: 'text';
    text: string;
  };
}

/**
 * 通知タイプ
 */
export type NotificationType =
  | 'attendance-summary'   // 勤怠サマリー
  | 'team-analysis'        // チーム分析
  | 'custom';              // 手動メッセージ

/**
 * 通知タイプのラベル定義
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  'attendance-summary': '勤怠サマリー',
  'team-analysis': 'チーム分析',
  'custom': '手動送信',
};

/**
 * 送信履歴エントリ
 */
export interface LineWorksSendHistory {
  /** 一意識別子 */
  id: string;
  /** 通知タイプ */
  type: NotificationType;
  /** 送信日時（Unix timestamp） */
  sentAt: number;
  /** 送信成功フラグ */
  success: boolean;
  /** メッセージプレビュー（先頭100文字） */
  messagePreview: string;
  /** エラーメッセージ（失敗時） */
  error?: string;
}

/**
 * 送信結果
 */
export interface LineWorksSendResult {
  /** 成功フラグ */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
}

/**
 * LocalStorageキー
 */
export const LINEWORKS_STORAGE_KEYS = {
  /** Webhook設定 */
  CONFIG: 'lineworks_config',
  /** 送信履歴 */
  HISTORY: 'lineworks_send_history',
} as const;

/**
 * 履歴保持件数の上限
 */
export const LINEWORKS_HISTORY_MAX_ENTRIES = 50;
