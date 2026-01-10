# システム仕様書

## 目次

1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [データモデル](#4-データモデル)
5. [サービス層](#5-サービス層)
6. [状態管理](#6-状態管理)
7. [認証システム](#7-認証システム)
8. [データ永続化](#8-データ永続化)
9. [ルーティング](#9-ルーティング)
10. [ビルドとデプロイ](#10-ビルドとデプロイ)

---

## 1. アーキテクチャ概要

### 1.1 設計思想

| 原則 | 説明 |
|------|------|
| クライアントサイド完結 | サーバーへのデータ送信なし |
| プライバシー重視 | 個人情報はブラウザ内のみに保存 |
| ゼロコスト運用 | GitHub Pages無料ホスティング |
| オフライン対応 | 初回アクセス後はオフラインで動作可能 |

### 1.2 システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                      ブラウザ                           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │   React     │  │  Tailwind   │  │  Recharts   │      │
│  │   (UI)      │  │  (CSS)      │  │  (グラフ)   │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Context API (状態管理)              │    │
│  │  StrengthsContext | SimulationContext | Theme   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │              サービス層                          │    │
│  │  StrengthsService | PersonalityAnalysisEngine   │    │
│  │  SimulationService | AttendanceService          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │   LocalStorage  │  │ Firebase Auth   │              │
│  │   (データ保存)   │  │ (認証)          │              │
│  └─────────────────┘  └─────────────────┘              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   GitHub Pages                          │
│              (静的ファイルホスティング)                  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 技術スタック

### 2.1 フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| React | 19.1 | UIフレームワーク |
| TypeScript | 4.9 | 型安全なJavaScript |
| Tailwind CSS | 3.4.1 | ユーティリティファーストCSS |
| Recharts | 3.2 | グラフ・チャート描画 |
| @dnd-kit | 6.3 | ドラッグ&ドロップ |
| Lucide React | 0.544 | アイコンライブラリ |
| XLSX | 0.18 | Excelファイル解析 |
| React Router | 7.11 | クライアントサイドルーティング |

### 2.2 認証・インフラ

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Firebase | 12.7 | 認証（Authentication） |
| GitHub Actions | - | CI/CD |
| GitHub Pages | - | 静的ホスティング |

### 2.3 開発ツール

| 技術 | 用途 |
|------|------|
| React Scripts | 5.0.1 | ビルドツール |
| Jest | テストフレームワーク |
| Testing Library | コンポーネントテスト |

---

## 3. ディレクトリ構成

```
strengths-finder-standalone/
├── public/                          # 静的ファイル
│   ├── index.html                   # HTMLテンプレート
│   └── favicon.ico                  # ファビコン
│
├── src/
│   ├── components/                  # UIコンポーネント
│   │   ├── auth/                    # 認証関連
│   │   │   ├── LoginPage.tsx        # ログイン画面
│   │   │   ├── RegisterPage.tsx     # 新規登録画面
│   │   │   ├── SetPasswordPage.tsx  # パスワード設定
│   │   │   ├── PasswordResetPage.tsx # パスワードリセット
│   │   │   └── PrivateRoute.tsx     # 認証ガード
│   │   │
│   │   ├── strengths/               # プロファイル分析
│   │   │   ├── StrengthsFinderPage.tsx  # メインページ
│   │   │   ├── MemberForm.tsx       # メンバー追加/編集
│   │   │   ├── MembersList.tsx      # メンバー一覧
│   │   │   ├── IndividualStrengths.tsx  # 個人分析
│   │   │   ├── DepartmentAnalysis.tsx   # 部署分析
│   │   │   ├── SelectedAnalysis.tsx # 選択分析
│   │   │   ├── StrengthsAnalysis.tsx # 所有者分析
│   │   │   ├── TeamSimulation.tsx   # チームシミュレーション
│   │   │   ├── AboutAnalysisTab.tsx # 分析について
│   │   │   ├── StageMasterSettings.tsx  # ステージマスタ
│   │   │   └── MemberRateSettings.tsx   # 単価設定
│   │   │
│   │   ├── attendance/              # 勤怠分析
│   │   │   └── AttendanceAnalysisPage.tsx
│   │   │
│   │   ├── analysis/                # 分析カード
│   │   │   └── ProfileAnalysisCard.tsx
│   │   │
│   │   ├── simulation/              # シミュレーション
│   │   │   ├── MemberCard.tsx       # ドラッグ可能カード
│   │   │   ├── GroupCard.tsx        # グループコンテナ
│   │   │   └── ScoreTooltip.tsx     # スコアツールチップ
│   │   │
│   │   ├── theme/                   # テーマ
│   │   │   └── ThemeSwitcher.tsx    # テーマ切替
│   │   │
│   │   └── ui/                      # 共通UI
│   │       └── Tabs.tsx             # タブコンポーネント
│   │
│   ├── contexts/                    # 状態管理
│   │   ├── StrengthsContext.tsx     # メンバー・資質
│   │   ├── SimulationContext.tsx    # シミュレーション
│   │   └── ThemeContext.tsx         # テーマ
│   │
│   ├── hooks/                       # カスタムフック
│   │   ├── useAuth.ts               # 認証
│   │   ├── useManagerMode.ts        # マネージャーモード
│   │   ├── useStageMasters.ts       # ステージマスタ
│   │   ├── useMemberRates.ts        # 単価情報
│   │   └── useFinancialData.ts      # 財務計算
│   │
│   ├── services/                    # ビジネスロジック
│   │   ├── StrengthsService.ts      # 資質管理
│   │   ├── Personality16Service.ts  # 16Personalities
│   │   ├── PersonalityAnalysisEngine.ts  # 分析エンジン
│   │   ├── SimulationService.ts     # シミュレーション
│   │   ├── AttendanceService.ts     # 勤怠分析
│   │   ├── ProfitabilityService.ts  # 利益率計算
│   │   ├── FinancialService.ts      # 財務計算
│   │   ├── StageMasterService.ts    # ステージマスタ
│   │   ├── MemberRateService.ts     # 単価管理
│   │   └── MigrationService.ts      # データ移行
│   │
│   ├── models/                      # 型定義
│   │   ├── StrengthsTypes.ts        # 資質・メンバー
│   │   ├── PersonalityAnalysis.ts   # 分析結果
│   │   ├── simulation.ts            # シミュレーション
│   │   └── AttendanceTypes.ts       # 勤怠
│   │
│   ├── types/                       # 追加型定義
│   │   ├── profitability.ts         # 利益率
│   │   └── financial.ts             # 財務
│   │
│   ├── utils/                       # ユーティリティ
│   │   ├── dataMigration.ts         # データ移行
│   │   └── auth/
│   │       └── domainValidator.ts   # ドメイン検証
│   │
│   ├── config/                      # 設定
│   │   └── firebase.ts              # Firebase設定
│   │
│   ├── App.tsx                      # アプリケーションルート
│   ├── index.tsx                    # エントリーポイント
│   └── index.css                    # グローバルスタイル
│
├── docs/                            # ドキュメント
├── scripts/                         # 管理スクリプト
├── package.json                     # 依存関係
├── tsconfig.json                    # TypeScript設定
├── tailwind.config.js               # Tailwind設定
└── firebase.json                    # Firebase設定
```

---

## 4. データモデル

### 4.1 Member（メンバー）

```typescript
interface Member {
  id: string;              // 社員番号（一意）
  name: string;            // 氏名
  department: string;      // 部署コード
  position: Position | string;  // 役職
  stageId?: string;        // ステージID（S1/S2/S3/S4/CONTRACT/BP）
  strengths: RankedStrength[];  // Top5資質
  personalityId?: number;  // 16Personalitiesタイプ（1-16）
  personalityVariant?: 'A' | 'T';  // アイデンティティ
  mbti?: string;          // MBTIタイプ（INTJ等）
}
```

### 4.2 RankedStrength（資質）

```typescript
interface RankedStrength {
  id: number;    // 資質ID（1-34）
  score: number; // 順位（1-5、1が最も強い）
}
```

### 4.3 Strength（資質マスタ）

```typescript
interface Strength {
  id: number;
  name: string;           // 資質名
  description: string;    // 説明
  category: StrengthCategory;  // カテゴリ
}

type StrengthCategory =
  | 'EXECUTING'           // 実行力
  | 'INFLUENCING'         // 影響力
  | 'RELATIONSHIP_BUILDING'  // 人間関係構築力
  | 'STRATEGIC_THINKING'; // 戦略的思考力
```

### 4.4 Position（役職）

```typescript
type Position =
  | 'GENERAL'   // 一般
  | 'LEADER'    // リーダー
  | 'MANAGER'   // マネージャー
  | 'DIRECTOR'; // 部長

interface CustomPosition {
  id: string;
  name: string;
  displayName: string;
  color: string;  // HEXカラー
  icon: 'crown' | 'circle' | 'star';
}
```

### 4.5 StageMaster（ステージマスタ）

```typescript
interface StageMaster {
  id: string;           // S1/S2/S3/S4/CONTRACT/BP
  name: string;         // 表示名
  personnelCost: number; // 人件費合計（円/月）
  expenseRate: number;   // 経費率（%）
  fixedExpense: number;  // 固定経費（円）
}
```

### 4.6 MemberRate（単価情報）

```typescript
interface MemberRate {
  memberId: string;
  monthlyRate?: number;   // 月額売上単価
  hourlyRate?: number;    // 時給（契約社員・BP用）
}
```

### 4.7 SimulationState（シミュレーション状態）

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
```

### 4.8 AttendanceRecord（勤怠レコード）

```typescript
interface AttendanceRecord {
  employeeId: string;     // 社員番号
  employeeName: string;   // 氏名
  department: string;     // 部門
  date: Date;            // 日付
  dayOfWeek: string;     // 曜日
  calendar: string;      // 平日/法定外/法定休
  application: string;   // 申請内容
  clockIn?: string;      // 出勤時刻
  clockOut?: string;     // 退勤時刻
  breakMinutes?: number; // 休憩時間
  actualWorkMinutes?: number;  // 実働時間
  overtimeMinutes?: number;    // 残業時間
  remarks?: string;      // 備考
  // ... その他フィールド
}
```

---

## 5. サービス層

### 5.1 StrengthsService

メンバー・資質の管理を担当。

```typescript
class StrengthsService {
  // 34資質の取得
  static getAllStrengths(): Strength[]

  // 資質IDから資質を取得
  static getStrengthById(id: number): Strength | undefined

  // カテゴリ別に資質を取得
  static getStrengthsByCategory(category: StrengthCategory): Strength[]

  // メンバーのTop5資質を取得
  static getTopStrengths(member: Member): Strength[]
}
```

### 5.2 PersonalityAnalysisEngine

MBTI × StrengthsFinder統合分析を担当。

```typescript
class PersonalityAnalysisEngine {
  // メンバーの統合分析を実行
  static analyze(member: Member): AnalysisResult | null

  // 相性スコア計算
  static calculateSynergyScore(mbtiType: string, strengths: RankedStrength[]): number

  // チーム適合度計算
  static calculateTeamFitScore(mbtiType: string, strengths: RankedStrength[]): number

  // リーダーシップ潜在力計算
  static calculateLeadershipPotential(mbtiType: string, strengths: RankedStrength[]): number

  // 役割推論
  static inferPrimaryRole(mbtiType: string, strengths: RankedStrength[]): string

  // プロファイルサマリー生成
  static buildProfileSummary(analysis: AnalysisResult): string[]
}
```

### 5.3 SimulationService

チームシミュレーションのロジックを担当。

```typescript
class SimulationService {
  // グループの作成・更新・削除
  static createGroup(state: SimulationState, name: string): SimulationState
  static updateGroup(state: SimulationState, groupId: string, name: string): SimulationState
  static deleteGroup(state: SimulationState, groupId: string): SimulationState

  // メンバーの移動
  static moveMember(
    state: SimulationState,
    memberId: string,
    fromGroupId: string | null,
    toGroupId: string | null
  ): SimulationState

  // グループ分析
  static analyzeGroup(group: SimulationGroup): GroupAnalysis

  // チーム特性ナラティブ生成
  static calculateTeamNarrative(members: Member[]): TeamNarrative

  // シナリオのエクスポート/インポート
  static exportScenario(state: SimulationState): string
  static importScenario(json: string): SimulationState
}
```

### 5.4 AttendanceService

勤怠分析のロジックを担当。

```typescript
class AttendanceService {
  // XLSXファイル解析
  static async parseXlsx(file: File): Promise<AttendanceRecord[]>

  // 日次レコード分析
  static analyzeDailyRecord(record: AttendanceRecord): DailyAnalysis

  // 拡張分析（月次）
  static analyzeExtended(records: AttendanceRecord[]): ExtendedAnalysisResult

  // 36協定チェック
  static getOvertimeAlertLevel(overtimeMinutes: number): OvertimeAlertLevel

  // 予兆判定
  static isOvertimeOnPaceToExceed(
    currentMinutes: number,
    dayOfMonth: number,
    limitMinutes: number
  ): boolean

  // 備考欄チェック
  static checkRemarksRequired(record: AttendanceRecord): RemarksCheck

  // 8時出社カレンダー登録者の補正処理
  // （9時出社のメンバーが8時出社カレンダーに登録されている場合の誤検出を補正）
  static is8HourScheduleFromSheetName(sheetName: string): boolean
  static shouldExcludeLateFor8HourSchedule(record: AttendanceRecord, lateMinutes: number): boolean
}
```

### 5.5 ProfitabilityService

利益率計算を担当。

```typescript
class ProfitabilityService {
  // 原価計算
  static calculateCost(
    member: Member,
    stageMasters: StageMaster[],
    memberRates: MemberRate[]
  ): number

  // 利益計算
  static calculateProfit(
    member: Member,
    stageMasters: StageMaster[],
    memberRates: MemberRate[]
  ): ProfitResult

  // 利益率計算
  static calculateProfitability(
    members: Member[],
    stageMasters: StageMaster[],
    memberRates: MemberRate[]
  ): ProfitabilitySummary
}
```

---

## 6. 状態管理

### 6.1 StrengthsContext

メンバー・資質・カスタム役職を管理。

```typescript
interface StrengthsContextType {
  // メンバー
  members: Member[];
  addMember: (member: Member) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;

  // 選択メンバー
  selectedMemberIds: string[];
  toggleMemberSelection: (id: string) => void;
  clearSelection: () => void;

  // カスタム役職
  customPositions: CustomPosition[];
  addCustomPosition: (position: CustomPosition) => void;

  // インポート/エクスポート
  exportData: () => string;
  importData: (json: string, strategy: ImportStrategy) => void;

  // 部署フィルター
  selectedDepartment: string | null;
  setSelectedDepartment: (dept: string | null) => void;
}
```

### 6.2 SimulationContext

シミュレーション状態を管理。

```typescript
interface SimulationContextType {
  state: SimulationState | null;
  setState: (state: SimulationState) => void;
  initializeFromMembers: (members: Member[]) => void;
  saveToStorage: () => void;
  loadFromStorage: () => void;
}
```

### 6.3 ThemeContext

テーマ設定を管理。

```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}
```

---

## 7. 認証システム

### 7.1 認証フロー

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  未ログイン  │────▶│   ログイン   │────▶│   認証済み   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       ▼                   │
┌─────────────┐            │
│  新規登録   │────────────┘
└─────────────┘
```

### 7.2 ドメイン制限

許可されたドメインのみ登録可能:

```typescript
const ALLOWED_DOMAINS = ['altx.co.jp'];

function validateEmailDomain(email: string): boolean {
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}
```

### 7.3 認証コンポーネント

| コンポーネント | 機能 |
|-------------|------|
| LoginPage | メール/パスワードログイン |
| RegisterPage | 新規ユーザー登録 |
| SetPasswordPage | 初回パスワード設定 |
| PasswordResetPage | パスワードリセット |
| PrivateRoute | 認証ガード（未認証→リダイレクト） |

### 7.4 管理者権限

Firebase Admin SDKでカスタムクレームを設定:

```bash
# 管理者権限付与
npm run admin:set <email>

# ユーザー一覧確認
npm run admin:list
```

---

## 8. データ永続化

### 8.1 LocalStorageキー

| キー | 内容 |
|-----|------|
| `strengths_members` | メンバーリスト |
| `strengths_custom_positions` | カスタム役職 |
| `strengths-simulation-state` | シミュレーション状態 |
| `strengths-stage-masters` | ステージマスタ |
| `strengths-member-rates` | 単価情報 |
| `strengths-theme-mode` | テーマ設定 |

### 8.2 自動保存

Context内でuseEffectにより自動保存:

```typescript
useEffect(() => {
  localStorage.setItem('strengths_members', JSON.stringify(members));
}, [members]);
```

### 8.3 インポート/エクスポート形式

```json
{
  "customPositions": [
    {
      "id": "CUSTOM_123",
      "name": "副事業部長",
      "displayName": "副事業部長",
      "color": "#9E9E9E",
      "icon": "crown"
    }
  ],
  "members": [
    {
      "id": "12345678",
      "name": "山田太郎",
      "department": "13D12345",
      "position": "MANAGER",
      "stageId": "S3",
      "strengths": [
        { "id": 1, "score": 1 },
        { "id": 16, "score": 2 }
      ],
      "personalityId": 1,
      "personalityVariant": "A",
      "mbti": "INTJ"
    }
  ],
  "stageMasters": [...],
  "memberRates": [...]
}
```

### 8.4 競合解決戦略

| 戦略 | 動作 |
|------|------|
| Replace | 既存データを削除し、インポートデータで置換 |
| Add | 重複しないメンバーのみ追加 |
| Merge | 重複メンバーは更新、新規は追加 |

---

## 9. ルーティング

### 9.1 ルート構成

```typescript
<BrowserRouter basename="/strengths-finder-standalone">
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/set-password" element={<SetPasswordPage />} />
    <Route path="/reset-password" element={<PasswordResetPage />} />
    <Route path="/*" element={
      <PrivateRoute>
        <StrengthsFinderPage />
      </PrivateRoute>
    } />
  </Routes>
</BrowserRouter>
```

### 9.2 basename設定

GitHub Pagesのサブディレクトリ対応:

```typescript
// 正しいナビゲーション
import { Link, useNavigate } from 'react-router-dom';

<Link to="/login">ログイン</Link>  // 自動でbasename付与
navigate('/dashboard');            // 自動でbasename付与
```

### 9.3 クエリパラメータ

| パラメータ | 効果 |
|-----------|------|
| `?mode=manager` | マネージャーモード有効化 |

---

## 10. ビルドとデプロイ

### 10.1 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm start` | 開発サーバー起動（localhost:3000） |
| `npm test` | テスト実行 |
| `npm run build` | 本番ビルド |
| `npm run preview` | ビルドプレビュー |

### 10.2 Firebase関連コマンド

| コマンド | 説明 |
|---------|------|
| `npm run emulator` | Firebase Emulator起動 |
| `npm run emulator:ui` | Emulator（UI付き）起動 |
| `npm run admin:set <email>` | 管理者権限付与 |
| `npm run admin:list` | ユーザー一覧表示 |

### 10.3 GitHub Actions CI/CD

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          REACT_APP_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          # ... 他のFirebase環境変数

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

### 10.4 環境変数

| 変数 | 説明 |
|------|------|
| `REACT_APP_FIREBASE_API_KEY` | Firebase APIキー |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase認証ドメイン |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebaseプロジェクトパブリック ID |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | ストレージバケット |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | メッセージング送信者ID |
| `REACT_APP_FIREBASE_APP_ID` | FirebaseアプリID |

### 10.5 本番URL

```
https://almlog.github.io/strengths-finder-standalone
```

---

*最終更新: 2026年1月10日 | バージョン: v3.4*
