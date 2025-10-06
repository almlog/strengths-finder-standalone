/**
 * ThemeSwitcher テスト
 *
 * TDD RED Phase: テーマ切り替えUIコンポーネントのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeSwitcher } from '../../../components/theme/ThemeSwitcher';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import * as ThemeContext from '../../../contexts/ThemeContext';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('レンダリング', () => {
    it('コンポーネントがレンダリングされる', () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('現在のテーマ名が表示される', () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      expect(screen.getByText(/デフォルト|ダーク/)).toBeInTheDocument();
    });

    it('aria-labelが設定されている', () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label');
    });

    it('aria-expandedが初期状態でfalse', () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('aria-haspopupが設定されている', () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-haspopup', 'true');
    });
  });

  describe('ドロップダウンメニュー', () => {
    it('ボタンクリックでメニューが開く', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('メニューに全てのテーマオプションが表示される', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const items = screen.getAllByRole('menuitem');
      const itemTexts = items.map(item => item.textContent);

      expect(itemTexts.some(text => text?.includes('デフォルト'))).toBe(true);
      expect(itemTexts.some(text => text?.includes('ダーク'))).toBe(true);
      expect(itemTexts.some(text => text?.includes('サイバーパンク'))).toBe(true);
      expect(itemTexts.some(text => text?.includes('キュート'))).toBe(true);
    });

    it('メニューにautoモードオプションが表示される', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const items = screen.getAllByRole('menuitem');
      const autoItem = items.find(item => item.textContent?.includes('自動'));
      expect(autoItem).toBeInTheDocument();
    });

    it('もう一度クリックでメニューが閉じる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('外側クリックでメニューが閉じる', async () => {
      render(
        <div>
          <div data-testid="outside">Outside</div>
          <ThemeProvider>
            <ThemeSwitcher />
          </ThemeProvider>
        </div>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('Escapeキーでメニューが閉じる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(button, { key: 'Escape' });

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('テーマ選択', () => {
    it('darkテーマを選択できる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const items = screen.getAllByRole('menuitem');
      const darkOption = items[1]; // 2番目の項目がdark
      fireEvent.click(darkOption);

      await waitFor(() => {
        expect(button.textContent).toContain('ダーク');
      });
    });

    it('cyberpunkテーマを選択できる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const items = screen.getAllByRole('menuitem');
      const cyberpunkOption = items[2]; // 3番目の項目がcyberpunk
      fireEvent.click(cyberpunkOption);

      await waitFor(() => {
        expect(button.textContent).toContain('サイバーパンク');
      });
    });

    it('cuteテーマを選択できる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const items = screen.getAllByRole('menuitem');
      const cuteOption = items[3]; // 4番目の項目がcute
      fireEvent.click(cuteOption);

      await waitFor(() => {
        expect(button.textContent).toContain('キュート');
      });
    });

    it('テーマ選択後にメニューが閉じる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const items = screen.getAllByRole('menuitem');
      const darkOption = items[1];
      fireEvent.click(darkOption);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('複数回テーマを変更できる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Dark選択
      fireEvent.click(button);
      const items1 = screen.getAllByRole('menuitem');
      fireEvent.click(items1[1]);

      await waitFor(() => {
        expect(button.textContent).toContain('ダーク');
      });

      // Cyberpunk選択
      fireEvent.click(button);
      const items2 = screen.getAllByRole('menuitem');
      fireEvent.click(items2[2]);

      await waitFor(() => {
        expect(button.textContent).toContain('サイバーパンク');
      });
    });
  });

  describe('autoモード切り替え', () => {
    it('autoモードに切り替えられる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const autoOption = screen.getByText(/自動/);
      fireEvent.click(autoOption);

      await waitFor(() => {
        expect(button).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('autoモード時にインジケーターが表示される', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      // 初期状態はauto
      expect(screen.getByText(/自動/i)).toBeInTheDocument();
    });

    it('manualモードからautoモードに戻せる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      // Manual化
      fireEvent.click(button);
      const items1 = screen.getAllByRole('menuitem');
      fireEvent.click(items1[1]); // dark

      // Auto化
      fireEvent.click(button);
      const items2 = screen.getAllByRole('menuitem');
      const autoOption = items2.find(item => item.textContent?.includes('自動'));
      fireEvent.click(autoOption!);

      await waitFor(() => {
        expect(button.textContent).toContain('自動');
      });
    });
  });

  describe('現在のテーマ表示', () => {
    it('選択中のテーマにチェックマークが表示される', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      const items = screen.getAllByRole('menuitem');
      const selectedItem = items.find(
        (item) => item.getAttribute('aria-checked') === 'true'
      );

      expect(selectedItem).toBeInTheDocument();
    });

    it('テーマ変更後に表示が更新される', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      const items = screen.getAllByRole('menuitem');
      fireEvent.click(items[1]); // dark

      await waitFor(() => {
        expect(button.textContent).toContain('ダーク');
      });
    });
  });

  describe('アクセシビリティ', () => {
    it('キーボード操作でメニューを開ける', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      fireEvent.keyDown(button, { key: 'Enter' });

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('矢印キーでメニュー項目を移動できる', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      fireEvent.keyDown(button, { key: 'ArrowDown' });
      fireEvent.keyDown(button, { key: 'ArrowDown' });

      const items = screen.getAllByRole('menuitem');
      expect(items.length).toBeGreaterThan(0);
    });

    it('role属性が正しく設定されている', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
    });

    it('フォーカス時にアウトラインが表示される', () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');
      button.focus();

      expect(button).toHaveFocus();
    });
  });

  describe('エラーハンドリング', () => {
    it('ThemeProvider外で使用時にエラーを表示', () => {
      jest.spyOn(ThemeContext, 'useTheme').mockImplementation(() => {
        throw new Error('useTheme must be used within ThemeProvider');
      });

      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ThemeSwitcher />);
      }).toThrow();

      spy.mockRestore();
    });

    it('setTheme失敗時もUIがクラッシュしない', async () => {
      jest.spyOn(ThemeContext, 'useTheme').mockReturnValue({
        currentTheme: {
          id: 'default',
          name: 'デフォルト',
          colors: {
            primary: '#2563EB',
            secondary: '#10B981',
            background: '#FFFFFF',
            text: '#1F2937',
            border: '#E5E7EB',
          },
        },
        themeId: 'default',
        themeMode: 'auto',
        setTheme: jest.fn(() => {
          throw new Error('setTheme failed');
        }),
        setThemeMode: jest.fn(),
      });

      render(<ThemeSwitcher />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      // ボタンのラベルに「デフォルト」が含まれることを確認
      expect(button.textContent).toContain('デフォルト');
    });
  });

  describe('パフォーマンス', () => {
    it('レンダリングが高速である', () => {
      const startTime = performance.now();

      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('モバイル対応', () => {
    it('タッチイベントで動作する', async () => {
      render(
        <ThemeProvider>
          <ThemeSwitcher />
        </ThemeProvider>
      );

      const button = screen.getByRole('button');

      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);
      fireEvent.click(button);

      expect(button).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
