/**
 * LINE WORKS送信ボタンコンポーネント
 *
 * @module components/lineworks/LineWorksSendButton
 * @description Webhook URLは環境変数/GitHub Secretsで管理。UI上の設定機能は不要。
 */

import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { NotificationType } from '../../types/lineworks';
import LineWorksPreviewModal from './LineWorksPreviewModal';

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
 * - クリックでプレビューモーダルを開く
 * - プレビューモーダルでメッセージ確認・コピー・送信
 */
const LineWorksSendButton: React.FC<LineWorksSendButtonProps> = ({
  type,
  buildMessage,
  label,
  disabled = false,
  size = 'sm',
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');

  // プレビューモーダルを開く
  const handlePreview = () => {
    const message = buildMessage();
    setPreviewMessage(message);
    setIsPreviewOpen(true);
  };

  // 他のボタン（PDF出力等）と同じサイズに統一
  const sizeClasses = size === 'sm'
    ? 'px-3 sm:px-4 py-2 text-sm gap-1.5'
    : 'px-3 sm:px-4 py-2 text-sm gap-2';

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-4 h-4';

  return (
    <>
      <button
        onClick={handlePreview}
        disabled={disabled}
        className={`flex items-center ${sizeClasses} rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        title="LINE WORKSプレビュー"
      >
        <Eye className={iconSize} />
        <span className="hidden sm:inline">{label || 'LINE WORKS'}</span>
        <span className="sm:hidden">LW</span>
      </button>

      {/* プレビューモーダル */}
      <LineWorksPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type={type}
        message={previewMessage}
      />
    </>
  );
};

export default LineWorksSendButton;
