/**
 * PasswordResetPage Component
 *
 * パスワードリセット画面
 * メールアドレスを入力してパスワードリセットメールを送信
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { isAllowedDomain, getAllowedDomainsString } from '../../utils/auth/domainValidator';

const PasswordResetPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ドメイン確認
    if (!isAllowedDomain(email)) {
      setError(`${getAllowedDomainsString()} のメールアドレスのみリセットできます`);
      setLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);

      // セキュリティ対策: ユーザーが存在するかどうかは明かさない
      if (err.code === 'auth/user-not-found') {
        // ユーザーが見つからなくても成功メッセージを表示
        setSuccess(true);
      } else if (err.code === 'auth/invalid-email') {
        setError('無効なメールアドレスです');
      } else if (err.code === 'auth/too-many-requests') {
        setError('リクエストが多すぎます。しばらく待ってから再試行してください');
      } else {
        setError('パスワードリセットメールの送信に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full p-8 bg-green-50 dark:bg-green-900/20 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-green-700 dark:text-green-400">
            リセットメールを送信しました
          </h2>
          <p className="mb-4">
            <strong>{email}</strong> にパスワードリセットメールを送信しました。
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            メールに記載されたリンクをクリックして、新しいパスワードを設定してください。
            <br />
            <br />
            <strong>リンクの有効期限: 1時間</strong>
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </div>
          <Link
            to="/login"
            className="block text-center py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2 text-center">パスワードリセット</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          登録済みのメールアドレスを入力してください
        </p>

        <form onSubmit={handlePasswordReset}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              メールアドレス（@{getAllowedDomainsString()}）
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`name@${getAllowedDomainsString()}`}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            disabled={loading}
          >
            {loading ? '送信中...' : 'リセットメールを送信'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-blue-500 hover:underline">
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PasswordResetPage;
