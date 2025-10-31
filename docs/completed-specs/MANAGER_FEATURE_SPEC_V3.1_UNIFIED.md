# マネージャー機能 - 設計・実装計画書 v3.1（統合版）

## 📌 改訂履歴

| バージョン | 日付 | 変更内容 | 理由 |
|-----------|------|---------|------|
| v1.0 | 2025-10-29 | 初版作成（3層管理） | - |
| v2.0 | 2025-10-29 | 2層シンプル実装に変更 | Githubセキュリティ・時給対応・UX改善 |
| v3.0 | 2025-10-29 | 利益率計算機能を追加 | 経営判断のための利益可視化 |
| **v3.1（統合版）** | 2025-10-29 | **契約単価分離 + 教育期間対応** | 実契約形態に即した正確な利益管理 |

### 🔄 v3.0 → v3.1での主な変更点

```diff
【データモデルの大幅改訂】
+ ✅ contractRate追加（売上と契約単価を明示的に分離）
+ ✅ employmentType導入（regular/contract/bp）
+ ✅ 固定経費方式の採用（契約社員・BP）

【計算ロジックの改善】
- ❌ BP: 売上 × 85% = 原価（v3.0の簡易計算）
+ ✅ BP: 契約単価 + 固定経費 = 原価（実態に即した計算）
+ ✅ 契約社員: 契約単価 + 固定経費
+ ✅ 教育期間: 売上¥0で自動判定

【ステージ体系の拡張】
+ ✅ CONTRACTステージ追加（契約社員用）
+ ✅ S1〜S4, CONTRACT, BPの6種類に拡大

【UI大幅拡張】
+ ✅ 契約単価入力欄（契約社員・BPのみ）
+ ✅ 教育期間メンバー表示（🎓アイコン）
+ ✅ 利益予測プレビューの詳細化
+ ✅ チーム利益率の二重表示（実質 vs 稼働）
```

---

## 📋 プロジェクト概要

### 目的
組織編成と**利益管理**の意思決定を支援するため、既存のStrengthsFinder分析ツールに**個別単価管理 + 利益率計算機能**を追加する。

### ビジネス価値
- 来季のチーム編成において、人件費（顧客請求額）と利益率を可視化
- 資質（強み）× 金額 × **利益率**の3軸でチームを最適化
- アメーバ経営の時間的採算を補完する実利益ベースの管理
- ステージ別・雇用形態別の生産性分析
- **教育投資コストの可視化**（将来への投資管理）

### 制約条件
- ✅ 既存の一般ユーザー機能は完全に保持（後方互換性）
- ✅ ブラウザベース・ゼロコスト運用の継続
- ✅ LocalStorageベースのデータ管理（外部送信なし）
- ✅ **単価・給与・経費情報をGithubリポジトリに含めない**（セキュリティ）
- ✅ ステージIDはJSONに含む（組織内管理前提）

---

## 🔐 セキュリティ設計

### 機密情報の分類と管理方針

| 情報種別 | 機密度 | Github | LocalStorage | JSON | 表示権限 |
|---------|-------|--------|--------------|------|---------|
| ポジション名・色 | 低 | ✅ 可 | - | ✅ 可 | 全員 |
| ステージID | 中 | ❌ 不可 | - | ✅ 可 | マネージャー |
| 売上単価 | 高 | ❌ 不可 | ✅ 保存 | ⚠️ 選択式 | マネージャー |
| 契約単価 | 高 | ❌ 不可 | ✅ 保存 | ⚠️ 選択式 | マネージャー |
| 平均給与 | 高 | ❌ 不可 | ✅ 保存 | ❌ 不可 | マネージャー |
| 固定経費 | 高 | ❌ 不可 | ✅ 保存 | ❌ 不可 | マネージャー |
| 利益・利益率 | 高 | ❌ 不可 | - | ❌ 不可 | マネージャー |

---

## 💰 利益率計算の仕様（4パターン対応）

### 雇用形態と計算方法

#### パターンA: 正社員（REGULAR: S1〜S4）

```typescript
【計算式】
売上（収入）= memberRate（顧客請求額）
給与（支出）= ステージ平均給与（賞与込み年収 ÷ 12）
経費（支出）= 給与 × 経費率（例: 30%）

原価 = 給与 + 経費
利益 = 売上 - 原価
利益率 = (利益 ÷ 売上) × 100

【具体例: S4メンバー】
売上: ¥900,000（顧客請求）
給与: ¥700,000（ステージS4の平均給与）
経費: ¥210,000（給与の30%）
───────────────
原価: ¥910,000
利益: -¥10,000
利益率: -1.1% 🔴（赤字）
```

**特徴:**
- 賞与を含む年収を12で割った月額平均
- 社会保険料・福利厚生費等を経費率で一括計算
- ステージ昇格で給与・経費が段階的に上昇

---

#### パターンB: 契約社員（CONTRACT）

```typescript
【計算式】
売上（収入）= memberRate（顧客請求額）
契約単価（支出）= contractRate（本人への支払額）
経費（支出）= 固定額（例: ¥80,000/月）

原価 = 契約単価 + 経費
利益 = 売上 - 原価
利益率 = (利益 ÷ 売上) × 100

【具体例: 時給契約社員】
売上: ¥600,000（顧客請求）
契約単価: ¥480,000（時給¥3,000 × 160h）
経費: ¥80,000（固定）
───────────────
原価: ¥560,000
利益: ¥40,000
利益率: 6.7% 🟡（低利益）
```

**特徴:**
- ボーナスなし（月額固定）
- 時給または月額契約
- 経費は固定額（社会保険料の会社負担等）
- 正社員より経費が低い

---

#### パターンC: ビジネスパートナー（BP）

```typescript
【計算式】
売上（収入）= memberRate（顧客請求額）
契約単価（支出）= contractRate（BP企業への支払額）
経費（支出）= 固定額（例: ¥50,000/月）

原価 = 契約単価 + 経費
利益 = 売上 - 原価
利益率 = (利益 ÷ 売上) × 100

【具体例: BPメンバー】
売上: ¥800,000（顧客請求）
契約単価: ¥680,000（BP企業への支払）
経費: ¥50,000（固定、管理コスト等）
───────────────
原価: ¥730,000
利益: ¥70,000
利益率: 8.8% 🟡（低利益）
```

**特徴:**
- 業務委託契約（企業間取引）
- ボーナスなし
- 経費は最小限（管理コストのみ）
- 利益率は契約交渉次第

---

#### パターンD: 教育期間メンバー（全雇用形態共通）

```typescript
【判定条件】
memberRate が未設定 OR memberRate.rate === 0
→ 自動的に教育期間として扱う

【計算式】
売上（収入）= ¥0（顧客請求なし）
原価（支出）= 通常の原価計算と同じ
  - 正社員: 給与 + 経費
  - 契約社員: 契約単価 + 固定経費
  - BP: 契約単価 + 固定経費

利益 = ¥0 - 原価 = マイナス（教育投資コスト）
利益率 = -100%（計算上、表示は「🎓 教育期間」）

【自動解除条件】
memberRate.rate > 0 を設定
→ 自動的に通常メンバーとして扱われる

【具体例: S2の教育期間メンバー】
売上: ¥0（教育期間）
給与: ¥450,000
経費: ¥135,000（30%）
───────────────
原価: ¥585,000
利益: -¥585,000
表示: 🎓 教育期間
      投資: ¥585,000/月
```

**特徴:**
- 客先での教育期間・入場前の準備期間を想定
- 売上がないため必ずマイナス（教育投資）
- 原価は通常通り発生（給与・契約単価・経費）
- 将来への投資として可視化

---

### 計算方法の比較表

| 雇用形態 | 売上 | 原価の内訳 | 経費の計算方法 | 利益率目安 | 備考 |
|---------|------|-----------|--------------|----------|------|
| 正社員<br>(S1〜S4) | 顧客請求額 | 給与 + 経費 | 給与 × 30% | 20〜30% | 賞与込み |
| 契約社員<br>(CONTRACT) | 顧客請求額 | 契約単価 + 経費 | 固定¥80,000 | 5〜15% | 時給or月額 |
| BP<br>(BP) | 顧客請求額 | 契約単価 + 経費 | 固定¥50,000 | 5〜15% | 企業間契約 |
| 教育期間<br>(全雇用形態) | ¥0 | 通常通り | 通常通り | -100% | 将来への投資 |

---

### チーム全体への影響（教育期間メンバー含む）

#### ケース1: 教育期間メンバーなし

```
【稼働メンバー6名のみ】
売上: ¥5,200,000
原価: ¥3,900,000
───────────────
利益: ¥1,300,000
利益率: 25.0% ✅

表示:
┌─────────────────────────┐
│ 💰 売上・利益分析      │
├─────────────────────────┤
│ 売上: ¥5,200,000       │
│ 原価: ¥3,900,000       │
│ 利益: ¥1,300,000       │
│ 利益率: 25.0% ✅       │
└─────────────────────────┘
```

#### ケース2: 教育期間メンバー1名あり

```
【稼働6名 + 教育1名（S2）】
売上: ¥5,200,000（変わらず）
原価: ¥4,485,000
  - 稼働メンバー: ¥3,900,000
  - 教育投資: ¥585,000
───────────────
利益: ¥715,000
実質利益率: 13.8%（⬇️ 11.2pt）
稼働利益率: 25.0%（教育除く）

表示:
┌─────────────────────────┐
│ 💰 売上・利益分析      │
├─────────────────────────┤
│ 売上: ¥5,200,000       │
│ 原価: ¥4,485,000       │
│   └ 🎓 教育投資(1名):  │
│       ¥585,000         │
│ 利益: ¥715,000         │
│ 実質利益率: 13.8%      │
│ 稼働利益率: 25.0%      │
│ (教育コスト除く)       │
└─────────────────────────┘
```

---

## 🏗️ 技術設計

### データモデル

#### 1. EmploymentType型（新規）

```typescript
// types/profitability.ts
export type EmploymentType = 'regular' | 'contract' | 'bp';

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  regular: '正社員',
  contract: '契約社員',
  bp: 'ビジネスパートナー',
};
```

#### 2. StageMaster型（v3.0から改訂）

```typescript
// types/profitability.ts
export interface StageMaster {
  id: string;                      // 'S1', 'S2', 'S3', 'S4', 'CONTRACT', 'BP'
  name: string;                    // 'ステージ1', '契約社員', ...
  employmentType: EmploymentType;  // 雇用形態（NEW）
  
  // 正社員用（employmentType === 'regular'のみ）
  averageSalary?: number;          // 平均給与（月額、賞与込み）
  salaryExpenseRate?: number;      // 給与に対する経費率（0.30 = 30%）
  
  // 契約社員・BP用（employmentType === 'contract' | 'bp'）
  fixedExpense?: number;           // 固定経費（月額）（NEW）
  
  description?: string;            // 説明文
  color?: string;                  // 表示用カラー
}

// デフォルト値
export const DEFAULT_STAGE_MASTERS: StageMaster[] = [
  // 正社員
  {
    id: 'S1',
    name: 'ステージ1',
    employmentType: 'regular',
    averageSalary: 350000,
    salaryExpenseRate: 0.30,
    description: '新入社員〜3年目',
    color: '#94A3B8',
  },
  {
    id: 'S2',
    name: 'ステージ2',
    employmentType: 'regular',
    averageSalary: 450000,
    salaryExpenseRate: 0.30,
    description: '中堅社員',
    color: '#64748B',
  },
  {
    id: 'S3',
    name: 'ステージ3',
    employmentType: 'regular',
    averageSalary: 550000,
    salaryExpenseRate: 0.30,
    description: 'ベテラン社員',
    color: '#475569',
  },
  {
    id: 'S4',
    name: 'ステージ4',
    employmentType: 'regular',
    averageSalary: 700000,
    salaryExpenseRate: 0.30,
    description: 'マネージャー層',
    color: '#334155',
  },
  
  // 契約社員（NEW）
  {
    id: 'CONTRACT',
    name: '契約社員',
    employmentType: 'contract',
    fixedExpense: 80000,
    description: '時給または月額契約（ボーナスなし）',
    color: '#06B6D4',
  },
  
  // ビジネスパートナー
  {
    id: 'BP',
    name: 'ビジネスパートナー',
    employmentType: 'bp',
    fixedExpense: 50000,
    description: '業務委託・外部協力者',
    color: '#8B5CF6',
  },
];
```

#### 3. ContractRate型（新規）

```typescript
// types/profitability.ts
export interface ContractRate {
  rateType: 'monthly' | 'hourly';
  rate: number;        // 月額単価 or 時給
  hours?: number;      // 時給の場合の月間稼働時間
}
```

#### 4. MemberStrengths型の拡張

```typescript
// models/StrengthsTypes.ts
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  positionId?: string;
  
  // 売上情報（顧客請求額）
  memberRate?: MemberRate;
  
  // 契約単価（支出、契約社員・BPのみ）← NEW
  contractRate?: ContractRate;
  
  // ステージID
  stageId?: string;
  
  strengths: { id: number; score: number }[];
}
```

#### 5. MemberProfitability型

```typescript
// types/profitability.ts
export interface MemberProfitability {
  memberId: string;
  revenue: number;       // 月間売上（顧客請求額）
  cost: number;          // 月間原価
  profit: number;        // 月間利益
  profitMargin: number;  // 利益率（%）
  
  // 教育期間フラグ（NEW）
  isTraining: boolean;
  
  // 詳細（デバッグ・表示用）
  details: {
    employmentType: EmploymentType;
    
    // 正社員の場合
    salary?: number;           // 平均給与
    salaryExpense?: number;    // 給与に対する経費
    
    // 契約社員・BPの場合
    contractAmount?: number;   // 契約単価
    fixedExpense?: number;     // 固定経費
    
    stageId?: string;
  };
}
```

#### 6. TeamProfitability型

```typescript
// types/profitability.ts
export interface TeamProfitability {
  // 基本集計
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;        // 実質利益率（教育コスト含む）
  
  memberCount: number;
  averageRevenue: number;
  averageProfit: number;
  
  profitByStage: Record<string, {
    count: number;
    totalProfit: number;
    averageProfitMargin: number;
  }>;
  
  // 教育期間関連（NEW）
  trainingCost: number;        // 教育投資コスト合計
  trainingCount: number;       // 教育期間メンバー数
  activeProfitMargin: number;  // 稼働利益率（教育コスト除く）
  hasTrainingMembers: boolean; // 教育メンバーが存在するか
}
```

---

### サービス層

#### ProfitabilityService（v3.1統合版）

```typescript
// services/profitabilityService.ts
export class ProfitabilityService {
  private static readonly STORAGE_KEY = 'stage_masters';
  
  /**
   * ステージマスタの取得
   */
  static getStageMasters(): StageMaster[] {
    const custom = localStorage.getItem(this.STORAGE_KEY);
    return custom ? JSON.parse(custom) : DEFAULT_STAGE_MASTERS;
  }
  
  /**
   * ステージマスタの保存
   */
  static saveStageMasters(masters: StageMaster[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(masters));
  }
  
  /**
   * 教育期間メンバーの判定
   */
  static isTrainingMember(member: MemberStrengths): boolean {
    // memberRate未設定 or rate=0 → 教育期間
    return !member.memberRate || member.memberRate.rate === 0;
  }
  
  /**
   * 契約単価の月額換算
   */
  static calculateContractAmount(contractRate: ContractRate): number {
    if (contractRate.rateType === 'hourly') {
      const hours = contractRate.hours || 160;
      return contractRate.rate * hours;
    }
    return contractRate.rate;
  }
  
  /**
   * メンバー個人の利益計算
   */
  static calculateMemberProfitability(
    member: MemberStrengths,
    stageMasters: StageMaster[]
  ): MemberProfitability | null {
    // ステージ情報の取得
    if (!member.stageId) return null;
    const stage = stageMasters.find(s => s.id === member.stageId);
    if (!stage) return null;
    
    // 教育期間の判定
    const isTraining = this.isTrainingMember(member);
    
    // 売上の取得
    let revenue: number;
    if (isTraining) {
      // 教育期間: 売上ゼロ
      revenue = 0;
    } else {
      revenue = FinancialService.calculateMonthlyRate(member);
      if (revenue === 0) return null; // データ不整合
    }
    
    // 原価の計算（雇用形態別）
    let cost: number;
    let details: MemberProfitability['details'];
    
    switch (stage.employmentType) {
      case 'regular':
        // 正社員: 給与 + 経費
        const salary = stage.averageSalary || 0;
        const salaryExpense = salary * (stage.salaryExpenseRate || 0.30);
        cost = salary + salaryExpense;
        
        details = {
          employmentType: 'regular',
          salary,
          salaryExpense,
          stageId: member.stageId,
        };
        break;
      
      case 'contract':
      case 'bp':
        // 契約社員・BP: 契約単価 + 固定経費
        if (!member.contractRate) {
          // 契約単価が未設定の場合はnullを返す
          return null;
        }
        
        const contractAmount = this.calculateContractAmount(member.contractRate);
        const fixedExpense = stage.fixedExpense || 0;
        cost = contractAmount + fixedExpense;
        
        details = {
          employmentType: stage.employmentType,
          contractAmount,
          fixedExpense,
          stageId: member.stageId,
        };
        break;
    }
    
    // 利益・利益率
    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : -100;
    
    return {
      memberId: member.id,
      revenue,
      cost,
      profit,
      profitMargin,
      isTraining,
      details,
    };
  }
  
  /**
   * チーム全体の利益計算
   */
  static calculateTeamProfitability(
    members: MemberStrengths[],
    stageMasters: StageMaster[]
  ): TeamProfitability {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    
    // 教育期間関連
    let trainingCost = 0;
    let trainingCount = 0;
    
    const profitByStage: Record<string, {
      count: number;
      totalProfit: number;
      totalProfitMargin: number;
    }> = {};
    
    let validMemberCount = 0;
    
    members.forEach(member => {
      const profitability = this.calculateMemberProfitability(member, stageMasters);
      if (!profitability) return;
      
      totalRevenue += profitability.revenue;
      totalCost += profitability.cost;
      totalProfit += profitability.profit;
      validMemberCount++;
      
      // 教育期間メンバーの集計
      if (profitability.isTraining) {
        trainingCost += profitability.cost;
        trainingCount++;
      }
      
      // ステージ別集計
      const stageId = member.stageId!;
      if (!profitByStage[stageId]) {
        profitByStage[stageId] = {
          count: 0,
          totalProfit: 0,
          totalProfitMargin: 0,
        };
      }
      profitByStage[stageId].count++;
      profitByStage[stageId].totalProfit += profitability.profit;
      
      // 教育期間メンバーは利益率計算に含めない
      if (!profitability.isTraining) {
        profitByStage[stageId].totalProfitMargin += profitability.profitMargin;
      }
    });
    
    // ステージ別平均利益率の計算
    Object.keys(profitByStage).forEach(stageId => {
      const data = profitByStage[stageId];
      // 教育期間メンバーを除いた人数で平均を取る
      const activeCount = data.count - members.filter(m => 
        m.stageId === stageId && this.isTrainingMember(m)
      ).length;
      
      if (activeCount > 0) {
        data.totalProfitMargin = data.totalProfitMargin / activeCount;
      } else {
        data.totalProfitMargin = 0;
      }
    });
    
    // 実質利益率（教育コスト含む）
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    // 稼働利益率（教育コスト除く）
    const activeCost = totalCost - trainingCost;
    const activeProfit = totalRevenue - activeCost;
    const activeProfitMargin = totalRevenue > 0 ? (activeProfit / totalRevenue) * 100 : 0;
    
    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      
      memberCount: validMemberCount,
      averageRevenue: validMemberCount > 0 ? totalRevenue / validMemberCount : 0,
      averageProfit: validMemberCount > 0 ? totalProfit / validMemberCount : 0,
      
      profitByStage,
      
      // 教育期間関連
      trainingCost,
      trainingCount,
      activeProfitMargin,
      hasTrainingMembers: trainingCount > 0,
    };
  }
  
  /**
   * 利益率のステータス判定
   */
  static getProfitMarginStatus(
    profitMargin: number,
    isTraining: boolean
  ): 'training' | 'danger' | 'warning' | 'good' {
    if (isTraining) return 'training';     // 教育期間
    if (profitMargin < 0) return 'danger';     // 赤字
    if (profitMargin < 15) return 'warning';   // 低利益
    return 'good';                              // 健全
  }
  
  /**
   * 利益率のステータス色
   */
  static getProfitMarginColor(
    profitMargin: number,
    isTraining: boolean
  ): string {
    const status = this.getProfitMarginStatus(profitMargin, isTraining);
    return {
      training: '#F97316',  // オレンジ（教育期間）
      danger: '#EF4444',    // 赤
      warning: '#F59E0B',   // 黄
      good: '#10B981',      // 緑
    }[status];
  }
}
```

---

## 📦 コンポーネント設計

### 新規コンポーネント

#### 1. StageMasterSettings
**責務:** ステージマスタの設定画面

**ファイル:** `src/components/profitability/StageMasterSettings.tsx`

**主な機能:**
- 正社員（S1〜S4）: 平均給与・経費率の設定
- 契約社員・BP: 固定経費の設定
- リアルタイム原価プレビュー
- LocalStorageへの保存

#### 2. ProfitabilitySummaryPanel
**責務:** チーム全体の利益率サマリー表示

**ファイル:** `src/components/profitability/ProfitabilitySummaryPanel.tsx`

**主な機能:**
- 売上・原価・利益・利益率の表示
- 教育投資コストの表示（条件分岐）
- 実質利益率 vs 稼働利益率の併記
- ステージ別内訳

#### 3. ProfitabilityBadge
**責務:** メンバー個別の利益率バッジ

**ファイル:** `src/components/profitability/ProfitabilityBadge.tsx`

**主な機能:**
- 利益率の色分け表示
- コンパクト表示モード
- 詳細ツールチップ

#### 4. TrainingMemberBadge
**責務:** 教育期間メンバーのバッジ表示

**ファイル:** `src/components/profitability/TrainingMemberBadge.tsx`

**主な機能:**
- 🎓アイコン表示
- 教育投資額の表示
- コンパクト表示モード

---

### 既存コンポーネントの修正

#### MemberForm（大幅拡張）

**変更内容:**
- ステージ選択時の雇用形態判定
- 売上単価入力欄（全員必須）
- 契約単価入力欄（契約社員・BPのみ、条件分岐表示）
  - 契約社員: 時給 + 稼働時間 or 月額
  - BP: 月額のみ
- 利益予測プレビュー（雇用形態別の詳細表示）
  - 通常メンバー: 利益率と色分け
  - 教育期間: 教育投資額表示

#### MembersList

**変更内容:**
- 利益率カラム追加（マネージャーモードのみ）
- 教育期間メンバーの特別表示（🎓アイコン）
- ProfitabilityBadge vs TrainingMemberBadgeの出し分け
- ステージバッジ表示

#### StrengthsContext

**変更内容:**
- `contractRate`フィールドの保存・読み込み
- JSONエクスポート時の契約単価含有制御（選択式）
- 教育期間判定の統合

---

## 🚀 実装ステップ

### 実装の優先順位

```
Phase 1: データモデル改訂（必須） ← 最優先
  → contractRate, employmentType, 固定経費

Phase 2: 計算ロジック実装（コア） ← 高優先度
  → 雇用形態別の原価計算

Phase 3: 基本UI実装 ← 高優先度
  → 契約単価入力、利益率表示

Phase 4: 教育期間対応（追加機能） ← 中優先度
  → 売上¥0判定、TrainingMemberBadge
  ※Phase 3完了後に実装でもOK
```

---

### Phase 1: データモデル改訂（0.5日）

**目標:** v3.0からv3.1へのデータ構造変更

```bash
mkdir -p src/types
touch src/types/profitability.ts
```

**タスク:**
- [ ] `EmploymentType`型定義
- [ ] `ContractRate`型定義
- [ ] `StageMaster`型の改訂
  - [ ] `employmentType`追加
  - [ ] `salaryExpenseRate`（名称変更）
  - [ ] `fixedExpense`追加
- [ ] `MemberStrengths`型に`contractRate`追加
- [ ] `MemberProfitability`型に`isTraining`追加
- [ ] `TeamProfitability`型に教育関連フィールド追加
- [ ] `DEFAULT_STAGE_MASTERS`の更新（CONTRACTステージ追加）

**完了条件:**
- [ ] TypeScriptのコンパイルエラーがない
- [ ] 型定義のテストが通る

---

### Phase 2: 計算ロジック実装（1日）

**目標:** 雇用形態別の利益率計算

```bash
touch src/services/profitabilityService.ts
```

**タスク:**
- [ ] `ProfitabilityService`クラス作成
- [ ] `getStageMasters()` - LocalStorage読込
- [ ] `saveStageMasters()` - LocalStorage保存
- [ ] `isTrainingMember()` - 教育期間判定
- [ ] `calculateContractAmount()` - 契約単価の月額換算
- [ ] `calculateMemberProfitability()` - 個人利益計算
  - [ ] 正社員の計算ロジック
  - [ ] 契約社員の計算ロジック
  - [ ] BPの計算ロジック
  - [ ] 教育期間の処理
- [ ] `calculateTeamProfitability()` - チーム利益計算
  - [ ] 教育コスト集計
  - [ ] 稼働利益率計算
- [ ] `getProfitMarginStatus()` - ステータス判定
- [ ] `getProfitMarginColor()` - 色判定

**完了条件:**
- [ ] 正社員の利益率計算が正しい
- [ ] 契約社員の利益率計算が正しい
- [ ] BPの利益率計算が正しい
- [ ] 教育期間の判定・計算が正しい
- [ ] チーム集計が正しい
- [ ] 単体テストが全てパス

---

### Phase 3: 基本UI実装（1.5日）

**目標:** 契約単価入力と利益率表示

#### ステップ3.1: ステージマスタ設定画面（0.5日）

```bash
touch src/components/profitability/StageMasterSettings.tsx
```

**タスク:**
- [ ] 正社員セクション（給与 + 経費率）
- [ ] 契約社員・BPセクション（固定経費のみ）
- [ ] 原価合計のプレビュー表示
- [ ] バリデーション強化
- [ ] LocalStorageへの保存

#### ステップ3.2: MemberFormの大幅拡張（0.5日）

**タスク:**
- [ ] ステージ選択時の雇用形態判定
- [ ] 売上単価入力欄（既存、教育期間の説明追加）
- [ ] 契約単価入力欄（条件分岐表示）
  - [ ] 契約社員: 時給 + 稼働時間入力
  - [ ] BP: 月額単価入力
  - [ ] 月額換算の自動表示
- [ ] 利益予測プレビュー
  - [ ] 雇用形態別の原価内訳表示
  - [ ] リアルタイム利益率計算

#### ステップ3.3: 利益率表示コンポーネント（0.5日）

```bash
touch src/components/profitability/ProfitabilitySummaryPanel.tsx
touch src/components/profitability/ProfitabilityBadge.tsx
```

**タスク:**
- [ ] `ProfitabilitySummaryPanel`実装
  - [ ] 売上・原価・利益・利益率の表示
  - [ ] ステージ別内訳表示
- [ ] `ProfitabilityBadge`実装
  - [ ] 利益率の色分けバッジ
  - [ ] ツールチップで詳細表示
- [ ] `MembersList`への統合

**完了条件:**
- [ ] 契約社員の追加・編集ができる
- [ ] BPの追加・編集ができる
- [ ] 利益率が正しく表示される
- [ ] 統合テストが全てパス

---

### Phase 4: 教育期間対応（1日）【オプション】

**目標:** 教育投資コストの可視化

**注意:** Phase 3完了後に実装してもOK。Phase 1-3で基本機能は完成。

#### ステップ4.1: 教育期間ロジック（0.5日）

**タスク:**
- [ ] `isTrainingMember()`の統合確認
- [ ] `calculateMemberProfitability()`の教育期間処理確認
- [ ] `calculateTeamProfitability()`の教育コスト集計確認
- [ ] 教育期間の単体テスト

#### ステップ4.2: 教育期間UI（0.5日）

```bash
touch src/components/profitability/TrainingMemberBadge.tsx
```

**タスク:**
- [ ] `TrainingMemberBadge`作成
  - [ ] コンパクト表示モード
  - [ ] 詳細表示モード
  - [ ] 教育投資額の表示
- [ ] `ProfitabilitySummaryPanel`の拡張
  - [ ] 教育投資コストの表示（条件分岐）
  - [ ] 実質利益率 vs 稼働利益率の併記
- [ ] `MembersList`の修正
  - [ ] `TrainingMemberBadge`の統合
  - [ ] 教育期間メンバーの特別表示
- [ ] `MemberForm`の修正
  - [ ] 教育投資予測プレビュー
  - [ ] 売上¥0入力時のヘルプテキスト

**完了条件:**
- [ ] 売上¥0で教育期間として扱われる
- [ ] 教育投資コストが表示される
- [ ] 実質利益率・稼働利益率が正しい
- [ ] 売上設定で自動解除される
- [ ] 統合テストが全てパス

---

## ✅ テスト計画

### 単体テスト - ProfitabilityService

#### 正社員の利益計算
```typescript
describe('calculateMemberProfitability - 正社員', () => {
  it('S4メンバー: 売上90万、給与70万、経費率30%', () => {
    const member = {
      id: '001',
      stageId: 'S4',
      memberRate: { rateType: 'monthly', rate: 900000 },
    };
    
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result.revenue).toBe(900000);
    expect(result.cost).toBe(910000); // 700000 + 210000
    expect(result.profit).toBe(-10000);
    expect(result.profitMargin).toBeCloseTo(-1.1, 1);
    expect(result.isTraining).toBe(false);
  });
});
```

#### 契約社員の利益計算
```typescript
describe('calculateMemberProfitability - 契約社員', () => {
  it('時給3000円×160h、売上60万、固定経費8万', () => {
    const member = {
      id: '002',
      stageId: 'CONTRACT',
      memberRate: { rateType: 'monthly', rate: 600000 },
      contractRate: { rateType: 'hourly', rate: 3000, hours: 160 },
    };
    
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result.revenue).toBe(600000);
    expect(result.cost).toBe(560000); // 480000 + 80000
    expect(result.profit).toBe(40000);
    expect(result.profitMargin).toBeCloseTo(6.7, 1);
    expect(result.isTraining).toBe(false);
  });
});
```

#### BPの利益計算
```typescript
describe('calculateMemberProfitability - BP', () => {
  it('売上80万、契約単価68万、固定経費5万', () => {
    const member = {
      id: '003',
      stageId: 'BP',
      memberRate: { rateType: 'monthly', rate: 800000 },
      contractRate: { rateType: 'monthly', rate: 680000 },
    };
    
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result.revenue).toBe(800000);
    expect(result.cost).toBe(730000); // 680000 + 50000
    expect(result.profit).toBe(70000);
    expect(result.profitMargin).toBeCloseTo(8.8, 1);
    expect(result.isTraining).toBe(false);
  });
});
```

#### 教育期間メンバーの利益計算
```typescript
describe('calculateMemberProfitability - 教育期間', () => {
  it('S2の教育期間メンバー（売上¥0）', () => {
    const member = {
      id: '004',
      stageId: 'S2',
      // memberRate未設定 → 教育期間
    };
    
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result.revenue).toBe(0);
    expect(result.cost).toBe(585000); // 450000 + 135000
    expect(result.profit).toBe(-585000);
    expect(result.profitMargin).toBe(-100);
    expect(result.isTraining).toBe(true);
  });
  
  it('契約社員の教育期間メンバー', () => {
    const member = {
      id: '005',
      stageId: 'CONTRACT',
      contractRate: { rateType: 'hourly', rate: 3000, hours: 160 },
      memberRate: { rateType: 'monthly', rate: 0 }, // 売上¥0 → 教育期間
    };
    
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result.revenue).toBe(0);
    expect(result.cost).toBe(560000); // 480000 + 80000
    expect(result.profit).toBe(-560000);
    expect(result.isTraining).toBe(true);
  });
});
```

#### チーム全体の教育コスト集計
```typescript
describe('calculateTeamProfitability', () => {
  it('稼働6名 + 教育1名', () => {
    const members = [
      // 稼働メンバー6名（省略）
      // 教育メンバー1名（S2）
      { id: '007', stageId: 'S2' }, // memberRate未設定 → 教育期間
    ];
    
    const result = ProfitabilityService.calculateTeamProfitability(
      members,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result.totalRevenue).toBe(5200000); // 変わらず
    expect(result.trainingCost).toBe(585000);
    expect(result.trainingCount).toBe(1);
    expect(result.hasTrainingMembers).toBe(true);
    expect(result.totalCost).toBe(4485000); // 3900000 + 585000
    expect(result.totalProfit).toBe(715000);
    expect(result.profitMargin).toBeCloseTo(13.8, 1); // 実質利益率
    expect(result.activeProfitMargin).toBeCloseTo(25.0, 1); // 稼働利益率
  });
  
  it('教育メンバーなし', () => {
    const members = [
      // 稼働メンバー6名のみ
    ];
    
    const result = ProfitabilityService.calculateTeamProfitability(
      members,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result.trainingCost).toBe(0);
    expect(result.trainingCount).toBe(0);
    expect(result.hasTrainingMembers).toBe(false);
    expect(result.profitMargin).toBeCloseTo(25.0, 1);
    expect(result.activeProfitMargin).toBeCloseTo(25.0, 1); // 同じ
  });
});
```

---

### E2Eシナリオ

#### シナリオ1: 契約社員の追加と利益率確認
1. マネージャーモード（`?mode=manager`）でアクセス
2. メンバー追加フォームを開く
3. ステージ「契約社員」を選択
4. 売上60万を入力
5. 時給3000円、稼働160時間を入力
6. 利益予測で利益率6.7%🟡を確認
7. 保存
8. メンバー一覧で黄色バッジ🟡を確認

#### シナリオ2: BPの追加
1. ステージ「ビジネスパートナー」を選択
2. 売上80万を入力
3. 契約単価68万を入力
4. 利益予測で利益率8.8%🟡を確認
5. 保存
6. チーム利益率サマリーでBPの影響を確認

#### シナリオ3: 教育期間メンバーの追加
1. ステージ「S2」を選択
2. **売上単価を空欄のまま** or 0を入力
3. 利益予測プレビューで「教育投資: ¥585,000/月」を確認
4. 保存
5. メンバー一覧で🎓アイコンと「教育期間」表示を確認
6. チーム利益率サマリーで教育投資コストが表示されることを確認
7. 実質利益率と稼働利益率の両方が表示されることを確認

#### シナリオ4: 教育期間から通常メンバーへの移行
1. 教育期間メンバーを編集
2. 売上単価¥600,000を入力
3. 利益予測が通常表示（利益率26.0%🟢）に切り替わることを確認
4. 保存
5. メンバー一覧で🎓が消え、利益率バッジに変わることを確認
6. チーム利益率サマリーで教育投資が減少することを確認

---

## 💬 想定Q&A

### v3.0 → v3.1の変更について

#### Q1: v3.0の既存データはどうなる？
**A:** 既存のステージID（S1〜S4、BP）はそのまま使えます。ただし、CONTRACTステージは新規追加なので、契約社員メンバーには手動で割り当てる必要があります。

#### Q2: v3.0で入力した給与データは保持される？
**A:** はい。LocalStorageに保存された給与データは引き継がれます。ただし、固定経費は新規項目なのでステージマスタ設定で追加入力が必要です。

#### Q3: BPの計算方式が変わったが、既存BPメンバーはどうなる？
**A:** v3.0では「売上 × 85%」で計算していましたが、v3.1では「契約単価 + 固定経費」に変わります。既存BPメンバーには**契約単価の入力が必要**です。

---

### 契約単価について

#### Q4: 売上単価と契約単価の違いは？
**A:**
- **売上単価（memberRate）**: 顧客への請求額（収入）
- **契約単価（contractRate）**: 本人/BP企業への支払額（支出）

正社員は給与がステージで決まるため契約単価は不要ですが、契約社員・BPは個別の契約単価入力が必要です。

#### Q5: 正社員でも契約単価を入力できる？
**A:** いいえ。正社員はステージ平均給与で計算されます。契約単価は契約社員・BPのみ入力可能です。

#### Q6: 時給の契約社員で稼働時間が月によって変わる場合は？
**A:** 現状は固定時間での計算です。将来的に「月次稼働時間の履歴管理」機能を追加予定です。

---

### 教育期間について

#### Q7: 教育期間メンバーとして登録するには？
**A:** 売上単価を0または空欄のままにしてください。自動的に教育期間として扱われます。

#### Q8: 教育期間を終了するには？
**A:** メンバーを編集して売上単価を設定してください。自動的に通常メンバーに切り替わります。手動での終了操作は不要です。

#### Q9: 教育期間中も原価は発生する？
**A:** はい。給与・契約単価・経費は通常通り計算されます。これが「教育投資コスト」として可視化されます。

#### Q10: チーム利益率はどちらを見るべき？
**A:**
- **実質利益率**: 教育コストを含めた真の利益率（経営判断用）
- **稼働利益率**: 稼働メンバーのみの生産性（チーム評価用）

両方を見ることで、教育投資の影響を正確に把握できます。教育メンバーがいない場合は「利益率」のみ表示されます。

---

### 固定経費について

#### Q11: 契約社員とBPの固定経費の違いは？
**A:**
- **契約社員**: ¥80,000（社会保険料の会社負担等）
- **BP**: ¥50,000（管理コストのみ）

固定経費の金額はステージマスタ設定画面で自由に変更できます。

#### Q12: 固定経費は変更できる？
**A:** はい。ステージマスタ設定画面で自由に変更できます。実態に合わせて調整してください。

---

### その他

#### Q13: ステージの平均給与は誰が見られる？
**A:** マネージャーモード（`?mode=manager`）でアクセスしている人のみが見られます。一般ユーザーには一切表示されません。

#### Q14: ステージIDはJSONに含まれるが、他部署に見られても良い？
**A:** はい。ステージIDは組織内管理情報として扱い、JSONに含めます。各所属長の判断で他部署への開示を決定します。

#### Q15: 赤字メンバーが出たらどうする？
**A:** 以下の対応を検討：
1. 単価の見直し（値上げ交渉）
2. ステージの再評価（実力に応じた調整）
3. 稼働時間の最適化（時給社員の場合）
4. 高利益率メンバーとのバランス調整

---

## 🎯 実装の重要ポイント

### データ移行の注意点

```typescript
// v3.0のデータ
{
  "stageId": "BP",
  "memberRate": { "rateType": "monthly", "rate": 800000 }
  // contractRateなし → v3.1で追加が必要
}

// v3.1で必要な追加データ
{
  "stageId": "BP",
  "memberRate": { "rateType": "monthly", "rate": 800000 },
  "contractRate": { "rateType": "monthly", "rate": 680000 } // NEW
}
```

### 後方互換性の確保

```typescript
// ProfitabilityService内
if (!member.contractRate && stage.employmentType !== 'regular') {
  // 契約単価が未設定の契約社員・BP
  return null; // 利益率計算をスキップ
}
```

### エラーハンドリング

```typescript
// データ不足時の表示
{profitability ? (
  profitability.isTraining ? (
    <TrainingMemberBadge profitability={profitability} />
  ) : (
    <ProfitabilityBadge profitability={profitability} />
  )
) : (
  <div className="text-gray-500 text-sm">
    データ不足（契約単価を設定してください）
  </div>
)}
```

---

## 📅 実装スケジュール（目安）

```
Phase 1: データモデル改訂 → 0.5日
Phase 2: 計算ロジック実装 → 1.0日
Phase 3: 基本UI実装 → 1.5日
───────────────────────────
小計: 3日（契約単価・固定経費対応完了）

Phase 4: 教育期間対応 → 1.0日（オプション）
───────────────────────────
合計: 4日（全機能完成）
```

**注意:**
- Phase 1-3で基本機能は完成します
- Phase 4（教育期間対応）は後回しでもOK
- Phase 3完了時点でレビュー推奨

---

## 🔄 Phase 4（教育期間）を後回しにする場合

Phase 1-3完了後、以下の状態になります：

**実装済み:**
- ✅ 契約単価の入力・管理
- ✅ 雇用形態別の利益率計算
- ✅ 固定経費方式
- ✅ 利益率の可視化

**未実装:**
- ⏸️ 教育期間の自動判定
- ⏸️ 教育投資コストの表示
- ⏸️ 実質利益率 vs 稼働利益率

この状態でも、売上を持つメンバーの利益率管理は完全に機能します。教育期間対応は必要になったタイミングでPhase 4として追加実装できます。

---

## 📚 関連ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発者ガイド
- [CLAUDE.md](./CLAUDE.md) - Claude開発ガイド
- [MANAGER_FEATURE_SPEC.md](./MANAGER_FEATURE_SPEC.md) - v1.0（参考用）
- [MANAGER_FEATURE_SPEC_V2.md](./MANAGER_FEATURE_SPEC_V2.md) - v2.0（参考用）
- [MANAGER_FEATURE_SPEC_V3.md](./MANAGER_FEATURE_SPEC_V3.md) - v3.0（実装済み）

---

**担当者:** SUZUKI Shunpei  
**最終更新:** 2025-10-29  
**バージョン:** 3.1（統合版）
**ステータス:** 実装準備完了
