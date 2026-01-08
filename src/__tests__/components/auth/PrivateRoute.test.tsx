/**
 * PrivateRoute テスト
 *
 * TDD: 認証必須ルートの保護コンポーネントテスト
 * - 未ログインユーザーのリダイレクト
 * - 管理者権限チェック
 * - 認証OKユーザーの表示許可
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PrivateRoute } from '../../../components/auth/PrivateRoute';
import * as useAuthModule from '../../../hooks/useAuth';

// Firebaseをモック（環境変数なしでもテスト実行可能にする）
jest.mock('../../../config/firebase', () => ({
  auth: {},
  app: {},
}));

// useAuthをモック
jest.mock('../../../hooks/useAuth');

const mockUseAuth = useAuthModule.useAuth as jest.MockedFunction<typeof useAuthModule.useAuth>;

// テスト用コンポーネント
const ProtectedContent = () => <div data-testid="protected-content">Protected Content</div>;
const LoginPage = () => <div data-testid="login-page">Login Page</div>;

// テスト用ラッパー
const renderWithRouter = (
  component: React.ReactNode,
  { route = '/' } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={component} />
        <Route path="/admin" element={component} />
      </Routes>
    </MemoryRouter>
  );
};

describe('PrivateRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ローディング状態', () => {
    it('loading中はスピナーを表示する', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        role: null,
        loading: true,
        isAuthenticated: false,
        isAdmin: false,
      });

      renderWithRouter(
        <PrivateRoute>
          <ProtectedContent />
        </PrivateRoute>
      );

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('未認証ユーザー', () => {
    it('未ログインの場合、ログイン画面にリダイレクトする', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        role: null,
        loading: false,
        isAuthenticated: false,
        isAdmin: false,
      });

      renderWithRouter(
        <PrivateRoute>
          <ProtectedContent />
        </PrivateRoute>
      );

      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('認証済みユーザー', () => {
    it('認証済みユーザーは保護されたコンテンツを表示する', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123' } as any,
        role: 'user',
        loading: false,
        isAuthenticated: true,
        isAdmin: false,
      });

      renderWithRouter(
        <PrivateRoute>
          <ProtectedContent />
        </PrivateRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('管理者も保護されたコンテンツを表示できる', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'admin-user-123' } as any,
        role: 'admin',
        loading: false,
        isAuthenticated: true,
        isAdmin: true,
      });

      renderWithRouter(
        <PrivateRoute>
          <ProtectedContent />
        </PrivateRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('管理者権限チェック', () => {
    it('requireAdmin=trueで管理者の場合、コンテンツを表示する', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'admin-user-123' } as any,
        role: 'admin',
        loading: false,
        isAuthenticated: true,
        isAdmin: true,
      });

      renderWithRouter(
        <PrivateRoute requireAdmin>
          <ProtectedContent />
        </PrivateRoute>,
        { route: '/admin' }
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('requireAdmin=trueで一般ユーザーの場合、アクセス拒否画面を表示する', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123' } as any,
        role: 'user',
        loading: false,
        isAuthenticated: true,
        isAdmin: false,
      });

      renderWithRouter(
        <PrivateRoute requireAdmin>
          <ProtectedContent />
        </PrivateRoute>,
        { route: '/admin' }
      );

      // テキストに絵文字が含まれているためsubstring matchで検索
expect(screen.getByText(/アクセス権限がありません/)).toBeInTheDocument();
      expect(screen.getByText('この機能は管理者のみ使用できます。')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('アクセス拒否画面にダッシュボードへのリンクがある', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123' } as any,
        role: 'user',
        loading: false,
        isAuthenticated: true,
        isAdmin: false,
      });

      renderWithRouter(
        <PrivateRoute requireAdmin>
          <ProtectedContent />
        </PrivateRoute>,
        { route: '/admin' }
      );

      const link = screen.getByText('ダッシュボードへ戻る');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/');
    });

    it('requireAdmin=falseの場合は権限チェックしない', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123' } as any,
        role: 'user',
        loading: false,
        isAuthenticated: true,
        isAdmin: false,
      });

      renderWithRouter(
        <PrivateRoute requireAdmin={false}>
          <ProtectedContent />
        </PrivateRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('デフォルト動作', () => {
    it('requireAdminのデフォルト値はfalse', () => {
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user-123' } as any,
        role: 'user',
        loading: false,
        isAuthenticated: true,
        isAdmin: false,
      });

      // requireAdminを指定しない
      renderWithRouter(
        <PrivateRoute>
          <ProtectedContent />
        </PrivateRoute>
      );

      // 一般ユーザーでもコンテンツが表示される
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});
