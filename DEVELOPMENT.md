# 開発者ガイド

## ⚠️ 必読：開発品質誓約

**開発を開始する前に必ず確認してください：**

1. 📋 **[開発品質誓約書](./DEVELOPMENT_QUALITY_PLEDGE.md)** - 開発の度に読む
2. 📖 **Spec（IMPLEMENTATION_PLAN_AI_TDD.md）** - 実行計画書として扱う
3. ✅ **タスク開始前・実装中・完了前にSpecと照合**

**Spec駆動開発とTDDの本質を理解し、品質基準を満たさない実装は行いません。**

---

## プロジェクト概要
メンバープロファイル分析は、元の勤怠管理分析ツールから切り出したスタンドアロンWebアプリケーションです。メンバーの強み（ストレングスファインダー）と性格（16Personalities）を可視化・分析します。

## 開発環境の準備

### 必要なソフトウェア
- Node.js 18.x 以上
- npm 9.x 以上
- Git

### 初期セットアップ
```bash
# リポジトリのクローン（既存の場合）
git clone <repository-url>
cd strengths-finder-standalone

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start
```

## プロジェクト構造

```
strengths-finder-standalone/
├── public/                    # 静的ファイル
├── src/
│   ├── components/
│   │   ├── strengths/         # プロファイル分析関連コンポーネント
│   │   │   ├── StrengthsFinderPage.tsx    # メインページ
│   │   │   ├── MemberForm.tsx             # メンバー追加/編集フォーム（v3.1: 単価入力UI追加）
│   │   │   ├── MembersList.tsx            # メンバー一覧
│   │   │   ├── IndividualStrengths.tsx    # 個人分析（プロファイル分析統合）
│   │   │   ├── DepartmentAnalysis.tsx     # 部署分析
│   │   │   ├── SelectedAnalysis.tsx       # 選択メンバー分析
│   │   │   ├── StrengthsAnalysis.tsx      # 資質分析
│   │   │   └── StageMasterSettings.tsx    # 🆕 v3.1: ステージマスタ設定
│   │   ├── analysis/          # 🆕 性格分析機能
│   │   │   └── ProfileAnalysisCard.tsx    # プロファイル分析カード
│   │   └── ui/
│   │       └── Tabs.tsx                   # タブコンポーネント
│   ├── contexts/
│   │   ├── StrengthsContext.tsx           # プロファイル分析用コンテキスト
│   │   └── ThemeContext.tsx               # テーマ管理コンテキスト
│   ├── hooks/
│   │   └── useMemberRates.ts              # 🆕 v3.1: 単価情報管理フック
│   ├── models/
│   │   ├── StrengthsTypes.ts              # 型定義
│   │   └── PersonalityAnalysis.ts         # 🆕 性格分析型定義
│   ├── services/
│   │   ├── StrengthsService.ts            # ビジネスロジック
│   │   ├── Personality16Service.ts        # 16Personalities サービス
│   │   ├── PersonalityAnalysisEngine.ts   # 🆕 性格分析エンジン
│   │   ├── ProfitabilityService.ts        # 🆕 v3.1: 利益率計算サービス
│   │   ├── FinancialService.ts            # 🆕 v3.1: 金額計算サービス
│   │   ├── StageMasterService.ts          # 🆕 v3.1: ステージマスタ管理
│   │   ├── MemberRateService.ts           # 🆕 v3.1: 単価情報管理
│   │   └── __tests__/
│   │       └── ProfitabilityService.v3.1.test.ts  # 🆕 v3.1: 利益計算テスト
│   ├── types/
│   │   ├── profitability.ts               # 🆕 v3.1: 利益計算型定義
│   │   └── financial.ts                   # 🆕 v3.1: 財務型定義
│   ├── App.tsx                            # メインアプリケーション
│   ├── index.tsx                          # エントリーポイント
│   └── index.css                          # グローバルスタイル
├── package.json                           # 依存関係と設定
├── tsconfig.json                          # TypeScript設定
├── tailwind.config.js                     # Tailwind CSS設定
├── postcss.config.js                      # PostCSS設定
└── .env                                   # 環境変数
```

## 主要な設定ファイル

### TypeScript設定 (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "es2015",
    "downlevelIteration": true,
    // その他の設定...
  }
}
```

### Tailwind CSS設定 (tailwind.config.js)
```javascript
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

### PostCSS設定 (postcss.config.js)
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 開発コマンド

```bash
# 開発サーバー起動
npm start

# 本番ビルド
npm run build

# テスト実行
npm test

# リンターとフォーマッターの実行（追加予定）
npm run lint
npm run format
```

## データ構造

### Member型
```typescript
interface Member {
  id: string;           // 社員番号
  name: string;         // 氏名
  department: string;   // 部署コード
  strengths: {
    id: number;         // 資質ID (1-34)
    score: number;      // 順位 (1-5)
  }[];
}
```

### 34の資質
1. 達成欲, 2. 活発性, 3. 適応性, ..., 34. 学習欲

詳細は `src/services/StrengthsService.ts` を参照。

## 主要機能の実装

### 1. データ永続化
- LocalStorageを使用したクライアントサイドデータ保存
- JSON形式でのインポート/エクスポート機能

### 2. 分析機能
- 個人の強み分析（レーダーチャート）
- **🆕 プロファイル分析（Phase1 & Phase2完成）**:
  - MBTI×資質の統合分析（相性スコア、チーム適合度、リーダーシップ潜在力）
  - 動的な役割推論（16パターン）
  - スコアベースの4文構成サマリー生成
  - 詳細な理論的根拠は [ANALYSIS_METHODOLOGY.md](./ANALYSIS_METHODOLOGY.md) 参照
- 部署別強み集計
- 選択メンバーの強み傾向分析
- 資質別メンバー検索
- **🆕 インポート競合解決**: Replace/Add/Merge戦略選択

### 3. 可視化
- Recharts ライブラリを使用
- レスポンシブデザイン対応

## 新機能の追加手順

1. **コンポーネントの作成**
   ```bash
   # 新しいコンポーネントファイルを作成
   touch src/components/strengths/NewFeature.tsx
   ```

2. **型定義の追加**
   ```typescript
   // src/models/StrengthsTypes.ts に型を追加
   export interface NewFeatureType {
     // 型定義
   }
   ```

3. **サービスロジックの実装**
   ```typescript
   // src/services/StrengthsService.ts にロジックを追加
   ```

4. **コンテキストの更新**
   ```typescript
   // src/contexts/StrengthsContext.tsx に状態管理を追加
   ```

## Phase2実装詳細ガイド

### 動的役割推論（Primary Role Inference）

**実装ファイル**: `src/services/PersonalityAnalysisEngine.ts`

**基本設計**:
```typescript
private static inferRoleFromMBTIAndStrengths(
  mbtiType: string,
  strengths: RankedStrength[]
): string {
  // MBTIタイプ解析（E/I, S/N, T/F, J/P）
  // TOP資質カテゴリ判定（ANALYTICAL, STRATEGIC, etc.）
  // 16パターンのマトリクスから役割を推論
}
```

**役割マトリクス例**:
| MBTIタイプ | TOP資質カテゴリ | 推論される役割 |
|-----------|--------------|-------------|
| INTJ | ANALYTICAL | 戦略的思考のエキスパート |
| ENTJ | INFLUENCING | 変革を牽引するリーダー |
| ENFP | RELATIONSHIP | チームを繋ぐコーディネーター |

### スコアベースサマリー生成

**実装ファイル**: `src/services/PersonalityAnalysisEngine.ts`

**4文構成の生成ロジック**:
```typescript
private static buildEnhancedProfileSummary(
  analysis: PersonalityAnalysis
): string[] {
  // 第1文: 相性タイプ（統合型/バランス型/多面型）
  // 第2文: 働き方スタイル（チーム協調型/個人作業型）
  // 第3文: 役割期待（リーダー型/専門家型）
  // 第4文: primaryRoleに基づく貢献内容
}
```

**スコア閾値定数**:
```typescript
const SYNERGY_THRESHOLDS = {
  HIGH: 85,  // 統合型
  MID: 55,   // バランス型
  // 54以下: 多面型
};

const TEAM_FIT_THRESHOLDS = {
  HIGH: 70,  // チーム協調型
  MID: 50,   // バランス型
  // 49以下: 個人作業型
};

const LEADERSHIP_THRESHOLDS = {
  HIGH: 70,  // リーダー型
  MID: 50,   // バランス型
  // 49以下: 専門家型
};
```

### インポート競合解決機能

**実装ファイル**:
- `src/components/strengths/ImportConflictDialog.tsx` (新規)
- `src/contexts/StrengthsContext.tsx` (更新)

**基本フロー**:
```typescript
// 1. インポート時に重複検出
const duplicateIds = importedMembers
  .filter(m => existingIds.has(m.id))
  .map(m => m.id);

// 2. ダイアログを表示してユーザーの選択を待機
const strategy = await onConflict({
  existingMembers, newMembers, duplicateIds
});

// 3. 選択された戦略で処理
switch (strategy) {
  case 'replace': // 全置換
  case 'add':     // 新規のみ追加
  case 'merge':   // マージ&更新
}
```

**3つの戦略**:
1. **Replace**: `setMembers(importedMembers)`
2. **Add**: `setMembers([...members, ...newMembersOnly])`
3. **Merge**: `Map`を使って既存と新規をマージ

### テスト実装ガイド

**テストファイル**: `src/__tests__/services/PersonalityAnalysisEngine.EnhancedSummary.test.ts`

**テストケース例**:
```typescript
describe('TC-010: 統合型のプロファイルサマリー', () => {
  const member: Member = {
    mbtiType: 'INTJ',
    strengths: [
      { id: 34, score: 1 },  // 戦略性 (HIGH synergy)
      { id: 29, score: 2 },  // 学習欲 (HIGH synergy)
      // ...
    ],
  };

  it('第1文に「高い相乗効果」が含まれる', () => {
    const result = engine.analyze(member);
    expect(result!.profileSummary[0]).toContain('相乗効果');
  });

  it('synergyScoreが85以上である', () => {
    const result = engine.analyze(member);
    expect(result!.synergyScore).toBeGreaterThanOrEqual(85);
  });
});
```

### バグ修正事例：資質スコア割り当て

**問題**: メンバー編集時に資質を付け替えると、すべてのスコアが5になる

**原因コード** (`MemberForm.tsx:112`):
```typescript
// ❌ 間違ったロジック
return [...prev, { id: strengthId, score: prev.length + 1 }];
// 編集時に prev.length = 4 なので、常に score = 5
```

**修正コード**:
```typescript
// ✅ 正しいロジック
const usedScores = prev.map(s => s.score);
let nextScore = 1;
while (usedScores.includes(nextScore) && nextScore <= 5) {
  nextScore++;
}
return [...prev, { id: strengthId, score: nextScore }];
// 1-5の範囲で未使用の最小スコアを探す
```

## トラブルシューティング

### よくある問題

1. **Tailwind CSSが効かない**
   - PostCSS設定を確認
   - index.cssにTailwindディレクティブがあるか確認

2. **TypeScriptエラー**
   - `downlevelIteration: true` が設定されているか確認
   - ES2015以上のターゲットが設定されているか確認

3. **ポートが使用中**
   - .envファイルでPORTを変更
   - または既存のプロセスを終了

### デバッグ方法
```bash
# 詳細なエラー情報を表示
npm start -- --verbose

# ビルド時の詳細情報
npm run build -- --verbose
```

## コーディング規約

### ファイル命名
- コンポーネント: PascalCase (例: `MemberForm.tsx`)
- サービス: PascalCase + Service (例: `StrengthsService.ts`)
- 型定義: PascalCase + Types (例: `StrengthsTypes.ts`)

### コンポーネント設計
- 単一責任の原則
- PropsとStateの明確な分離
- TypeScriptの型注釈を必須

### スタイリング
- Tailwind CSSクラスを使用
- カスタムCSSは最小限に

## デプロイ

### 本番ビルド
```bash
npm run build
```

### 静的ホスティング
buildフォルダの内容をWebサーバーにデプロイ。

### 環境変数
本番環境では以下の設定を確認：
- PORT: 適切なポート番号
- NODE_ENV: production

## Firebase認証開発

### ローカル開発環境のセットアップ

```bash
# 環境変数ファイルを作成
cp .env.example .env.local

# .env.local に Firebase 設定を追加
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### Firebase Emulator（オプション）

**重要**: `.env.local` の `REACT_APP_USE_EMULATOR` 設定を確認してください。

```bash
# 本番Firebase認証を使用（通常はこちら）
REACT_APP_USE_EMULATOR=false

# Firebase Emulatorを使用する場合のみ true に設定
REACT_APP_USE_EMULATOR=true
```

> **注意**: `REACT_APP_USE_EMULATOR=true` の場合、Firebase Emulatorが起動していないとログインに失敗します。

```bash
# Firebase CLIのインストール
npm install -g firebase-tools

# Emulatorの起動
npm run emulator

# UIありで起動
npm run emulator:ui
```

### 認証コンポーネント

| ファイル | 説明 |
|---------|------|
| `src/components/auth/LoginPage.tsx` | ログイン画面 |
| `src/components/auth/RegistrationPage.tsx` | 管理者用ユーザー招待画面 |
| `src/components/auth/SetPasswordPage.tsx` | 初回パスワード設定画面 |
| `src/components/auth/PasswordResetPage.tsx` | パスワードリセット画面 |
| `src/hooks/useAuth.ts` | 認証状態管理フック |
| `src/config/firebase.ts` | Firebase設定 |
| `src/utils/auth/` | 認証ユーティリティ |

### 管理者権限の設定

```bash
# サービスアカウントキーを配置
# Firebase Console → プロジェクト設定 → サービスアカウント
# 「新しい秘密鍵の生成」→ firebase-service-account.json

# 管理者権限を付与
npm run admin:set <email>

# ユーザー一覧を確認
npm run admin:list
```

### テストの実行

```bash
# 認証関連テストの実行
npm test -- --testPathPattern="auth"

# 全テストの実行
npm test
```

### ドキュメント

- [認証要件定義](docs/auth/AUTHENTICATION_REQUIREMENTS.md)
- [実装計画](docs/auth/IMPLEMENTATION_PLAN.md)
- [技術仕様書](docs/auth/TECHNICAL_SPECIFICATION.md)

## 今後の改善案

- [ ] ESLint/Prettierの導入
- [ ] テストカバレッジの向上
- [ ] PWA対応
- [ ] データ暗号化オプション
- [ ] CSV形式のインポート/エクスポート
- [ ] グラフのカスタマイズ機能