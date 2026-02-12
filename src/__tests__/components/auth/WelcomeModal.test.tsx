/**
 * WelcomeModal Component Tests
 *
 * 初回ログイン説明モーダルのテスト
 * TDD: RED phase - テストを先に書く
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WelcomeModal from '../../../components/auth/WelcomeModal';
import { STORAGE_KEYS } from '../../../constants/storage';

describe('WelcomeModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <MemoryRouter>
        <WelcomeModal isOpen={isOpen} onClose={mockOnClose} />
      </MemoryRouter>
    );
  };

  describe('表示/非表示', () => {
    it('isOpen=true のとき表示される', () => {
      renderModal(true);
      expect(screen.getByText('メンバープロファイル分析ツール')).toBeInTheDocument();
    });

    it('isOpen=false のとき表示されない', () => {
      renderModal(false);
      expect(screen.queryByText('メンバープロファイル分析ツール')).not.toBeInTheDocument();
    });

    it('Xボタンで閉じる', () => {
      renderModal(true);
      const closeButton = screen.getByLabelText('閉じる');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('オーバーレイクリックで閉じる', () => {
      renderModal(true);
      const overlay = screen.getByTestId('welcome-overlay');
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('モーダル内部クリックではオーバーレイ経由で閉じない', () => {
      renderModal(true);
      const modal = screen.getByTestId('welcome-modal-content');
      fireEvent.click(modal);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('ステップ遷移', () => {
    it('初期表示はステップ1（ようこそ）', () => {
      renderModal(true);
      expect(screen.getByText('メンバープロファイル分析ツール')).toBeInTheDocument();
      expect(screen.getByText(/StrengthsFinder/)).toBeInTheDocument();
    });

    it('「次へ」ボタンでステップ2に遷移', () => {
      renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('できること')).toBeInTheDocument();
    });

    it('ステップ2で「次へ」ボタンでステップ3に遷移', () => {
      renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('はじめかた')).toBeInTheDocument();
    });

    it('ステップ2で「戻る」ボタンでステップ1に戻る', () => {
      renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('戻る'));
      expect(screen.getByText('メンバープロファイル分析ツール')).toBeInTheDocument();
    });

    it('ステップ3で「戻る」ボタンでステップ2に戻る', () => {
      renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('戻る'));
      expect(screen.getByText('できること')).toBeInTheDocument();
    });

    it('ステップ3で「はじめる」ボタンで閉じる', () => {
      renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('はじめる'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ステップインジケーター', () => {
    it('3つのステップインジケーターが表示される', () => {
      renderModal(true);
      const indicators = screen.getAllByTestId(/^step-indicator-/);
      expect(indicators).toHaveLength(3);
    });
  });

  describe('localStorage', () => {
    it('閉じるときに localStorage に表示済みフラグを保存', () => {
      renderModal(true);
      fireEvent.click(screen.getByLabelText('閉じる'));
      expect(localStorage.getItem(STORAGE_KEYS.WELCOME_SHOWN)).toBe('true');
    });

    it('「はじめる」ボタンで閉じても localStorage に保存', () => {
      renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('はじめる'));
      expect(localStorage.getItem(STORAGE_KEYS.WELCOME_SHOWN)).toBe('true');
    });

    it('オーバーレイクリックで閉じても localStorage に保存', () => {
      renderModal(true);
      const overlay = screen.getByTestId('welcome-overlay');
      fireEvent.click(overlay);
      expect(localStorage.getItem(STORAGE_KEYS.WELCOME_SHOWN)).toBe('true');
    });
  });

  describe('Step 2: 機能紹介', () => {
    it('5つの機能カードが表示される', () => {
      renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText('個人分析')).toBeInTheDocument();
      expect(screen.getByText('チーム分析')).toBeInTheDocument();
      expect(screen.getByText('チームシミュレーション')).toBeInTheDocument();
      expect(screen.getByText('勤怠分析')).toBeInTheDocument();
      expect(screen.getByText('資質分析')).toBeInTheDocument();
    });
  });

  describe('Step 3: はじめかた', () => {
    it('3つの手順が表示される', () => {
      renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('次へ'));
      expect(screen.getByText(/会社メールアドレスを登録/)).toBeInTheDocument();
      expect(screen.getByText(/確認メールのリンクからパスワード/)).toBeInTheDocument();
      expect(screen.getByText(/詳しい使い方を確認/)).toBeInTheDocument();
    });
  });

  describe('再表示時の動作', () => {
    it('再表示時はステップ1から始まる', () => {
      const { unmount } = renderModal(true);
      fireEvent.click(screen.getByText('次へ'));
      fireEvent.click(screen.getByText('次へ'));
      unmount();

      renderModal(true);
      expect(screen.getByText('メンバープロファイル分析ツール')).toBeInTheDocument();
    });
  });
});
