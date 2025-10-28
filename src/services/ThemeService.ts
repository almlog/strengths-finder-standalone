/**
 * テーマサービス
 *
 * @module ThemeService
 * @description テーマの取得、保存、OS設定検出を行うサービス
 */

import {
  Theme,
  ThemeId,
  ThemeSettings,
  DEFAULT_THEME_SETTINGS,
  isValidThemeSettings,
  isValidThemeId,
} from '../models/ThemeTypes';

/**
 * LocalStorageのキー
 */
export const STORAGE_KEY = 'strengths-finder-theme-settings';

/**
 * テーマ定義
 *
 * 全てのテーマの定義を保持
 */
export const THEMES: Record<ThemeId, Theme> = {
  default: {
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
  dark: {
    id: 'dark',
    name: 'ダーク',
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      background: '#1F2937',
      text: '#F9FAFB',
      border: '#374151',
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'サイバー',
    colors: {
      primary: '#00F0FF',      // ネオンシアン
      secondary: '#FF006E',    // ネオンピンク
      background: '#0d1117',   // 深い黒
      text: '#E6E6FA',         // ラベンダーホワイト
      border: '#00F0FF',       // ネオンシアン
    },
  },
  cute: {
    id: 'cute',
    name: 'かわいい',
    colors: {
      primary: '#FF6B9D',      // ピンク
      secondary: '#FFA07A',    // ライトサーモン
      background: '#FFF5F7',   // 柔らかいピンクホワイト
      text: '#5D4E6D',         // ソフトパープル
      border: '#FFB6C1',       // ライトピンク
    },
  },
};

/**
 * OS設定に基づく推奨テーマを取得
 *
 * @returns {ThemeId} OS設定に基づくテーマID ('default' | 'dark')
 *
 * @example
 * ```typescript
 * const osTheme = getOSPreferredTheme();
 * console.log(osTheme); // 'dark' or 'default'
 * ```
 */
export const getOSPreferredTheme = (): 'default' | 'dark' => {
  try {
    // SSR環境対応
    if (typeof window === 'undefined') {
      return 'default';
    }

    // matchMedia未対応ブラウザ対応
    if (!window.matchMedia) {
      return 'default';
    }

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // matchesがundefinedの場合の対応
    if (darkModeQuery.matches === undefined) {
      return 'default';
    }

    return darkModeQuery.matches ? 'dark' : 'default';
  } catch (error) {
    // エラー時はデフォルトテーマを返す
    console.warn('Failed to detect OS theme preference:', error);
    return 'default';
  }
};

/**
 * アクティブなテーマを取得
 *
 * ThemeSettingsに基づいて、現在適用すべきテーマを決定する
 *
 * @param {ThemeSettings} settings - テーマ設定
 * @returns {Theme} 適用すべきテーマオブジェクト
 *
 * @example
 * ```typescript
 * const settings = { mode: 'auto', selectedTheme: 'default', version: '1.0.0' };
 * const theme = getActiveTheme(settings);
 * console.log(theme.id); // OS設定に基づき 'default' or 'dark'
 * ```
 */
export const getActiveTheme = (settings: ThemeSettings): Theme => {
  try {
    // 設定が不正な場合はデフォルト
    if (!isValidThemeSettings(settings)) {
      return THEMES.default;
    }

    // autoモードの場合はOS設定に従う
    if (settings.mode === 'auto') {
      const osTheme = getOSPreferredTheme();
      return THEMES[osTheme];
    }

    // manualモードの場合は選択されたテーマを返す
    if (settings.mode === 'manual') {
      const themeId = settings.selectedTheme;

      // 不正なテーマIDの場合はデフォルト
      if (!isValidThemeId(themeId)) {
        return THEMES.default;
      }

      return THEMES[themeId];
    }

    // 想定外のmodeの場合はデフォルト
    return THEMES.default;
  } catch (error) {
    console.error('Failed to get active theme:', error);
    return THEMES.default;
  }
};

/**
 * テーマ設定をLocalStorageに保存
 *
 * @param {ThemeSettings} settings - 保存するテーマ設定
 *
 * @example
 * ```typescript
 * const settings = { mode: 'manual', selectedTheme: 'dark', version: '1.0.0' };
 * saveThemeSettings(settings);
 * ```
 */
export const saveThemeSettings = (settings: ThemeSettings): void => {
  try {
    // LocalStorage使用可否チェック
    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn('LocalStorage is not available');
      return;
    }

    // JSON文字列化して保存
    const json = JSON.stringify(settings);
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch (error) {
    // QuotaExceededErrorなどをキャッチ
    if (error instanceof DOMException) {
      console.error('Failed to save theme settings (QuotaExceeded):', error);
    } else {
      console.error('Failed to save theme settings:', error);
    }
  }
};

/**
 * テーマ設定をLocalStorageから読み込み
 *
 * データがない場合や破損している場合はデフォルト設定を返す
 *
 * @returns {ThemeSettings} 読み込んだテーマ設定
 *
 * @example
 * ```typescript
 * const settings = loadThemeSettings();
 * console.log(settings.mode); // 'auto' or 'manual'
 * ```
 */
export const loadThemeSettings = (): ThemeSettings => {
  try {
    // LocalStorage使用可否チェック
    if (typeof window === 'undefined' || !window.localStorage) {
      return DEFAULT_THEME_SETTINGS;
    }

    // データ取得
    const json = window.localStorage.getItem(STORAGE_KEY);

    // データがない場合はデフォルト
    if (!json) {
      return DEFAULT_THEME_SETTINGS;
    }

    // JSONパース
    const data = JSON.parse(json);

    // バリデーション
    if (!isValidThemeSettings(data)) {
      console.warn('Invalid theme settings in LocalStorage, using defaults');
      return DEFAULT_THEME_SETTINGS;
    }

    return data;
  } catch (error) {
    // JSON.parseエラーなどをキャッチ
    console.error('Failed to load theme settings:', error);
    return DEFAULT_THEME_SETTINGS;
  }
};
