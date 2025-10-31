# ダークモード対応 - グラフエリア仕様書

## 📋 概要
グラフや分析結果の表示エリアをダークモードに対応させる。
資質の色（GROUP_COLORS）は変更せず、背景とテキストのみ調整する。

## 🎯 対応方針
**方針A: シンプル対応**
- グラフ背景だけダークモード対応
- 資質の色はそのまま（意味を持つ情報として維持）
- 文字色のみ調整

## 📦 対象コンポーネント

### 1. IndividualStrengths.tsx
個人分析画面 - 全34資質の表示と強みの詳細

### 2. DepartmentAnalysis.tsx
部署分析画面 - グループ分布と強み頻度のグラフ

### 3. SelectedAnalysis.tsx
選択メンバー分析画面 - 選択したメンバーの集計

### 4. StrengthsAnalysis.tsx
資質分析画面 - 特定資質を持つメンバーの検索

### 5. MemberForm.tsx
メンバー追加/編集フォーム

### 6. MembersList.tsx
メンバー一覧表示

### 7. StrengthsFinderPage.tsx
メインページ

## 🎨 デザイン仕様

### 背景色
| 要素 | Light モード | Dark モード |
|------|-------------|-------------|
| カード背景 | `bg-white` | `bg-gray-800` |
| サブ背景 | `bg-gray-50` | `bg-gray-700` |
| ヘッダー背景 | `bg-gray-100` | `bg-gray-800` |

### テキスト色
| 要素 | Light モード | Dark モード |
|------|-------------|-------------|
| 通常テキスト | `text-gray-900` | `text-gray-100` |
| サブテキスト | `text-gray-700` | `text-gray-300` |
| 補足テキスト | `text-gray-600` | `text-gray-400` |
| 薄いテキスト | `text-gray-500` | `text-gray-500` |

### ボーダー
| 要素 | Light モード | Dark モード |
|------|-------------|-------------|
| 通常ボーダー | `border-gray-200` | `border-gray-600` |
| 薄いボーダー | `border-gray-100` | `border-gray-700` |

### 資質の色（変更なし）
```typescript
GROUP_COLORS = {
  EXECUTING: "#9B59B6",           // 実行力（紫）
  INFLUENCING: "#D6813E",         // 影響力（オレンジ）
  RELATIONSHIP_BUILDING: "#4A6FDC", // 人間関係構築力（青）
  STRATEGIC_THINKING: "#4C9F70"   // 戦略的思考力（緑）
}
```

## 🔧 実装チェックリスト

### Phase 1: IndividualStrengths.tsx ✅
- [x] メンバー情報カード (`bg-gray-50` → `bg-gray-50 dark:bg-gray-700`)
- [x] 強みのバランスカード (`bg-white` → `bg-white dark:bg-gray-800`)
- [x] カテゴリタイトル (`text-gray-XXX` → ダークモード対応)
- [x] 資質タイル（ボーダー調整）
- [x] 強み詳細説明カード (`bg-white` → `bg-white dark:bg-gray-800`)
- [x] 詳細カード内部 (`bg-gray-50` → `bg-gray-50 dark:bg-gray-700`)
- [x] テキスト色調整
- [x] ローカル動作確認

### Phase 2: DepartmentAnalysis.tsx ✅
- [x] カード背景 (`bg-white` → `bg-white dark:bg-gray-800`)
- [x] セレクトボックス (`border` → `border dark:border-gray-600`)
- [x] Recharts グラフ背景色
- [x] Tooltip 背景・テキスト色
- [x] 軸ラベルの色
- [x] テキスト色調整
- [x] ローカル動作確認

### Phase 3: SelectedAnalysis.tsx ✅
- [x] カード背景 (`bg-white` → `bg-white dark:bg-gray-800`)
- [x] チェックボックスエリア背景
- [x] テキスト色調整
- [x] グラフエリア対応
- [x] ローカル動作確認

### Phase 4: StrengthsAnalysis.tsx ✅
- [x] カード背景 (`bg-white` → `bg-white dark:bg-gray-800`)
- [x] セレクトボックス調整
- [x] テキスト色調整
- [x] ローカル動作確認

### Phase 5: MemberForm.tsx ✅
- [x] モーダル背景 (`bg-white` → `bg-white dark:bg-gray-800`)
- [x] Input/Select ボーダー・背景調整
- [x] ラベルテキスト色調整
- [x] エラーメッセージ背景
- [x] 資質選択ボタン（選択状態含む）
- [x] 順位調整ボタン
- [x] 保存/キャンセルボタン
- [x] ローカル動作確認

### Phase 6: MembersList.tsx ✅
- [x] リスト背景 (`bg-white` → `bg-white dark:bg-gray-700`)
- [x] アイテム背景（選択状態含む）
- [x] **メンバー名のテキスト色修正** (`text-md font-medium` → `dark:text-gray-100`)
- [x] 部署コード・資質テキスト色調整
- [x] ボタン・セレクトボックス調整
- [x] ローカル動作確認

### Phase 7: StrengthsFinderPage.tsx ✅
- [x] ヘッダー（タイトル、アイコン）
- [x] サンプル/エクスポート/インポートボタン
- [x] メンバー追加ボタン
- [x] エラーメッセージ
- [x] サイドバー（メンバー一覧エリア）背景 - 既に対応済み
- [x] 分析エリア背景 - 既に対応済み
- [x] ローカル動作確認

### Phase 8: 統合テスト ✅
- [x] すべての画面でテーマ切り替え確認
- [x] Light → Dark 切り替え
- [x] Dark → Light 切り替え
- [x] リロード後もテーマ維持確認
- [x] グラフの視認性確認
- [x] テキストの視認性確認

## 🧪 テスト方針

### 目視確認項目
1. **背景のコントラスト**
   - 資質カードが背景に対して見やすいか
   - 文字が読みやすいか

2. **資質の色**
   - 4つのグループの色が識別できるか
   - ダークモードでも色の意味が伝わるか

3. **グラフの視認性**
   - Recharts のグラフが見やすいか
   - Tooltip が読みやすいか
   - 軸ラベルが読みやすいか

4. **操作性**
   - ボタン、セレクトボックスが操作しやすいか
   - Hover 状態が分かりやすいか

### 非機能要件
- テーマ切り替えは即座に反映される
- LocalStorageでテーマ設定が永続化される
- リロード後もテーマが維持される

## 📝 実装ガイドライン

### Tailwind クラスの追加パターン
```tsx
// Before
<div className="bg-white p-4">

// After
<div className="bg-white dark:bg-gray-800 p-4">
```

### テキスト色の調整パターン
```tsx
// Before
<p className="text-gray-700">テキスト</p>

// After
<p className="text-gray-700 dark:text-gray-300">テキスト</p>
```

### ボーダーの調整パターン
```tsx
// Before
<div className="border border-gray-200">

// After
<div className="border border-gray-200 dark:border-gray-600">
```

### Recharts の調整例
```tsx
<Tooltip
  contentStyle={{
    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
    color: theme === 'dark' ? '#E5E7EB' : '#111827',
    border: theme === 'dark' ? '1px solid #4B5563' : '1px solid #E5E7EB'
  }}
/>
```

## ⚠️ 注意事項

1. **資質の色は変更しない**
   - GROUP_COLORS の値は固定
   - インラインスタイルで設定されている箇所はそのまま

2. **1ファイルずつ確認**
   - 修正→確認→次へ
   - 一気に修正しない

3. **既存の動作を壊さない**
   - Lightモードの見た目は変えない
   - 機能は一切変更しない

## 🎉 完了条件

- [x] 全7コンポーネントの修正完了
- [x] すべての画面で動作確認完了
- [x] Light/Dark 切り替えがスムーズ
- [x] 資質の色が両モードで視認可能
- [x] テキストが両モードで読みやすい
- [x] グラフが両モードで見やすい
- [x] コミット & Push 完了

---

## ✅ 実装完了日

**2025年10月9日**

すべてのグラフ・分析画面のダークモード対応が完了しました。

---

## 📚 参考情報

- Tailwind CSS Dark Mode: https://tailwindcss.com/docs/dark-mode
- Recharts Documentation: https://recharts.org/
- 既存テーマ実装: `src/contexts/ThemeContext.tsx`
