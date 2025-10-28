# SPEC: メンバー一括選択機能

## 1. 概要

**機能名**: メンバー一括選択・一括解除機能
**対象画面**: メンバーリスト（MembersList.tsx）
**目的**: 複数メンバーの分析対象選択を効率化

## 2. 要件定義

### 2.1 機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| FR-1 | 現在表示中の全メンバーを一括選択できる | 必須 |
| FR-2 | 現在選択中の全メンバーを一括解除できる | 必須 |
| FR-3 | 選択中のメンバー数を表示する | 必須 |
| FR-4 | 部署フィルターと連動する（フィルター後のメンバーのみ選択） | 必須 |
| FR-5 | メンバーが0人の場合はボタンを無効化 | 必須 |

### 2.2 非機能要件

| ID | 要件 | 優先度 |
|----|------|--------|
| NFR-1 | ボタンクリックから選択完了まで100ms以内 | 推奨 |
| NFR-2 | 既存の個別選択機能と競合しない | 必須 |
| NFR-3 | ダークモード対応 | 必須 |
| NFR-4 | レスポンシブデザイン（スマホ対応） | 推奨 |

## 3. UI設計

### 3.1 配置

**位置**: 部署コードフィルターの直後、メンバーリストの直前

```
┌─────────────────────────────────────┐
│ 部署コードフィルター                  │
│ [すべての部署コード ▼]               │
├─────────────────────────────────────┤
│ [✓ 全員選択] [× 選択解除]           │
│ 現在 3人選択中                       │
├─────────────────────────────────────┤
│ メンバーリスト                       │
│ ┌─────────────────────────────────┐ │
│ │ □ 山田太郎 (部署: A001)          │ │
│ └─────────────────────────────────┘ │
│ ...                                  │
└─────────────────────────────────────┘
```

### 3.2 ボタン仕様

#### 全員選択ボタン

- **ラベル**: "全員選択"
- **アイコン**: CheckSquare（lucide-react）
- **動作**: フィルター後の全メンバーを選択状態にする
- **無効化条件**: メンバーが0人、または既に全員選択済み

#### 選択解除ボタン

- **ラベル**: "選択解除"
- **アイコン**: XSquare（lucide-react）
- **動作**: 現在選択中の全メンバーを解除
- **無効化条件**: 選択中のメンバーが0人

#### 選択状況表示

- **テキスト**: "現在 {n}人選択中"
- **色**: 0人: グレー、1人以上: ブルー
- **位置**: ボタンの右側

### 3.3 スタイリング

```typescript
// ボタン共通スタイル
className="flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium
           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

// 全員選択ボタン
className="... bg-blue-100 text-blue-700 hover:bg-blue-200
           dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"

// 選択解除ボタン
className="... bg-gray-100 text-gray-700 hover:bg-gray-200
           dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"

// 選択状況テキスト
className="text-sm text-gray-600 dark:text-gray-400"
```

## 4. 技術仕様

### 4.1 Context API拡張

**ファイル**: `src/contexts/StrengthsContext.tsx`

#### 追加メソッド

```typescript
interface StrengthsContextProps {
  // 既存のメソッド...

  // 新規追加
  selectAllMembers: (memberIds: string[]) => void;
  clearAllSelections: () => void;
}
```

#### メソッド仕様

##### selectAllMembers

```typescript
/**
 * 指定されたメンバーIDの配列を全て選択状態にする
 * @param memberIds - 選択するメンバーIDの配列
 * @description 既存の選択状態に追加（重複は自動除外）
 */
const selectAllMembers = (memberIds: string[]) => {
  setSelectedMemberIds(prevIds => {
    const newIds = [...new Set([...prevIds, ...memberIds])];
    return newIds;
  });
};
```

##### clearAllSelections

```typescript
/**
 * 全ての選択を解除する
 * @description selectedMemberIdsを空配列にする
 */
const clearAllSelections = () => {
  setSelectedMemberIds([]);
};
```

### 4.2 MembersList拡張

**ファイル**: `src/components/strengths/MembersList.tsx`

#### 追加ロジック

```typescript
// フィルター後のメンバーIDリストを取得
const filteredMemberIds = filteredMembers.map(m => m.id);

// 全員選択済みかどうか
const isAllSelected = filteredMemberIds.length > 0 &&
  filteredMemberIds.every(id => selectedMemberIds.includes(id));

// ボタンハンドラー
const handleSelectAll = () => {
  selectAllMembers(filteredMemberIds);
};

const handleClearAll = () => {
  clearAllSelections();
};
```

## 5. テストケース

### 5.1 単体テスト（Context）

| テストID | テスト内容 | 期待結果 |
|---------|-----------|---------|
| UT-CTX-1 | selectAllMembers([id1, id2])を呼ぶ | selectedMemberIdsに[id1, id2]が追加される |
| UT-CTX-2 | 既に選択済みのIDを含むリストでselectAllMembersを呼ぶ | 重複せず、ユニークなIDのみ保持 |
| UT-CTX-3 | clearAllSelections()を呼ぶ | selectedMemberIdsが空配列になる |

### 5.2 統合テスト（UI）

| テストID | テスト内容 | 期待結果 |
|---------|-----------|---------|
| IT-UI-1 | 「全員選択」ボタンをクリック | フィルター後の全メンバーのチェックマークがON |
| IT-UI-2 | 全員選択後、「選択解除」ボタンをクリック | 全メンバーのチェックマークがOFF |
| IT-UI-3 | 部署フィルターを変更後、「全員選択」 | フィルター後のメンバーのみ選択される |
| IT-UI-4 | メンバーが0人の時 | 「全員選択」ボタンが無効化される |
| IT-UI-5 | 選択中のメンバーが0人の時 | 「選択解除」ボタンが無効化される |
| IT-UI-6 | 既に全員選択済みの時 | 「全員選択」ボタンが無効化される |

### 5.3 E2Eテスト（手動）

| テストID | テスト内容 | 期待結果 |
|---------|-----------|---------|
| E2E-1 | 全員選択→「選択したメンバーを分析」タブ | 選択した全メンバーの分析が表示される |
| E2E-2 | 全員選択→個別チェックでOFF→選択解除 | 全て解除される |
| E2E-3 | 部署Aフィルター→全員選択→部署B選択→全員選択 | 部署Aと部署Bの両方が選択される |

## 6. 実装順序

1. **SPEC作成** ✅（このファイル）
2. **Context拡張**
   - `selectAllMembers`メソッド実装
   - `clearAllSelections`メソッド実装
   - インターフェース更新
3. **UI実装**
   - ボタンUIの追加
   - 選択状況表示の追加
   - イベントハンドラーの実装
4. **動作確認**
   - ローカル環境での手動テスト
   - 各種エッジケースの確認
5. **コミット**
   - 機能追加コミット
   - ドキュメント更新

## 7. リスク・考慮事項

### 7.1 パフォーマンス

- **大量メンバー**: 1000人以上のメンバーがいる場合、全選択が遅延する可能性
  - **対策**: 現実的には50-100人程度の想定なので問題なし

### 7.2 ユーザー体験

- **誤操作防止**: 「選択解除」の誤クリック
  - **対策**: ボタンの色を区別（選択=青、解除=グレー）
  - **将来対応**: 解除時に確認ダイアログ（オプション）

### 7.3 既存機能との互換性

- **個別選択との併用**: 全選択後に個別でOFF可能か
  - **対策**: 既存の`toggleMemberSelection`をそのまま使用

## 8. 将来拡張

- **部分選択状態の表示**: "5/10人選択中"のような表示
- **選択履歴**: 前回選択したメンバーを記憶
- **選択プリセット**: "リーダー陣のみ"などのクイック選択

---

**作成日**: 2025-01-23
**バージョン**: 1.0
**著者**: SUZUKI Shunpei
