# Claude Code 開発ガイド

---

# ⚠️ 【絶対厳守】開発前に必ず読むこと ⚠️

## 🚨 重大な警告：過去に何度も繰り返された重大ミス 🚨

**このプロジェクトでは、過去に以下の重大な開発プロセス違反が繰り返し発生しています。**

### ❌ 絶対にやってはいけないこと

1. **テストを書かずに実装してcommit/push**
   - 結果: コンパイルエラーのあるコードが本番環境にデプロイされかける
   - 影響: CI/CDパイプラインがエラーを検出してビルド失敗、緊急hotfix対応が必要に

2. **開発環境で動作確認せずにmainブランチにpush**
   - 結果: 実際にアプリが動くかどうか不明なコードが本番に
   - 影響: ユーザーがアプリを使用中にクラッシュする可能性

3. **TDD原則（RED → GREEN → REFACTOR）を無視**
   - 結果: テストがない = 品質保証がない = バグの温床
   - 影響: リグレッションバグ、予期しない動作、データ破損のリスク

4. **🆕 ローカルビルドのみでCI環境を検証せずにpush**
   - 結果: ローカルでは成功してもCI環境でビルド失敗
   - 影響: 本番デプロイが失敗し、緊急hotfix対応が必要に
   - **重要**: `npm run build` と `CI=true npm run build` は挙動が異なる
     - ローカル: ESLint警告は警告のまま → ビルド成功
     - CI環境: ESLint警告がエラーに昇格 → ビルド失敗

### 🔴 mainブランチ = 本番環境という認識

```
mainへのpush = 本番環境への自動デプロイ = ユーザーへの即時影響
```

**mainブランチにpushしたコードは、GitHub ActionsのCI/CDパイプラインを通じて自動的に本番環境にデプロイされます。**

つまり、**テストなしのcommitは本番障害の直接的な原因**になります。

### ✅ 絶対に守るべき開発フロー（TDD必須）

```
┌─────────────────────────────────────────────────────────┐
│ 1. RED: テストを先に書く（失敗することを確認）          │
│    npm test -- --testNamePattern="your-test"             │
│    → FAIL が出ることを確認                               │
├─────────────────────────────────────────────────────────┤
│ 2. GREEN: 実装してテストを通す                           │
│    コードを書く                                          │
│    npm test -- --testNamePattern="your-test"             │
│    → PASS が出ることを確認                               │
├─────────────────────────────────────────────────────────┤
│ 3. REFACTOR: コードをきれいにする                        │
│    重複削除、命名改善など                                │
│    テストが引き続きPASSすることを確認                    │
├─────────────────────────────────────────────────────────┤
│ 4. 開発環境で動作確認（必須）                            │
│    npm start                                             │
│    → ブラウザで http://localhost:3006 を開く            │
│    → 実際に機能が動くことを目視確認                      │
├─────────────────────────────────────────────────────────┤
│ 5. 🆕 CI環境ビルド検証（必須）★2026-01-31追加★          │
│    set CI=true && npm run build （Windows）              │
│    CI=true npm run build （Mac/Linux）                   │
│    → ESLint警告がエラーとして検出される                  │
│    → 「Compiled successfully.」が出ることを確認          │
│    ⚠️ npm run build だけでは不十分！CI環境を再現せよ！   │
├─────────────────────────────────────────────────────────┤
│ 6. Commit & Push（これより前の工程を飛ばすな！）        │
│    git add .                                             │
│    git commit -m "..."                                   │
│    git push origin main                                  │
└─────────────────────────────────────────────────────────┘
```

### 🔥 違反した場合の実際の影響（過去事例）

**2025年11月4日の実例:**

1. ❌ テストなしで実装 (commit b95101a)
2. ❌ mainにpush
3. ❌ TypeScript重複キーエラー発生 (`'回復志向'` の重複)
4. 🚨 CI/CDビルドが失敗
5. 🚨 緊急hotfix対応 (commit d4c9621)
6. 🚨 さらにテスト追加 (commit 4ebf7ab)

**🆕 2026年1月31日の実例（CI環境未検証）:**

1. ❌ ローカルで `npm run build` 成功を確認
2. ❌ `CI=true` での検証を省略
3. ❌ mainにpush (commit eaba6dc)
4. 🚨 GitHub Actions CIビルドが失敗
   - ESLint警告「未使用のインポート12件」がエラーに昇格
   - `Treating warnings as errors because process.env.CI = true`
5. 🚨 本番デプロイ失敗
6. 🚨 緊急hotfix対応 (commit 1d6dae4)

**根本原因:**
- ローカル `npm run build`: ESLint警告は警告のまま → ビルド成功
- CI環境 `CI=true npm run build`: 警告がエラーに → ビルド失敗
- **ローカルビルド成功 ≠ CI環境ビルド成功**

**教訓:**
> 本番適用前は必ず `CI=true npm run build` でCI環境を再現して検証すること

**もしCI/CDがエラーを検出できなかった場合:**
- 本番アプリケーションがクラッシュ
- ユーザーの業務が停止
- データ損失の可能性
- 顧客からの信頼喪失
- 深夜緊急対応

### 📋 Commit前チェックリスト（全項目必須）

コミット前に、以下を**必ず全て**確認してください：

- [ ] **テストを先に書いた（RED phase）**
  - `npm test -- --testNamePattern="your-test"` で FAIL を確認した

- [ ] **実装してテストが通った（GREEN phase）**
  - `npm test -- --testNamePattern="your-test"` で PASS を確認した

- [ ] **開発サーバーでコンパイル成功**
  - `npm start` でエラーなく起動した
  - ブラウザで実際に動作することを確認した

- [ ] **TypeScriptエラーがない**
  - `npx tsc --noEmit` でエラーが出ない

- [ ] **関連する既存テストが全てPASS**
  - `npm test` で全テストがパスする

- [ ] **🆕 CI環境ビルドが成功（2026-01-31追加・必須）**
  - Windows: `set CI=true && npm run build`
  - Mac/Linux: `CI=true npm run build`
  - ⚠️ `npm run build` だけでは不十分！
  - ESLint警告がCI環境ではエラーになるため、必ずCI環境を再現すること
  - 「Compiled successfully.」が出ることを確認

- [ ] **GitHub Actionsの前回ビルドが成功している**
  - https://github.com/almlog/strengths-finder-standalone/actions でビルド履歴を確認
  - 直近1回（前回）のビルドが ✅ 成功していることを確認
  - 失敗している場合は、先にそのエラーを修正してから新しいcommitを行う

**全てチェックできた？ → それでようやくcommit/push可能です**

---

## Claudeでメンバープロファイル分析を開発する際の手順

### 🚀 初回起動時のセットアップ

#### 新規クローンの場合
```bash
# 1. リポジトリをクローン
git clone https://github.com/almlog/strengths-finder-standalone.git
cd strengths-finder-standalone

# 2. セットアップスクリプトを実行（推奨）
# Windows:
setup.bat

# Mac/Linux:
./setup.sh
```

#### 既存プロジェクトの場合
```bash
# 1. プロジェクトディレクトリに移動
cd strengths-finder-standalone

# 2. 現在の状況を確認
ls -la
git status

# 3. 必要に応じて依存関係をインストール
npm install

# 4. 開発サーバーを起動
npm start
```

**開発サーバーURL**: http://localhost:3006

### ⚠️ 開発サーバー起動前の必須確認

**`.env.local` の設定を必ず確認してください：**

```bash
# 本番Firebase認証を使用する場合（通常はこちら）
REACT_APP_USE_EMULATOR=false

# Firebase Emulatorを使用する場合のみ true
# REACT_APP_USE_EMULATOR=true
```

> **重要**: `REACT_APP_USE_EMULATOR=true` のままだと、Firebase Emulatorが起動していない場合ログインに失敗します。本番Firebase認証を使う場合は必ず `false` に設定してください。

### 💡 セットアップスクリプトの活用

**setup.bat / setup.sh の利点:**
- ✅ Node.js/npmの自動チェック
- ✅ 依存関係の自動インストール  
- ✅ エラー時の詳細ガイダンス
- ✅ 開発サーバーの自動起動オプション

**手動セットアップが必要な場合:**
- カスタムNode.jsバージョンの使用
- 特定の npm オプション指定
- 企業プロキシ環境での実行

### 📂 プロジェクト構造の理解

このプロジェクトの主要ファイル：

```
strengths-finder-standalone/
├── .claude/                              # Claude Code 設定
│   └── skills/
│       └── strengths-analyzer/           # 分析システム専門スキル
│           └── SKILL.md                  # スキル定義
├── src/
│   ├── App.tsx                           # メインアプリ（ルーティング含む）
│   ├── components/
│   │   ├── auth/                         # 認証コンポーネント
│   │   │   ├── LoginPage.tsx            # ログイン画面
│   │   │   ├── RegistrationPage.tsx     # ユーザー招待（管理者用）
│   │   │   ├── SetPasswordPage.tsx      # パスワード設定
│   │   │   └── PasswordResetPage.tsx    # パスワードリセット
│   │   └── strengths/                    # ストレングス関連コンポーネント
│   │       ├── StrengthsFinderPage.tsx  # メインページ
│   │       ├── MemberForm.tsx           # メンバー追加/編集
│   │       ├── MembersList.tsx          # メンバー一覧
│   │       └── ...                      # その他分析コンポーネント
│   ├── config/firebase.ts               # Firebase設定
│   ├── hooks/useAuth.ts                 # 認証状態管理フック
│   ├── utils/auth/                      # 認証ユーティリティ
│   ├── contexts/StrengthsContext.tsx    # 状態管理
│   ├── services/
│   │   ├── StrengthsService.ts          # ビジネスロジック
│   │   ├── PersonalityAnalysisEngine.ts # 分析エンジン
│   │   ├── ProfitabilityService.ts      # 利益率計算
│   │   └── SimulationService.ts         # チームシミュレーション
│   └── models/StrengthsTypes.ts         # 型定義
├── scripts/                              # 管理スクリプト
│   ├── set-admin-role.js                # 管理者権限付与
│   └── list-users.js                    # ユーザー一覧表示
├── docs/                                 # ドキュメント（詳細は docs/README.md）
├── README.md                            # プロジェクト概要
├── DEVELOPMENT.md                       # 開発者ガイド
└── CLAUDE.md                           # このファイル
```

### 🤖 Claude Skills の活用

このプロジェクトには**strengths-analyzer**という専門スキルが用意されています。

#### スキルとは？
- StrengthsFinder分析システムの専門知識を持つClaude Codeの拡張機能
- 34資質、MBTI、Belbin理論、利益率計算、チームシミュレーションなど、すべての分析機能に精通

#### スキルの起動方法

**1. 自動起動（推奨）**
以下のようなキーワードを含む質問をすると、Claudeが自動的にスキルを起動します：
- `相性スコア`、`チーム適合度`、`リーダーシップ`
- `資質`、`MBTI`、`Belbin`
- `利益率`、`profitability`
- `チームシミュレーション`、`team simulation`

**2. 手動起動**
```
# Claudeに直接指示
strengths-analyzerスキルを使って相性スコアの計算ロジックを説明して
```

#### スキルができること
- 分析ロジックの詳細説明（計算式、理論的根拠）
- 実装の確認（該当ファイルを自動で読み取り）
- バグ調査（関連コードを特定して検証）
- 新機能開発の支援（類似実装の検索、TDD提案）

#### 例
```
Q: 相性スコアってどう計算してるの？
→ スキルが PersonalityAnalysisEngine.ts を読んで、
   MBTI_COMPATIBILITY マトリクスと計算式を説明

Q: 四半期ごとの利益推移グラフを追加したい
→ ProfitabilityService.ts の既存ロジックを確認し、
   新規メソッドとRechartsの実装例を提案
```

### 🔧 よく使用するコマンド

```bash
# 開発サーバー起動
npm start

# 本番ビルド
npm run build

# ビルドのプレビュー
npm run preview

# テスト実行
npm test

# 認証関連テスト
npm test -- --testPathPattern="auth"

# Firebase Emulator起動（オプション）
npm run emulator

# 管理者権限付与
npm run admin:set <email>

# ユーザー一覧確認
npm run admin:list
```

### 🔐 Firebase認証開発

#### 環境変数の設定

```bash
# .env.local を作成（.gitignoreに含まれている）
cp .env.example .env.local

# Firebase Console から設定値を取得して設定
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=...
REACT_APP_FIREBASE_PROJECT_ID=...
```

#### 認証機能の開発時の注意

1. **テスト必須**: 認証コンポーネントの変更時はTDDを厳守
2. **セキュリティ**: ドメイン制限バリデーションを必ず実装
3. **エラーハンドリング**: Firebase認証エラーを適切に処理

#### 管理者権限の設定

```bash
# 1. Firebase Console → プロジェクト設定 → サービスアカウント
# 2. 「新しい秘密鍵の生成」をクリック
# 3. ダウンロードしたJSONを firebase-service-account.json に保存
# 4. scripts/ または プロジェクトルートに配置

# 管理者権限を付与
npm run admin:set suzuki.shunpei@altx.co.jp

# ユーザー一覧を確認
npm run admin:list
```

**詳細なドキュメント**: [docs/auth/](docs/auth/) を参照

### 🎯 開発の進め方

#### 1. 新機能を追加する場合

1. **Issue/要件の確認**
   ```bash
   # まず現在の動作を確認
   npm start
   ```

2. **コンポーネントの作成**
   ```bash
   # 新しいコンポーネントファイルを作成
   touch src/components/strengths/NewFeature.tsx
   ```

3. **型定義の追加**
   - `src/models/StrengthsTypes.ts` に新しい型を追加

4. **サービスロジックの実装**
   - `src/services/StrengthsService.ts` にビジネスロジックを追加

5. **状態管理の更新**
   - `src/contexts/StrengthsContext.tsx` に状態を追加

#### 2. バグ修正の場合

1. **問題の再現**
   ```bash
   npm start
   # ブラウザで問題を確認
   ```

2. **ログの確認**
   - ブラウザのDevToolsのConsoleタブを確認
   - Networkタブでリクエストエラーを確認

3. **該当ファイルの特定**
   ```bash
   # エラーメッセージから該当ファイルを探す
   grep -r "エラーメッセージ" src/
   ```

#### 3. スタイル調整の場合

- Tailwind CSSクラスを使用
- カスタムスタイルは最小限に
- レスポンシブデザインを考慮

### 🐛 トラブルシューティング

#### よくある問題と解決方法

1. **開発サーバーが起動しない**
   ```bash
   # ポートを確認
   netstat -an | findstr :3006

   # ポートが使用中の場合、プロセスを終了
   # PIDを確認して taskkill /F /PID <PID>
   npm start
   ```

2. **Tailwind CSSが効かない**
   ```bash
   # 設定ファイルを確認
   cat postcss.config.js
   cat tailwind.config.js
   
   # 再インストール
   npm install tailwindcss@3.4.1
   ```

3. **TypeScriptエラー**
   ```bash
   # 設定を確認
   cat tsconfig.json
   
   # 型チェック
   npx tsc --noEmit
   ```

4. **ビルドエラー**
   ```bash
   # 詳細なエラー情報を表示
   npm run build -- --verbose
   ```

5. **ログインに失敗する**
   ```bash
   # .env.local の REACT_APP_USE_EMULATOR を確認
   # true = Firebase Emulator使用（ローカルEmulatorが必要）
   # false = 本番Firebase使用（通常はこちら）

   # .env.local を編集
   REACT_APP_USE_EMULATOR=false

   # 開発サーバーを再起動（環境変数変更後は必須）
   # 既存プロセスを終了してから npm start
   ```

### 📝 コーディング規約

#### ファイル命名規則
- コンポーネント: `PascalCase.tsx`
- ユーティリティ: `camelCase.ts`
- 型定義: `PascalCaseTypes.ts`

#### コンポーネント設計
```typescript
// 良い例
interface Props {
  member: Member;
  onUpdate: (member: Member) => void;
}

const MemberCard: React.FC<Props> = ({ member, onUpdate }) => {
  // 実装
};

export default MemberCard;
```

#### 状態管理
- LocalStorageへの保存は `StrengthsContext` で管理
- 一時的な状態は各コンポーネントの `useState` を使用

### 🔍 デバッグのヒント

#### 1. React Developer Tools
```javascript
// コンソールで状態を確認
$r.props
$r.state
```

#### 2. ローカルストレージの確認
```javascript
// ブラウザのConsoleで実行
console.log(localStorage.getItem('strengths-members'));
```

#### 3. サービスロジックのテスト
```javascript
// 34の資質一覧を確認
import StrengthsService from './services/StrengthsService';
console.log(StrengthsService.getAllStrengths());
```

### 🚀 デプロイ手順

```bash
# 本番ビルド
npm run build

# ビルド結果の確認
ls -la build/

# 静的ファイルとしてデプロイ
# buildフォルダの内容をWebサーバーにアップロード
```

### 📋 開発時のチェックリスト

- [ ] 開発サーバーが正常に起動する
- [ ] TypeScriptエラーがない
- [ ] Tailwind CSSが適用されている
- [ ] レスポンシブデザインが機能している
- [ ] ローカルストレージでデータが保存される
- [ ] インポート/エクスポート機能が動作する
- [ ] 各分析画面でグラフが表示される

### 🔗 関連リンク

- [README.md](./README.md) - プロジェクト概要
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 詳細な開発ガイド
- [docs/README.md](./docs/README.md) - ドキュメント一覧
- [docs/auth/](./docs/auth/) - Firebase認証ドキュメント
- [docs/analysis/](./docs/analysis/) - 分析ロジックドキュメント
- [React公式ドキュメント](https://react.dev/)
- [Tailwind CSS公式ドキュメント](https://tailwindcss.com/)
- [Recharts公式ドキュメント](https://recharts.org/)
- [Firebase公式ドキュメント](https://firebase.google.com/docs)

### 💡 開発Tips

1. **効率的な開発環境**
   ```bash
   # 自動保存でホットリロード
   # VS Codeの設定: "files.autoSave": "afterDelay"
   ```

2. **エラー解決のアプローチ**
   - エラーメッセージを正確に読む
   - 関連ファイルの imports/exports を確認
   - ブラウザのDevToolsを活用

3. **新機能開発時の順序**
   1. 型定義 → 2. サービス → 3. コンポーネント → 4. 統合

この手順に従うことで、Claudeを使った効率的な開発が可能になります。