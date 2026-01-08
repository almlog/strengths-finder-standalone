/**
 * PrivateRoute Component
 *
 * 認証が必要なルートを保護するコンポーネント
 * 未ログインユーザーをログイン画面にリダイレクト
 * 管理者権限が必要な場合はロールもチェック
 */

import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  // 認証状態の読み込み中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-xl text-gray-700 dark:text-gray-300">読み込み中...</div>
        </div>
      </div>
    );
  }

  // 未ログインの場合、ログイン画面へリダイレクト
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 管理者権限が必要だが、管理者でない場合
  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md p-8 bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-700 dark:text-red-400">
            ❌ アクセス権限がありません
          </h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            この機能は管理者のみ使用できます。
          </p>
          <Link
            to="/"
            className="text-blue-500 hover:underline"
          >
            ダッシュボードへ戻る
          </Link>
        </div>
      </div>
    );
  }

  // 認証OKの場合、子コンポーネントを表示
  return <>{children}</>;
};
