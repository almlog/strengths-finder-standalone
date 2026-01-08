/**
 * PasswordResetPage Component Tests
 *
 * パスワードリセット画面のテスト
 * TDD: RED phase - テストを先に書く
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PasswordResetPage from '../../../components/auth/PasswordResetPage';

// Firebase モック
jest.mock('../../../config/firebase', () => ({
  auth: {},
}));

// Firebase Auth モック
const mockSendPasswordResetEmail = jest.fn();
jest.mock('firebase/auth', () => ({
  sendPasswordResetEmail: (...args: any[]) => mockSendPasswordResetEmail(...args),
}));

// domainValidator モック
jest.mock('../../../utils/auth/domainValidator', () => ({
  isAllowedDomain: (email: string) => email.endsWith('@altx.co.jp'),
  getAllowedDomainsString: () => 'altx.co.jp',
}));

describe('PasswordResetPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <PasswordResetPage />
      </MemoryRouter>
    );
  };

  describe('初期表示', () => {
    it('パスワードリセット画面が表示される', () => {
      renderComponent();

      expect(screen.getByText('パスワードリセット')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/name@altx.co.jp/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'リセットメールを送信' })).toBeInTheDocument();
    });

    it('ログイン画面へのリンクが表示される', () => {
      renderComponent();

      expect(screen.getByText('ログイン画面に戻る')).toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    it('許可されていないドメインのメールアドレスでエラーが表示される', async () => {
      renderComponent();

      const emailInput = screen.getByPlaceholderText(/name@altx.co.jp/);
      const submitButton = screen.getByRole('button', { name: 'リセットメールを送信' });

      fireEvent.change(emailInput, { target: { value: 'test@gmail.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/altx.co.jp のメールアドレスのみ/)).toBeInTheDocument();
      });

      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('パスワードリセットメール送信', () => {
    it('有効なメールアドレスでリセットメールが送信される', async () => {
      mockSendPasswordResetEmail.mockResolvedValueOnce(undefined);
      renderComponent();

      const emailInput = screen.getByPlaceholderText(/name@altx.co.jp/);
      const submitButton = screen.getByRole('button', { name: 'リセットメールを送信' });

      fireEvent.change(emailInput, { target: { value: 'test@altx.co.jp' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
          expect.anything(),
          'test@altx.co.jp'
        );
      });

      // 成功メッセージが表示される（h2タグを検索）
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /リセットメールを送信しました/ })).toBeInTheDocument();
      });
    });

    it('送信中はボタンが無効化される', async () => {
      mockSendPasswordResetEmail.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderComponent();

      const emailInput = screen.getByPlaceholderText(/name@altx.co.jp/);
      const submitButton = screen.getByRole('button', { name: 'リセットメールを送信' });

      fireEvent.change(emailInput, { target: { value: 'test@altx.co.jp' } });
      fireEvent.click(submitButton);

      expect(screen.getByRole('button', { name: '送信中...' })).toBeDisabled();
    });
  });

  describe('エラーハンドリング', () => {
    it('ユーザーが見つからない場合でも成功メッセージを表示（セキュリティ対策）', async () => {
      // セキュリティ上、ユーザーが存在するかどうかは明かさない
      mockSendPasswordResetEmail.mockRejectedValueOnce({
        code: 'auth/user-not-found',
      });
      renderComponent();

      const emailInput = screen.getByPlaceholderText(/name@altx.co.jp/);
      const submitButton = screen.getByRole('button', { name: 'リセットメールを送信' });

      fireEvent.change(emailInput, { target: { value: 'unknown@altx.co.jp' } });
      fireEvent.click(submitButton);

      // セキュリティ上、成功メッセージを表示（h2タグを検索）
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /リセットメールを送信しました/ })).toBeInTheDocument();
      });
    });

    it('無効なメールアドレスでエラーが表示される', async () => {
      mockSendPasswordResetEmail.mockRejectedValueOnce({
        code: 'auth/invalid-email',
      });
      renderComponent();

      const emailInput = screen.getByPlaceholderText(/name@altx.co.jp/);
      const submitButton = screen.getByRole('button', { name: 'リセットメールを送信' });

      fireEvent.change(emailInput, { target: { value: 'invalid@altx.co.jp' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('無効なメールアドレスです')).toBeInTheDocument();
      });
    });

    it('リクエスト過多でエラーが表示される', async () => {
      mockSendPasswordResetEmail.mockRejectedValueOnce({
        code: 'auth/too-many-requests',
      });
      renderComponent();

      const emailInput = screen.getByPlaceholderText(/name@altx.co.jp/);
      const submitButton = screen.getByRole('button', { name: 'リセットメールを送信' });

      fireEvent.change(emailInput, { target: { value: 'test@altx.co.jp' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/しばらく待ってから再試行/)).toBeInTheDocument();
      });
    });
  });
});
