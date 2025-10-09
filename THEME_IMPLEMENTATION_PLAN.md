# カラーテーマ機能 実装計画書

**プロジェクト**: ストレングスファインダー分析ツール
**機能**: カラーテーマ切り替え機能（OS自動検出対応）
**開発手法**: Spec駆動開発 + TDD
**作成日**: 2025-10-06
**作成者**: SUZUKI Shunpei

---

## 📋 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [機能仕様（Specification）](#機能仕様specification)
3. [技術仕様](#技術仕様)
4. [段階的実装計画](#段階的実装計画)
5. [テスト戦略（TDD）](#テスト戦略tdd)
6. [リスク管理](#リスク管理)
7. [成功基準](#成功基準)

---

## プロジェクト概要

### 目的
ユーザーの視認性向上と長時間作業の快適性を実現するため、複数のカラーテーマ切り替え機能を提供する。

### スコープ
- OS設定の自動検出（prefers-color-scheme）
- 4つのプリセットテーマ（デフォルト、ダーク、サイバーパンク、キュート）
- ユーザー選択の永続化（LocalStorage）
- 既存機能への非破壊的追加

### アウトオブスコープ
- カスタムテーマエディター（将来的に検討）
- テーマのインポート/エクスポート（将来的に検討）
- アニメーション効果（Phase 3以降）

---

## 機能仕様（Specification）

### FS-001: テーマモード管理

#### 仕様
システムは以下の2つのモードをサポートする：

1. **自動モード（Auto Mode）**
   - OS設定（prefers-color-scheme）を検出
   - OSがダーク → ダークテーマ適用
   - OSがライト → デフォルトテーマ適用
   - OS設定変更時、リアルタイムで反映

2. **手動モード（Manual Mode）**
   - ユーザーが明示的にテーマを選択
   - 選択後はOS設定を無視
   - 4つのテーマから選択可能

#### 受け入れ基準
- [ ] 初回アクセス時、自動モードが有効
- [ ] OS設定がダークの場合、ダークテーマが適用される
- [ ] OS設定がライトの場合、デフォルトテーマが適用される
- [ ] ユーザーがテーマを手動選択すると、手動モードに切り替わる
- [ ] 手動モードでは、OS設定変更を無視する
- [ ] 「自動」を再選択すると、自動モードに戻る

### FS-002: テーマ一覧

#### 仕様

| テーマID | 名称 | 説明 | 適用条件 |
|---------|------|------|---------|
| `default` | デフォルト | シンプルで読みやすい標準テーマ | 自動モード（OS=ライト）または手動選択 |
| `dark` | ダーク | 目に優しいダークモード | 自動モード（OS=ダーク）または手動選択 |
| `cyberpunk` | サイバーパンク | ネオン輝く近未来的デザイン | 手動選択のみ |
| `cute` | キュート | 優しく柔らかいパステルカラー | 手動選択のみ |

#### 受け入れ基準
- [ ] すべてのテーマが正常に表示される
- [ ] テーマ切り替え時、1秒以内に反映される
- [ ] リロード後も選択したテーマが維持される

### FS-003: テーマスイッチャーUI

#### 仕様

**配置場所**: 画面右上（インポート/エクスポートボタンの左側）

**表示内容**:
```
┌─────────────────────────────┐
│ 🎨 カラーテーマ            │
├─────────────────────────────┤
│ ⚙️ 自動 (OSに合わせる)  ✓  │
│   現在: ダーク              │
├─────────────────────────────┤
│ 🌞 デフォルト              │
│    シンプルで読みやすい     │
├─────────────────────────────┤
│ 🌙 ダーク                  │
│    目に優しいダークモード   │
├─────────────────────────────┤
│ 🌃 サイバーパンク          │
│    ネオン輝く近未来デザイン │
├─────────────────────────────┤
│ 💖 キュート                │
│    優しく柔らかいパステル   │
└─────────────────────────────┘
```

#### 受け入れ基準
- [ ] パレットアイコンをクリックでメニュー表示
- [ ] 現在適用中のテーマにチェックマーク表示
- [ ] 自動モードの場合、現在のOSテーマを表示
- [ ] 各テーマ選択でメニューが自動的に閉じる
- [ ] メニュー外をクリックでメニューが閉じる

### FS-004: データ永続化

#### 仕様

**LocalStorageキー**: `strengths-finder-theme-settings`

**保存データ構造**:
```typescript
{
  mode: 'auto' | 'manual',
  selectedTheme: 'default' | 'dark' | 'cyberpunk' | 'cute',
  version: '1.0.0'
}
```

#### 受け入れ基準
- [ ] テーマ選択時、LocalStorageに保存される
- [ ] ブラウザ再起動後も設定が維持される
- [ ] LocalStorageが使用できない環境でもエラーにならない

### FS-005: OS設定変更の検出

#### 仕様
- `matchMedia`の`change`イベントを監視
- OS設定変更時、自動モードの場合のみテーマを更新

#### 受け入れ基準
- [ ] 自動モード時、OS設定変更で即座にテーマが切り替わる
- [ ] 手動モード時、OS設定変更を無視する
- [ ] イベントリスナーが適切にクリーンアップされる

---

## 技術仕様

### アーキテクチャ

```
┌─────────────────────────────────────────┐
│            App.tsx                      │
│  ┌─────────────────────────────────┐   │
│  │   ThemeProvider (Context)       │   │
│  │  - 状態管理                      │   │
│  │  - OS設定監視                    │   │
│  │  - CSS変数更新                   │   │
│  └─────────────────────────────────┘   │
│              ▼                          │
│  ┌─────────────────────────────────┐   │
│  │   StrengthsFinderPage           │   │
│  │  ┌───────────────────────────┐  │   │
│  │  │  ThemeSwitcher (UI)       │  │   │
│  │  └───────────────────────────┘  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

         ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  ThemeService    │  │  LocalStorage    │
│  - ロジック       │  │  - 永続化         │
│  - テーマ定義     │  │                  │
└──────────────────┘  └──────────────────┘
```

### ディレクトリ構成

```
src/
├── models/
│   └── ThemeTypes.ts          # 型定義
├── services/
│   └── ThemeService.ts        # ビジネスロジック
├── contexts/
│   └── ThemeContext.tsx       # 状態管理
├── components/
│   ├── ui/
│   │   └── ThemeSwitcher.tsx  # UIコンポーネント
│   └── strengths/
│       └── StrengthsFinderPage.tsx  # 統合
├── styles/
│   └── theme.css              # テーマCSS
├── __tests__/
│   ├── models/
│   │   └── ThemeTypes.test.ts
│   ├── services/
│   │   └── ThemeService.test.ts
│   ├── contexts/
│   │   └── ThemeContext.test.tsx
│   └── components/
│       └── ThemeSwitcher.test.tsx
└── App.tsx                    # ThemeProvider統合
```

---

## 段階的実装計画

### Phase 1: 基盤構築（Week 1）

**目標**: テーマシステムの基礎を実装し、デフォルトとダークの2テーマで動作確認

#### Phase 1.1: 型定義とテストファイル準備（Day 1）

**作業内容**:
1. `src/models/ThemeTypes.ts` 作成
2. `src/__tests__/models/ThemeTypes.test.ts` 作成

**TDD手順**:

```typescript
// Step 1: テストを先に書く（RED）
describe('ThemeTypes', () => {
  test('ThemeMode型が正しく定義されている', () => {
    const auto: ThemeMode = 'auto';
    const manual: ThemeMode = 'manual';
    expect(auto).toBe('auto');
    expect(manual).toBe('manual');
  });

  test('ThemeSettings型が正しく定義されている', () => {
    const settings: ThemeSettings = {
      mode: 'auto',
      selectedTheme: 'default',
      version: '1.0.0'
    };
    expect(settings.mode).toBe('auto');
  });
});
```

```typescript
// Step 2: 実装（GREEN）
export type ThemeMode = 'auto' | 'manual';
export type ThemeId = 'default' | 'dark' | 'cyberpunk' | 'cute';

export interface ThemeSettings {
  mode: ThemeMode;
  selectedTheme: ThemeId;
  version: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      muted: string;
      inverse: string;
    };
    accent: {
      primary: string;
      secondary: string;
      hover: string;
      active: string;
    };
    border: {
      light: string;
      default: string;
      dark: string;
    };
    status: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
}

export interface ThemeContextType {
  currentTheme: Theme;
  themeId: ThemeId;
  themeMode: ThemeMode;
  setTheme: (themeId: ThemeId) => void;
  setThemeMode: (mode: ThemeMode) => void;
  availableThemes: Theme[];
}
```

**受け入れテスト**:
- [ ] `npm test` でテストが成功
- [ ] TypeScriptコンパイルエラーなし

#### Phase 1.2: ThemeService実装（Day 2-3）

**TDD手順**:

```typescript
// Step 1: テストを先に書く（RED）
// src/__tests__/services/ThemeService.test.ts

describe('ThemeService', () => {
  describe('getOSPreferredTheme', () => {
    test('OS設定がダークの場合、darkを返す', () => {
      // matchMedia のモック
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      expect(getOSPreferredTheme()).toBe('dark');
    });

    test('OS設定がライトの場合、defaultを返す', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      expect(getOSPreferredTheme()).toBe('default');
    });
  });

  describe('getActiveTheme', () => {
    test('自動モードの場合、OS設定に基づいたテーマを返す', () => {
      const settings: ThemeSettings = {
        mode: 'auto',
        selectedTheme: 'cute',
        version: '1.0.0'
      };

      // OSがダークの場合
      const result = getActiveTheme(settings);
      expect(result).toBe('dark'); // cuteではなくdark
    });

    test('手動モードの場合、selectedThemeを返す', () => {
      const settings: ThemeSettings = {
        mode: 'manual',
        selectedTheme: 'cute',
        version: '1.0.0'
      };

      const result = getActiveTheme(settings);
      expect(result).toBe('cute');
    });
  });

  describe('saveThemeSettings', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    test('設定をLocalStorageに保存する', () => {
      const settings: ThemeSettings = {
        mode: 'manual',
        selectedTheme: 'dark',
        version: '1.0.0'
      };

      saveThemeSettings(settings);

      const saved = localStorage.getItem('strengths-finder-theme-settings');
      expect(saved).toBe(JSON.stringify(settings));
    });
  });

  describe('loadThemeSettings', () => {
    test('保存された設定を読み込む', () => {
      const settings: ThemeSettings = {
        mode: 'manual',
        selectedTheme: 'cyberpunk',
        version: '1.0.0'
      };

      localStorage.setItem('strengths-finder-theme-settings', JSON.stringify(settings));

      const loaded = loadThemeSettings();
      expect(loaded).toEqual(settings);
    });

    test('保存データがない場合、デフォルト設定を返す', () => {
      localStorage.clear();

      const loaded = loadThemeSettings();
      expect(loaded).toEqual({
        mode: 'auto',
        selectedTheme: 'default',
        version: '1.0.0'
      });
    });
  });
});
```

```typescript
// Step 2: 実装（GREEN）
// src/services/ThemeService.ts

import { Theme, ThemeId, ThemeSettings, ThemeMode } from '../models/ThemeTypes';

const STORAGE_KEY = 'strengths-finder-theme-settings';
const CURRENT_VERSION = '1.0.0';

// テーマ定義（デフォルト・ダークのみ Phase 1）
const defaultTheme: Theme = {
  id: 'default',
  name: 'デフォルト',
  description: 'シンプルで読みやすい標準テーマ',
  colors: {
    background: {
      primary: '#f3f4f6',
      secondary: '#ffffff',
      tertiary: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#6b7280',
      muted: '#9ca3af',
      inverse: '#ffffff',
    },
    accent: {
      primary: '#2563eb',
      secondary: '#3b82f6',
      hover: '#1d4ed8',
      active: '#1e40af',
    },
    border: {
      light: '#e5e7eb',
      default: '#d1d5db',
      dark: '#9ca3af',
    },
    status: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
  },
};

const darkTheme: Theme = {
  id: 'dark',
  name: 'ダーク',
  description: '目に優しいダークモード',
  colors: {
    background: {
      primary: '#111827',
      secondary: '#1f2937',
      tertiary: '#374151',
    },
    text: {
      primary: '#f9fafb',
      secondary: '#d1d5db',
      muted: '#9ca3af',
      inverse: '#111827',
    },
    accent: {
      primary: '#60a5fa',
      secondary: '#3b82f6',
      hover: '#93c5fd',
      active: '#dbeafe',
    },
    border: {
      light: '#374151',
      default: '#4b5563',
      dark: '#6b7280',
    },
    status: {
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
    },
  },
};

export const THEMES: Record<ThemeId, Theme> = {
  default: defaultTheme,
  dark: darkTheme,
  cyberpunk: defaultTheme, // Phase 2で実装
  cute: defaultTheme,      // Phase 2で実装
};

export const getTheme = (themeId: ThemeId): Theme => {
  return THEMES[themeId];
};

export const getAllThemes = (): Theme[] => {
  // Phase 1ではデフォルトとダークのみ
  return [THEMES.default, THEMES.dark];
};

export const getOSPreferredTheme = (): 'default' | 'dark' => {
  if (typeof window === 'undefined') return 'default';

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'default';
};

export const getActiveTheme = (settings: ThemeSettings): ThemeId => {
  if (settings.mode === 'auto') {
    return getOSPreferredTheme();
  }
  return settings.selectedTheme;
};

export const getDefaultSettings = (): ThemeSettings => ({
  mode: 'auto',
  selectedTheme: 'default',
  version: CURRENT_VERSION,
});

export const loadThemeSettings = (): ThemeSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return getDefaultSettings();

    const parsed = JSON.parse(saved) as ThemeSettings;

    // バージョンチェック（将来の互換性のため）
    if (parsed.version !== CURRENT_VERSION) {
      return getDefaultSettings();
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load theme settings:', error);
    return getDefaultSettings();
  }
};

export const saveThemeSettings = (settings: ThemeSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save theme settings:', error);
  }
};
```

**受け入れテスト**:
- [ ] すべてのテストが成功
- [ ] コードカバレッジ 90%以上
- [ ] ESLintエラーなし

#### Phase 1.3: ThemeContext実装（Day 4-5）

**TDD手順**:

```typescript
// Step 1: テストを先に書く（RED）
// src/__tests__/contexts/ThemeContext.test.tsx

import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

describe('ThemeContext', () => {
  test('初期状態で自動モードが有効', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.themeMode).toBe('auto');
  });

  test('OS設定がダークの場合、ダークテーマが適用される', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    expect(result.current.themeId).toBe('dark');
  });

  test('setThemeで手動モードに切り替わる', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    act(() => {
      result.current.setTheme('cyberpunk');
    });

    expect(result.current.themeMode).toBe('manual');
    expect(result.current.themeId).toBe('cyberpunk');
  });

  test('setThemeModeで自動モードに戻せる', () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ThemeProvider,
    });

    // 手動モードに切り替え
    act(() => {
      result.current.setTheme('cute');
    });

    expect(result.current.themeMode).toBe('manual');

    // 自動モードに戻す
    act(() => {
      result.current.setThemeMode('auto');
    });

    expect(result.current.themeMode).toBe('auto');
  });
});
```

```typescript
// Step 2: 実装（GREEN）
// src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, ThemeId, ThemeMode, ThemeContextType, ThemeSettings } from '../models/ThemeTypes';
import {
  getTheme,
  getAllThemes,
  loadThemeSettings,
  saveThemeSettings,
  getActiveTheme,
  getOSPreferredTheme,
} from '../services/ThemeService';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<ThemeSettings>(loadThemeSettings());
  const activeThemeId = getActiveTheme(settings);
  const [currentTheme, setCurrentTheme] = useState<Theme>(getTheme(activeThemeId));

  // テーマを手動選択
  const handleSetTheme = (themeId: ThemeId) => {
    const newSettings: ThemeSettings = {
      mode: 'manual',
      selectedTheme: themeId,
      version: '1.0.0',
    };
    setSettings(newSettings);
    setCurrentTheme(getTheme(themeId));
    saveThemeSettings(newSettings);
  };

  // モード切り替え
  const handleSetThemeMode = (mode: ThemeMode) => {
    const newSettings: ThemeSettings = {
      ...settings,
      mode,
    };
    setSettings(newSettings);
    const newActiveThemeId = getActiveTheme(newSettings);
    setCurrentTheme(getTheme(newActiveThemeId));
    saveThemeSettings(newSettings);
  };

  // OS設定変更の監視
  useEffect(() => {
    if (settings.mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const newThemeId = getOSPreferredTheme();
      setCurrentTheme(getTheme(newThemeId));
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.mode]);

  // CSS変数を更新
  useEffect(() => {
    const root = document.documentElement;
    const colors = currentTheme.colors;

    root.style.setProperty('--color-bg-primary', colors.background.primary);
    root.style.setProperty('--color-bg-secondary', colors.background.secondary);
    root.style.setProperty('--color-bg-tertiary', colors.background.tertiary);

    root.style.setProperty('--color-text-primary', colors.text.primary);
    root.style.setProperty('--color-text-secondary', colors.text.secondary);
    root.style.setProperty('--color-text-muted', colors.text.muted);
    root.style.setProperty('--color-text-inverse', colors.text.inverse);

    root.style.setProperty('--color-accent-primary', colors.accent.primary);
    root.style.setProperty('--color-accent-secondary', colors.accent.secondary);
    root.style.setProperty('--color-accent-hover', colors.accent.hover);
    root.style.setProperty('--color-accent-active', colors.accent.active);

    root.style.setProperty('--color-border-light', colors.border.light);
    root.style.setProperty('--color-border-default', colors.border.default);
    root.style.setProperty('--color-border-dark', colors.border.dark);

    root.style.setProperty('--color-status-success', colors.status.success);
    root.style.setProperty('--color-status-warning', colors.status.warning);
    root.style.setProperty('--color-status-error', colors.status.error);
    root.style.setProperty('--color-status-info', colors.status.info);
  }, [currentTheme]);

  const value: ThemeContextType = {
    currentTheme,
    themeId: activeThemeId,
    themeMode: settings.mode,
    setTheme: handleSetTheme,
    setThemeMode: handleSetThemeMode,
    availableThemes: getAllThemes(),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
```

**受け入れテスト**:
- [ ] すべてのテストが成功
- [ ] OS設定変更時、自動的にテーマが切り替わる
- [ ] 手動選択時、OS設定を無視する

#### Phase 1.4: ThemeSwitcher UI実装（Day 6-7）

**実装内容**:
1. `src/components/ui/ThemeSwitcher.tsx` 作成
2. `src/__tests__/components/ThemeSwitcher.test.tsx` 作成

**TDD手順**:

```typescript
// Step 1: テストを先に書く（RED）
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSwitcher from '../../components/ui/ThemeSwitcher';
import { ThemeProvider } from '../../contexts/ThemeContext';

describe('ThemeSwitcher', () => {
  test('パレットアイコンが表示される', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const button = screen.getByLabelText('テーマを変更');
    expect(button).toBeInTheDocument();
  });

  test('クリックでメニューが開く', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const button = screen.getByLabelText('テーマを変更');
    fireEvent.click(button);

    expect(screen.getByText('カラーテーマ')).toBeInTheDocument();
    expect(screen.getByText('自動 (OSに合わせる)')).toBeInTheDocument();
  });

  test('テーマ選択でメニューが閉じる', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>
    );

    const button = screen.getByLabelText('テーマを変更');
    fireEvent.click(button);

    const darkTheme = screen.getByText('ダーク');
    fireEvent.click(darkTheme);

    expect(screen.queryByText('カラーテーマ')).not.toBeInTheDocument();
  });
});
```

**受け入れテスト**:
- [ ] UIテストが成功
- [ ] アクセシビリティチェック（ARIA属性）
- [ ] レスポンシブデザイン確認

#### Phase 1.5: theme.css作成とApp.tsx統合（Day 8）

**実装内容**:
1. `src/styles/theme.css` 作成
2. `src/App.tsx` に ThemeProvider 追加
3. `src/index.css` に theme.css インポート追加
4. `src/components/strengths/StrengthsFinderPage.tsx` に ThemeSwitcher 追加

**受け入れテスト**:
- [ ] ローカル開発環境で動作確認
- [ ] デフォルト↔ダークの切り替え確認
- [ ] 自動モード↔手動モードの切り替え確認
- [ ] リロード後も設定が維持される

#### Phase 1.6: Phase 1 デプロイ（Day 9-10）

**手順**:
1. すべてのテストが成功していることを確認
2. `npm run build` で本番ビルド確認
3. ブランチ作成: `feature/theme-phase1`
4. コミット＆プッシュ
5. Pull Request作成
6. レビュー
7. masterにマージ
8. mainにマージ → 自動デプロイ

**受け入れテスト**:
- [ ] GitHub Actionsが成功
- [ ] 本番環境で動作確認
- [ ] すべてのブラウザで動作確認（Chrome, Firefox, Safari, Edge）
- [ ] モバイルデバイスで動作確認

---

### Phase 2: グラフ・資質カラー対応（Week 2-3）

**目標**: Rechartsのグラフと資質カラー（GROUP_COLORS）をテーマ対応

#### Phase 2.1: テーマ対応カラーパレット定義（Day 11-12）

**実装内容**:
1. `ThemeService.ts` にグラフ用カラーパレット追加
2. `GROUP_COLORS` をテーマから動的取得

**TDD手順**:

```typescript
// テスト
describe('Theme Graph Colors', () => {
  test('各テーマがグラフ用カラーパレットを持つ', () => {
    const theme = getTheme('default');
    expect(theme.graphColors).toBeDefined();
    expect(theme.graphColors.executing).toBe('#f59e0b');
  });
});

// 実装
export interface Theme {
  // ... 既存のフィールド
  graphColors: {
    executing: string;    // 実行力
    influencing: string;  // 影響力
    relationship: string; // 人間関係構築力
    strategic: string;    // 戦略的思考力
  };
}
```

**受け入れテスト**:
- [ ] 各テーマで異なるグラフカラーが定義されている
- [ ] テーマ切り替えでグラフの色が変わる

#### Phase 2.2: Rechartsコンポーネント修正（Day 13-15）

**対象ファイル**:
- `DepartmentAnalysis.tsx`
- `SelectedAnalysis.tsx`
- `IndividualStrengths.tsx`
- `StrengthsAnalysis.tsx`

**実装方針**:
```typescript
// Before
<Bar dataKey="value" fill="#2563eb" />

// After
const { currentTheme } = useTheme();
<Bar dataKey="value" fill={currentTheme.colors.accent.primary} />
```

**受け入れテスト**:
- [ ] すべてのグラフがテーマ対応
- [ ] テーマ切り替えで即座に反映

#### Phase 2.3: Phase 2 デプロイ（Day 16-17）

**手順**: Phase 1と同様

---

### Phase 3: サイバーパンク・キュートテーマ追加（Week 4）

**目標**: 残り2テーマの実装

#### Phase 3.1: テーマ定義追加（Day 18-19）

**実装内容**:
1. `ThemeService.ts` にサイバーパンク・キュートテーマ追加
2. テーマプレビュー画像作成
3. ドキュメント更新

**受け入れテスト**:
- [ ] 4つすべてのテーマが選択可能
- [ ] 各テーマで正常に表示される

#### Phase 3.2: UI最終調整（Day 20-21）

**実装内容**:
- テーマスイッチャーに全テーマ表示
- アニメーション効果追加（オプション）
- パフォーマンス最適化

**受け入れテスト**:
- [ ] テーマ切り替えが1秒以内
- [ ] メモリリークがない
- [ ] アクセシビリティ基準を満たす

#### Phase 3.3: Phase 3 デプロイ（Day 22-23）

**手順**: Phase 1と同様

---

## テスト戦略（TDD）

### テストピラミッド

```
        ┌─────────────┐
        │   E2E (10%) │  ← ユーザーシナリオ
        ├─────────────┤
        │ Integration │  ← コンポーネント統合
        │    (30%)    │
        ├─────────────┤
        │    Unit     │  ← 関数・ロジック
        │    (60%)    │
        └─────────────┘
```

### テスト種別と実施内容

#### ユニットテスト（60%）

**対象**:
- ThemeService のすべての関数
- 型定義のバリデーション
- ユーティリティ関数

**ツール**: Jest

**カバレッジ目標**: 90%以上

#### 統合テスト（30%）

**対象**:
- ThemeContext + ThemeService
- ThemeSwitcher + ThemeContext
- App.tsx + ThemeProvider

**ツール**: React Testing Library

**カバレッジ目標**: 80%以上

#### E2Eテスト（10%）

**シナリオ**:
1. 初回アクセス → 自動モード確認
2. テーマ手動選択 → 反映確認
3. リロード → 設定維持確認
4. OS設定変更 → 自動モード時のみ反映確認

**ツール**: Playwright または Cypress（検討中）

### TDD サイクル

```
┌──────────┐
│ 1. RED   │ ← テスト失敗（実装前）
└────┬─────┘
     ↓
┌────┴─────┐
│ 2. GREEN │ ← 最小限の実装でテスト成功
└────┬─────┘
     ↓
┌────┴─────┐
│ 3. REFAC │ ← コード品質向上
└────┬─────┘
     ↓
  (繰り返し)
```

### 継続的テスト

**GitHub Actionsワークフロー**:
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run build
```

---

## リスク管理

### 技術的リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|---------|------|
| LocalStorage使用不可の環境 | 中 | 低 | try-catch でエラーハンドリング |
| 既存コンポーネントへの影響 | 高 | 中 | Phase 1で段階的導入、十分なテスト |
| パフォーマンス劣化 | 中 | 低 | CSS Variables使用で最小化 |
| ブラウザ互換性 | 中 | 低 | matchMedia のポリフィル検討 |

### スケジュールリスク

| リスク | 対策 |
|--------|------|
| Phase 1の遅延 | バッファ日（Day 9-10）を設定 |
| テスト工数の過小評価 | 各Phaseに十分なテスト期間を確保 |

### 品質リスク

| リスク | 対策 |
|--------|------|
| テストカバレッジ不足 | 90%以上のカバレッジを必須化 |
| アクセシビリティ問題 | ARIAラベル、キーボード操作対応 |

---

## 成功基準

### Phase 1完了基準
- [ ] ユニットテストカバレッジ 90%以上
- [ ] 統合テストすべて成功
- [ ] デフォルト↔ダーク切り替え正常動作
- [ ] 自動モード正常動作
- [ ] 本番環境デプロイ成功
- [ ] パフォーマンステスト（Lighthouse）スコア 90以上

### Phase 2完了基準
- [ ] すべてのグラフがテーマ対応
- [ ] テスト追加・更新完了
- [ ] 既存機能への影響なし
- [ ] 本番環境デプロイ成功

### Phase 3完了基準
- [ ] 4テーマすべて実装完了
- [ ] 最終E2Eテスト成功
- [ ] ドキュメント完備
- [ ] ユーザーフィードバック収集開始

### プロジェクト完了基準
- [ ] すべてのPhase完了
- [ ] テストカバレッジ 90%以上維持
- [ ] パフォーマンス影響 +5%以内
- [ ] アクセシビリティ基準（WCAG 2.1 AA）達成
- [ ] ユーザーマニュアル作成
- [ ] 開発者ドキュメント作成

---

## 付録

### A. 用語集

| 用語 | 説明 |
|------|------|
| テーマモード | 自動（OS連動）または手動（ユーザー選択） |
| OS設定 | prefers-color-scheme メディアクエリで取得 |
| LocalStorage | ブラウザのローカルストレージ（5MB制限） |
| CSS Variables | --custom-property による動的スタイル |

### B. 参考資料

- React Context API: https://react.dev/reference/react/useContext
- prefers-color-scheme: https://developer.mozilla.org/ja/docs/Web/CSS/@media/prefers-color-scheme
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Jest: https://jestjs.io/ja/

---

**承認**

| 役割 | 氏名 | 承認日 |
|------|------|--------|
| 開発責任者 | SUZUKI Shunpei | 2025-10-06 |

**変更履歴**

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-10-06 | 初版作成 |
