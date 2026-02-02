/**
 * LINE WORKS送信ボタンコンポーネント
 *
 * @module components/lineworks/LineWorksSendButton
 */

import React, { useState } from 'react';
import { Send, Settings, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { LineWorksService } from '../../services/LineWorksService';
import { NotificationType } from '../../types/lineworks';
import LineWorksSettingsModal from './LineWorksSettingsModal';

interface LineWorksSendButtonProps {
  /** 通知タイプ */
  type: NotificationType;
  /** 送信するメッセージを生成する関数 */
  buildMessage: () => string;
  /** ボタンラベル（省略時は「LINE WORKS」） */
  label?: string;
  /** 無効化フラグ */
  disabled?: boolean;
  /** サイズ */
  size?: 'sm' | 'md';
}

/**
 * LINE WORKS送信ボタン
 *
 * - 未設定時: 設定アイコン表示、クリックで設定モーダルを開く
 * - 設定済み時: 送信アイコン表示、クリックで確認後に送信
 */
const LineWorksSendButton: React.FC<LineWorksSendButtonProps> = ({
  type,
  buildMessage,
  label,
  disabled = false,
  size = 'sm',
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  const isConfigured = LineWorksService.isConfigured();

  // 送信処理
  const handleSend = async () => {
    if (!isConfigured) {
      setIsSettingsOpen(true);
      return;
    }

    // 確認ダイアログ
    const message = buildMessage();
    const preview = message.length > 100 ? message.substring(0, 100) + '...' : message;

    if (!window.confirm(`以下のメッセージをLINE WORKSに送信しますか？\n\n${preview}`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    const result = await LineWorksService.send(type, message);

    setIsSending(false);
    setSendResult({
      success: result.success,
      message: result.success ? '送信しました' : `送信失敗: ${result.error}`,
    });

    // 3秒後に結果表示をクリア
    setTimeout(() => setSendResult(null), 3000);
  };

  // 設定ボタンクリック
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettingsOpen(true);
  };

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-xs gap-1'
    : 'px-3 py-2 text-sm gap-2';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <>
      <div className="relative inline-flex items-center">
        {/* メインボタン */}
        <button
          onClick={handleSend}
          disabled={disabled || isSending}
          className={`flex items-center ${sizeClasses} rounded-lg transition-colors ${
            isConfigured
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
          } disabled:opacity-50`}
          title={isConfigured ? 'LINE WORKSに送信' : 'LINE WORKS設定を開く'}
        >
          {isSending ? (
            <RefreshCw className={`${iconSize} animate-spin`} />
          ) : isConfigured ? (
            <Send className={iconSize} />
          ) : (
            <Settings className={iconSize} />
          )}
          <span className="hidden sm:inline">{label || 'LINE WORKS'}</span>
          <span className="sm:hidden">LW</span>
        </button>

        {/* 設定ボタン（設定済みの場合のみ表示） */}
        {isConfigured && (
          <button
            onClick={handleSettingsClick}
            className={`ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`}
            title="LINE WORKS設定"
          >
            <Settings className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </button>
        )}

        {/* 送信結果トースト */}
        {sendResult && (
          <div
            className={`absolute top-full left-0 mt-1 px-3 py-1 rounded-lg text-xs whitespace-nowrap z-10 ${
              sendResult.success
                ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
            }`}
          >
            <span className="flex items-center gap-1">
              {sendResult.success ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {sendResult.message}
            </span>
          </div>
        )}
      </div>

      {/* 設定モーダル */}
      <LineWorksSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

export default LineWorksSendButton;
