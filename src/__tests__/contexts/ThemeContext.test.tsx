/**
 * ThemeContext テスト
 *
 * TDD RED Phase: ThemeContextの全機能をテスト
 * 65テストケース（初期化、状態管理、OS監視、CSS変数、エラーハンドリング）
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  ThemeProvider,
  useTheme,
  ThemeContext,
} from '../../contexts/ThemeContext';
import * as ThemeService from '../../services/ThemeService';
import { ThemeSettings } from '../../models/ThemeTypes';

describe('ThemeContext', () => {
  // モック
  let mockMatchMedia: jest.Mock;
  let mockLocalStorage: any;

  beforeEach(() => {
    // LocalStorageモック
    let store: Record<string, string> = {};
    mockLocalStorage = {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });

    // matchMediaモック
    mockMatchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    });

    // コンソールスパイ
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('初期化', () => {
    it('ThemeProviderがレンダリングできる', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current).toBeDefined();
    });

    it('初期状態がデフォルトテーマである', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.themeId).toBe('default');
      expect(result.current.currentTheme.id).toBe('default');
    });

    it('初期状態がautoモードである', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.themeMode).toBe('auto');
    });

    it('LocalStorageに保存された設定を読み込む', () => {
      const savedSettings: ThemeSettings = {
        mode: 'manual',
        selectedTheme: 'dark',
        version: '1.0.0',
      };

      jest
        .spyOn(ThemeService, 'loadThemeSettings')
        .mockReturnValue(savedSettings);

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.themeId).toBe('dark');
      expect(result.current.themeMode).toBe('manual');
    });

    it('OS設定がdarkの場合、autoモードでdarkテーマを適用', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.themeId).toBe('dark');
    });

    it('useThemeがProvider外で使用された場合エラーをスロー', () => {
      // エラーを抑制
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within ThemeProvider');

      spy.mockRestore();
    });

    it('currentThemeが正しいテーマオブジェクトを返す', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.currentTheme).toHaveProperty('id');
      expect(result.current.currentTheme).toHaveProperty('name');
      expect(result.current.currentTheme).toHaveProperty('colors');
      expect(result.current.currentTheme.colors).toHaveProperty('primary');
    });

    it('初期化時にCSS変数が設定される', () => {
      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-primary')).toBeTruthy();
    });
  });

  describe('setTheme機能', () => {
    it('setThemeでテーマを変更できる', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.themeId).toBe('dark');
    });

    it('setTheme実行時にLocalStorageに保存される', () => {
      const saveSpy = jest.spyOn(ThemeService, 'saveThemeSettings');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(saveSpy).toHaveBeenCalled();
    });

    it('setTheme実行時にCSS変数が更新される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const initialPrimary =
        document.documentElement.style.getPropertyValue('--theme-primary');

      act(() => {
        result.current.setTheme('dark');
      });

      const updatedPrimary =
        document.documentElement.style.getPropertyValue('--theme-primary');

      expect(updatedPrimary).not.toBe(initialPrimary);
    });

    it('cyberpunkテーマに変更できる', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('cyberpunk');
      });

      expect(result.current.themeId).toBe('cyberpunk');
      expect(result.current.currentTheme.name).toBe('サイバーパンク');
    });

    it('cuteテーマに変更できる', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('cute');
      });

      expect(result.current.themeId).toBe('cute');
      expect(result.current.currentTheme.name).toBe('キュート');
    });

    it('不正なテーマIDの場合defaultにフォールバック', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('invalid' as any);
      });

      expect(result.current.themeId).toBe('default');
    });

    it('同じテーマIDを設定しても動作する', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.themeId).toBe('dark');
    });

    it('テーマ変更が複数回実行できる', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });
      expect(result.current.themeId).toBe('dark');

      act(() => {
        result.current.setTheme('cyberpunk');
      });
      expect(result.current.themeId).toBe('cyberpunk');

      act(() => {
        result.current.setTheme('default');
      });
      expect(result.current.themeId).toBe('default');
    });

    it('setTheme実行時にmodeがmanualに変更される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.themeMode).toBe('auto');

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.themeMode).toBe('manual');
    });

    it('setTheme後もcurrentThemeが正しく更新される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.currentTheme.id).toBe('dark');
      expect(result.current.currentTheme.colors.background).toBe('#1F2937');
    });
  });

  describe('setThemeMode機能', () => {
    it('setThemeModeでautoモードに変更できる', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark'); // manual化
      });

      act(() => {
        result.current.setThemeMode('auto');
      });

      expect(result.current.themeMode).toBe('auto');
    });

    it('setThemeModeでmanualモードに変更できる', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setThemeMode('manual');
      });

      expect(result.current.themeMode).toBe('manual');
    });

    it('autoモードに変更するとOS設定に従う', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('cute'); // manual化
      });

      act(() => {
        result.current.setThemeMode('auto'); // OS設定に戻す
      });

      expect(result.current.themeId).toBe('dark'); // OS=dark
    });

    it('setThemeMode実行時にLocalStorageに保存される', () => {
      const saveSpy = jest.spyOn(ThemeService, 'saveThemeSettings');

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setThemeMode('manual');
      });

      expect(saveSpy).toHaveBeenCalled();
    });

    it('不正なmodeの場合autoにフォールバック', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setThemeMode('invalid' as any);
      });

      expect(result.current.themeMode).toBe('auto');
    });

    it('同じmodeを設定しても動作する', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setThemeMode('auto');
      });

      act(() => {
        result.current.setThemeMode('auto');
      });

      expect(result.current.themeMode).toBe('auto');
    });

    it('mode変更が複数回実行できる', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setThemeMode('manual');
      });
      expect(result.current.themeMode).toBe('manual');

      act(() => {
        result.current.setThemeMode('auto');
      });
      expect(result.current.themeMode).toBe('auto');
    });

    it('manualモードではOS変更を無視する', () => {
      const listeners: Array<(e: any) => void> = [];
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn((event, handler) => {
          listeners.push(handler);
        }),
        removeEventListener: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('cute'); // manual化
      });

      // OS設定変更をシミュレート
      act(() => {
        listeners.forEach((listener) =>
          listener({ matches: true } as MediaQueryListEvent)
        );
      });

      expect(result.current.themeId).toBe('cute'); // 変更されない
    });
  });

  describe('OS設定監視', () => {
    it('autoモード時にOS設定変更を検出する', async () => {
      const listeners: Array<(e: any) => void> = [];
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn((event, handler) => {
          listeners.push(handler);
        }),
        removeEventListener: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.themeId).toBe('default');

      // OS設定をdarkに変更
      act(() => {
        listeners.forEach((listener) =>
          listener({ matches: true } as MediaQueryListEvent)
        );
      });

      await waitFor(() => {
        expect(result.current.themeId).toBe('dark');
      });
    });

    it('OS設定がlightに変更されたらdefaultテーマに切り替わる', async () => {
      const listeners: Array<(e: any) => void> = [];
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: jest.fn((event, handler) => {
          listeners.push(handler);
        }),
        removeEventListener: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.themeId).toBe('dark');

      // OS設定をlightに変更
      act(() => {
        listeners.forEach((listener) =>
          listener({ matches: false } as MediaQueryListEvent)
        );
      });

      await waitFor(() => {
        expect(result.current.themeId).toBe('default');
      });
    });

    it('matchMedia.addEventListenerが呼ばれる', () => {
      const addEventListenerSpy = jest.fn();
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: addEventListenerSpy,
        removeEventListener: jest.fn(),
      }));

      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('アンマウント時にeventListenerがクリーンアップされる', () => {
      const removeEventListenerSpy = jest.fn();
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: removeEventListenerSpy,
      }));

      const { unmount } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'change',
        expect.any(Function)
      );
    });

    it('matchMediaが存在しない環境でもエラーにならない', () => {
      (window as any).matchMedia = undefined;

      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ThemeProvider,
        });
      }).not.toThrow();
    });

    it('matchMedia.addEventListenerがない環境でもエラーにならない', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ThemeProvider,
        });
      }).not.toThrow();
    });

    it('OS設定変更が複数回発生しても対応できる', async () => {
      const listeners: Array<(e: any) => void> = [];
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn((event, handler) => {
          listeners.push(handler);
        }),
        removeEventListener: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // Dark
      act(() => {
        listeners.forEach((listener) => listener({ matches: true } as any));
      });
      await waitFor(() => expect(result.current.themeId).toBe('dark'));

      // Light
      act(() => {
        listeners.forEach((listener) => listener({ matches: false } as any));
      });
      await waitFor(() => expect(result.current.themeId).toBe('default'));

      // Dark again
      act(() => {
        listeners.forEach((listener) => listener({ matches: true } as any));
      });
      await waitFor(() => expect(result.current.themeId).toBe('dark'));
    });

    it('autoモードに戻すとOS監視が再開される', async () => {
      const listeners: Array<(e: any) => void> = [];
      mockMatchMedia.mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: jest.fn((event, handler) => {
          listeners.push(handler);
        }),
        removeEventListener: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // Manual化
      act(() => {
        result.current.setTheme('cute');
      });

      // Auto化（OS=dark）
      act(() => {
        result.current.setThemeMode('auto');
      });

      expect(result.current.themeId).toBe('dark');
    });

    it('OS監視中に例外が発生してもクラッシュしない', () => {
      const listeners: Array<(e: any) => void> = [];
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn((event, handler) => {
          listeners.push(handler);
        }),
        removeEventListener: jest.fn(),
      }));

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(() => {
        act(() => {
          listeners.forEach((listener) => listener(null as any)); // 不正なイベント
        });
      }).not.toThrow();
    });

    it('複数のThemeProviderが独立して動作する', () => {
      const { result: result1 } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const { result: result2 } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result1.current.setTheme('dark');
      });

      // result2は影響を受けない（別のProvider）
      expect(result2.current.themeId).toBe('default');
    });
  });

  describe('CSS変数更新', () => {
    it('初期化時に全てのCSS変数が設定される', () => {
      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-primary')).toBeTruthy();
      expect(root.style.getPropertyValue('--theme-secondary')).toBeTruthy();
      expect(root.style.getPropertyValue('--theme-background')).toBeTruthy();
      expect(root.style.getPropertyValue('--theme-text')).toBeTruthy();
      expect(root.style.getPropertyValue('--theme-border')).toBeTruthy();
    });

    it('テーマ変更時にCSS変数が更新される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;
      const beforePrimary = root.style.getPropertyValue('--theme-primary');

      act(() => {
        result.current.setTheme('dark');
      });

      const afterPrimary = root.style.getPropertyValue('--theme-primary');
      expect(afterPrimary).not.toBe(beforePrimary);
      expect(afterPrimary).toBe('#3B82F6'); // darkテーマのprimary
    });

    it('defaultテーマのCSS変数が正しく設定される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('default');
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-primary')).toBe('#2563EB');
      expect(root.style.getPropertyValue('--theme-background')).toBe('#FFFFFF');
    });

    it('darkテーマのCSS変数が正しく設定される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('dark');
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-primary')).toBe('#3B82F6');
      expect(root.style.getPropertyValue('--theme-background')).toBe('#1F2937');
    });

    it('cyberpunkテーマのCSS変数が正しく設定される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('cyberpunk');
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-primary')).toBe('#FF00FF');
      expect(root.style.getPropertyValue('--theme-background')).toBe('#0A0E27');
    });

    it('cuteテーマのCSS変数が正しく設定される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      act(() => {
        result.current.setTheme('cute');
      });

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-primary')).toBe('#FF69B4');
      expect(root.style.getPropertyValue('--theme-background')).toBe('#FFF0F5');
    });

    it('CSS変数更新が高速に実行される', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const startTime = performance.now();

      act(() => {
        result.current.setTheme('dark');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 100ms以内
    });

    it('複数回のテーマ変更でCSS変数が正しく更新され続ける', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;

      act(() => {
        result.current.setTheme('dark');
      });
      expect(root.style.getPropertyValue('--theme-primary')).toBe('#3B82F6');

      act(() => {
        result.current.setTheme('cyberpunk');
      });
      expect(root.style.getPropertyValue('--theme-primary')).toBe('#FF00FF');

      act(() => {
        result.current.setTheme('default');
      });
      expect(root.style.getPropertyValue('--theme-primary')).toBe('#2563EB');
    });

    it('document.documentElementがnullでもエラーにならない', () => {
      const originalDocumentElement = document.documentElement;
      Object.defineProperty(document, 'documentElement', {
        value: null,
        writable: true,
        configurable: true,
      });

      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ThemeProvider,
        });
      }).not.toThrow();

      Object.defineProperty(document, 'documentElement', {
        value: originalDocumentElement,
        writable: true,
        configurable: true,
      });
    });

    it('CSS変数名が仕様通りである', () => {
      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;
      const cssVars = [
        '--theme-primary',
        '--theme-secondary',
        '--theme-background',
        '--theme-text',
        '--theme-border',
      ];

      cssVars.forEach((varName) => {
        expect(root.style.getPropertyValue(varName)).toBeTruthy();
      });
    });

    it('CSS変数の値がカラーコード形式である', () => {
      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;
      const primary = root.style.getPropertyValue('--theme-primary');

      // #RRGGBB形式
      expect(primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('OS設定変更時にもCSS変数が更新される', async () => {
      const listeners: Array<(e: any) => void> = [];
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn((event, handler) => {
          listeners.push(handler);
        }),
        removeEventListener: jest.fn(),
      }));

      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;
      const beforePrimary = root.style.getPropertyValue('--theme-primary');

      act(() => {
        listeners.forEach((listener) => listener({ matches: true } as any));
      });

      await waitFor(() => {
        const afterPrimary = root.style.getPropertyValue('--theme-primary');
        expect(afterPrimary).not.toBe(beforePrimary);
      });
    });

    it('setPropertyが失敗してもクラッシュしない', () => {
      const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
      CSSStyleDeclaration.prototype.setProperty = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('setProperty error');
        });

      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ThemeProvider,
        });
      }).not.toThrow();

      CSSStyleDeclaration.prototype.setProperty = originalSetProperty;
    });

    it('アンマウント後もCSS変数が残る', () => {
      const { unmount } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;
      const primary = root.style.getPropertyValue('--theme-primary');

      unmount();

      expect(root.style.getPropertyValue('--theme-primary')).toBe(primary);
    });

    it('複数のコンポーネントが同じCSS変数を共有する', () => {
      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const root = document.documentElement;
      const primary1 = root.style.getPropertyValue('--theme-primary');

      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const primary2 = root.style.getPropertyValue('--theme-primary');

      expect(primary1).toBe(primary2);
    });
  });

  describe('エラーハンドリング', () => {
    it('LocalStorage保存失敗時もクラッシュしない', () => {
      jest
        .spyOn(ThemeService, 'saveThemeSettings')
        .mockImplementation(() => {
          throw new Error('Save failed');
        });

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(() => {
        act(() => {
          result.current.setTheme('dark');
        });
      }).not.toThrow();
    });

    it('LocalStorage読み込み失敗時もクラッシュしない', () => {
      jest
        .spyOn(ThemeService, 'loadThemeSettings')
        .mockImplementation(() => {
          throw new Error('Load failed');
        });

      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ThemeProvider,
        });
      }).not.toThrow();
    });

    it('不正なテーマデータでもフォールバックする', () => {
      jest.spyOn(ThemeService, 'getActiveTheme').mockReturnValue(null as any);

      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(result.current.currentTheme).toBeDefined();
    });

    it('setState実行中の例外をキャッチする', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      // 無効なテーマIDで例外が発生する可能性をテスト
      expect(() => {
        act(() => {
          result.current.setTheme(undefined as any);
        });
      }).not.toThrow();
    });

    it('useEffect内の例外でレンダリングが停止しない', () => {
      mockMatchMedia.mockImplementation(() => {
        throw new Error('matchMedia error');
      });

      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ThemeProvider,
        });
      }).not.toThrow();
    });

    it('children=nullでもレンダリングできる', () => {
      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ({ children }) => (
            <ThemeProvider>{null}</ThemeProvider>
          ),
        });
      }).not.toThrow();
    });

    it('children=undefinedでもレンダリングできる', () => {
      expect(() => {
        renderHook(() => useTheme(), {
          wrapper: ({ children }) => (
            <ThemeProvider>{undefined}</ThemeProvider>
          ),
        });
      }).not.toThrow();
    });

    it('極端に高速なテーマ変更でも動作する', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      expect(() => {
        act(() => {
          for (let i = 0; i < 100; i++) {
            result.current.setTheme(i % 2 === 0 ? 'dark' : 'default');
          }
        });
      }).not.toThrow();

      expect(result.current.themeId).toBeDefined();
    });
  });

  describe('パフォーマンス', () => {
    it('初期化が高速である（100ms以内）', () => {
      const startTime = performance.now();

      renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('setTheme実行が高速である（50ms以内）', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const startTime = performance.now();

      act(() => {
        result.current.setTheme('dark');
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50);
    });

    it('100回のテーマ変更が1秒以内に完了する', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.setTheme(i % 2 === 0 ? 'dark' : 'default');
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('メモリリークがない（アンマウント後にクリーンアップされる）', () => {
      const removeEventListenerSpy = jest.fn();
      mockMatchMedia.mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: removeEventListenerSpy,
      }));

      const { unmount } = renderHook(() => useTheme(), {
        wrapper: ThemeProvider,
      });

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});
