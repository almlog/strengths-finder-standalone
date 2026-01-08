/**
 * useAuth Hook テスト
 *
 * TDD: 認証状態管理フックのテスト
 * - 認証状態の管理
 * - ロール判定
 * - ローカル開発環境での管理者判定
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth, UserRole } from '../../hooks/useAuth';

// Firebase モック
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

// onAuthStateChanged のモック
const mockUnsubscribeFn = jest.fn();
const mockOnAuthStateChanged = jest.fn(() => mockUnsubscribeFn);
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth: any, callback: any) => {
    return mockOnAuthStateChanged(auth, callback);
  },
  User: {},
}));

describe('useAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('初期状態', () => {
    it('loading が true で開始する', () => {
      mockOnAuthStateChanged.mockImplementation(() => jest.fn());

      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.role).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('未認証状態', () => {
    it('ユーザーがいない場合、未認証状態になる', async () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        // 非同期でコールバックを呼ぶ
        setTimeout(() => callback(null), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.role).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('認証済み状態', () => {
    it('ユーザーがいる場合、認証済み状態になる', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'user@example.com',
        getIdTokenResult: jest.fn().mockResolvedValue({
          claims: { role: 'user' },
        }),
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBe(mockUser);
      expect(result.current.role).toBe('user');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isAdmin).toBe(false);
    });

    it('管理者ロールを持つユーザーは isAdmin が true になる', async () => {
      const mockUser = {
        uid: 'admin-uid',
        email: 'admin@example.com',
        getIdTokenResult: jest.fn().mockResolvedValue({
          claims: { role: 'admin' },
        }),
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe('admin');
      expect(result.current.isAdmin).toBe(true);
    });
  });

  describe('ローカル開発環境での管理者判定', () => {
    it('Emulator環境で LOCAL_ADMIN_EMAILS に含まれるメールは管理者になる', async () => {
      process.env.REACT_APP_USE_EMULATOR = 'true';

      const mockUser = {
        uid: 'local-admin-uid',
        email: 'suzuki.shunpei@altx.co.jp', // LOCAL_ADMIN_EMAILS に含まれる
        getIdTokenResult: jest.fn().mockResolvedValue({
          claims: {}, // roleクレームなし
        }),
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe('admin');
      expect(result.current.isAdmin).toBe(true);
    });

    it('Emulator環境でも LOCAL_ADMIN_EMAILS に含まれないメールは一般ユーザー', async () => {
      process.env.REACT_APP_USE_EMULATOR = 'true';

      const mockUser = {
        uid: 'local-user-uid',
        email: 'other@altx.co.jp', // LOCAL_ADMIN_EMAILS に含まれない
        getIdTokenResult: jest.fn().mockResolvedValue({
          claims: {},
        }),
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.role).toBe('user');
      expect(result.current.isAdmin).toBe(false);
    });

    it('本番環境では LOCAL_ADMIN_EMAILS は無視される', async () => {
      process.env.REACT_APP_USE_EMULATOR = 'false';

      const mockUser = {
        uid: 'prod-uid',
        email: 'suzuki.shunpei@altx.co.jp', // LOCAL_ADMIN_EMAILS に含まれるが無視される
        getIdTokenResult: jest.fn().mockResolvedValue({
          claims: {}, // roleクレームなし
        }),
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return jest.fn();
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // 本番環境ではカスタムクレームのみで判定
      expect(result.current.role).toBe('user');
      expect(result.current.isAdmin).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('getIdTokenResult でエラーが発生してもクラッシュしない', async () => {
      const mockUser = {
        uid: 'error-uid',
        email: 'error@example.com',
        getIdTokenResult: jest.fn().mockRejectedValue(new Error('Token error')),
      };

      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        setTimeout(() => callback(mockUser), 0);
        return jest.fn();
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // エラー時はデフォルトの 'user' ロールになる
      expect(result.current.user).toBe(mockUser);
      expect(result.current.role).toBe('user');
      expect(result.current.isAuthenticated).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にunsubscribeが呼ばれる', () => {
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        return mockUnsubscribeFn;
      });

      const { unmount } = renderHook(() => useAuth());

      unmount();

      expect(mockUnsubscribeFn).toHaveBeenCalled();
    });
  });
});
