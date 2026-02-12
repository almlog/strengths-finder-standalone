/**
 * LINE WORKS Webhook設定モーダル（複数Webhook対応）
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
  Star,
  Plus,
} from 'lucide-react';
import { LineWorksService } from '../../services/LineWorksService';
import {
  LineWorksWebhookEntry,
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
 * LINE WORKS設定モーダル（複数Webhook対応）
 */
const LineWorksSettingsModal: React.FC<LineWorksSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [webhooks, setWebhooks] = useState<LineWorksWebhookEntry[]>([]);
  const [defaultWebhookId, setDefaultWebhookId] = useState<string | undefined>();
  const [history, setHistory] = useState<LineWorksSendHistory[]>([]);
  const [sendingWebhookId, setSendingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 新規追加フォーム
  const [newRoomName, setNewRoomName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  // 初期化
  useEffect(() => {
    if (isOpen) {
      // マイグレーション実行（旧形式→新形式）
      LineWorksService.migrateConfig();

      const loadedWebhooks = LineWorksService.getWebhooks();
      const loadedDefault = LineWorksService.getDefaultWebhook();
      setWebhooks(loadedWebhooks);
      setDefaultWebhookId(loadedDefault?.id);
      setHistory(LineWorksService.getHistory());
      setTestResult(null);
      setNewRoomName('');
      setNewWebhookUrl('');
    }
  }, [isOpen]);

  // Webhook追加
  const handleAddWebhook = () => {
    if (!newRoomName.trim()) {
      setTestResult({ success: false, message: 'ルーム名を入力してください' });
      return;
    }

    if (!newWebhookUrl.trim()) {
      setTestResult({ success: false, message: 'Webhook URLを入力してください' });
      return;
    }

    if (!newWebhookUrl.startsWith('https://')) {
      setTestResult({ success: false, message: 'URLはhttps://で始まる必要があります' });
      return;
    }

    LineWorksService.addWebhook(newRoomName.trim(), newWebhookUrl.trim());
    setWebhooks(LineWorksService.getWebhooks());
    setDefaultWebhookId(LineWorksService.getDefaultWebhook()?.id);
    setNewRoomName('');
    setNewWebhookUrl('');
    setTestResult({ success: true, message: 'ルームを追加しました' });
  };

  // Webhook削除
  const handleRemoveWebhook = (webhookId: string) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (!webhook) return;

    if (window.confirm(`「${webhook.roomName}」を削除しますか？`)) {
      LineWorksService.removeWebhook(webhookId);
      setWebhooks(LineWorksService.getWebhooks());
      setDefaultWebhookId(LineWorksService.getDefaultWebhook()?.id);
      setTestResult({ success: true, message: 'ルームを削除しました' });
    }
  };

  // デフォルト設定
  const handleSetDefault = (webhookId: string) => {
    LineWorksService.setDefaultWebhook(webhookId);
    setDefaultWebhookId(webhookId);
    setTestResult({ success: true, message: 'デフォルトルームを変更しました' });
  };

  // テスト送信
  const handleTestSend = async (webhookId: string) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (!webhook) return;

    setSendingWebhookId(webhookId);
    setTestResult(null);

    const result = await LineWorksService.send(
      'custom',
      `[テスト] メンバープロファイル分析からのテスト送信です\n送信先: ${webhook.roomName}\n送信日時: ${new Date().toLocaleString('ja-JP')}`,
      webhookId
    );

    setSendingWebhookId(null);
    setTestResult({
      success: result.success,
      message: result.success ? `「${webhook.roomName}」へのテスト送信に成功しました` : `送信失敗: ${result.error}`,
    });

    // 履歴とWebhook情報を更新
    setHistory(LineWorksService.getHistory());
    setWebhooks(LineWorksService.getWebhooks());
  };

  // 全設定クリア
  const handleClearAll = () => {
    if (window.confirm('全てのWebhook設定をクリアしますか？')) {
      LineWorksService.clearConfig();
      setWebhooks([]);
      setDefaultWebhookId(undefined);
      setTestResult({ success: true, message: '全ての設定をクリアしました' });
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
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
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

          {/* 登録済みルーム一覧 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              登録済みルーム
            </h3>

            {webhooks.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                ルームが登録されていません。下のフォームから追加してください。
              </p>
            ) : (
              <div className="space-y-2">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSetDefault(webhook.id)}
                          className={`p-1 rounded transition-colors ${
                            webhook.id === defaultWebhookId
                              ? 'text-yellow-500'
                              : 'text-gray-400 hover:text-yellow-500'
                          }`}
                          title={webhook.id === defaultWebhookId ? 'デフォルト' : 'デフォルトに設定'}
                        >
                          <Star className={`w-4 h-4 ${webhook.id === defaultWebhookId ? 'fill-current' : ''}`} />
                        </button>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {webhook.roomName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTestSend(webhook.id)}
                          disabled={sendingWebhookId === webhook.id}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                        >
                          {sendingWebhookId === webhook.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          テスト
                        </button>
                        <button
                          onClick={() => handleRemoveWebhook(webhook.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {webhook.webhookUrl}
                    </p>
                    {webhook.lastSentAt && (
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        最終送信: {new Date(webhook.lastSentAt).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 新規追加フォーム */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              新規ルーム追加
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="ルーム名（例: リーダー専用）"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="url"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                placeholder="Webhook URL（https://...）"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddWebhook}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                追加
              </button>
            </div>
          </div>

          {/* 設定クリア */}
          {webhooks.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                全ての設定をクリア
              </button>
            </div>
          )}

          {/* 送信履歴 */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
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
                        {entry.roomName && (
                          <span className="text-gray-500 dark:text-gray-400">
                            → {entry.roomName}
                          </span>
                        )}
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
