/**
 * ThemeTypes 型定義テスト
 *
 * TDD RED Phase: 型の正しい使用と不正な使用を検証
 */

import {
  ThemeMode,
  ThemeId,
  ThemeSettings,
  Theme,
  ThemeContextType,
  DEFAULT_THEME_SETTINGS,
  isValidThemeMode,
  isValidThemeId,
  isValidThemeSettings,
} from '../../models/ThemeTypes';

describe('ThemeTypes', () => {
  describe('ThemeMode型', () => {
    it('autoモードが有効である', () => {
      const mode: ThemeMode = 'auto';
      expect(mode).toBe('auto');
    });

    it('manualモードが有効である', () => {
      const mode: ThemeMode = 'manual';
      expect(mode).toBe('manual');
    });

    it('isValidThemeModeがautoをtrueと判定', () => {
      expect(isValidThemeMode('auto')).toBe(true);
    });

    it('isValidThemeModeがmanualをtrueと判定', () => {
      expect(isValidThemeMode('manual')).toBe(true);
    });

    it('isValidThemeModeが不正な値をfalseと判定', () => {
      expect(isValidThemeMode('invalid')).toBe(false);
      expect(isValidThemeMode('')).toBe(false);
      expect(isValidThemeMode(null as any)).toBe(false);
      expect(isValidThemeMode(undefined as any)).toBe(false);
    });
  });

  describe('ThemeId型', () => {
    it('defaultテーマIDが有効である', () => {
      const id: ThemeId = 'default';
      expect(id).toBe('default');
    });

    it('darkテーマIDが有効である', () => {
      const id: ThemeId = 'dark';
      expect(id).toBe('dark');
    });

    it('cyberpunkテーマIDが有効である', () => {
      const id: ThemeId = 'cyberpunk';
      expect(id).toBe('cyberpunk');
    });

    it('cuteテーマIDが有効である', () => {
      const id: ThemeId = 'cute';
      expect(id).toBe('cute');
    });

    it('isValidThemeIdが全ての有効なIDをtrueと判定', () => {
      expect(isValidThemeId('default')).toBe(true);
      expect(isValidThemeId('dark')).toBe(true);
      expect(isValidThemeId('cyberpunk')).toBe(true);
      expect(isValidThemeId('cute')).toBe(true);
    });

    it('isValidThemeIdが不正な値をfalseと判定', () => {
      expect(isValidThemeId('invalid')).toBe(false);
      expect(isValidThemeId('')).toBe(false);
      expect(isValidThemeId(null as any)).toBe(false);
      expect(isValidThemeId(undefined as any)).toBe(false);
    });
  });

  describe('ThemeSettings型', () => {
    it('正しい構造のThemeSettingsオブジェクトが作成できる', () => {
      const settings: ThemeSettings = {
        mode: 'auto',
        selectedTheme: 'default',
        version: '1.0.0',
      };
      expect(settings.mode).toBe('auto');
      expect(settings.selectedTheme).toBe('default');
      expect(settings.version).toBe('1.0.0');
    });

    it('manualモードのThemeSettingsが作成できる', () => {
      const settings: ThemeSettings = {
        mode: 'manual',
        selectedTheme: 'dark',
        version: '1.0.0',
      };
      expect(settings.mode).toBe('manual');
      expect(settings.selectedTheme).toBe('dark');
    });

    it('DEFAULT_THEME_SETTINGSが正しいデフォルト値を持つ', () => {
      expect(DEFAULT_THEME_SETTINGS.mode).toBe('auto');
      expect(DEFAULT_THEME_SETTINGS.selectedTheme).toBe('default');
      expect(DEFAULT_THEME_SETTINGS.version).toBe('1.0.0');
    });

    it('isValidThemeSettingsが正しい設定をtrueと判定', () => {
      const settings: ThemeSettings = {
        mode: 'auto',
        selectedTheme: 'default',
        version: '1.0.0',
      };
      expect(isValidThemeSettings(settings)).toBe(true);
    });

    it('isValidThemeSettingsが不正なmodeをfalseと判定', () => {
      const settings = {
        mode: 'invalid',
        selectedTheme: 'default',
        version: '1.0.0',
      };
      expect(isValidThemeSettings(settings as any)).toBe(false);
    });

    it('isValidThemeSettingsが不正なselectedThemeをfalseと判定', () => {
      const settings = {
        mode: 'auto',
        selectedTheme: 'invalid',
        version: '1.0.0',
      };
      expect(isValidThemeSettings(settings as any)).toBe(false);
    });

    it('isValidThemeSettingsが必須フィールド欠落をfalseと判定', () => {
      expect(isValidThemeSettings({} as any)).toBe(false);
      expect(isValidThemeSettings(null as any)).toBe(false);
      expect(isValidThemeSettings(undefined as any)).toBe(false);
    });
  });

  describe('Theme型', () => {
    it('完全なThemeオブジェクトが作成できる', () => {
      const theme: Theme = {
        id: 'default',
        name: 'デフォルト',
        colors: {
          primary: '#2563EB',
          secondary: '#10B981',
          background: '#FFFFFF',
          text: '#1F2937',
          border: '#E5E7EB',
        },
      };
      expect(theme.id).toBe('default');
      expect(theme.name).toBe('デフォルト');
      expect(theme.colors.primary).toBe('#2563EB');
    });

    it('darkテーマのThemeオブジェクトが作成できる', () => {
      const theme: Theme = {
        id: 'dark',
        name: 'ダーク',
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#1F2937',
          text: '#F9FAFB',
          border: '#374151',
        },
      };
      expect(theme.id).toBe('dark');
      expect(theme.colors.background).toBe('#1F2937');
    });

    it('全てのカラーキーが必須である', () => {
      const theme: Theme = {
        id: 'default',
        name: 'Test',
        colors: {
          primary: '#000000',
          secondary: '#000000',
          background: '#FFFFFF',
          text: '#000000',
          border: '#CCCCCC',
        },
      };
      expect(Object.keys(theme.colors)).toEqual([
        'primary',
        'secondary',
        'background',
        'text',
        'border',
      ]);
    });
  });

  describe('ThemeContextType型', () => {
    it('ThemeContextTypeの完全な構造が定義できる', () => {
      const mockContext: ThemeContextType = {
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
        setTheme: jest.fn(),
        setThemeMode: jest.fn(),
      };

      expect(mockContext.themeId).toBe('default');
      expect(mockContext.themeMode).toBe('auto');
      expect(typeof mockContext.setTheme).toBe('function');
      expect(typeof mockContext.setThemeMode).toBe('function');
    });

    it('setTheme関数がThemeIdを受け取る', () => {
      const setTheme = jest.fn();
      setTheme('dark');
      expect(setTheme).toHaveBeenCalledWith('dark');
    });

    it('setThemeMode関数がThemeModeを受け取る', () => {
      const setThemeMode = jest.fn();
      setThemeMode('manual');
      expect(setThemeMode).toHaveBeenCalledWith('manual');
    });
  });

  describe('型安全性の確認', () => {
    it('ThemeModeは2つの値のみを許可', () => {
      const modes: ThemeMode[] = ['auto', 'manual'];
      expect(modes.length).toBe(2);
    });

    it('ThemeIdは4つの値のみを許可', () => {
      const ids: ThemeId[] = ['default', 'dark', 'cyberpunk', 'cute'];
      expect(ids.length).toBe(4);
    });

    it('ThemeSettings.versionは文字列型である', () => {
      const settings: ThemeSettings = DEFAULT_THEME_SETTINGS;
      expect(typeof settings.version).toBe('string');
    });
  });
});
