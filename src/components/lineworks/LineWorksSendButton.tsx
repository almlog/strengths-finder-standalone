/**
 * LINE WORKS送信ボタンコンポーネント
 *
 * @module components/lineworks/LineWorksSendButton
 */

import React, { useState } from 'react';
import { Eye, Settings } from 'lucide-react';
import { LineWorksService } from '../../services/LineWorksService';
import { NotificationType } from '../../types/lineworks';
import LineWorksSettingsModal from './LineWorksSettingsModal';
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
 * - 設定ボタンで設定モーダルを開く
 */
const LineWorksSendButton: React.FC<LineWorksSendButtonProps> = ({
  type,
  buildMessage,
  label,
  disabled = false,
  size = 'sm',
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');

  const isConfigured = LineWorksService.isConfigured();

  // プレビューモーダルを開く
  const handlePreview = () => {
    const message = buildMessage();
    setPreviewMessage(message);
    setIsPreviewOpen(true);
  };

  // 設定ボタンクリック
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSettingsOpen(true);
  };

  // 他のボタン（PDF出力等）と同じサイズに統一
  const sizeClasses = size === 'sm'
    ? 'px-3 sm:px-4 py-2 text-sm gap-1.5'
    : 'px-3 sm:px-4 py-2 text-sm gap-2';

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-4 h-4';

  return (
    <>
      <div className="relative inline-flex items-center">
        {/* メインボタン（プレビュー表示） */}
        <button
          onClick={handlePreview}
          disabled={disabled}
          className={`flex items-center ${sizeClasses} rounded-lg transition-colors ${
            isConfigured
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50`}
          title="LINE WORKSプレビュー"
        >
          <Eye className={iconSize} />
          <span className="hidden sm:inline">{label || 'LINE WORKS'}</span>
          <span className="sm:hidden">LW</span>
        </button>

        {/* 設定ボタン */}
        <button
          onClick={handleSettingsClick}
          className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          title="LINE WORKS設定"
        >
          <Settings className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} text-gray-500 dark:text-gray-400`} />
        </button>
      </div>

      {/* プレビューモーダル */}
      <LineWorksPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        type={type}
        message={previewMessage}
      />

      {/* 設定モーダル */}
      <LineWorksSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};

export default LineWorksSendButton;
