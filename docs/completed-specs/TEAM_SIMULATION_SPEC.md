# チームシミュレーション機能 - 機能仕様書

**作成日**: 2025-10-31
**バージョン**: 1.0
**ステータス**: 🟡 設計フェーズ

---

## 📋 エグゼクティブサマリー

### 目的
来期の組織変更やチーム編成を検討する際、メンバーを動的に再配置し、各グループの強み分布・利益率をリアルタイムでシミュレーションできる機能を提供する。

### ユースケース
- 人事担当者が来期の組織編成を複数パターン試行
- マネージャーが新規プロジェクトのチーム構成を最適化
- 経営層が部署再編の財務インパクトを事前評価

### 主要機能
1. ドラッグ&ドロップによるメンバー再配置
2. グループごとの強み分布グラフ（リアルタイム更新）
3. グループごとの利益率分析（マネージャーモード、リアルタイム更新）
4. シミュレーション結果のエクスポート（JSON）
5. シミュレーション結果のインポート
6. シミュレーション結果の本番データへの反映（上書き警告付き）

---

## 🎯 機能要件

### FR-001: 新規タブ「チームシミュレーション」の追加

**説明**: 既存の4タブ（個人分析、部署分析、選択分析、所有者分析）に加え、5番目のタブとして追加。

**受け入れ基準**:
- [ ] タブ名: 「チームシミュレーション」（アイコン: 🧪 または 🔀）
- [ ] PC表示で最適化（モバイルでは閲覧のみ可能、編集不可メッセージ表示）
- [ ] 初回表示時: 全メンバーが「未配置プール」に表示される

---

### FR-002: メンバーカードのドラッグ&ドロップ

**説明**: メンバーカードをドラッグして、グループ間で移動できる。

**受け入れ基準**:
- [ ] メンバーカードには以下を表示:
  - 氏名
  - 社員番号
  - TOP3資質（アイコン or 略称）
  - 役職アイコン（該当者のみ）
- [ ] ドラッグ中: カードが半透明になる
- [ ] ドロップ可能エリア: 視覚的にハイライト
- [ ] ドロップ後: 即座にグループに追加され、統計が更新される
- [ ] 元のグループから削除される（移動）

**技術要件**:
- ライブラリ: `react-beautiful-dnd` または `@dnd-kit/core`（推奨: @dnd-kit - 軽量）
- ドラッグハンドル: カード全体をドラッグ可能に

---

### FR-003: グループの管理

**説明**: ユーザーが自由にグループを追加・削除・名前変更できる。

**受け入れ基準**:
- [ ] デフォルト: 未配置プール + グループ1, グループ2, グループ3
- [ ] 「+ グループ追加」ボタンで新規グループ作成（最大10グループ）
- [ ] グループ名をクリックでインライン編集可能
- [ ] グループ削除時: 所属メンバーは未配置プールに戻る
- [ ] 未配置プールは削除不可

**データ構造**:
```typescript
interface SimulationGroup {
  id: string;              // UUID
  name: string;            // "グループ1", "営業チーム", etc.
  memberIds: string[];     // 所属メンバーのID配列
  color?: string;          // グループカラー（オプション）
}

interface SimulationState {
  groups: SimulationGroup[];
  unassignedPool: string[]; // 未配置メンバーのID配列
}
```

---

### FR-004: グループごとの強み分布グラフ（リアルタイム）

**説明**: 各グループ内の資質分布を円グラフで表示。メンバー移動時に即座に更新。

**受け入れ基準**:
- [ ] 4つの資質グループ（実行力、影響力、人間関係構築力、戦略的思考力）の割合を表示
- [ ] 使用ライブラリ: Recharts（既存と同じ）
- [ ] グラフサイズ: 各グループカード内にコンパクト表示（200x200px程度）
- [ ] メンバー0人の場合: 「メンバーなし」メッセージ表示
- [ ] ホバー時: 各グループの資質数を表示

**ロジック**:
- 既存の`analyzeDepartment`メソッドを流用
- グループのメンバーリストを渡して`groupDistribution`を計算

---

### FR-005: グループごとの利益率分析（マネージャーモード、リアルタイム）

**説明**: マネージャーモード時、各グループの利益率・総利益を表示。

**受け入れ基準**:
- [ ] 表示項目（グループカード内）:
  - 総売上（月額）
  - 総原価（月額）
  - 総利益（月額）
  - 利益率（%、色分け表示）
- [ ] 利益率の色分け:
  - 40%以上: 緑
  - 20-39%: 青
  - 0-19%: 黄
  - マイナス: 赤
- [ ] メンバー移動時に即座に再計算
- [ ] ステージ情報または単価情報がないメンバー: 「データ不足」警告

**ロジック**:
- `ProfitabilityService.calculateTeamProfitability` を流用
- グループのメンバーリスト + stageMasters + memberRates を渡す

---

### FR-006: シミュレーション結果のエクスポート

**説明**: 現在のシミュレーション状態をJSONファイルとしてエクスポート。

**受け入れ基準**:
- [ ] ボタン位置: 画面右上「エクスポート」ボタン
- [ ] ファイル名: `team-simulation-YYYYMMDD-HHMMSS.json`
- [ ] エクスポート内容:
  - シミュレーション名（ユーザー入力、デフォルト: "2025年度案"）
  - 作成日時
  - グループ定義（名前、メンバーID配列）
  - メンバー情報（氏名、社員番号のみ、資質データは含まない）

**JSONフォーマット**:
```json
{
  "_comment": "Strengths Finder - Team Simulation",
  "version": "1.0",
  "simulationName": "2025年度案A",
  "exportedAt": "2025-10-31T12:00:00.000Z",
  "groups": [
    {
      "id": "uuid-1",
      "name": "営業チーム",
      "memberIds": ["m001", "m002"],
      "members": [
        { "id": "m001", "name": "山田太郎", "employeeNumber": "EMP001" },
        { "id": "m002", "name": "佐藤花子", "employeeNumber": "EMP002" }
      ]
    }
  ],
  "unassignedPool": {
    "memberIds": ["m003"],
    "members": [
      { "id": "m003", "name": "鈴木一郎", "employeeNumber": "EMP003" }
    ]
  }
}
```

---

### FR-007: シミュレーション結果のインポート

**説明**: エクスポートしたJSONファイルをインポートし、シミュレーション状態を復元。

**受け入れ基準**:
- [ ] ボタン位置: 画面右上「インポート」ボタン
- [ ] ファイル選択ダイアログ表示
- [ ] バリデーション:
  - JSONフォーマット検証
  - メンバーIDの存在確認（存在しないIDは警告表示）
  - バージョン互換性チェック
- [ ] インポート成功時: シミュレーション状態を完全に置き換え
- [ ] インポート失敗時: エラーメッセージ表示、状態は変更しない

---

### FR-008: シミュレーション結果の本番データへの反映

**説明**: シミュレーション結果を本番のメンバーデータに反映（部署コードを更新）。

**受け入れ基準**:
- [ ] ボタン位置: 画面右上「本番データに反映」ボタン
- [ ] 実行前: 警告ダイアログ表示
  - タイトル: 「⚠️ 本番データを上書きします」
  - メッセージ: 「シミュレーション結果を本番データに反映すると、すべてのメンバーの部署コードが更新されます。この操作は取り消せません。」
  - 変更内容のプレビュー表示:
    - 「山田太郎: 営業部 → 営業チーム」
    - 「佐藤花子: 開発部 → 開発チーム」
  - ボタン: 「キャンセル」「反映する」
- [ ] 反映実行時:
  - 各メンバーの`department`フィールドをグループ名で上書き
  - LocalStorageに保存
  - 成功メッセージ: 「✅ 本番データに反映しました」
- [ ] 反映後: シミュレーションタブをリセット（全メンバー未配置に戻す）

**注意事項**:
- 未配置プールのメンバーは部署コード「未配置」に設定
- マネージャーモードの単価情報は変更しない

---

## 🎨 UI/UX設計

### レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [個人分析] [部署分析] [選択分析] [所有者分析] [🧪チームシミュレーション] │
├─────────────────────────────────────────────────────────────┤
│  シミュレーション名: [2025年度案A    ]  [エクスポート] [インポート] [本番反映] │
├───────────────┬─────────────────────────────────────────────┤
│ 📦 未配置      │  📊 グループ1 (5人) [×]                       │
│ プール (3人)   │  ┌─────────────────┐                        │
│               │  │ [氏名][社員番号]   │ ← メンバーカード      │
│ [山田太郎]     │  │ TOP3資質表示      │                        │
│ [佐藤花子]     │  └─────────────────┘                        │
│ [鈴木一郎]     │  強み分布: [円グラフ]                          │
│               │  💰利益率: 35.2% (良好)                        │
│               │  総利益: ¥1,200,000/月                        │
│               ├─────────────────────────────────────────────┤
│               │  📊 グループ2 (4人) [×]                       │
│               │  ...                                          │
│               ├─────────────────────────────────────────────┤
│ [+ グループ追加] │  📊 グループ3 (2人) [×]                       │
└───────────────┴─────────────────────────────────────────────┘
```

### 色設計
- 未配置プール: グレー系（bg-gray-100 dark:bg-gray-800）
- グループカード: 白背景、ボーダー付き（bg-white dark:bg-gray-700 border-2）
- ドラッグ中: 半透明（opacity-50）
- ドロップ可能エリア: 青いボーダー点滅（border-blue-400 border-dashed）

### レスポンシブ対応
- デスクトップ（1024px以上）: 左右2カラムレイアウト
- タブレット（768-1023px）: 左右2カラム、グラフは縮小
- モバイル（768px未満）: 編集不可メッセージ表示
  - 「この機能はPC環境で利用してください」

---

## 📊 データ設計

### 新規型定義 (`src/types/simulation.ts`)

```typescript
/**
 * シミュレーショングループ
 */
export interface SimulationGroup {
  id: string;
  name: string;
  memberIds: string[];
  color?: string;
}

/**
 * シミュレーション状態
 */
export interface SimulationState {
  simulationName: string;
  groups: SimulationGroup[];
  unassignedPool: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * シミュレーションエクスポート形式
 */
export interface SimulationExport {
  _comment: string;
  version: string;
  simulationName: string;
  exportedAt: string;
  groups: Array<{
    id: string;
    name: string;
    memberIds: string[];
    members: Array<{
      id: string;
      name: string;
      employeeNumber: string;
    }>;
  }>;
  unassignedPool: {
    memberIds: string[];
    members: Array<{
      id: string;
      name: string;
      employeeNumber: string;
    }>;
  };
}

/**
 * グループ統計情報
 */
export interface GroupStats {
  memberCount: number;
  groupDistribution: Record<StrengthGroup, number>;
  profitability?: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    profitMargin: number;
  };
}
```

### LocalStorage設計

- キー: `strengths-simulation-state`
- 値: `SimulationState` のJSON文字列
- 自動保存: グループ変更、メンバー移動時に即座に保存

---

## 🧪 テスト計画（TDD）

### Phase 1: ユニットテスト

#### Test Suite 1: SimulationService.test.ts

**ファイル**: `src/services/SimulationService.test.ts`

```typescript
describe('SimulationService', () => {
  describe('createGroup', () => {
    test('TC-SIM-001: 新規グループを作成できる', () => {
      const group = SimulationService.createGroup('営業チーム');
      expect(group.id).toBeDefined();
      expect(group.name).toBe('営業チーム');
      expect(group.memberIds).toEqual([]);
    });
  });

  describe('moveMembers', () => {
    test('TC-SIM-002: メンバーをグループ間で移動できる', () => {
      const state = initialState;
      const newState = SimulationService.moveMember(
        state,
        'member1',
        'unassigned',
        'group1'
      );
      expect(newState.unassignedPool).not.toContain('member1');
      expect(newState.groups[0].memberIds).toContain('member1');
    });

    test('TC-SIM-003: 存在しないメンバーの移動はエラー', () => {
      expect(() => {
        SimulationService.moveMember(state, 'invalid', 'unassigned', 'group1');
      }).toThrow('Member not found');
    });
  });

  describe('calculateGroupStats', () => {
    test('TC-SIM-004: グループの統計情報を計算できる', () => {
      const members = [mockMember1, mockMember2];
      const stats = SimulationService.calculateGroupStats(members);
      expect(stats.memberCount).toBe(2);
      expect(stats.groupDistribution).toBeDefined();
    });

    test('TC-SIM-005: メンバー0人のグループは統計0', () => {
      const stats = SimulationService.calculateGroupStats([]);
      expect(stats.memberCount).toBe(0);
      expect(Object.values(stats.groupDistribution).every(v => v === 0)).toBe(true);
    });
  });

  describe('exportSimulation', () => {
    test('TC-SIM-006: シミュレーションをJSON形式でエクスポート', () => {
      const json = SimulationService.exportSimulation(state, members);
      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0');
      expect(parsed.simulationName).toBeDefined();
      expect(parsed.groups).toBeInstanceOf(Array);
    });
  });

  describe('importSimulation', () => {
    test('TC-SIM-007: JSONからシミュレーションをインポート', () => {
      const json = validSimulationJSON;
      const state = SimulationService.importSimulation(json);
      expect(state.groups.length).toBeGreaterThan(0);
    });

    test('TC-SIM-008: 不正なJSONはエラー', () => {
      expect(() => {
        SimulationService.importSimulation('invalid json');
      }).toThrow();
    });

    test('TC-SIM-009: 存在しないメンバーIDは警告', () => {
      const json = simulationWithInvalidMemberId;
      const result = SimulationService.importSimulation(json);
      expect(result.warnings).toContain('Member m999 not found');
    });
  });

  describe('applyToProduction', () => {
    test('TC-SIM-010: シミュレーション結果を本番データに反映', () => {
      const members = [mockMember1, mockMember2];
      const updated = SimulationService.applyToProduction(state, members);
      expect(updated[0].department).toBe('営業チーム');
    });

    test('TC-SIM-011: 未配置メンバーは「未配置」部署に', () => {
      const updated = SimulationService.applyToProduction(state, members);
      const unassigned = updated.find(m => state.unassignedPool.includes(m.id));
      expect(unassigned?.department).toBe('未配置');
    });
  });
});
```

**テスト実行コマンド**:
```bash
npm test -- SimulationService.test.ts
```

**目標カバレッジ**: 90%以上

---

#### Test Suite 2: SimulationContext.test.tsx

**ファイル**: `src/contexts/SimulationContext.test.tsx`

```typescript
describe('SimulationContext', () => {
  test('TC-SIM-CTX-001: 初期状態は未配置プールに全メンバー', () => {
    const { result } = renderHook(() => useSimulation(), {
      wrapper: SimulationProvider
    });
    expect(result.current.unassignedPool.length).toBe(mockMembers.length);
  });

  test('TC-SIM-CTX-002: グループ追加が機能する', () => {
    const { result } = renderHook(() => useSimulation(), {
      wrapper: SimulationProvider
    });
    act(() => {
      result.current.addGroup('新規チーム');
    });
    expect(result.current.groups.length).toBe(4); // 初期3 + 新規1
  });

  test('TC-SIM-CTX-003: メンバー移動が状態を更新する', () => {
    const { result } = renderHook(() => useSimulation(), {
      wrapper: SimulationProvider
    });
    act(() => {
      result.current.moveMember('m001', 'unassigned', 'group1');
    });
    expect(result.current.unassignedPool).not.toContain('m001');
    expect(result.current.groups[0].memberIds).toContain('m001');
  });
});
```

---

### Phase 2: 統合テスト

#### Test Suite 3: TeamSimulation.integration.test.tsx

**ファイル**: `src/components/strengths/TeamSimulation.integration.test.tsx`

```typescript
describe('TeamSimulation Integration', () => {
  test('TC-SIM-INT-001: ドラッグ&ドロップでメンバー移動', async () => {
    render(<TeamSimulation />);
    const memberCard = screen.getByText('山田太郎');
    const targetGroup = screen.getByText('グループ1');

    // react-beautiful-dnd のモック操作
    fireEvent.dragStart(memberCard);
    fireEvent.drop(targetGroup);

    await waitFor(() => {
      expect(screen.getByText('グループ1 (1人)')).toBeInTheDocument();
    });
  });

  test('TC-SIM-INT-002: グラフがリアルタイム更新される', async () => {
    render(<TeamSimulation />);

    // メンバー移動
    const memberCard = screen.getByText('山田太郎');
    const targetGroup = screen.getByText('グループ1');
    fireEvent.dragStart(memberCard);
    fireEvent.drop(targetGroup);

    // グラフが更新されることを確認
    await waitFor(() => {
      const chart = screen.getByTestId('group1-strength-chart');
      expect(chart).toBeInTheDocument();
    });
  });

  test('TC-SIM-INT-003: エクスポート→インポートでデータ復元', async () => {
    const { user } = renderWithUser(<TeamSimulation />);

    // エクスポート
    const exportBtn = screen.getByText('エクスポート');
    await user.click(exportBtn);
    const exportedJSON = await getDownloadedFile();

    // ページリロード（状態リセット）
    render(<TeamSimulation />);

    // インポート
    const importBtn = screen.getByText('インポート');
    await user.click(importBtn);
    await uploadFile(exportedJSON);

    // 状態が復元されることを確認
    expect(screen.getByText('グループ1 (5人)')).toBeInTheDocument();
  });
});
```

---

### Phase 3: E2Eテスト（オプション）

Playwrightを使用したE2Eテストも検討可能：
- シナリオ1: 新規組織編成の作成から本番反映まで
- シナリオ2: エクスポート→編集→インポート→反映

---

## 🏗️ 実装フェーズ

### Phase 1: 基盤実装（2-3日）

#### Day 1: データ層 + サービス層

**実装順序**:
1. 型定義 (`src/types/simulation.ts`)
2. `SimulationService.ts` - ビジネスロジック
   - `createGroup()`
   - `moveMember()`
   - `calculateGroupStats()`
   - `exportSimulation()`
   - `importSimulation()`
   - `applyToProduction()`
3. ユニットテスト（TC-SIM-001 ~ TC-SIM-011）
4. **TDD**: テストを先に書いてから実装

**成果物**:
- [ ] `src/types/simulation.ts`
- [ ] `src/services/SimulationService.ts`
- [ ] `src/services/SimulationService.test.ts`
- [ ] 全テストパス（npm test）

---

#### Day 2: Context + UI基盤

**実装順序**:
1. `SimulationContext.tsx` - 状態管理
   - `useSimulation` hook
   - LocalStorage連携
   - グループ操作メソッド
2. Contextのテスト（TC-SIM-CTX-001 ~ TC-SIM-CTX-003）
3. `TeamSimulation.tsx` - メインコンポーネント（レイアウトのみ）
4. `MemberCard.tsx` - ドラッグ可能なメンバーカード
5. `GroupCard.tsx` - ドロップ可能なグループカード

**成果物**:
- [ ] `src/contexts/SimulationContext.tsx`
- [ ] `src/contexts/SimulationContext.test.tsx`
- [ ] `src/components/strengths/TeamSimulation.tsx`
- [ ] `src/components/strengths/simulation/MemberCard.tsx`
- [ ] `src/components/strengths/simulation/GroupCard.tsx`
- [ ] 全テストパス

---

#### Day 3: ドラッグ&ドロップ実装

**実装順序**:
1. `@dnd-kit/core` インストール
2. DnDContext のセットアップ
3. ドラッグ開始・終了ハンドラー実装
4. ドロップ時のグループ更新ロジック
5. 統合テスト（TC-SIM-INT-001）

**成果物**:
- [ ] ドラッグ&ドロップ機能完動
- [ ] 統合テストパス

---

### Phase 2: 分析機能実装（1-2日）

#### Day 4: グラフ連動

**実装順序**:
1. `GroupStatsCard.tsx` - グループごとの統計カード
2. 強み分布グラフの統合（Recharts）
3. リアルタイム更新ロジック
4. マネージャーモード: 利益率表示の統合
5. 統合テスト（TC-SIM-INT-002）

**成果物**:
- [ ] `src/components/strengths/simulation/GroupStatsCard.tsx`
- [ ] リアルタイムグラフ更新
- [ ] 統合テストパス

---

#### Day 5: エクスポート/インポート/反映機能

**実装順序**:
1. エクスポートボタン + ダウンロード処理
2. インポートボタン + ファイル選択 + バリデーション
3. 本番反映ボタン + 警告ダイアログ
4. 変更プレビュー表示
5. 統合テスト（TC-SIM-INT-003）

**成果物**:
- [ ] エクスポート/インポート機能完動
- [ ] 本番反映機能完動
- [ ] 全統合テストパス

---

### Phase 3: リファクタリング（1日）

#### Day 6: コードクリーンアップ

**実施項目**:
1. **重複コード削除**
   - `calculateGroupStats` と既存の `analyzeDepartment` の共通化
   - `ProfitabilityService` の利用箇所を統一
2. **型安全性の強化**
   - Union型の活用（`GroupId | 'unassigned'`）
   - Nullable型の明示
3. **パフォーマンス最適化**
   - `useMemo` でグラフデータをキャッシュ
   - 大量メンバー時の仮想スクロール検討
4. **アクセシビリティ改善**
   - キーボードナビゲーション対応
   - ARIA属性の追加
5. **ドキュメント整備**
   - TSDoc コメント追加
   - README.md に機能説明追加

**成果物**:
- [ ] ESLint/Prettier エラー0
- [ ] TypeScript strict mode対応
- [ ] テストカバレッジ90%以上
- [ ] ドキュメント更新

---

## 📐 アーキテクチャ設計

### ディレクトリ構造

```
src/
├── components/
│   └── strengths/
│       ├── TeamSimulation.tsx              # メインコンポーネント
│       └── simulation/
│           ├── MemberCard.tsx              # ドラッグ可能カード
│           ├── GroupCard.tsx               # ドロップゾーン
│           ├── GroupStatsCard.tsx          # 統計表示カード
│           ├── SimulationToolbar.tsx       # ツールバー（エクスポート等）
│           └── ApplyConfirmDialog.tsx      # 本番反映確認ダイアログ
├── contexts/
│   └── SimulationContext.tsx               # 状態管理
├── services/
│   └── SimulationService.ts                # ビジネスロジック
├── types/
│   └── simulation.ts                       # 型定義
└── __tests__/
    ├── services/
    │   └── SimulationService.test.ts
    ├── contexts/
    │   └── SimulationContext.test.tsx
    └── integration/
        └── TeamSimulation.integration.test.tsx
```

---

## 🔧 技術スタック

### 新規導入ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| @dnd-kit/core | ^6.1.0 | ドラッグ&ドロップ |
| @dnd-kit/sortable | ^8.0.0 | ソート可能リスト |
| @dnd-kit/utilities | ^3.2.2 | ユーティリティ |
| uuid | ^9.0.0 | グループID生成 |

### インストールコマンド

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities uuid
npm install --save-dev @types/uuid
```

---

## ⚠️ リスク管理

### 技術的リスク

| リスク | 影響度 | 対策 |
|-------|-------|------|
| ドラッグ&ドロップのパフォーマンス | 中 | 仮想スクロール導入検討 |
| モバイル非対応による利用率低下 | 低 | PC専用機能として明示 |
| 大量メンバー時のUI遅延 | 中 | useMemo/useCallback活用 |

### 運用リスク

| リスク | 影響度 | 対策 |
|-------|-------|------|
| 本番反映の誤操作 | 高 | 確認ダイアログ+変更プレビュー |
| エクスポートファイルの紛失 | 中 | 自動保存機能は実装済み |

---

## 📋 チェックリスト

### Phase 1 完了条件
- [ ] 全ユニットテストパス（90%以上カバレッジ）
- [ ] ドラッグ&ドロップ動作
- [ ] LocalStorageにシミュレーション状態保存
- [ ] TypeScriptエラー0

### Phase 2 完了条件
- [ ] グラフリアルタイム更新動作
- [ ] エクスポート/インポート機能動作
- [ ] 本番反映機能動作（警告ダイアログ含む）
- [ ] 全統合テストパス

### Phase 3 完了条件
- [ ] ESLint/Prettierエラー0
- [ ] TSDocコメント整備
- [ ] README.md更新
- [ ] デモ動画作成（オプション）

---

## 🚀 リリース計画

### v1.0.0（Phase 1-3完了後）
- チームシミュレーション機能リリース
- CHANGELOGに追記
- ユーザー向けガイド作成（CLAUDE.md更新）

### 今後の拡張案（v1.1以降）
- シナリオ比較機能（A案 vs B案）
- グループのドラッグ&ドロップでの並び替え
- AIによるチーム編成提案
- 資質の相性スコアを考慮した推奨編成
- 過去のシミュレーション履歴表示

---

## 📝 参考資料

- React DnD: https://react-dnd.github.io/react-dnd/
- @dnd-kit: https://dndkit.com/
- Recharts: https://recharts.org/
- Testing Library: https://testing-library.com/

---

**承認者**: _____________
**実装担当者**: Claude Code
**レビュアー**: _____________
