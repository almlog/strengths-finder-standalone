/**
 * useAuth Hook
 *
 * Firebase Authenticationの認証状態を管理するカスタムフック
 * ユーザーのログイン状態、ロール（admin/user）を提供
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

export type UserRole = 'admin' | 'user' | null;

export interface AuthState {
  user: User | null;
  role: UserRole;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * 認証状態を管理するフック
 *
 * @returns {AuthState} 認証状態オブジェクト
 *
 * @example
 * const { user, role, isAuthenticated, isAdmin, loading } = useAuth();
 *
 * if (loading) return <div>Loading...</div>;
 * if (!isAuthenticated) return <Navigate to="/login" />;
 * if (isAdmin) return <AdminDashboard />;
 */
// ローカル開発用: 管理者メールアドレスリスト
// 本番環境ではカスタムクレームで管理
const LOCAL_ADMIN_EMAILS = ['suzuki.shunpei@altx.co.jp'];

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Firebase認証状態の監視
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // カスタムクレーム（ロール情報）を取得
          const idTokenResult = await firebaseUser.getIdTokenResult();
          let userRole = (idTokenResult.claims.role as UserRole) || 'user';

          // ローカル開発環境では、特定のメールアドレスを管理者として認識
          if (
            process.env.REACT_APP_USE_EMULATOR === 'true' &&
            firebaseUser.email &&
            LOCAL_ADMIN_EMAILS.includes(firebaseUser.email)
          ) {
            userRole = 'admin';
            console.log('🔧 ローカル開発モード: 管理者権限を付与');
          }

          setUser(firebaseUser);
          setRole(userRole);
        } catch (error) {
          console.error('Error fetching user role:', error);
          setUser(firebaseUser);
          setRole('user'); // デフォルトはuser
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    // クリーンアップ
    return () => unsubscribe();
  }, []);

  return {
    user,
    role,
    loading,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
  };
};
