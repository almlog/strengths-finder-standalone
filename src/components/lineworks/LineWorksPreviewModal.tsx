/**
 * LINE WORKS送信プレビューモーダル
 *
 * @module components/lineworks/LineWorksPreviewModal
 * @description Webhook URLは環境変数で管理。UI上の設定機能は不要。
 */

import React, { useState } from 'react';
import {
  X,
  Send,
  Copy,
  CheckCircle,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { LineWorksService } from '../../services/LineWorksService';
import { NotificationType, NOTIFICATION_TYPE_LABELS } from '../../types/lineworks';

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
 * LINE WORKS送信プレビューモーダル
 *
 * - メッセージのプレビュー表示
 * - クリップボードにコピー
 * - 実際に送信（環境変数で設定済みの場合のみ）
 */
const LineWorksPreviewModal: React.FC<LineWorksPreviewModalProps> = ({
  isOpen,
  onClose,
  type,
  message,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const isConfigured = LineWorksService.isConfigured();
  const roomName = LineWorksService.getRoomName();

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
    if (!isConfigured) {
      setSendResult({ success: false, message: 'LINE WORKS送信が無効です' });
      return;
    }

    if (!window.confirm(`「${roomName}」にメッセージを送信しますか？`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    const result = await LineWorksService.send(type, message);

    setIsSending(false);
    setSendResult({
      success: result.success,
      message: result.success
        ? `「${roomName}」に送信しました`
        : `送信失敗: ${result.error}`,
    });
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
            {isConfigured && (
              <span>
                送信先: <span className="font-medium text-gray-900 dark:text-gray-100">{roomName}</span>
              </span>
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
                  {roomName}に投稿されます
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  LINE WORKS送信が無効です
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
                title={!isConfigured ? 'LINE WORKS送信が無効です' : ''}
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
