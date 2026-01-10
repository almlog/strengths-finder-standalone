# APIリファレンス

## 目次

1. [サービス](#1-サービス)
2. [カスタムフック](#2-カスタムフック)
3. [コンテキスト](#3-コンテキスト)
4. [型定義](#4-型定義)
5. [定数](#5-定数)

---

## 1. サービス

### 1.1 StrengthsService

**ファイル:** `src/services/StrengthsService.ts`

資質データとメンバー管理のユーティリティを提供。

#### メソッド

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `getAllStrengths()` | なし | `Strength[]` | 34資質すべてを取得 |
| `getStrengthById(id)` | `id: number` | `Strength \| undefined` | ID指定で資質を取得 |
| `getStrengthsByCategory(category)` | `category: StrengthCategory` | `Strength[]` | カテゴリ別に資質を取得 |
| `getTopStrengths(member)` | `member: Member` | `Strength[]` | メンバーのTop5資質を取得 |
| `getCategoryForStrength(id)` | `id: number` | `StrengthCategory` | 資質IDからカテゴリを取得 |

#### 使用例

```typescript
import StrengthsService from './services/StrengthsService';

// 全資質を取得
const allStrengths = StrengthsService.getAllStrengths();

// 実行力カテゴリの資質を取得
const executingStrengths = StrengthsService.getStrengthsByCategory('EXECUTING');

// メンバーのTop5を取得
const topStrengths = StrengthsService.getTopStrengths(member);
```

---

### 1.2 PersonalityAnalysisEngine

**ファイル:** `src/services/PersonalityAnalysisEngine.ts`

MBTI × StrengthsFinder統合分析エンジン。

#### メソッド

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `analyze(member)` | `member: Member` | `AnalysisResult \| null` | メンバーの統合分析を実行 |
| `calculateSynergyScore(mbti, strengths)` | `mbti: string, strengths: RankedStrength[]` | `number` | 相性スコアを計算 |
| `calculateTeamFitScore(mbti, strengths)` | `mbti: string, strengths: RankedStrength[]` | `number` | チーム適合度を計算 |
| `calculateLeadershipPotential(mbti, strengths)` | `mbti: string, strengths: RankedStrength[]` | `number` | リーダーシップ潜在力を計算 |
| `inferPrimaryRole(mbti, strengths)` | `mbti: string, strengths: RankedStrength[]` | `string` | 役割を推論 |

#### 使用例

```typescript
import PersonalityAnalysisEngine from './services/PersonalityAnalysisEngine';

const member = {
  id: '12345',
  name: '山田太郎',
  department: '13D12345',
  mbti: 'INTJ',
  strengths: [
    { id: 34, score: 1 },  // 戦略性
    { id: 29, score: 2 },  // 学習欲
    // ...
  ]
};

const analysis = PersonalityAnalysisEngine.analyze(member);
if (analysis) {
  console.log('相性スコア:', analysis.synergyScore);
  console.log('チーム適合度:', analysis.teamFitScore);
  console.log('リーダーシップ:', analysis.leadershipPotential);
  console.log('役割:', analysis.primaryRole);
}
```

---

### 1.3 SimulationService

**ファイル:** `src/services/SimulationService.ts`

チームシミュレーションのロジック。

#### メソッド

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `createGroup(state, name)` | `state: SimulationState, name: string` | `SimulationState` | グループを作成 |
| `updateGroup(state, groupId, name)` | `state: SimulationState, groupId: string, name: string` | `SimulationState` | グループ名を更新 |
| `deleteGroup(state, groupId)` | `state: SimulationState, groupId: string` | `SimulationState` | グループを削除 |
| `moveMember(state, memberId, from, to)` | `state: SimulationState, memberId: string, fromGroupId: string \| null, toGroupId: string \| null` | `SimulationState` | メンバーを移動 |
| `analyzeGroup(group)` | `group: SimulationGroup` | `GroupAnalysis` | グループを分析 |
| `calculateTeamNarrative(members)` | `members: Member[]` | `TeamNarrative` | チーム特性ナラティブを生成 |
| `exportScenario(state)` | `state: SimulationState` | `string` | シナリオをJSON出力 |
| `importScenario(json)` | `json: string` | `SimulationState` | JSONからシナリオを読み込み |

#### 使用例

```typescript
import SimulationService from './services/SimulationService';

// グループ作成
let state = SimulationService.createGroup(initialState, 'プロジェクトA');

// メンバー移動
state = SimulationService.moveMember(state, 'member123', null, 'group456');

// グループ分析
const analysis = SimulationService.analyzeGroup(state.groups[0]);

// チーム特性ナラティブ
const narrative = SimulationService.calculateTeamNarrative(members);
console.log(narrative.title);    // "バランス型チーム"
console.log(narrative.summary);  // "このチームは..."
```

---

### 1.4 AttendanceService

**ファイル:** `src/services/AttendanceService.ts`

勤怠分析のロジック。

#### メソッド

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `parseXlsx(file)` | `file: File` | `Promise<AttendanceRecord[]>` | XLSXファイルを解析 |
| `analyzeDailyRecord(record)` | `record: AttendanceRecord` | `DailyAnalysis` | 日次レコードを分析 |
| `analyzeExtended(records)` | `records: AttendanceRecord[]` | `ExtendedAnalysisResult` | 拡張分析（月次） |
| `getOvertimeAlertLevel(minutes)` | `minutes: number` | `OvertimeAlertLevel` | 36協定レベルを取得 |
| `isOvertimeOnPaceToExceed(current, day, limit)` | `current: number, day: number, limit: number` | `boolean` | 超過予測判定 |
| `checkRemarksRequired(record)` | `record: AttendanceRecord` | `RemarksCheck` | 備考欄チェック |
| `is8HourScheduleFromSheetName(name)` | `name: string` | `boolean` | 8時出社カレンダー判定（シート名から） |
| `shouldExcludeLateFor8HourSchedule(record, late)` | `record: AttendanceRecord, late: number` | `boolean` | 8時出社カレンダー登録者の遅刻誤検出を補正すべきか判定 |

#### 使用例

```typescript
import AttendanceService from './services/AttendanceService';

// XLSXファイル解析
const records = await AttendanceService.parseXlsx(file);

// 拡張分析
const result = AttendanceService.analyzeExtended(records);
console.log('従業員数:', result.summary.totalEmployees);
console.log('違反件数:', result.summary.totalViolations);

// 36協定チェック
const level = AttendanceService.getOvertimeAlertLevel(50 * 60); // 50時間
console.log(level); // 'exceeded'

// 予兆判定
const isRisk = AttendanceService.isOvertimeOnPaceToExceed(
  30 * 60,  // 現在30時間
  15,       // 月の15日目
  45 * 60   // 上限45時間
);
```

---

### 1.5 ProfitabilityService

**ファイル:** `src/services/ProfitabilityService.ts`

利益率計算のロジック。

#### メソッド

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `calculateCost(member, stages, rates)` | `member: Member, stages: StageMaster[], rates: MemberRate[]` | `number` | 原価を計算 |
| `calculateProfit(member, stages, rates)` | `member: Member, stages: StageMaster[], rates: MemberRate[]` | `ProfitResult` | 利益を計算 |
| `calculateProfitability(members, stages, rates)` | `members: Member[], stages: StageMaster[], rates: MemberRate[]` | `ProfitabilitySummary` | 全体の利益率を計算 |

#### 使用例

```typescript
import ProfitabilityService from './services/ProfitabilityService';

const result = ProfitabilityService.calculateProfit(
  member,
  stageMasters,
  memberRates
);

console.log('売上:', result.revenue);
console.log('原価:', result.cost);
console.log('利益:', result.profit);
console.log('利益率:', result.profitMargin);
```

---

### 1.6 Personality16Service

**ファイル:** `src/services/Personality16Service.ts`

16Personalitiesマスタデータ。

#### メソッド

| メソッド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `getAllTypes()` | なし | `PersonalityType[]` | 全16タイプを取得 |
| `getTypeById(id)` | `id: number` | `PersonalityType \| undefined` | ID指定でタイプを取得 |
| `getTypeByMbti(mbti)` | `mbti: string` | `PersonalityType \| undefined` | MBTI文字列でタイプを取得 |

---

## 2. カスタムフック

### 2.1 useAuth

**ファイル:** `src/hooks/useAuth.ts`

Firebase認証状態を管理。

```typescript
const {
  user,           // User | null - 現在のユーザー
  isLoading,      // boolean - 認証状態読み込み中
  isAdmin,        // boolean - 管理者権限
  signIn,         // (email, password) => Promise<void>
  signOut,        // () => Promise<void>
  signUp,         // (email, password) => Promise<void>
  resetPassword,  // (email) => Promise<void>
} = useAuth();
```

---

### 2.2 useManagerMode

**ファイル:** `src/hooks/useManagerMode.ts`

マネージャーモードの状態を管理。

```typescript
const {
  isManagerMode,  // boolean - マネージャーモードか
} = useManagerMode();

// URLに ?mode=manager がある場合にtrue
```

---

### 2.3 useStageMasters

**ファイル:** `src/hooks/useStageMasters.ts`

ステージマスタのCRUD操作。

```typescript
const {
  stageMasters,      // StageMaster[] - ステージ一覧
  updateStageMaster, // (stage: StageMaster) => void
  resetToDefaults,   // () => void - デフォルトに戻す
  exportData,        // () => string - JSON出力
  importData,        // (json: string, strategy: ImportStrategy) => void
} = useStageMasters();
```

---

### 2.4 useMemberRates

**ファイル:** `src/hooks/useMemberRates.ts`

メンバー単価情報の管理。

```typescript
const {
  memberRates,     // MemberRate[] - 単価一覧
  getRateForMember, // (memberId: string) => MemberRate | undefined
  updateRate,      // (rate: MemberRate) => void
  deleteRate,      // (memberId: string) => void
  exportData,      // () => string
  importData,      // (json: string) => void
} = useMemberRates();
```

---

### 2.5 useFinancialData

**ファイル:** `src/hooks/useFinancialData.ts`

財務計算の統合。

```typescript
const {
  calculateMemberFinancials, // (member: Member) => FinancialResult
  calculateTeamFinancials,   // (members: Member[]) => TeamFinancialResult
  getTotalRevenue,           // () => number
  getTotalCost,              // () => number
  getTotalProfit,            // () => number
  getProfitMargin,           // () => number
} = useFinancialData();
```

---

## 3. コンテキスト

### 3.1 StrengthsContext

**ファイル:** `src/contexts/StrengthsContext.tsx`

メンバー・資質・選択状態を管理。

```typescript
interface StrengthsContextType {
  // メンバー管理
  members: Member[];
  addMember: (member: Member) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;

  // 選択管理
  selectedMemberIds: string[];
  toggleMemberSelection: (id: string) => void;
  selectAllMembers: () => void;
  clearSelection: () => void;

  // カスタム役職
  customPositions: CustomPosition[];
  addCustomPosition: (position: CustomPosition) => void;
  updateCustomPosition: (position: CustomPosition) => void;
  deleteCustomPosition: (id: string) => void;

  // インポート/エクスポート
  exportData: () => string;
  importData: (json: string, strategy: ImportStrategy) => void;

  // 部署フィルター
  selectedDepartment: string | null;
  setSelectedDepartment: (dept: string | null) => void;
  departments: string[];  // ユニークな部署一覧
}
```

#### 使用例

```typescript
import { useStrengths } from './contexts/StrengthsContext';

function MyComponent() {
  const { members, addMember, selectedMemberIds } = useStrengths();

  const handleAdd = () => {
    addMember({
      id: '12345',
      name: '新規メンバー',
      department: '13D12345',
      position: 'GENERAL',
      strengths: [],
    });
  };

  return (
    <div>
      <p>メンバー数: {members.length}</p>
      <p>選択中: {selectedMemberIds.length}</p>
    </div>
  );
}
```

---

### 3.2 SimulationContext

**ファイル:** `src/contexts/SimulationContext.tsx`

シミュレーション状態を管理。

```typescript
interface SimulationContextType {
  state: SimulationState | null;
  setState: (state: SimulationState) => void;
  initializeFromMembers: (members: Member[]) => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
  clearState: () => void;
}
```

---

### 3.3 ThemeContext

**ファイル:** `src/contexts/ThemeContext.tsx`

テーマ設定を管理。

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

---

## 4. 型定義

### 4.1 基本型

**ファイル:** `src/models/StrengthsTypes.ts`

```typescript
// 資質カテゴリ
type StrengthCategory =
  | 'EXECUTING'
  | 'INFLUENCING'
  | 'RELATIONSHIP_BUILDING'
  | 'STRATEGIC_THINKING';

// 資質
interface Strength {
  id: number;            // 1-34
  name: string;          // 資質名
  description: string;   // 説明
  category: StrengthCategory;
}

// ランク付き資質
interface RankedStrength {
  id: number;    // 資質ID
  score: number; // 順位 (1-5)
}

// 役職
type Position = 'GENERAL' | 'LEADER' | 'MANAGER' | 'DIRECTOR';

// カスタム役職
interface CustomPosition {
  id: string;
  name: string;
  displayName: string;
  color: string;
  icon: 'crown' | 'circle' | 'star';
}

// メンバー
interface Member {
  id: string;
  name: string;
  department: string;
  position: Position | string;
  stageId?: string;
  strengths: RankedStrength[];
  personalityId?: number;
  personalityVariant?: 'A' | 'T';
  mbti?: string;
}
```

### 4.2 分析結果型

**ファイル:** `src/models/PersonalityAnalysis.ts`

```typescript
interface AnalysisResult {
  synergyScore: number;          // 相性スコア (0-100)
  teamFitScore: number;          // チーム適合度 (0-100)
  leadershipPotential: number;   // リーダーシップ潜在力 (0-100)
  primaryRole: string;           // 推論された役割
  profileSummary: string[];      // 4文構成のサマリー
  strengths?: string[];          // 強み一覧
  workStyle?: string;            // 働き方スタイル
  communicationStyle?: string;   // コミュニケーションスタイル
}
```

### 4.3 シミュレーション型

**ファイル:** `src/models/simulation.ts`

```typescript
interface SimulationState {
  groups: SimulationGroup[];
  unassignedMembers: Member[];
  lastUpdated: string;
}

interface SimulationGroup {
  id: string;
  name: string;
  members: Member[];
}

interface GroupAnalysis {
  memberCount: number;
  avgSynergyScore: number;
  avgTeamFitScore: number;
  avgLeadershipPotential: number;
  strengthDistribution: CategoryDistribution;
}

interface TeamNarrative {
  title: string;           // "バランス型チーム"
  summary: string;         // "このチームは..."
  topStrengths: TopStrengthItem[];
  possibilities: string[];
}
```

### 4.4 勤怠型

**ファイル:** `src/models/AttendanceTypes.ts`

```typescript
type ViolationType =
  | 'missing_clock'
  | 'break_violation'
  | 'late_application_missing'
  | 'early_leave_application_missing'
  | 'early_start_application_missing'
  | 'time_leave_punch_missing'
  | 'night_break_application_missing'
  | 'remarks_missing'
  | 'remarks_format_warning';

type OvertimeAlertLevel =
  | 'normal'
  | 'warning'
  | 'exceeded'
  | 'caution'
  | 'serious'
  | 'severe'
  | 'critical'
  | 'illegal';

interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  date: Date;
  dayOfWeek: string;
  calendar: string;
  application: string;
  clockIn?: string;
  clockOut?: string;
  breakMinutes?: number;
  actualWorkMinutes?: number;
  overtimeMinutes?: number;
  remarks?: string;
  sheetName?: string;
}

interface ExtendedAnalysisResult {
  summary: AnalysisSummary;
  employeeSummaries: EmployeeSummary[];
  departmentSummaries: DepartmentSummary[];
  violations: Violation[];
}
```

---

## 5. 定数

### 5.1 スコア閾値

```typescript
// 相性スコア
const SYNERGY_THRESHOLDS = {
  HIGH: 85,   // 統合型
  MID: 55,    // バランス型
  // 54以下: 多面型
};

// チーム適合度
const TEAM_FIT_THRESHOLDS = {
  HIGH: 70,   // チーム協調型
  MID: 50,    // バランス型
  // 49以下: 個人作業型
};

// リーダーシップ
const LEADERSHIP_THRESHOLDS = {
  HIGH: 70,   // リーダー型
  MID: 50,    // バランス型
  // 49以下: 専門家型
};
```

### 5.2 36協定閾値

```typescript
const OVERTIME_THRESHOLDS = {
  WARNING: 35 * 60,   // 35時間
  EXCEEDED: 45 * 60,  // 45時間
  CAUTION: 55 * 60,   // 55時間
  SERIOUS: 65 * 60,   // 65時間
  SEVERE: 70 * 60,    // 70時間
  CRITICAL: 80 * 60,  // 80時間
  ILLEGAL: 100 * 60,  // 100時間
};
```

### 5.3 ステージ順序

```typescript
const STAGE_ORDER = ['S1', 'S2', 'S3', 'S4', 'CONTRACT', 'BP'];
```

### 5.4 資質重み

```typescript
const STRENGTH_WEIGHTS = {
  TOP1: 0.50,
  TOP2: 0.30,
  TOP3: 0.15,
  TOP4: 0.03,
  TOP5: 0.02,
};
```

---

*最終更新: 2026年1月10日 | バージョン: v3.4*
