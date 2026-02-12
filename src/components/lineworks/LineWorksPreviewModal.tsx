/**
 * LINE WORKS送信プレビューモーダル（複数Webhook対応）
 *
 * @module components/lineworks/LineWorksPreviewModal
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Copy,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { LineWorksService } from '../../services/LineWorksService';
import { NotificationType, NOTIFICATION_TYPE_LABELS, LineWorksWebhookEntry } from '../../types/lineworks';

interface LineWorksPreviewModalProps {
  /** モーダルが開いているか */
  isOpen: boolean;
  /** 閉じるコールバック */
  onClose: () => void;
  /** 通知タイプ */
  type: NotificationType;
  /** メッセージ本文 */
  message: string;
}

/**
 * LINE WORKS送信プレビューモーダル（複数Webhook対応）
 *
 * - メッセージのプレビュー表示
 * - 送信先ルームの選択
 * - クリップボードにコピー
 * - 実際に送信（設定済みの場合のみ）
 */
const LineWorksPreviewModal: React.FC<LineWorksPreviewModalProps> = ({
  isOpen,
  onClose,
  type,
  message,
}) => {
  const [webhooks, setWebhooks] = useState<LineWorksWebhookEntry[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // 初期化
  useEffect(() => {
    if (isOpen) {
      // マイグレーション実行
      LineWorksService.migrateConfig();

      const loadedWebhooks = LineWorksService.getWebhooks();
      setWebhooks(loadedWebhooks);

      // デフォルトWebhookを初期選択
      const defaultWebhook = LineWorksService.getDefaultWebhook();
      if (defaultWebhook) {
        setSelectedWebhookId(defaultWebhook.id);
      } else if (loadedWebhooks.length > 0) {
        setSelectedWebhookId(loadedWebhooks[0].id);
      }

      setSendResult(null);
      setCopied(false);
    }
  }, [isOpen]);

  const isConfigured = webhooks.length > 0;

  // クリップボードにコピー
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('クリップボードへのコピーに失敗:', error);
    }
  };

  // 送信処理
  const handleSend = async () => {
    if (!isConfigured || !selectedWebhookId) {
      setSendResult({ success: false, message: 'Webhook URLが設定されていません' });
      return;
    }

    const targetWebhook = webhooks.find(w => w.id === selectedWebhookId);
    if (!targetWebhook) {
      setSendResult({ success: false, message: '送信先が見つかりません' });
      return;
    }

    if (!window.confirm(`「${targetWebhook.roomName}」にメッセージを送信しますか？`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    const result = await LineWorksService.send(type, message, selectedWebhookId);

    setIsSending(false);
    setSendResult({
      success: result.success,
      message: result.success
        ? `「${targetWebhook.roomName}」に送信しました`
        : `送信失敗: ${result.error}`,
    });

    // Webhookの最終送信日時を更新するために再読み込み
    setWebhooks(LineWorksService.getWebhooks());
  };

  // モーダルを閉じる
  const handleClose = () => {
    setSendResult(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  const lineCount = message.split('\n').length;
  const charCount = message.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            送信内容プレビュー
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* メタ情報 */}
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {/* 送信先選択 */}
            {isConfigured && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">送信先:</span>
                <div className="relative">
                  <select
                    value={selectedWebhookId}
                    onChange={(e) => setSelectedWebhookId(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-1 text-sm font-medium text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    {webhooks.map((webhook) => (
                      <option key={webhook.id} value={webhook.id}>
                        {webhook.roomName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
            <span>
              種別: <span className="font-medium text-gray-900 dark:text-gray-100">{NOTIFICATION_TYPE_LABELS[type]}</span>
            </span>
            <span>行数: {lineCount}</span>
            <span>文字数: {charCount}</span>
          </div>
        </div>

        {/* メッセージ本文 */}
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            {message}
          </pre>
        </div>

        {/* 結果表示 */}
        {sendResult && (
          <div
            className={`mx-4 mb-2 p-3 rounded-lg flex items-center gap-2 ${
              sendResult.success
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}
          >
            {sendResult.success ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm">{sendResult.message}</span>
          </div>
        )}

        {/* フッター */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Webhook状態表示 */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {isConfigured ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  {webhooks.length}件のルームが設定済み
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  Webhook未設定（設定ボタンから設定してください）
                </span>
              )}
            </div>

            {/* ボタン群 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    コピー済み
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    コピー
                  </>
                )}
              </button>
              <button
                onClick={handleSend}
                disabled={!isConfigured || isSending}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={!isConfigured ? 'Webhook URLを設定してください' : ''}
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    送信
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LineWorksPreviewModal;
