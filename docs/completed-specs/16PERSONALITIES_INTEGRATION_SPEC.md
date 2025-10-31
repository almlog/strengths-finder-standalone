# 16Personalities統合機能 - 仕様書

## 📋 概要
ストレングスファインダー分析ツールに16Personalities性格診断結果を統合し、メンバーの多角的な理解を可能にする。

**目的**:
- 個人分析タブでストレングスファインダーと16Personalitiesを併せて表示
- 新規「16P分析タブ」でチーム全体の性格タイプ分布を可視化
- 既存UI/UXの世界観を損なわない

**非機能要件**:
- 16P情報は任意項目（データがないメンバーも正常に動作）
- 既存のストレングスファインダー機能に影響を与えない
- ダークモード完全対応
- AIによる分析・推奨は一切行わない（事実データの表示のみ）

## 🎯 統合方針

### 方針A: 既存UIを尊重した段階的統合

1. **個人分析タブ（既存）**: ストレングスファインダー情報の下に16P情報を追加
2. **16P分析タブ（新規）**: チーム全体の16P分布を可視化
3. **データ拡張**: `MemberStrengths` 型に16P情報を任意項目として追加
4. **段階的実装**: Phase 1-3 に分割して安全に実装

## 📦 対象コンポーネント

### 既存コンポーネント（修正）

#### 1. src/models/StrengthsTypes.ts
型定義の拡張 - `personalityId` と `personalityVariant` を追加

#### 2. src/components/strengths/MemberForm.tsx
メンバー追加/編集フォームに16P選択UIを追加

#### 3. src/components/strengths/MembersList.tsx
メンバーリストに16Pバッジ表示を追加（任意）

#### 4. src/components/strengths/IndividualStrengths.tsx
個人分析タブに `Personality16Card` コンポーネントを追加

#### 5. src/components/strengths/StrengthsFinderPage.tsx
新規タブ「16P分析」を追加

### 新規コンポーネント（作成）

#### 6. src/services/Personality16Service.ts
16Personalities マスターデータとビジネスロジック

#### 7. src/components/strengths/Personality16Card.tsx
個人用16P情報表示カード

#### 8. src/components/strengths/Personality16TeamAnalysis.tsx
16P分析タブのメインコンポーネント

#### 9. src/components/strengths/Personality16Matrix.tsx
16タイプマトリクス（4×4グリッド）表示

#### 10. src/components/strengths/RoleGroupDistribution.tsx
役割グループ分布（アナリスト、外交官、番人、探検家）表示

#### 11. src/components/strengths/TypeMembersList.tsx
タイプ別メンバーリスト表示

## 🗂️ データ構造仕様

### MemberStrengths型の拡張

```typescript
// src/models/StrengthsTypes.ts

export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  strengths: RankedStrength[];

  // 16Personalities情報（任意）
  personalityId?: number;        // 1-16（マスターデータのID）
  personalityVariant?: 'A' | 'T'; // A: 自己主張型, T: 慎重型
}
```

**バリデーション**:
- `personalityId` は1-16の整数（任意）
- `personalityVariant` は 'A' または 'T'（任意）
- 両方とも `undefined` の場合、16P情報なしとして扱う

### Personality16Type型の定義

```typescript
// src/services/Personality16Service.ts

export interface Personality16Type {
  id: number;                  // 1-16
  code: string;                // "INTJ"
  name: string;                // "建築家"
  nameEn: string;              // "Architect"
  role: 'analyst' | 'diplomat' | 'sentinel' | 'explorer';
  roleName: string;            // "アナリスト"
  description: string;         // 公式サイトからの説明文
  colorLight: string;          // Light mode用の色 (#RRGGBB)
  colorDark: string;           // Dark mode用の色 (#RRGGBB)
}
```

**マスターデータ**:
- 全16タイプを定数配列 `PERSONALITY_TYPES_DATA` で管理
- 役割グループごとに色分け（計32色: 各タイプごとにLight/Dark）

### 役割グループの定義

| 役割グループ | 英語名 | タイプ数 | 代表色（Light） | 代表色（Dark） |
|-------------|--------|---------|----------------|----------------|
| アナリスト | Analyst | 4 | #8B4789 | #B565B3 |
| 外交官 | Diplomat | 4 | #4C9F70 | #62C78E |
| 番人 | Sentinel | 4 | #4A6FDC | #6B8FE8 |
| 探検家 | Explorer | 4 | #D6813E | #E69B5F |

## 🎨 UI/UXデザイン仕様

### 個人分析タブ（既存に追加）

#### Before（現在）
```
┌─────────────────────────────────────┐
│ 左: メンバーリスト                   │
│                                     │
│ 右: 選択したメンバーの分析           │
│    ├─ 強みTOP5                      │
│    ├─ レーダーチャート               │
│    └─ 強み詳細説明                  │
└─────────────────────────────────────┘
```

#### After（16P統合後）
```
┌─────────────────────────────────────┐
│ 左: メンバーリスト                   │
│    └─ 16P登録済みバッジ（任意）      │
│                                     │
│ 右: 選択したメンバーの分析           │
│    ├─ 基本情報                      │
│    ├─ 強みTOP5（既存）               │
│    ├─ レーダーチャート（既存）       │
│    ├─ 強み詳細説明（既存）           │
│    └─ 16P性格タイプ（NEW）          │
│       ├─ タイプカード（INTJ等）      │
│       ├─ 役割グループバッジ          │
│       ├─ バリアントバッジ（A/T）     │
│       └─ 公式説明文                 │
└─────────────────────────────────────┘
```

**実装ポイント**:
- 16P情報が登録されている場合のみ表示
- 既存のストレングス情報の下に配置
- ダークモード対応（colorLight/colorDark使い分け）

### 16P分析タブ（新規）

```
┌─────────────────────────────────────┐
│ 16Personalities チーム分析           │
├─────────────────────────────────────┤
│                                     │
│ 【16タイプマトリクス】               │
│                                     │
│  アナリスト          外交官          │
│  ┌────┬────┐  ┌────┬────┐          │
│  │INTJ│INTP│  │INFJ│INFP│          │
│  │ 2人│ 1人│  │ 0人│ 1人│          │
│  ├────┼────┤  ├────┼────┤          │
│  │ENTJ│ENTP│  │ENFJ│ENFP│          │
│  │ 1人│ 0人│  │ 0人│ 2人│          │
│  └────┴────┘  └────┴────┘          │
│                                     │
│  番人            探検家              │
│  ┌────┬────┐  ┌────┬────┐          │
│  │ISTJ│ISFJ│  │ISTP│ISFP│          │
│  │ 2人│ 1人│  │ 1人│ 0人│          │
│  ├────┼────┤  ├────┼────┤          │
│  │ESTJ│ESFJ│  │ESTP│ESFP│          │
│  │ 2人│ 0人│  │ 1人│ 0人│          │
│  └────┴────┘  └────┴────┘          │
│                                     │
│ 【役割グループ分布】                 │
│  🟣 アナリスト: 4人（28.6%）         │
│  🟢 外交官: 3人（21.4%）             │
│  🔵 番人: 5人（35.7%）← 最多        │
│  🟡 探検家: 2人（14.3%）             │
│                                     │
│ 【バリアント分布】                   │
│  自己主張型（-A）: 6人（42.9%）      │
│  慎重型（-T）: 8人（57.1%）          │
│                                     │
│ 【タイプ別メンバーリスト】           │
│  ▼ INTJ（建築家）- 2人              │
│     • 山田 太郎（DEV-001）           │
│     • 高橋 美咲（DEV-002）           │
└─────────────────────────────────────┘
```

**インタラクション**:
- マトリクスのセルをクリック → タイプ別メンバーリストにスクロール
- メンバー名をクリック → 個人分析タブに遷移してそのメンバーを選択

## 🔧 実装チェックリスト

### Phase 1: データ構造とサービス層 🟡
- [ ] `StrengthsTypes.ts` に `personalityId` と `personalityVariant` を追加
- [ ] `Personality16Service.ts` を作成
  - [ ] `PERSONALITY_TYPES_DATA` マスターデータ（全16タイプ）
  - [ ] `getPersonalityById(id: number)` 関数
  - [ ] `getPersonalityByCode(code: string)` 関数
  - [ ] `analyzeTeamPersonalities(members: MemberStrengths[])` 関数
- [ ] サービス層の単体テスト作成
- [ ] LocalStorage の互換性確認（既存データが壊れないか）

### Phase 2: 個人分析タブ統合 🟡
- [ ] `Personality16Card.tsx` を作成
  - [ ] タイプアイコン表示
  - [ ] 役割グループバッジ
  - [ ] バリアントバッジ（-A / -T）
  - [ ] 公式説明文表示
  - [ ] ダークモード対応（colorLight/colorDark切り替え）
- [ ] `IndividualStrengths.tsx` に統合
  - [ ] `selectedMember.personalityId` がある場合のみ表示
- [ ] `MemberForm.tsx` を修正
  - [ ] 16Pタイプ選択ドロップダウン追加
  - [ ] バリアント選択（A/T）追加
  - [ ] バリデーション追加
- [ ] `MembersList.tsx` に16Pバッジ追加（任意）
- [ ] Phase 2の統合テスト

### Phase 3: 16P分析タブ作成 🟡
- [ ] `Personality16Matrix.tsx` を作成
  - [ ] 4×4グリッドレイアウト
  - [ ] 役割グループごとに色分け
  - [ ] クリック時のスクロール処理
- [ ] `RoleGroupDistribution.tsx` を作成
  - [ ] 役割グループ別の人数・割合表示
  - [ ] 円グラフまたはバーチャート
- [ ] `TypeMembersList.tsx` を作成
  - [ ] タイプ別メンバーリスト
  - [ ] アコーディオンUI
  - [ ] メンバー名クリック → 個人分析タブ遷移
- [ ] `Personality16TeamAnalysis.tsx` を作成
  - [ ] 上記3コンポーネントを統合
- [ ] `StrengthsFinderPage.tsx` にタブ追加
  - [ ] タブ名: "16P分析"
  - [ ] アイコン: 🧠
- [ ] Phase 3の統合テスト

### Phase 4: 総合テスト・仕上げ 🟡
- [ ] 全画面での動作確認
- [ ] ダークモード切り替え確認
- [ ] LocalStorage の読み書き確認
- [ ] インポート/エクスポート機能の確認
- [ ] レスポンシブデザイン確認
- [ ] アクセシビリティ確認
- [ ] ドキュメント更新（README.md）

## 🧪 テスト方針

### 単体テスト（Jest + React Testing Library）

#### Personality16Service.test.ts
```typescript
describe('Personality16Service', () => {
  test('getPersonalityById: 有効なIDで正しいタイプを取得', () => {
    const personality = getPersonalityById(1);
    expect(personality?.code).toBe('INTJ');
  });

  test('getPersonalityById: 無効なIDでundefinedを返す', () => {
    const personality = getPersonalityById(999);
    expect(personality).toBeUndefined();
  });

  test('analyzeTeamPersonalities: 正しい集計結果を返す', () => {
    const members = [
      { id: '1', personalityId: 1, ... }, // INTJ
      { id: '2', personalityId: 1, ... }, // INTJ
      { id: '3', personalityId: 5, ... }, // INFJ
    ];
    const analysis = analyzeTeamPersonalities(members);
    expect(analysis.typeDistribution[1]).toBe(2); // INTJ: 2人
    expect(analysis.typeDistribution[5]).toBe(1); // INFJ: 1人
  });
});
```

#### Personality16Card.test.tsx
```typescript
describe('Personality16Card', () => {
  test('personalityIdがあれば表示される', () => {
    render(<Personality16Card personalityId={1} variant="A" />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
    expect(screen.getByText('建築家')).toBeInTheDocument();
  });

  test('ダークモードで正しい色が適用される', () => {
    // ThemeContextをmockしてテスト
  });
});
```

### 統合テスト

#### E2Eテストシナリオ
1. **16P情報の登録**
   - メンバー追加フォームで16Pタイプを選択
   - 保存後、個人分析タブで16P情報が表示される

2. **16P情報の編集**
   - 既存メンバーの16P情報を編集
   - 変更が即座に反映される

3. **16P分析タブの表示**
   - 16P分析タブに遷移
   - マトリクスに正しい人数が表示される
   - タイプ別リストが正しく表示される

4. **データ互換性**
   - 16P情報がないメンバーも正常に表示される
   - エクスポート/インポートで16P情報が保持される

### 目視確認項目

1. **UI/UX一貫性**
   - 既存のストレングスファインダーUIと調和しているか
   - フォント、色、間隔が統一されているか

2. **ダークモード対応**
   - 全16タイプの色がダークモードで視認可能か
   - テキストのコントラストが十分か

3. **レスポンシブデザイン**
   - モバイル画面でマトリクスが崩れないか

4. **アクセシビリティ**
   - キーボード操作が可能か
   - スクリーンリーダーで読み上げ可能か

## 📝 実装ガイドライン

### 16Personalitiesマスターデータの作成

#### 公式サイトからの情報取得
```typescript
// src/services/Personality16Service.ts

export const PERSONALITY_TYPES_DATA: Personality16Type[] = [
  {
    id: 1,
    code: "INTJ",
    name: "建築家",
    nameEn: "Architect",
    role: "analyst",
    roleName: "アナリスト",
    description: `
      想像力が豊かで、戦略的な思考の持ち主。あらゆることに計画を立てる。

      【特徴】
      - 独立心が高く、長期的なビジョンを持って行動する
      - 論理的で分析的な思考を好む
      - 計画を立てて体系的に物事を進める

      （出典: 16Personalities公式サイト）
      https://www.16personalities.com/ja/intj型の性格
    `,
    colorLight: "#8B4789",
    colorDark: "#B565B3"
  },
  // ... 全16タイプ
];
```

**著作権対応**:
- 説明文は16Personalities公式サイトから引用
- 出典URLを明記
- パブリック情報として適切に利用

### コンポーネント設計パターン

#### Personality16Card.tsx
```typescript
interface Props {
  personalityId: number;
  variant?: 'A' | 'T';
}

const Personality16Card: React.FC<Props> = ({ personalityId, variant }) => {
  const { themeId } = useTheme();
  const isDark = themeId === 'dark';

  const personality = Personality16Service.getPersonalityById(personalityId);
  if (!personality) return null;

  const color = isDark ? personality.colorDark : personality.colorLight;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
      {/* タイプアイコン */}
      <div style={{ backgroundColor: `${color}20` }}>
        <span style={{ color }}>{personality.code}</span>
      </div>

      {/* 説明文 */}
      <div className="text-sm text-gray-700 dark:text-gray-300">
        {personality.description}
      </div>
    </div>
  );
};
```

### MemberFormの拡張

```typescript
// src/components/strengths/MemberForm.tsx

const MemberForm: React.FC<Props> = ({ ... }) => {
  const [personalityId, setPersonalityId] = useState<number | undefined>();
  const [personalityVariant, setPersonalityVariant] = useState<'A' | 'T' | undefined>();

  return (
    <form>
      {/* 既存のフォームフィールド */}

      {/* 16Personalities情報（任意） */}
      <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          16Personalities 性格タイプ（任意）
        </h4>

        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
          性格タイプ
        </label>
        <select
          value={personalityId || ''}
          onChange={(e) => setPersonalityId(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2"
        >
          <option value="">未設定</option>
          {Personality16Service.getAllPersonalities().map(p => (
            <option key={p.id} value={p.id}>
              {p.code} - {p.name}（{p.roleName}）
            </option>
          ))}
        </select>

        {personalityId && (
          <>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1 mt-2">
              バリアント
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="A"
                  checked={personalityVariant === 'A'}
                  onChange={() => setPersonalityVariant('A')}
                  className="mr-2"
                />
                自己主張型（-A）
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="T"
                  checked={personalityVariant === 'T'}
                  onChange={() => setPersonalityVariant('T')}
                  className="mr-2"
                />
                慎重型（-T）
              </label>
            </div>
          </>
        )}
      </div>
    </form>
  );
};
```

## ⚠️ 注意事項

### 1. 既存機能への影響を最小化

- **データ互換性**: 16P情報がない既存メンバーも正常に動作
- **UI不変**: ストレングスファインダーのUIは一切変更しない
- **機能独立**: 16P機能が壊れてもストレングスファインダーは動作

### 2. AI分析の禁止

- ✅ 許可: 事実データの表示（「INTJが2人います」）
- ❌ 禁止: 解釈や推奨（「INTJは○○に向いています」）

### 3. 色の管理

- 16タイプ × 2モード = 32色を管理
- 既存のGROUP_COLORS（4色）との調和を保つ
- ダークモードでのコントラストを確保

### 4. パフォーマンス

- マスターデータは定数配列（不要な再計算なし）
- メンバー数が多い場合のマトリクス表示を最適化

### 5. セキュリティ

- ユーザー入力（personalityId）のバリデーション必須
- XSS対策（description表示時）

## 🎉 完了条件

### Phase 1 完了条件
- [ ] `Personality16Service.ts` の全関数が単体テストをパス
- [ ] LocalStorageに16P情報が保存・読み込みできる
- [ ] 既存データが壊れない

### Phase 2 完了条件
- [ ] `MemberForm.tsx` で16Pタイプを選択・保存できる
- [ ] `IndividualStrengths.tsx` で16P情報が表示される
- [ ] ダークモード切り替えで色が正しく変わる
- [ ] 16P情報がないメンバーもエラーなく表示される

### Phase 3 完了条件
- [ ] 16P分析タブが表示される
- [ ] マトリクスに正しい人数が表示される
- [ ] タイプ別リストが表示される
- [ ] クリック時の画面遷移が動作する

### Phase 4 完了条件
- [ ] 全機能が統合テストをパス
- [ ] インポート/エクスポートで16P情報が保持される
- [ ] ドキュメントが更新されている
- [ ] コミット & Push 完了

---

## 📚 参考情報

### 16Personalities公式
- 公式サイト: https://www.16personalities.com/ja
- 性格タイプ一覧: https://www.16personalities.com/ja/personality-types

### 既存実装
- テーマシステム: `src/contexts/ThemeContext.tsx`
- ダークモード仕様: `DARKMODE_GRAPH_SPEC.md`
- ストレングスファインダー型定義: `src/models/StrengthsTypes.ts`

### 技術スタック
- React 19
- TypeScript
- Tailwind CSS (Dark Mode)
- Recharts (グラフライブラリ)
- Jest + React Testing Library

---

## 🚀 次のステップ

1. **TDDテスト計画の作成**: 各コンポーネントのテストケースを詳細化
2. **Phase 1の実装開始**: データ構造とサービス層から着手
3. **継続的なフィードバック**: 各Phaseごとにレビューと調整

---

**仕様書バージョン**: 1.0.0
**作成日**: 2025年10月10日
**最終更新**: 2025年10月10日
