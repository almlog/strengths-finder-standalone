/**
 * SetPasswordPage テスト
 *
 * Bug Fix: linkWithCredential 失敗時に updatePassword でフォールバック
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Firebase Auth モック — jest.mock はホイスティングされるため直接定義
const mockSignInWithEmailLink = jest.fn();
const mockLinkWithCredential = jest.fn();
const mockUpdatePassword = jest.fn();
const mockCredential = jest.fn();
const mockSignOut = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock('../../../config/firebase', () => ({
  auth: { signOut: () => mockSignOut() },
}));

jest.mock('firebase/auth', () => {
  return {
    isSignInWithEmailLink: () => true,
    signInWithEmailLink: (...args: unknown[]) => mockSignInWithEmailLink(...args),
    linkWithCredential: (...args: unknown[]) => mockLinkWithCredential(...args),
    updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
    EmailAuthProvider: {
      credential: (...args: unknown[]) => mockCredential(...args),
    },
  };
});

// window.alert モック
const originalAlert = window.alert;
const mockAlert = jest.fn();

import SetPasswordPage from '../../../components/auth/SetPasswordPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <SetPasswordPage />
    </MemoryRouter>
  );
}

const mockUser = { uid: 'test-uid', email: 'test@altx.co.jp' };

describe('SetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = mockAlert;
    // localStorage にメールアドレスを設定
    window.localStorage.setItem('emailForSignIn', 'test@altx.co.jp');
    mockSignInWithEmailLink.mockResolvedValue({ user: mockUser });
    mockLinkWithCredential.mockResolvedValue({});
    mockUpdatePassword.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue(undefined);
    mockCredential.mockReturnValue({ providerId: 'password' });
  });

  afterEach(() => {
    window.alert = originalAlert;
    window.localStorage.removeItem('emailForSignIn');
  });

  it('正常系: linkWithCredential 成功でアカウント作成', async () => {
    renderPage();

    const passwordInputs = await screen.findAllByDisplayValue('');
    // パスワード入力フィールドを特定（type="password"）
    const passwordFields = passwordInputs.filter(
      (el) => el.getAttribute('type') === 'password'
    );
    fireEvent.change(passwordFields[0], { target: { value: 'Test1234!' } });
    fireEvent.change(passwordFields[1], { target: { value: 'Test1234!' } });
    fireEvent.click(screen.getByText('アカウント作成'));

    await waitFor(() => {
      expect(mockSignInWithEmailLink).toHaveBeenCalled();
      expect(mockLinkWithCredential).toHaveBeenCalled();
      expect(mockUpdatePassword).not.toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith('アカウントが作成されました！ログインしてください。');
    });
  });

  it('バグ修正: linkWithCredential が provider-already-linked で失敗 → updatePassword でフォールバック', async () => {
    mockLinkWithCredential.mockRejectedValue({ code: 'auth/provider-already-linked' });

    renderPage();

    const passwordFields = (await screen.findAllByDisplayValue('')).filter(
      (el) => el.getAttribute('type') === 'password'
    );
    fireEvent.change(passwordFields[0], { target: { value: 'Test1234!' } });
    fireEvent.change(passwordFields[1], { target: { value: 'Test1234!' } });
    fireEvent.click(screen.getByText('アカウント作成'));

    await waitFor(() => {
      expect(mockLinkWithCredential).toHaveBeenCalled();
      expect(mockUpdatePassword).toHaveBeenCalledWith(mockUser, 'Test1234!');
      expect(mockAlert).toHaveBeenCalledWith('アカウントが作成されました！ログインしてください。');
    });
  });

  it('バグ修正: linkWithCredential が credential-already-in-use で失敗 → updatePassword でフォールバック', async () => {
    mockLinkWithCredential.mockRejectedValue({ code: 'auth/credential-already-in-use' });

    renderPage();

    const passwordFields = (await screen.findAllByDisplayValue('')).filter(
      (el) => el.getAttribute('type') === 'password'
    );
    fireEvent.change(passwordFields[0], { target: { value: 'Test1234!' } });
    fireEvent.change(passwordFields[1], { target: { value: 'Test1234!' } });
    fireEvent.click(screen.getByText('アカウント作成'));

    await waitFor(() => {
      expect(mockLinkWithCredential).toHaveBeenCalled();
      expect(mockUpdatePassword).toHaveBeenCalledWith(mockUser, 'Test1234!');
      expect(mockAlert).toHaveBeenCalledWith('アカウントが作成されました！ログインしてください。');
    });
  });

  it('linkWithCredential がその他のエラーで失敗 → エラー表示', async () => {
    mockLinkWithCredential.mockRejectedValue({
      code: 'auth/invalid-action-code',
      message: 'The action code is invalid.',
    });

    renderPage();

    const passwordFields = (await screen.findAllByDisplayValue('')).filter(
      (el) => el.getAttribute('type') === 'password'
    );
    fireEvent.change(passwordFields[0], { target: { value: 'Test1234!' } });
    fireEvent.change(passwordFields[1], { target: { value: 'Test1234!' } });
    fireEvent.click(screen.getByText('アカウント作成'));

    await waitFor(() => {
      expect(mockUpdatePassword).not.toHaveBeenCalled();
      expect(screen.getByText(/リンクが無効または期限切れです/)).toBeInTheDocument();
    });
  });
});
