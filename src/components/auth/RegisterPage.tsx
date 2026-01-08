/**
 * RegisterPage Component
 *
 * アカウント登録画面
 * メールアドレスを入力し、登録リンクを送信
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { isAllowedDomain, getAllowedDomainsString } from '../../utils/auth/domainValidator';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // ドメイン確認
    if (!isAllowedDomain(email)) {
      setError(`${getAllowedDomainsString()} のメールアドレスのみ登録できます`);
      setLoading(false);
      return;
    }

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/strengths-finder-standalone/set-password`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      // メールアドレスをLocalStorageに保存（後で使用）
      window.localStorage.setItem('emailForSignIn', email);

      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-email') {
        setError('無効なメールアドレスです');
      } else if (err.code === 'auth/missing-android-pkg-name') {
        setError('設定エラー: Android package名が設定されていません');
      } else if (err.code === 'auth/missing-ios-bundle-id') {
        setError('設定エラー: iOS bundle IDが設定されていません');
      } else {
        setError('登録リンクの送信に失敗しました');
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
            ✅ 登録リンクを送信しました
          </h2>
          <p className="mb-4">
            <strong>{email}</strong> に登録リンクを送信しました。
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            メールに記載されたリンクをクリックして、パスワードを設定してください。
            <br />
            <br />
            <strong>リンクの有効期限: 24時間</strong>
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2 text-center">アカウント登録</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          メールアドレスを入力して登録リンクを受け取ってください
        </p>

        <form onSubmit={handleRegister}>
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
            {loading ? '送信中...' : '登録リンクを送信'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-blue-500 hover:underline">
            既にアカウントをお持ちの方
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
