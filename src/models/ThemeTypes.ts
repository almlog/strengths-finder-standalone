/**
 * カラーテーマ機能 型定義
 *
 * @module ThemeTypes
 * @description テーマシステムで使用する全ての型定義とバリデーション関数
 */

/**
 * テーマモード
 *
 * - `auto`: OS設定に基づいて自動的にテーマを選択
 * - `manual`: ユーザーが手動でテーマを選択
 */
export type ThemeMode = 'auto' | 'manual';

/**
 * テーマID
 *
 * - `default`: デフォルトテーマ（ライトモード）
 * - `dark`: ダークテーマ
 * - `cyberpunk`: サイバーパンクテーマ（Phase 3で実装）
 * - `cute`: キュートテーマ（Phase 3で実装）
 */
export type ThemeId = 'default' | 'dark' | 'cyberpunk' | 'cute';

/**
 * テーマ設定
 *
 * LocalStorageに保存される設定情報
 *
 * @property {ThemeMode} mode - テーマモード（auto/manual）
 * @property {ThemeId} selectedTheme - 選択されたテーマID
 * @property {string} version - 設定のバージョン（マイグレーション用）
 */
export interface ThemeSettings {
  /** テーマモード */
  mode: ThemeMode;
  /** 選択されたテーマID */
  selectedTheme: ThemeId;
  /** 設定バージョン */
  version: string;
}

/**
 * テーマカラー定義
 *
 * 各テーマで使用する色の定義
 *
 * @property {string} primary - プライマリカラー
 * @property {string} secondary - セカンダリカラー
 * @property {string} background - 背景色
 * @property {string} text - テキスト色
 * @property {string} border - ボーダー色
 */
export interface ThemeColors {
  /** プライマリカラー */
  primary: string;
  /** セカンダリカラー */
  secondary: string;
  /** 背景色 */
  background: string;
  /** テキスト色 */
  text: string;
  /** ボーダー色 */
  border: string;
}

/**
 * テーマ定義
 *
 * 完全なテーマ情報
 *
 * @property {ThemeId} id - テーマID
 * @property {string} name - テーマ表示名
 * @property {ThemeColors} colors - カラー定義
 */
export interface Theme {
  /** テーマID */
  id: ThemeId;
  /** テーマ表示名 */
  name: string;
  /** カラー定義 */
  colors: ThemeColors;
}

/**
 * テーマコンテキスト型
 *
 * React Contextで提供されるテーマ関連の状態と操作
 *
 * @property {Theme} currentTheme - 現在適用中のテーマ
 * @property {ThemeId} themeId - 現在のテーマID
 * @property {ThemeMode} themeMode - 現在のテーマモード
 * @property {function} setTheme - テーマを変更する関数
 * @property {function} setThemeMode - テーマモードを変更する関数
 */
export interface ThemeContextType {
  /** 現在適用中のテーマ */
  currentTheme: Theme;
  /** 現在のテーマID */
  themeId: ThemeId;
  /** 現在のテーマモード */
  themeMode: ThemeMode;
  /** テーマを変更する */
  setTheme: (themeId: ThemeId) => void;
  /** テーマモードを変更する */
  setThemeMode: (mode: ThemeMode) => void;
}

/**
 * デフォルトテーマ設定
 *
 * 初回起動時またはLocalStorageが空の場合に使用
 */
export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  mode: 'auto',
  selectedTheme: 'default',
  version: '1.0.0',
};

/**
 * ThemeModeのバリデーション
 *
 * @param {any} value - 検証する値
 * @returns {boolean} 有効なThemeModeの場合true
 */
export const isValidThemeMode = (value: any): value is ThemeMode => {
  return value === 'auto' || value === 'manual';
};

/**
 * ThemeIdのバリデーション
 *
 * @param {any} value - 検証する値
 * @returns {boolean} 有効なThemeIdの場合true
 */
export const isValidThemeId = (value: any): value is ThemeId => {
  return (
    value === 'default' ||
    value === 'dark' ||
    value === 'cyberpunk' ||
    value === 'cute'
  );
};

/**
 * ThemeSettingsのバリデーション
 *
 * LocalStorageから読み込んだデータが正しい構造かを検証
 *
 * @param {any} value - 検証する値
 * @returns {boolean} 有効なThemeSettingsの場合true
 */
export const isValidThemeSettings = (value: any): value is ThemeSettings => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const settings = value as ThemeSettings;

  return (
    isValidThemeMode(settings.mode) &&
    isValidThemeId(settings.selectedTheme) &&
    typeof settings.version === 'string'
  );
};
