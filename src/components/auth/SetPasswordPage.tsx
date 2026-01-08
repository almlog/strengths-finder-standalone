/**
 * SetPasswordPage Component
 *
 * パスワード設定画面
 * メールの登録リンクからアクセスしてパスワードを設定
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { auth } from '../../config/firebase';

const SetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // URLがEmail Linkかどうか確認
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // LocalStorageからメールアドレスを取得
      let savedEmail = window.localStorage.getItem('emailForSignIn');

      if (!savedEmail) {
        // ない場合は入力を求める
        savedEmail = window.prompt('確認のため、メールアドレスを入力してください');
      }

      if (savedEmail) {
        setEmail(savedEmail);
        setLoading(false);
      } else {
        setError('メールアドレスが確認できませんでした');
        setLoading(false);
      }
    } else {
      setError('無効なリンクです');
      setLoading(false);
    }
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProcessing(true);

    // パスワード検証
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      setProcessing(false);
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上にしてください');
      setProcessing(false);
      return;
    }

    try {
      // Email Linkでサインイン（一時的な認証）
      const result = await signInWithEmailLink(auth, email, window.location.href);

      // パスワード認証をリンク（永続的な認証に変換）
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(result.user, credential);

      // LocalStorageをクリア
      window.localStorage.removeItem('emailForSignIn');

      // 成功メッセージ
      alert('アカウントが作成されました！ログインしてください。');

      // サインアウトしてログイン画面へ
      await auth.signOut();
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-action-code') {
        setError('リンクが無効または期限切れです。再度登録フォームから送信してください。');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に登録されています');
      } else if (err.code === 'auth/expired-action-code') {
        setError('リンクの有効期限が切れています。再度登録フォームから送信してください。');
      } else if (err.code === 'auth/weak-password') {
        setError('パスワードが弱すぎます。より強力なパスワードを設定してください。');
      } else {
        setError('アカウント作成に失敗しました: ' + err.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md p-8 bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-red-700 dark:text-red-400">
            ❌ エラー
          </h2>
          <p className="mb-4">{error}</p>
          <Link
            to="/register"
            className="text-blue-500 hover:underline"
          >
            登録フォームへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-2 text-center">パスワード設定</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          アカウントのパスワードを設定してください
        </p>

        <form onSubmit={handleSetPassword}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">メールアドレス</label>
            <input
              type="email"
              value={email}
              className="w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
              disabled
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">パスワード（8文字以上）</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={processing}
              minLength={8}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              数字、英字を含む8文字以上を推奨
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">パスワード（確認）</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={processing}
              minLength={8}
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
            disabled={processing}
          >
            {processing ? 'アカウント作成中...' : 'アカウント作成'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordPage;
