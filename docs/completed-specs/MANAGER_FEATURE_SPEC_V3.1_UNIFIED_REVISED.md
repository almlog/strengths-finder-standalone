# マネージャー機能 - 設計・実装計画書 v3.1（統合版・改訂版）

## 📌 改訂履歴

| バージョン | 日付 | 変更内容 | 理由 |
|-----------|------|---------|------|
| v1.0 | 2025-10-29 | 初版作成（3層管理） | - |
| v2.0 | 2025-10-29 | 2層シンプル実装に変更 | Githubセキュリティ・時給対応・UX改善 |
| v3.0 | 2025-10-29 | 利益率計算機能を追加 | 経営判断のための利益可視化 |
| v3.1（統合版） | 2025-10-29 | 契約単価分離 + 教育期間対応 | 実契約形態に即した正確な利益管理 |
| **v3.1（改訂版）** | 2025-10-29 | **データモデル整理（案A適用）** | セキュリティ境界の明確化、UI責務分離 |

### 🔄 v3.1改訂版での主な変更点

```diff
【データモデルの明確な分離】
- ❌ MemberStrengthsに機密情報（memberRate, contractRate）
+ ✅ MemberStrengths: 基本情報 + stageIdのみ（JSONエクスポート可）
+ ✅ MemberRateRecord: 単価情報専用（LocalStorageのみ）

【セキュリティの構造的保証】
- ❌ JSONエクスポート時の除外設定に依存
+ ✅ MemberStrengthsに金額情報が最初から存在しない

【UI責務の明確化】
- ❌ 個人編集画面とマネージャー設定で単価入力が重複
+ ✅ 個人編集画面: stageIdのみ設定
+ ✅ マネージャー設定: 単価情報のみ管理

【データ移行】
+ ✅ v3.0 → v3.1改訂版への自動移行スクリプト追加
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
- ✅ **金額情報をGithubリポジトリに含めない**（セキュリティ）
- ✅ **金額情報をMemberStrengthsに含めない**（構造的セキュリティ）← NEW
- ✅ ステージIDはJSONに含む（組織内管理前提）

---

## 🔐 セキュリティ設計（改訂版）

### 情報の3層分離（案A）

```
┌────────────────────────────────────────────┐
│ 第1層: MemberStrengths（JSONエクスポート可）│
├────────────────────────────────────────────┤
│ ✅ 基本情報（名前、部署、強み）            │
│ ✅ stageId（原価構造のテンプレート参照）   │
│ ❌ 金額情報は一切含まない                  │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 第2層: MemberRateRecord（LocalStorageのみ）│
├────────────────────────────────────────────┤
│ 🔒 memberRate（売上単価）                  │
│ 🔒 contractRate（契約単価）                │
│ 🔒 個別メンバーの金額情報                  │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 第3層: StageMaster（LocalStorageのみ）     │
├────────────────────────────────────────────┤
│ 🔒 averageSalary（平均給与）               │
│ 🔒 salaryExpenseRate（経費率）             │
│ 🔒 fixedExpense（固定経費）                │
│ 🔒 ステージごとの原価構造テンプレート      │
└────────────────────────────────────────────┘
```

### 機密情報の分類と管理方針

| 情報種別 | 機密度 | MemberStrengths | MemberRateRecord | StageMaster | JSONエクスポート | 表示権限 |
|---------|-------|----------------|------------------|-------------|----------------|---------|
| 名前・部署・強み | 低 | ✅ | - | - | ✅ 可 | 全員 |
| ステージID | 中 | ✅ | - | - | ✅ 可 | マネージャー |
| 売上単価 | 高 | ❌ | ✅ | - | ❌ 不可 | マネージャー |
| 契約単価 | 高 | ❌ | ✅ | - | ❌ 不可 | マネージャー |
| 平均給与 | 高 | ❌ | - | ✅ | ❌ 不可 | マネージャー |
| 固定経費 | 高 | ❌ | - | ✅ | ❌ 不可 | マネージャー |
| 利益・利益率 | 高 | ❌ | - | - | ❌ 不可 | マネージャー |

### セキュリティ上の利点（案A）

```typescript
✅ JSONエクスポート時の設定ミス防止
  - MemberStrengthsに金額情報が存在しない
  - 除外設定不要、構造的に安全

✅ 将来の機能追加時の安全性
  - 新機能でMemberStrengthsを使っても金額漏洩なし
  - レビュー時の確認が容易

✅ コードの単純化
  - フィルタリングロジック不要
  - エクスポートは単純なJSON.stringify
```

---

## 💰 利益率計算の仕様（4パターン対応）

### 雇用形態と計算方法

#### パターンA: 正社員（REGULAR: S1〜S4）

```typescript
【計算式】
売上（収入）= MemberRateRecord.memberRate（顧客請求額）
給与（支出）= StageMaster.averageSalary（賞与込み年収 ÷ 12）
経費（支出）= 給与 × StageMaster.salaryExpenseRate（例: 30%）

原価 = 給与 + 経費
利益 = 売上 - 原価
利益率 = (利益 ÷ 売上) × 100

【具体例: S4メンバー】
売上: ¥900,000（MemberRateRecord）
給与: ¥700,000（StageMaster S4）
経費: ¥210,000（給与の30%）
───────────────
原価: ¥910,000
利益: -¥10,000
利益率: -1.1% 🔴（赤字）
```

#### パターンB: 契約社員（CONTRACT）

```typescript
【計算式】
売上（収入）= MemberRateRecord.memberRate（顧客請求額）
契約単価（支出）= MemberRateRecord.contractRate（本人への支払額）
経費（支出）= StageMaster.fixedExpense（固定額、例: ¥80,000/月）

原価 = 契約単価 + 経費
利益 = 売上 - 原価
利益率 = (利益 ÷ 売上) × 100

【具体例: 時給契約社員】
売上: ¥600,000（MemberRateRecord）
契約単価: ¥480,000（MemberRateRecord: 時給¥3,000 × 160h）
経費: ¥80,000（StageMaster CONTRACT）
───────────────
原価: ¥560,000
利益: ¥40,000
利益率: 6.7% 🟡（低利益）
```

#### パターンC: ビジネスパートナー（BP）

```typescript
【計算式】
売上（収入）= MemberRateRecord.memberRate（顧客請求額）
契約単価（支出）= MemberRateRecord.contractRate（BP企業への支払額）
経費（支出）= StageMaster.fixedExpense（固定額、例: ¥50,000/月）

原価 = 契約単価 + 経費
利益 = 売上 - 原価
利益率 = (利益 ÷ 売上) × 100

【具体例: BPメンバー】
売上: ¥800,000（MemberRateRecord）
契約単価: ¥680,000（MemberRateRecord）
経費: ¥50,000（StageMaster BP）
───────────────
原価: ¥730,000
利益: ¥70,000
利益率: 8.8% 🟡（低利益）
```

#### パターンD: 教育期間メンバー（全雇用形態共通）

```typescript
【判定条件】
MemberRateRecord.memberRate が未設定 OR memberRate.rate === 0
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
MemberRateRecord.memberRate.rate > 0 を設定
→ 自動的に通常メンバーとして扱われる

【具体例: S2の教育期間メンバー】
売上: ¥0（MemberRateRecord未設定）
給与: ¥450,000（StageMaster S2）
経費: ¥135,000（30%）
───────────────
原価: ¥585,000
利益: -¥585,000
表示: 🎓 教育期間
      投資: ¥585,000/月
```

---

## 🏗️ 技術設計（改訂版）

### データモデル

#### 1. MemberStrengths型（改訂版 - 機密情報を削除）

```typescript
// models/StrengthsTypes.ts
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;  // 表示用役職
  stageId?: string;              // ステージID（原価構造参照）
  strengths: RankedStrength[];
  
  // ❌ 以下のフィールドを削除（v3.1改訂版）
  // memberRate?: MemberRate;      // → MemberRateRecordへ移動
  // contractRate?: ContractRate;  // → MemberRateRecordへ移動
  // positionId?: string;          // → 不要フィールドとして削除
}
```

**重要な変更点:**
- `memberRate`, `contractRate`を完全に削除
- これによりJSONエクスポートが構造的に安全になる
- 金額情報は`MemberRateRecord`で一元管理

#### 2. MemberRateRecord型（新規 - 単価情報専用）

```typescript
// types/profitability.ts
export interface MemberRateRecord {
  memberId: string;              // MemberStrengths.idへの参照
  memberRate: MemberRate;        // 売上単価
  contractRate?: ContractRate;   // 契約単価（契約社員・BPのみ）
  updatedAt?: string;            // 更新日時
}

export interface MemberRate {
  rateType: 'monthly' | 'hourly';
  rate: number;        // 月額単価 or 時給
  hours?: number;      // 時給の場合の月間稼働時間
}

export interface ContractRate {
  rateType: 'monthly' | 'hourly';
  rate: number;        // 月額単価 or 時給
  hours?: number;      // 時給の場合の月間稼働時間
}
```

**特徴:**
- LocalStorage専用（JSONエクスポートには含まれない）
- メンバーIDで`MemberStrengths`と紐付け
- 売上単価と契約単価を一元管理

#### 3. EmploymentType型

```typescript
// types/profitability.ts
export type EmploymentType = 'regular' | 'contract' | 'bp';

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  regular: '正社員',
  contract: '契約社員',
  bp: 'ビジネスパートナー',
};
```

#### 4. StageMaster型

```typescript
// types/profitability.ts
export interface StageMaster {
  id: string;                      // 'S1', 'S2', 'S3', 'S4', 'CONTRACT', 'BP'
  name: string;                    // 'ステージ1', '契約社員', ...
  employmentType: EmploymentType;  // 雇用形態
  
  // 正社員用（employmentType === 'regular'のみ）
  averageSalary?: number;          // 平均給与（月額、賞与込み）
  salaryExpenseRate?: number;      // 給与に対する経費率（0.30 = 30%）
  
  // 契約社員・BP用（employmentType === 'contract' | 'bp'）
  fixedExpense?: number;           // 固定経費（月額）
  
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
  
  // 契約社員
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

#### 5. MemberProfitability型

```typescript
// types/profitability.ts
export interface MemberProfitability {
  memberId: string;
  revenue: number;       // 月間売上（顧客請求額）
  cost: number;          // 月間原価
  profit: number;        // 月間利益
  profitMargin: number;  // 利益率（%）
  isTraining: boolean;   // 教育期間フラグ
  
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
  
  // 教育期間関連
  trainingCost: number;        // 教育投資コスト合計
  trainingCount: number;       // 教育期間メンバー数
  activeProfitMargin: number;  // 稼働利益率（教育コスト除く）
  hasTrainingMembers: boolean; // 教育メンバーが存在するか
}
```

---

### サービス層（改訂版）

#### FinancialService（改訂版 - MemberRateRecord管理）

```typescript
// services/financialService.ts
export class FinancialService {
  private static readonly STORAGE_KEY = 'member_rates';
  
  /**
   * 全メンバーの単価情報を取得
   */
  static getMemberRates(): MemberRateRecord[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
  
  /**
   * 全メンバーの単価情報を保存
   */
  static saveMemberRates(records: MemberRateRecord[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
  }
  
  /**
   * 特定メンバーの単価情報を取得
   */
  static getMemberRate(memberId: string): MemberRateRecord | undefined {
    const records = this.getMemberRates();
    return records.find(r => r.memberId === memberId);
  }
  
  /**
   * 特定メンバーの単価情報を保存・更新
   */
  static saveMemberRate(record: MemberRateRecord): void {
    const records = this.getMemberRates();
    const index = records.findIndex(r => r.memberId === record.memberId);
    
    if (index >= 0) {
      // 更新
      records[index] = { ...record, updatedAt: new Date().toISOString() };
    } else {
      // 新規追加
      records.push({ ...record, updatedAt: new Date().toISOString() });
    }
    
    this.saveMemberRates(records);
  }
  
  /**
   * 特定メンバーの単価情報を削除
   */
  static deleteMemberRate(memberId: string): void {
    const records = this.getMemberRates();
    const filtered = records.filter(r => r.memberId !== memberId);
    this.saveMemberRates(filtered);
  }
  
  /**
   * 月額売上の計算
   */
  static calculateMonthlyRate(memberRate: MemberRate): number {
    if (memberRate.rateType === 'hourly') {
      const hours = memberRate.hours || 160;
      return memberRate.rate * hours;
    }
    return memberRate.rate;
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
   * 通貨フォーマット
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
```

#### ProfitabilityService（改訂版 - MemberRateRecordを使用）

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
  static isTrainingMember(rateRecord: MemberRateRecord | undefined): boolean {
    // MemberRateRecord未設定 or rate=0 → 教育期間
    return !rateRecord || !rateRecord.memberRate || rateRecord.memberRate.rate === 0;
  }
  
  /**
   * メンバー個人の利益計算（改訂版）
   */
  static calculateMemberProfitability(
    member: MemberStrengths,         // 基本情報のみ
    rateRecord: MemberRateRecord | undefined,  // 単価情報（LocalStorageから）
    stageMasters: StageMaster[]      // ステージマスタ
  ): MemberProfitability | null {
    // ステージ情報の取得
    if (!member.stageId) return null;
    const stage = stageMasters.find(s => s.id === member.stageId);
    if (!stage) return null;
    
    // 教育期間の判定
    const isTraining = this.isTrainingMember(rateRecord);
    
    // 売上の取得
    let revenue: number;
    if (isTraining) {
      revenue = 0;
    } else {
      revenue = FinancialService.calculateMonthlyRate(rateRecord!.memberRate);
      if (revenue === 0) return null;
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
        if (!rateRecord || !rateRecord.contractRate) {
          // 契約単価が未設定の場合はnullを返す
          return null;
        }
        
        const contractAmount = FinancialService.calculateContractAmount(rateRecord.contractRate);
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
   * チーム全体の利益計算（改訂版）
   */
  static calculateTeamProfitability(
    members: MemberStrengths[],
    memberRates: Map<string, MemberRateRecord>,  // メンバーIDをキーとしたMap
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
      const rateRecord = memberRates.get(member.id);
      const profitability = this.calculateMemberProfitability(member, rateRecord, stageMasters);
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
      const activeCount = data.count - members.filter(m => {
        const rateRecord = memberRates.get(m.id);
        return m.stageId === stageId && this.isTrainingMember(rateRecord);
      }).length;
      
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

### カスタムフック（改訂版）

#### useProfitability（改訂版 - MemberRateRecordを統合）

```typescript
// hooks/useProfitability.ts
import { useMemo } from 'react';
import { MemberStrengths } from '../models/StrengthsTypes';
import { ProfitabilityService } from '../services/profitabilityService';
import { FinancialService } from '../services/financialService';
import { useManagerMode } from './useManagerMode';

export function useProfitability(members: MemberStrengths[]) {
  const { isManagerMode } = useManagerMode();
  
  // ステージマスタの取得
  const stageMasters = useMemo(() => {
    return ProfitabilityService.getStageMasters();
  }, []);
  
  // 単価情報の取得（LocalStorageから）
  const memberRates = useMemo(() => {
    if (!isManagerMode) return new Map();
    
    const records = FinancialService.getMemberRates();
    const map = new Map<string, MemberRateRecord>();
    records.forEach(r => map.set(r.memberId, r));
    return map;
  }, [isManagerMode]);
  
  // ステージ情報を持つメンバーが1人以上いるか
  const hasStageData = members.some(m => m.stageId);
  
  // 利益率表示が可能か判定
  const canShowProfitability = isManagerMode && hasStageData;
  
  // チーム全体の利益率計算
  const teamProfitability = useMemo(() => {
    if (!canShowProfitability) return null;
    
    return ProfitabilityService.calculateTeamProfitability(
      members,
      memberRates,
      stageMasters
    );
  }, [members, memberRates, stageMasters, canShowProfitability]);
  
  // メンバー個別の利益率計算
  const memberProfitabilities = useMemo(() => {
    if (!canShowProfitability) return new Map();
    
    const map = new Map<string, MemberProfitability>();
    members.forEach(member => {
      const rateRecord = memberRates.get(member.id);
      const profitability = ProfitabilityService.calculateMemberProfitability(
        member,
        rateRecord,
        stageMasters
      );
      if (profitability) {
        map.set(member.id, profitability);
      }
    });
    return map;
  }, [members, memberRates, stageMasters, canShowProfitability]);
  
  return {
    canShowProfitability,
    teamProfitability,
    memberProfitabilities,
    memberRates,
    stageMasters,
  };
}
```

---

## 📦 UI設計（改訂版）

### UI責務の明確な分離

```
┌────────────────────────────────────────────┐
│ 個人編集画面（MemberForm）                 │
├────────────────────────────────────────────┤
│ 責務: 基本情報 + ステージIDの設定         │
│                                            │
│ 入力項目:                                  │
│ ✅ 氏名                                    │
│ ✅ 部署                                    │
│ ✅ 役職（表示用）                          │
│ ✅ ステージID（原価構造参照）              │
│ ✅ 強み                                    │
│                                            │
│ ❌ 売上単価（入力しない）                  │
│ ❌ 契約単価（入力しない）                  │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ マネージャー設定 > 単価情報管理            │
├────────────────────────────────────────────┤
│ 責務: 売上単価・契約単価の管理             │
│                                            │
│ 入力項目:                                  │
│ ✅ メンバー選択（ドロップダウン）          │
│ ✅ 売上単価（月額 or 時給）                │
│ ✅ 契約単価（契約社員・BPのみ）            │
│                                            │
│ 参照情報（編集不可）:                      │
│ 📊 ステージID（参照のみ）                  │
│ 📊 原価プレビュー                          │
│ 📊 利益率予測                              │
└────────────────────────────────────────────┘
```

### MemberForm（改訂版 - 単価入力を削除）

```typescript
// src/components/strengths/MemberForm.tsx
function MemberForm({ memberId, onClose }: Props) {
  const { isManagerMode } = useManagerMode();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState<Position | undefined>();
  const [stageId, setStageId] = useState<string>('');
  const [strengths, setStrengths] = useState<RankedStrength[]>([]);
  
  const stageMasters = ProfitabilityService.getStageMasters();
  const selectedStage = stageMasters.find(s => s.id === stageId);
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {memberId ? 'メンバー編集' : 'メンバー追加'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          {/* 氏名 */}
          <div className="mb-4">
            <label className="block font-medium mb-2">氏名 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          
          {/* 部署 */}
          <div className="mb-4">
            <label className="block font-medium mb-2">部署 *</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          
          {/* 役職（表示用） */}
          <div className="mb-4">
            <label className="block font-medium mb-2">役職</label>
            <select
              value={position?.id || ''}
              onChange={(e) => {
                const pos = POSITIONS.find(p => p.id === e.target.value);
                setPosition(pos);
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">選択してください</option>
              {POSITIONS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          {/* ステージID（マネージャーモードのみ） */}
          {isManagerMode && (
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center mb-3">
                <span className="text-lg mr-2">💼</span>
                <h3 className="font-bold text-blue-900">ステージ設定</h3>
                <span className="ml-2 text-xs text-gray-600">（原価構造の参照）</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">ステージ</label>
                <select
                  value={stageId}
                  onChange={(e) => setStageId(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">選択してください</option>
                  <optgroup label="正社員">
                    {stageMasters
                      .filter(s => s.employmentType === 'regular')
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </optgroup>
                  <optgroup label="その他">
                    {stageMasters
                      .filter(s => s.employmentType !== 'regular')
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  💡 ステージは原価構造のテンプレートを指定します
                </p>
              </div>
              
              {/* ステージ情報のプレビュー */}
              {selectedStage && (
                <div className="mt-3 p-3 bg-white rounded border border-blue-300">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {selectedStage.name}の原価構造:
                  </p>
                  
                  {selectedStage.employmentType === 'regular' ? (
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">平均給与:</span>
                        <span className="font-medium">
                          {FinancialService.formatCurrency(selectedStage.averageSalary || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">経費率:</span>
                        <span className="font-medium">
                          {((selectedStage.salaryExpenseRate || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-gray-700 font-medium">原価合計:</span>
                        <span className="font-bold text-red-600">
                          {FinancialService.formatCurrency(
                            (selectedStage.averageSalary || 0) * (1 + (selectedStage.salaryExpenseRate || 0))
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">固定経費:</span>
                        <span className="font-medium">
                          {FinancialService.formatCurrency(selectedStage.fixedExpense || 0)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        ※ 契約単価は「単価情報管理」で設定します
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* 強み入力（既存） */}
          <div className="mb-4">
            <label className="block font-medium mb-2">強み</label>
            {/* 強み入力UIは既存のまま */}
          </div>
          
          {/* 保存ボタン */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              保存
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border rounded hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### MemberRateManagement（新規 - 単価情報管理画面）

```typescript
// src/components/profitability/MemberRateManagement.tsx
function MemberRateManagement({ members }: { members: MemberStrengths[] }) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [memberRate, setMemberRate] = useState<MemberRate>({ rateType: 'monthly', rate: 0 });
  const [contractRate, setContractRate] = useState<ContractRate | undefined>();
  
  const selectedMember = members.find(m => m.id === selectedMemberId);
  const stageMasters = ProfitabilityService.getStageMasters();
  const selectedStage = selectedMember?.stageId 
    ? stageMasters.find(s => s.id === selectedMember.stageId)
    : undefined;
  
  // 既存の単価情報を読み込み
  useEffect(() => {
    if (selectedMemberId) {
      const record = FinancialService.getMemberRate(selectedMemberId);
      if (record) {
        setMemberRate(record.memberRate);
        setContractRate(record.contractRate);
      } else {
        setMemberRate({ rateType: 'monthly', rate: 0 });
        setContractRate(undefined);
      }
    }
  }, [selectedMemberId]);
  
  // 利益予測の計算
  const profitPreview = useMemo(() => {
    if (!selectedMember || !selectedStage || !memberRate) return null;
    
    const revenue = FinancialService.calculateMonthlyRate(memberRate);
    const isTraining = revenue === 0;
    
    if (isTraining) {
      // 教育期間の場合
      let cost: number;
      if (selectedStage.employmentType === 'regular') {
        cost = (selectedStage.averageSalary || 0) * (1 + (selectedStage.salaryExpenseRate || 0));
      } else {
        if (!contractRate) return null;
        cost = FinancialService.calculateContractAmount(contractRate) + (selectedStage.fixedExpense || 0);
      }
      return { revenue: 0, cost, profit: -cost, profitMargin: -100, isTraining: true };
    }
    
    // 通常メンバーの場合
    let cost: number;
    if (selectedStage.employmentType === 'regular') {
      const salary = selectedStage.averageSalary || 0;
      const expense = salary * (selectedStage.salaryExpenseRate || 0);
      cost = salary + expense;
    } else {
      if (!contractRate) return null;
      const contractAmount = FinancialService.calculateContractAmount(contractRate);
      cost = contractAmount + (selectedStage.fixedExpense || 0);
    }
    
    const profit = revenue - cost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return { revenue, cost, profit, profitMargin, isTraining: false };
  }, [selectedMember, selectedStage, memberRate, contractRate]);
  
  const handleSave = () => {
    if (!selectedMemberId) return;
    
    const record: MemberRateRecord = {
      memberId: selectedMemberId,
      memberRate,
      contractRate,
    };
    
    FinancialService.saveMemberRate(record);
    alert('単価情報を保存しました');
  };
  
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">💰 単価情報管理</h2>
      <p className="text-sm text-gray-600 mb-6">
        ⚠️ この情報はブラウザにのみ保存され、JSONエクスポートには含まれません
      </p>
      
      {/* メンバー選択 */}
      <div className="mb-6">
        <label className="block font-medium mb-2">メンバー選択</label>
        <select
          value={selectedMemberId}
          onChange={(e) => setSelectedMemberId(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="">メンバーを選択してください</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>
              {m.name}（{m.department}）
              {m.stageId && ` - ${stageMasters.find(s => s.id === m.stageId)?.name}`}
            </option>
          ))}
        </select>
      </div>
      
      {selectedMember && selectedStage && (
        <>
          {/* ステージ情報（参照のみ） */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold text-gray-700 mb-2">📊 ステージ情報（参照）</h3>
            <div className="text-sm">
              <p className="mb-1">
                ステージ: <span className="font-medium">{selectedStage.name}</span>
              </p>
              <p className="text-gray-500 text-xs">
                ※ ステージの変更は「個人編集画面」で行います
              </p>
            </div>
          </div>
          
          {/* 売上単価入力 */}
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center mb-3">
              <span className="text-lg mr-2">💰</span>
              <h3 className="font-bold text-green-900">売上単価</h3>
              <span className="ml-2 text-xs text-gray-600">（顧客請求額）</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">月額単価（円）</label>
              <input
                type="number"
                value={memberRate.rate}
                onChange={(e) => setMemberRate({
                  rateType: 'monthly',
                  rate: Number(e.target.value),
                })}
                placeholder="教育期間の場合は0"
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 教育期間中は0にしてください
              </p>
            </div>
          </div>
          
          {/* 契約単価入力（契約社員・BPのみ） */}
          {selectedStage.employmentType !== 'regular' && (
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center mb-3">
                <span className="text-lg mr-2">📝</span>
                <h3 className="font-bold text-blue-900">契約単価</h3>
                <span className="ml-2 text-xs text-gray-600">
                  （本人/BP企業への支払額）
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {selectedStage.employmentType === 'contract' ? '時給' : '月額契約単価'}（円）
                  </label>
                  <input
                    type="number"
                    value={contractRate?.rate || ''}
                    onChange={(e) => setContractRate({
                      rateType: selectedStage.employmentType === 'contract' ? 'hourly' : 'monthly',
                      rate: Number(e.target.value),
                      hours: contractRate?.hours,
                    })}
                    placeholder={selectedStage.employmentType === 'contract' ? '例: 3000' : '例: 680000'}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                
                {selectedStage.employmentType === 'contract' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">稼働時間（時間/月）</label>
                    <input
                      type="number"
                      value={contractRate?.hours || 160}
                      onChange={(e) => setContractRate({
                        ...contractRate!,
                        hours: Number(e.target.value),
                      })}
                      placeholder="例: 160"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                )}
                
                {/* 月額換算表示 */}
                {contractRate && selectedStage.employmentType === 'contract' && (
                  <div className="bg-white p-3 rounded border border-blue-300">
                    <p className="text-sm text-gray-600">月額換算:</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {FinancialService.formatCurrency(
                        FinancialService.calculateContractAmount(contractRate)
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 利益予測プレビュー */}
          {profitPreview && (
            <div className={`mb-6 p-4 border-2 rounded-lg ${
              profitPreview.isTraining 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-purple-50 border-purple-200'
            }`}>
              <div className="flex items-center mb-3">
                <span className="text-lg mr-2">
                  {profitPreview.isTraining ? '🎓' : '📊'}
                </span>
                <h3 className={`font-bold ${
                  profitPreview.isTraining ? 'text-orange-900' : 'text-purple-900'
                }`}>
                  {profitPreview.isTraining ? '教育投資予測' : '利益予測'}
                </h3>
              </div>
              
              {profitPreview.isTraining ? (
                // 教育期間の場合
                <div className="space-y-2">
                  <div className="p-3 bg-white rounded border border-orange-300">
                    <p className="text-sm text-gray-700 mb-2">
                      このメンバーは教育期間として扱われます
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">月間教育投資:</span>
                      <span className="font-bold text-2xl text-orange-700">
                        {FinancialService.formatCurrency(profitPreview.cost)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    💡 売上を設定すると自動的に通常メンバーに切り替わります
                  </p>
                </div>
              ) : (
                // 通常メンバーの場合
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-700">売上:</span>
                    <span className="font-bold">
                      {FinancialService.formatCurrency(profitPreview.revenue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-700">原価:</span>
                    <span className="font-bold text-red-600">
                      {FinancialService.formatCurrency(profitPreview.cost)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-700">利益:</span>
                    <span
                      className="font-bold text-xl"
                      style={{
                        color: ProfitabilityService.getProfitMarginColor(
                          profitPreview.profitMargin,
                          false
                        )
                      }}
                    >
                      {FinancialService.formatCurrency(profitPreview.profit)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">利益率:</span>
                    <span
                      className="font-bold text-2xl"
                      style={{
                        color: ProfitabilityService.getProfitMarginColor(
                          profitPreview.profitMargin,
                          false
                        )
                      }}
                    >
                      {profitPreview.profitMargin.toFixed(1)}%
                      {profitPreview.profitMargin < 0 && ' 🔴'}
                      {profitPreview.profitMargin >= 0 && profitPreview.profitMargin < 15 && ' 🟡'}
                      {profitPreview.profitMargin >= 15 && ' 🟢'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 保存ボタン */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="flex-1 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              disabled={!selectedMember}
            >
              保存
            </button>
          </div>
        </>
      )}
      
      {!selectedMember && (
        <div className="text-center text-gray-500 py-8">
          メンバーを選択してください
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 データ移行（v3.0 → v3.1改訂版）

### 移行スクリプト

```typescript
// utils/dataMigration.ts
export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
}

/**
 * v3.0 → v3.1改訂版へのデータ移行
 * MemberStrengthsから単価情報を分離してMemberRateRecordへ移行
 */
export function migrateToV3_1(): MigrationResult {
  const errors: string[] = [];
  let migratedCount = 0;
  
  try {
    // 1. 既存のMemberStrengthsデータを取得
    const membersData = localStorage.getItem('strengths_members');
    if (!membersData) {
      return {
        success: true,
        migratedCount: 0,
        errors: [],
      };
    }
    
    const members: any[] = JSON.parse(membersData);
    const rateRecords: MemberRateRecord[] = [];
    
    // 2. 各メンバーから単価情報を抽出
    members.forEach((member, index) => {
      try {
        if (member.memberRate || member.contractRate) {
          rateRecords.push({
            memberId: member.id,
            memberRate: member.memberRate || { rateType: 'monthly', rate: 0 },
            contractRate: member.contractRate,
            updatedAt: new Date().toISOString(),
          });
          
          // 3. MemberStrengthsから単価情報を削除
          delete member.memberRate;
          delete member.contractRate;
          delete member.positionId; // 不要フィールドも削除
          
          migratedCount++;
        }
      } catch (err) {
        errors.push(`メンバー${index}の移行エラー: ${err}`);
      }
    });
    
    // 4. 更新後のMemberStrengthsを保存
    localStorage.setItem('strengths_members', JSON.stringify(members));
    
    // 5. MemberRateRecordをLocalStorageに保存
    FinancialService.saveMemberRates(rateRecords);
    
    // 6. 移行バージョンを記録
    localStorage.setItem('data_migration_version', '3.1');
    
    console.log(`✅ データ移行完了: ${migratedCount}件の単価情報を分離`);
    
    return {
      success: true,
      migratedCount,
      errors,
    };
  } catch (err) {
    errors.push(`移行処理エラー: ${err}`);
    return {
      success: false,
      migratedCount,
      errors,
    };
  }
}

/**
 * 移行が必要かチェック
 */
export function needsMigration(): boolean {
  const version = localStorage.getItem('data_migration_version');
  return !version || parseFloat(version) < 3.1;
}
```

### 初回起動時の自動移行

```typescript
// App.tsx または初期化処理
import { migrateToV3_1, needsMigration } from './utils/dataMigration';

function App() {
  useEffect(() => {
    if (needsMigration()) {
      console.log('📦 v3.1へのデータ移行を実行中...');
      
      const result = migrateToV3_1();
      
      if (result.success) {
        console.log(`✅ 移行完了: ${result.migratedCount}件`);
        if (result.errors.length > 0) {
          console.warn('⚠️ 一部エラー:', result.errors);
        }
      } else {
        console.error('❌ 移行失敗:', result.errors);
        alert('データ移行に失敗しました。管理者に連絡してください。');
      }
    }
  }, []);
  
  return <>{/* アプリケーションコンポーネント */}</>;
}
```

---

## 🚀 実装ステップ（改訂版）

### Phase 1: データモデル改訂（0.5日）

**目標:** MemberStrengthsから機密情報を分離

**タスク:**
- [ ] `MemberStrengths`型から`memberRate`, `contractRate`, `positionId`を削除
- [ ] `MemberRateRecord`型を新規作成
- [ ] `FinancialService`にMemberRateRecord管理メソッドを追加
  - [ ] `getMemberRates()`
  - [ ] `saveMemberRates()`
  - [ ] `getMemberRate(memberId)`
  - [ ] `saveMemberRate(record)`
  - [ ] `deleteMemberRate(memberId)`
- [ ] データ移行スクリプト作成
  - [ ] `migrateToV3_1()`
  - [ ] `needsMigration()`
- [ ] `App.tsx`に自動移行処理を追加

**完了条件:**
- [ ] TypeScriptのコンパイルエラーがない
- [ ] 移行スクリプトの動作確認
- [ ] 既存データが正しく移行される

---

### Phase 2: 計算ロジック実装（1日）

**目標:** MemberRateRecordを使用した利益率計算

**タスク:**
- [ ] `ProfitabilityService.calculateMemberProfitability()`の改訂
  - [ ] MemberRateRecordを引数に追加
  - [ ] MemberStrengthsから単価情報取得を削除
- [ ] `ProfitabilityService.calculateTeamProfitability()`の改訂
  - [ ] MemberRateRecordのMapを引数に追加
- [ ] `ProfitabilityService.isTrainingMember()`の改訂
  - [ ] MemberRateRecordを引数に変更
- [ ] `useProfitability`フックの改訂
  - [ ] MemberRateRecordの取得処理を追加
  - [ ] 計算処理にMemberRateRecordを渡すよう修正

**完了条件:**
- [ ] 正社員の利益率計算が正しい
- [ ] 契約社員の利益率計算が正しい
- [ ] BPの利益率計算が正しい
- [ ] 教育期間の判定・計算が正しい
- [ ] 単体テストが全てパス

---

### Phase 3: UI実装（1.5日）

**目標:** 責務分離されたUI実装

#### ステップ3.1: MemberFormの改訂（0.5日）

**タスク:**
- [ ] `memberRate`, `contractRate`の入力欄を削除
- [ ] ステージID選択のみに簡略化
- [ ] ステージ情報のプレビュー表示
- [ ] 単価情報管理への誘導メッセージ追加

#### ステップ3.2: MemberRateManagementの新規作成（1日）

```bash
touch src/components/profitability/MemberRateManagement.tsx
```

**タスク:**
- [ ] メンバー選択ドロップダウン
- [ ] 売上単価入力欄
- [ ] 契約単価入力欄（条件分岐）
- [ ] ステージ情報の参照表示
- [ ] 利益予測プレビュー
- [ ] 教育期間対応
- [ ] 保存・削除機能

**完了条件:**
- [ ] 単価情報の追加・編集・削除ができる
- [ ] 利益率が正しく表示される
- [ ] 教育期間の判定が正しい
- [ ] 統合テストが全てパス

---

### Phase 4: 教育期間対応（1日）【オプション】

**目標:** 教育投資コストの可視化

**注意:** Phase 3完了後に実装してもOK。Phase 1-3で基本機能は完成。

#### ステップ4.1: 教育期間ロジック（0.5日）

**タスク:**
- [ ] `isTrainingMember()`の動作確認
- [ ] `calculateMemberProfitability()`の教育期間処理確認
- [ ] `calculateTeamProfitability()`の教育コスト集計確認
- [ ] 教育期間の単体テスト

#### ステップ4.2: 教育期間UI（0.5日）

```bash
touch src/components/profitability/TrainingMemberBadge.tsx
```

**タスク:**
- [ ] `TrainingMemberBadge`作成
- [ ] `ProfitabilitySummaryPanel`の拡張
- [ ] `MembersList`の修正
- [ ] `MemberRateManagement`の教育期間対応

**完了条件:**
- [ ] 売上¥0で教育期間として扱われる
- [ ] 教育投資コストが表示される
- [ ] 実質利益率・稼働利益率が正しい
- [ ] 売上設定で自動解除される

---

## ✅ テスト計画（改訂版）

### 単体テスト - FinancialService

```typescript
describe('FinancialService', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('単価情報の保存・取得', () => {
    const record: MemberRateRecord = {
      memberId: '001',
      memberRate: { rateType: 'monthly', rate: 800000 },
      contractRate: { rateType: 'monthly', rate: 680000 },
    };
    
    FinancialService.saveMemberRate(record);
    const retrieved = FinancialService.getMemberRate('001');
    
    expect(retrieved).toBeDefined();
    expect(retrieved!.memberRate.rate).toBe(800000);
    expect(retrieved!.contractRate!.rate).toBe(680000);
  });
  
  it('単価情報の更新', () => {
    const record1: MemberRateRecord = {
      memberId: '001',
      memberRate: { rateType: 'monthly', rate: 800000 },
    };
    
    FinancialService.saveMemberRate(record1);
    
    const record2: MemberRateRecord = {
      memberId: '001',
      memberRate: { rateType: 'monthly', rate: 900000 },
    };
    
    FinancialService.saveMemberRate(record2);
    const retrieved = FinancialService.getMemberRate('001');
    
    expect(retrieved!.memberRate.rate).toBe(900000);
  });
  
  it('単価情報の削除', () => {
    const record: MemberRateRecord = {
      memberId: '001',
      memberRate: { rateType: 'monthly', rate: 800000 },
    };
    
    FinancialService.saveMemberRate(record);
    FinancialService.deleteMemberRate('001');
    const retrieved = FinancialService.getMemberRate('001');
    
    expect(retrieved).toBeUndefined();
  });
});
```

### 単体テスト - ProfitabilityService（改訂版）

```typescript
describe('ProfitabilityService', () => {
  const DEFAULT_STAGE_MASTERS = [
    {
      id: 'S2',
      name: 'ステージ2',
      employmentType: 'regular' as const,
      averageSalary: 450000,
      salaryExpenseRate: 0.30,
    },
    {
      id: 'BP',
      name: 'BP',
      employmentType: 'bp' as const,
      fixedExpense: 50000,
    },
  ];
  
  it('正社員の利益計算（MemberRateRecord使用）', () => {
    const member: MemberStrengths = {
      id: '001',
      name: '山田太郎',
      department: '開発部',
      stageId: 'S2',
      strengths: [],
    };
    
    const rateRecord: MemberRateRecord = {
      memberId: '001',
      memberRate: { rateType: 'monthly', rate: 600000 },
    };
    
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      rateRecord,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result).not.toBeNull();
    expect(result!.revenue).toBe(600000);
    expect(result!.cost).toBe(585000); // 450000 + 135000
    expect(result!.profit).toBe(15000);
    expect(result!.profitMargin).toBeCloseTo(2.5, 1);
    expect(result!.isTraining).toBe(false);
  });
  
  it('BPの利益計算（MemberRateRecord使用）', () => {
    const member: MemberStrengths = {
      id: '002',
      name: '佐藤花子',
      department: '開発部',
      stageId: 'BP',
      strengths: [],
    };
    
    const rateRecord: MemberRateRecord = {
      memberId: '002',
      memberRate: { rateType: 'monthly', rate: 800000 },
      contractRate: { rateType: 'monthly', rate: 680000 },
    };
    
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      rateRecord,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result).not.toBeNull();
    expect(result!.revenue).toBe(800000);
    expect(result!.cost).toBe(730000); // 680000 + 50000
    expect(result!.profit).toBe(70000);
    expect(result!.profitMargin).toBeCloseTo(8.8, 1);
    expect(result!.isTraining).toBe(false);
  });
  
  it('教育期間メンバーの判定（MemberRateRecord未設定）', () => {
    const member: MemberStrengths = {
      id: '003',
      name: '鈴木一郎',
      department: '開発部',
      stageId: 'S2',
      strengths: [],
    };
    
    // MemberRateRecord未設定 = 教育期間
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      undefined,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result).not.toBeNull();
    expect(result!.revenue).toBe(0);
    expect(result!.cost).toBe(585000);
    expect(result!.profit).toBe(-585000);
    expect(result!.isTraining).toBe(true);
  });
  
  it('教育期間メンバーの判定（rate=0）', () => {
    const member: MemberStrengths = {
      id: '003',
      name: '鈴木一郎',
      department: '開発部',
      stageId: 'S2',
      strengths: [],
    };
    
    const rateRecord: MemberRateRecord = {
      memberId: '003',
      memberRate: { rateType: 'monthly', rate: 0 },
    };
    
    const result = ProfitabilityService.calculateMemberProfitability(
      member,
      rateRecord,
      DEFAULT_STAGE_MASTERS
    );
    
    expect(result).not.toBeNull();
    expect(result!.revenue).toBe(0);
    expect(result!.isTraining).toBe(true);
  });
});
```

### データ移行テスト

```typescript
describe('Data Migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  
  it('v3.0データをv3.1形式に移行', () => {
    // v3.0形式のデータを準備
    const v3_0_data = [
      {
        id: '001',
        name: '山田太郎',
        department: '開発部',
        stageId: 'S2',
        memberRate: { rateType: 'monthly', rate: 600000 },
        strengths: [],
      },
      {
        id: '002',
        name: '佐藤花子',
        department: '開発部',
        stageId: 'BP',
        memberRate: { rateType: 'monthly', rate: 800000 },
        contractRate: { rateType: 'monthly', rate: 680000 },
        strengths: [],
      },
    ];
    
    localStorage.setItem('strengths_members', JSON.stringify(v3_0_data));
    
    // 移行実行
    const result = migrateToV3_1();
    
    // 検証
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(2);
    expect(result.errors.length).toBe(0);
    
    // MemberStrengthsから単価情報が削除されていることを確認
    const migrated_members = JSON.parse(localStorage.getItem('strengths_members')!);
    expect(migrated_members[0].memberRate).toBeUndefined();
    expect(migrated_members[0].contractRate).toBeUndefined();
    expect(migrated_members[0].positionId).toBeUndefined();
    
    // MemberRateRecordが正しく作成されていることを確認
    const rates = FinancialService.getMemberRates();
    expect(rates.length).toBe(2);
    expect(rates[0].memberId).toBe('001');
    expect(rates[0].memberRate.rate).toBe(600000);
    expect(rates[1].memberId).toBe('002');
    expect(rates[1].contractRate!.rate).toBe(680000);
  });
});
```

---

## 💬 想定Q&A（改訂版追加）

### データ構造の変更について

#### Q16: MemberStrengthsから単価情報がなくなったが、JSONエクスポートはどうなる？
**A:** JSONエクスポートは従来通り可能です。ただし、単価情報は含まれません。これにより、誤って機密情報を外部に送信するリスクがなくなります。

#### Q17: 既存のv3.0データはどうなる？
**A:** 初回起動時に自動的にv3.1形式に移行されます。MemberStrengthsから単価情報が分離され、LocalStorageの`MemberRateRecord`として保存されます。

#### Q18: 個人編集画面で単価を入力していたが、これからはどこで入力する？
**A:** 「マネージャー設定 > 単価情報管理」画面で入力します。個人編集画面はステージIDの設定のみに専念します。

#### Q19: ステージIDと単価情報の両方を設定する必要がある？
**A:** はい。
- **ステージID**: 個人編集画面で設定（原価構造のテンプレート）
- **単価情報**: 単価情報管理画面で設定（個別の売上・契約単価）

両方が揃って初めて利益率が計算されます。

#### Q20: 移行に失敗したらどうなる？
**A:** 移行スクリプトはエラー処理を含んでいます。失敗した場合はコンソールにエラーが出力され、アラートで通知されます。元のデータは保持されるので、再試行可能です。

---

## 🎯 実装の重要ポイント（改訂版）

### 1. データ分離の厳密な遵守

```typescript
// ✅ 正しい実装
const member: MemberStrengths = {
  id: '001',
  name: '山田太郎',
  stageId: 'S2',
  // memberRate, contractRateは含まない
};

const rateRecord: MemberRateRecord = {
  memberId: '001',
  memberRate: { rateType: 'monthly', rate: 600000 },
};

// ❌ 誤った実装
const member: MemberStrengths = {
  id: '001',
  name: '山田太郎',
  stageId: 'S2',
  memberRate: { ... }, // これは許されない
};
```

### 2. JSONエクスポートの安全性

```typescript
// ✅ 正しい実装（フィルタリング不要）
function exportMembers(members: MemberStrengths[]) {
  return JSON.stringify(members); // 単価情報が含まれていないので安全
}

// ❌ 必要ない実装（v3.0以前）
function exportMembers(members: MemberStrengths[], includeRates: boolean) {
  if (includeRates) {
    return JSON.stringify(members);
  } else {
    // フィルタリングが必要だった
    return JSON.stringify(members.map(m => ({ ...m, memberRate: undefined })));
  }
}
```

### 3. 利益率計算時のデータ統合

```typescript
// ✅ 正しい実装
function calculateProfitability(member: MemberStrengths) {
  const rateRecord = FinancialService.getMemberRate(member.id);
  return ProfitabilityService.calculateMemberProfitability(
    member,      // 基本情報
    rateRecord,  // 単価情報
    stageMasters // ステージマスタ
  );
}
```

---

## 📅 実装スケジュール（改訂版）

```
Phase 1: データモデル改訂 + 移行 → 0.5日
Phase 2: 計算ロジック実装 → 1.0日
Phase 3: UI実装 → 1.5日
───────────────────────────────────────
小計: 3日（契約単価・固定経費対応完了）

Phase 4: 教育期間対応 → 1.0日（オプション）
───────────────────────────────────────
合計: 4日（全機能完成）
```

---

## 📚 関連ドキュメント

- [README.md](./README.md) - プロジェクト概要
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 開発者ガイド
- [CLAUDE.md](./CLAUDE.md) - Claude開発ガイド
- [MANAGER_FEATURE_SPEC_V3.md](./MANAGER_FEATURE_SPEC_V3.md) - v3.0（実装済み）

---

**担当者:** SUZUKI Shunpei  
**最終更新:** 2025-10-29  
**バージョン:** 3.1（統合版・改訂版）  
**ステータス:** 実装準備完了（案A適用）
