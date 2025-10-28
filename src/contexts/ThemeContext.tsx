/**
 * テーマコンテキスト
 *
 * @module ThemeContext
 * @description アプリ全体のテーマ状態を管理するReact Context
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  ThemeContextType,
  ThemeId,
  ThemeMode,
  ThemeSettings,
  isValidThemeId,
  isValidThemeMode,
} from '../models/ThemeTypes';
import {
  getActiveTheme,
  getOSPreferredTheme,
  loadThemeSettings,
  saveThemeSettings,
  THEMES,
} from '../services/ThemeService';

/**
 * テーマコンテキスト
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

/**
 * ThemeProviderのProps
 */
interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * テーマプロバイダー
 *
 * アプリ全体をラップして、テーマ機能を提供する
 *
 * @param {ThemeProviderProps} props - children
 * @returns {JSX.Element} ThemeProvider
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // LocalStorageから設定を読み込み
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      return loadThemeSettings();
    } catch (error) {
      console.error('Failed to load theme settings:', error);
      return {
        mode: 'auto',
        selectedTheme: 'default',
        version: '1.0.0',
      };
    }
  });

  // 現在のテーマIDを計算
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(() => {
    try {
      const theme = getActiveTheme(settings);
      return theme.id;
    } catch (error) {
      console.error('Failed to get active theme:', error);
      return 'default';
    }
  });

  /**
   * テーマを変更
   *
   * @param {ThemeId} themeId - 新しいテーマID
   */
  const setTheme = (themeId: ThemeId): void => {
    try {
      // バリデーション
      if (!isValidThemeId(themeId)) {
        console.warn(`Invalid theme ID: ${themeId}, falling back to default`);
        themeId = 'default';
      }

      // 設定を更新（manualモードに変更）
      const newSettings: ThemeSettings = {
        mode: 'manual',
        selectedTheme: themeId,
        version: '1.0.0',
      };

      setSettings(newSettings);
      setCurrentThemeId(themeId);

      // LocalStorageに保存
      saveThemeSettings(newSettings);
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  };

  /**
   * テーマモードを変更
   *
   * @param {ThemeMode} mode - 新しいテーマモード
   */
  const setThemeMode = (mode: ThemeMode): void => {
    try {
      // バリデーション
      if (!isValidThemeMode(mode)) {
        console.warn(`Invalid theme mode: ${mode}, falling back to auto`);
        mode = 'auto';
      }

      // autoモードの場合、OS設定に基づくテーマIDを取得
      let newThemeId = settings.selectedTheme;
      if (mode === 'auto') {
        const osTheme = getOSPreferredTheme();
        newThemeId = osTheme;
      }

      // 設定を更新
      const newSettings: ThemeSettings = {
        mode,
        selectedTheme: newThemeId,
        version: '1.0.0',
      };

      setSettings(newSettings);
      setCurrentThemeId(newThemeId);

      // LocalStorageに保存
      saveThemeSettings(newSettings);
    } catch (error) {
      console.error('Failed to set theme mode:', error);
    }
  };

  /**
   * OS設定の変更を監視
   */
  useEffect(() => {
    // autoモードでない場合は監視しない
    if (settings.mode !== 'auto') {
      return;
    }

    try {
      // matchMedia未対応環境チェック
      if (
        typeof window === 'undefined' ||
        !window.matchMedia ||
        typeof window.matchMedia !== 'function'
      ) {
        return;
      }

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // イベントハンドラー
      const handleChange = (e: MediaQueryListEvent | MediaQueryList): void => {
        try {
          // イベントオブジェクトの妥当性チェック
          if (!e || typeof e.matches === 'undefined') {
            return;
          }

          // settingsを参照せず、直接stateを更新
          setSettings((currentSettings) => {
            // autoモードのみ反応
            if (currentSettings.mode !== 'auto') {
              return currentSettings;
            }

            const newThemeId = e.matches ? 'dark' : 'default';
            setCurrentThemeId(newThemeId);

            const newSettings: ThemeSettings = {
              mode: 'auto',
              selectedTheme: newThemeId,
              version: '1.0.0',
            };

            saveThemeSettings(newSettings);
            return newSettings;
          });
        } catch (error) {
          console.error('Failed to handle OS theme change:', error);
        }
      };

      // イベントリスナー登録
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else if ((mediaQuery as any).addListener) {
        // 古いブラウザ対応
        (mediaQuery as any).addListener(handleChange);
      }

      // クリーンアップ
      return () => {
        try {
          if (mediaQuery.removeEventListener) {
            mediaQuery.removeEventListener('change', handleChange);
          } else if ((mediaQuery as any).removeListener) {
            (mediaQuery as any).removeListener(handleChange);
          }
        } catch (error) {
          console.error('Failed to cleanup OS theme listener:', error);
        }
      };
    } catch (error) {
      console.error('Failed to setup OS theme monitoring:', error);
      return undefined;
    }
  }, [settings.mode]);

  /**
   * CSS変数とdarkクラスを更新
   */
  useEffect(() => {
    try {
      // document.documentElement存在チェック
      if (!document.documentElement) {
        return;
      }

      // 現在のテーマを取得
      const theme = THEMES[currentThemeId] || THEMES.default;

      // CSS変数を設定
      const root = document.documentElement;
      root.style.setProperty('--theme-primary', theme.colors.primary);
      root.style.setProperty('--theme-secondary', theme.colors.secondary);
      root.style.setProperty('--theme-background', theme.colors.background);
      root.style.setProperty('--theme-text', theme.colors.text);
      root.style.setProperty('--theme-border', theme.colors.border);

      // Tailwind用: テーマクラスの追加/削除
      root.classList.remove('dark', 'cyberpunk', 'cute');

      // テーマごとのクラス設定
      if (currentThemeId === 'dark') {
        // ダークテーマのみdarkクラスを追加
        root.classList.add('dark');
      } else if (currentThemeId === 'cyberpunk') {
        // cyberpunkは独自クラスのみ（darkクラスは追加しない）
        root.classList.add('cyberpunk');
      } else if (currentThemeId === 'cute') {
        // cuteは独自クラスのみ
        root.classList.add('cute');
      }
    } catch (error) {
      console.error('Failed to update CSS variables:', error);
    }
  }, [currentThemeId]);

  // Context値
  const contextValue: ThemeContextType = {
    currentTheme: THEMES[currentThemeId] || THEMES.default,
    themeId: currentThemeId,
    themeMode: settings.mode,
    setTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useThemeカスタムフック
 *
 * ThemeContextを使用するためのフック
 *
 * @returns {ThemeContextType} テーマコンテキスト
 * @throws {Error} ThemeProvider外で使用された場合
 *
 * @example
 * ```tsx
 * const { currentTheme, setTheme } = useTheme();
 * ```
 */
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};
