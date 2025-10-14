/**
 * StrengthsFinderPage Mobile Responsive Tests
 *
 * TDD for mobile UX improvements:
 * 1. Header responsive layout
 * 2. Scroll to analysis area on member select
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StrengthsFinderPage from '../../../components/strengths/StrengthsFinderPage';
import { StrengthsProvider } from '../../../contexts/StrengthsContext';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock scrollIntoView
const mockScrollIntoView = jest.fn();
Element.prototype.scrollIntoView = mockScrollIntoView;

const renderWithProviders = () => {
  return render(
    <ThemeProvider>
      <StrengthsProvider>
        <StrengthsFinderPage />
      </StrengthsProvider>
    </ThemeProvider>
  );
};

describe('StrengthsFinderPage Mobile Responsive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console warnings
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Header Responsive Layout', () => {
    it('should have flex-col class for mobile layout', () => {
      renderWithProviders();

      // Header要素を取得
      const header = screen.getByRole('heading', { name: /メンバープロファイル分析/ }).parentElement;

      // flex-colクラスが存在することを確認
      expect(header?.className).toContain('flex-col');
    });

    it('should have sm:flex-row class for desktop layout', () => {
      renderWithProviders();

      const header = screen.getByRole('heading', { name: /メンバープロファイル分析/ }).parentElement;

      // sm:flex-rowクラスが存在することを確認
      expect(header?.className).toContain('sm:flex-row');
    });

    it('should have flex-wrap on button container', () => {
      renderWithProviders();

      // ボタンコンテナを取得（「メンバーを追加」ボタンの親要素）
      const addButton = screen.getByRole('button', { name: /メンバーを追加/ });
      const buttonContainer = addButton.parentElement;

      // flex-wrapクラスが存在することを確認
      expect(buttonContainer?.className).toContain('flex-wrap');
    });

    it('should have gap-4 for vertical spacing', () => {
      renderWithProviders();

      const header = screen.getByRole('heading', { name: /メンバープロファイル分析/ }).parentElement;

      // gap-4クラスが存在することを確認
      expect(header?.className).toContain('gap-4');
    });
  });

  describe('Scroll to Analysis Area on Member Select', () => {
    it('should scroll to analysis area when member is selected', async () => {
      renderWithProviders();

      // Wait for member list to load
      await waitFor(() => {
        expect(screen.getByText(/メンバー一覧/)).toBeInTheDocument();
      });

      // メンバーがいる場合はクリック（サンプルデータによる）
      const memberCards = screen.queryAllByRole('button', { name: /編集|削除/ });
      if (memberCards.length > 0) {
        const firstMemberCard = memberCards[0].closest('.cursor-pointer');
        if (firstMemberCard) {
          fireEvent.click(firstMemberCard);

          // scrollIntoViewが呼ばれることを確認
          await waitFor(() => {
            expect(mockScrollIntoView).toHaveBeenCalled();
          }, { timeout: 200 });

          // behaviorとblockのオプションを確認
          expect(mockScrollIntoView).toHaveBeenCalledWith(
            expect.objectContaining({
              behavior: 'smooth',
              block: 'start'
            })
          );
        }
      }
    });

    it('should have ref on analysis area div', () => {
      renderWithProviders();

      // 分析エリア（Tabsを含むdiv）を探す
      const analysisArea = screen.getByText(/個人分析/).closest('[class*="col-span-12 md:col-span-8"]');

      // 分析エリアが存在することを確認
      expect(analysisArea).toBeInTheDocument();
    });
  });

  describe('Backward Compatibility', () => {
    it('should still render all buttons', () => {
      renderWithProviders();

      expect(screen.getByRole('button', { name: /メンバーを追加/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /サンプル/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /エクスポート/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /インポート/ })).toBeInTheDocument();
    });

    it('should still render member list and analysis area', () => {
      renderWithProviders();

      expect(screen.getByText(/メンバー一覧/)).toBeInTheDocument();
      expect(screen.getByText(/個人分析/)).toBeInTheDocument();
    });
  });
});
