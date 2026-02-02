/**
 * LINE WORKS Webhook設定モーダル
 *
 * @module components/lineworks/LineWorksSettingsModal
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { LineWorksService } from '../../services/LineWorksService';
import {
  LineWorksConfig,
  LineWorksSendHistory,
  NOTIFICATION_TYPE_LABELS,
} from '../../types/lineworks';

interface LineWorksSettingsModalProps {
  /** モーダルが開いているか */
  isOpen: boolean;
  /** 閉じるコールバック */
  onClose: () => void;
}

/**
 * LINE WORKS設定モーダル
 */
const LineWorksSettingsModal: React.FC<LineWorksSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [config, setConfig] = useState<LineWorksConfig | null>(null);
  const [history, setHistory] = useState<LineWorksSendHistory[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 初期化
  useEffect(() => {
    if (isOpen) {
      const savedConfig = LineWorksService.getConfig();
      setConfig(savedConfig);
      setWebhookUrl(savedConfig?.webhookUrl || '');
      setHistory(LineWorksService.getHistory());
      setTestResult(null);
    }
  }, [isOpen]);

  // 設定保存
  const handleSave = () => {
    if (!webhookUrl.trim()) {
      setTestResult({ success: false, message: 'Webhook URLを入力してください' });
      return;
    }

    // URL形式の簡易チェック
    if (!webhookUrl.startsWith('https://')) {
      setTestResult({ success: false, message: 'URLはhttps://で始まる必要があります' });
      return;
    }

    LineWorksService.setConfig(webhookUrl.trim());
    setConfig(LineWorksService.getConfig());
    setTestResult({ success: true, message: '設定を保存しました' });
  };

  // テスト送信
  const handleTestSend = async () => {
    if (!webhookUrl.trim()) {
      setTestResult({ success: false, message: 'Webhook URLを入力してください' });
      return;
    }

    // 一時的に設定を保存してテスト
    LineWorksService.setConfig(webhookUrl.trim());

    setIsSending(true);
    setTestResult(null);

    const result = await LineWorksService.send(
      'custom',
      `[テスト] メンバープロファイル分析からのテスト送信です\n送信日時: ${new Date().toLocaleString('ja-JP')}`
    );

    setIsSending(false);
    setTestResult({
      success: result.success,
      message: result.success ? 'テスト送信に成功しました' : `送信失敗: ${result.error}`,
    });

    // 履歴を更新
    setHistory(LineWorksService.getHistory());
    setConfig(LineWorksService.getConfig());
  };

  // 設定クリア
  const handleClear = () => {
    if (window.confirm('Webhook設定をクリアしますか？')) {
      LineWorksService.clearConfig();
      setConfig(null);
      setWebhookUrl('');
      setTestResult({ success: true, message: '設定をクリアしました' });
    }
  };

  // 履歴クリア
  const handleClearHistory = () => {
    if (window.confirm('送信履歴をクリアしますか？')) {
      LineWorksService.clearHistory();
      setHistory([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            LINE WORKS連携設定
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Webhook URL入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Webhook URL
            </label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              LINE WORKSのBot Webhook URLを入力してください
            </p>
          </div>

          {/* 結果表示 */}
          {testResult && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}

          {/* ボタン群 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-4 h-4" />
              保存
            </button>
            <button
              onClick={handleTestSend}
              disabled={isSending}
              className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isSending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              テスト送信
            </button>
            <button
              onClick={handleClear}
              disabled={!config}
              className="flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              クリア
            </button>
          </div>

          {/* 現在の設定状態 */}
          {config && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                現在の設定
              </h3>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  設定日時:{' '}
                  {new Date(config.configuredAt).toLocaleString('ja-JP')}
                </p>
                {config.lastSentAt && (
                  <p>
                    最終送信:{' '}
                    {new Date(config.lastSentAt).toLocaleString('ja-JP')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 送信履歴 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                送信履歴
              </h3>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  履歴をクリア
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                送信履歴はありません
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.slice(0, 10).map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-2 rounded-lg text-xs ${
                      entry.success
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {entry.success ? (
                          <CheckCircle className="w-3 h-3 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span className="text-gray-700 dark:text-gray-300">
                          {NOTIFICATION_TYPE_LABELS[entry.type]}
                        </span>
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {new Date(entry.sentAt).toLocaleString('ja-JP', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {entry.error && (
                      <p className="mt-1 text-red-600 dark:text-red-400">
                        {entry.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default LineWorksSettingsModal;
