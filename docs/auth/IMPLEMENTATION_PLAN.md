# Firebase Authentication 実装計画書

**バージョン**: 1.0
**作成日**: 2025-12-23
**プロジェクト**: StrengthsFinder統合分析ツール
**担当**: SUZUKI Shunpei

---

## 📋 目次

1. [実装方針](#実装方針)
2. [フェーズ計画](#フェーズ計画)
3. [タスク詳細](#タスク詳細)
4. [TDD手順](#tdd手順)
5. [リスクと対策](#リスクと対策)
6. [チェックリスト](#チェックリスト)

---

## 実装方針

### 開発原則

**CLAUDE.mdで定義された原則に従う**:

```
✅ 必須: TDD（RED → GREEN → REFACTOR）
✅ 必須: 開発サーバーでの動作確認
✅ 必須: TypeScriptエラーゼロ
✅ 必須: 全テストPASS
✅ 禁止: テストなしでcommit/push
✅ 禁止: 動作確認なしでcommit/push
```

### 開発フロー

```
1. RED: テストを先に書く（失敗することを確認）
   ↓
2. GREEN: 実装してテストを通す
   ↓
3. REFACTOR: コードをきれいにする
   ↓
4. 開発サーバーで動作確認（必須）
   ↓
5. Commit & Push
```

### ブランチ戦略

```
feature/firebase-authentication
  ├── すでに作成済み
  ├── すべての実装をこのブランチで行う
  └── 完了後、mainにマージ
```

---

## フェーズ計画

### 全体スケジュール

| フェーズ | 内容 | 期間 | 状況 |
|---------|------|------|------|
| **Phase 0** | ドキュメント作成 | 0.5日 | ✅ 完了 |
| **Phase 1** | 基盤実装 | 0.5日 | 🔄 実装中（一部完了） |
| **Phase 2** | Firebaseセットアップ | 0.5日 | ⏳ 待機中 |
| **Phase 3** | ルーティング統合 | 0.5日 | ⏳ 待機中 |
| **Phase 4** | テスト実装 | 0.5日 | ⏳ 待機中 |
| **Phase 5** | 動作確認・デプロイ | 0.5日 | ⏳ 待機中 |
| **合計** | | **3日** | |

---

## タスク詳細

### Phase 0: ドキュメント作成 ✅

**目的**: 実装前に仕様を固める

- [x] 機能要件定義書作成（AUTHENTICATION_REQUIREMENTS.md）
- [x] 技術仕様書作成（TECHNICAL_SPECIFICATION.md）
- [x] 実装計画書作成（IMPLEMENTATION_PLAN.md）
- [x] ドキュメント検証（次のステップ）

**成果物**:
- `docs/auth/AUTHENTICATION_REQUIREMENTS.md`
- `docs/auth/TECHNICAL_SPECIFICATION.md`
- `docs/auth/IMPLEMENTATION_PLAN.md`

---

### Phase 1: 基盤実装 🔄

**目的**: 認証機能の基盤コードを実装

#### 完了済み ✅

- [x] Firebase SDKインストール
- [x] Firebase設定ファイル作成（`src/config/firebase.ts`）
- [x] 認証フック実装（`src/hooks/useAuth.ts`）
- [x] ドメイン検証実装（`src/utils/auth/domainValidator.ts`）
- [x] 登録フォーム実装（`src/components/auth/RegisterPage.tsx`）
- [x] パスワード設定画面実装（`src/components/auth/SetPasswordPage.tsx`）
- [x] ログイン画面実装（`src/components/auth/LoginPage.tsx`）
- [x] ルート保護コンポーネント実装（`src/components/auth/PrivateRoute.tsx`）

#### 残タスク

- [ ] react-router-domの確認・インストール
- [ ] .env.exampleの更新（Emulator設定追加）
- [ ] firebase.tsにEmulator接続ロジック追加
- [ ] .gitignoreに.env.localを追加

**TDD手順（残タスク用）**:

```bash
# 1. テスト作成（RED）
# src/__tests__/config/firebase.test.ts
# Emulator接続のテスト

# 2. 実装（GREEN）
# firebase.tsにEmulator接続コード追加

# 3. テスト実行
npm test

# 4. リファクタリング
```

---

### Phase 2: Firebaseセットアップ ⏳

**目的**: Firebase Console での設定とEmulatorのセットアップ

#### 2-1. Firebaseプロジェクト作成（ユーザーが実施）

**手順**:
1. Firebase Console にアクセス: https://console.firebase.google.com/
2. 「プロジェクトを追加」をクリック
3. プロジェクト名: `strengths-finder-auth`（例）
4. Google Analyticsは無効でOK
5. プロジェクト作成

#### 2-2. Authentication設定

**手順**:
1. 左メニュー → Authentication → 「始める」
2. Sign-in method タブ
3. 「メール/パスワード」を有効化
   - メール/パスワードのトグルをON
4. 「メールリンク（パスワードなしでログイン）」を有効化
   - トグルをON

#### 2-3. Firebase設定取得

**手順**:
1. プロジェクト設定（歯車アイコン）→ プロジェクトの設定
2. 「マイアプリ」セクション
3. 「アプリを追加」→ ウェブアプリ（</>）
4. アプリのニックネーム: `strengths-finder-web`
5. Firebase Hosting: チェックしない
6. 表示される設定をコピー

**取得する値**:
```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

#### 2-4. 環境変数設定

**ローカル開発用（.env.local）**:
```bash
# .env.local（このファイルは.gitignoreに追加）
REACT_APP_USE_EMULATOR=true
REACT_APP_FIREBASE_API_KEY=取得したAPIキー
REACT_APP_FIREBASE_AUTH_DOMAIN=取得したAuth Domain
REACT_APP_FIREBASE_PROJECT_ID=取得したProject ID
REACT_APP_FIREBASE_STORAGE_BUCKET=取得したStorage Bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=取得したMessaging Sender ID
REACT_APP_FIREBASE_APP_ID=取得したApp ID
```

**GitHub Secrets設定**:
```bash
# GitHub Settings → Secrets and variables → Actions
# New repository secret で以下を追加

REACT_APP_USE_EMULATOR=false
REACT_APP_FIREBASE_API_KEY=***
REACT_APP_FIREBASE_AUTH_DOMAIN=***
REACT_APP_FIREBASE_PROJECT_ID=***
REACT_APP_FIREBASE_STORAGE_BUCKET=***
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=***
REACT_APP_FIREBASE_APP_ID=***
```

#### 2-5. Firebase Emulator セットアップ

**インストール**:
```bash
# Firebase CLIインストール（グローバル）
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクト初期化
firebase init emulators
# → Auth Emulator を選択
# → ポート: 9099（デフォルト）
# → Emulator UI: 有効化、ポート 4000
```

**firebase.jsonファイル作成**:
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

**package.jsonにスクリプト追加**:
```json
{
  "scripts": {
    "emulator": "firebase emulators:start --only auth",
    "dev": "npm run emulator & npm start"
  }
}
```

#### 2-6. Emulator起動確認

```bash
# Emulator起動
npm run emulator

# 別ターミナルで開発サーバー起動
npm start

# または統合起動
npm run dev
```

**確認**:
- Emulator UI: http://localhost:4000
- Auth Emulator: http://localhost:9099

---

### Phase 3: ルーティング統合 ⏳

**目的**: 既存アプリケーションに認証ルーティングを統合

#### 3-1. react-router-dom確認

**確認コマンド**:
```bash
npm list react-router-dom
```

**インストール（必要な場合）**:
```bash
npm install react-router-dom
npm install --save-dev @types/react-router-dom
```

#### 3-2. App.tsx更新

**既存のApp.tsxを読み取り**:
```bash
# 現在のApp.tsxの構造を確認
```

**統合方針**:
```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './components/auth/PrivateRoute';
import RegisterPage from './components/auth/RegisterPage';
import SetPasswordPage from './components/auth/SetPasswordPage';
import LoginPage from './components/auth/LoginPage';

function App() {
  return (
    <BrowserRouter basename="/strengths-finder-standalone">
      <Routes>
        {/* パブリックルート */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/set-password" element={<SetPasswordPage />} />

        {/* 認証必須ルート（既存の画面） */}
        <Route
          path="/*"
          element={
            <PrivateRoute>
              {/* 既存のメインアプリ */}
              <StrengthsFinderApp />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

#### 3-3. ナビゲーションバーにログアウトボタン追加

**実装箇所**: 既存のナビゲーションコンポーネント

```typescript
import { auth } from './config/firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';

const Navigation = () => {
  const { user, isAdmin } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <nav>
      {/* 既存のナビゲーション */}

      {/* ログアウトボタン追加 */}
      {user && (
        <button onClick={handleLogout}>
          ログアウト
        </button>
      )}
    </nav>
  );
};
```

---

### Phase 4: テスト実装 ⏳

**目的**: TDD原則に従ったテスト作成

#### 4-1. ユニットテスト

**domainValidator.test.ts**:
```bash
# RED
touch src/__tests__/utils/auth/domainValidator.test.ts

# テスト作成
# - @altx.co.jp を許可
# - その他のドメインを拒否
# - 空文字・不正形式のチェック

# GREEN
# 既に実装済み

# テスト実行
npm test -- domainValidator.test.ts
```

#### 4-2. フックテスト

**useAuth.test.ts**:
```bash
# RED
touch src/__tests__/hooks/useAuth.test.ts

# テスト作成
# - 初期状態: loading=true, user=null
# - ログイン後: user設定、role取得
# - ログアウト後: user=null

# GREEN
# 実装は完了

# テスト実行
npm test -- useAuth.test.ts
```

#### 4-3. コンポーネントテスト

**LoginPage.test.tsx**:
```bash
# RED
touch src/__tests__/components/auth/LoginPage.test.tsx

# テスト作成
# - フォーム表示
# - 入力検証
# - ログイン成功時のリダイレクト
# - エラーメッセージ表示

# GREEN
# 既に実装済み

# テスト実行
npm test -- LoginPage.test.tsx
```

#### 4-4. テストカバレッジ確認

```bash
npm test -- --coverage --watchAll=false
```

**目標**: 90%以上

---

### Phase 5: 動作確認・デプロイ ⏳

**目的**: 本番環境へのデプロイ

#### 5-1. ローカル動作確認（Emulator）

**確認項目**:
- [ ] 登録フロー
  - [ ] @altx.co.jp で登録成功
  - [ ] その他のドメインで登録失敗
  - [ ] メールリンク送信成功
- [ ] パスワード設定
  - [ ] リンククリックで画面表示
  - [ ] パスワード設定成功
  - [ ] ログイン画面へリダイレクト
- [ ] ログイン
  - [ ] 正しい認証情報でログイン成功
  - [ ] 誤った認証情報でエラー表示
  - [ ] ダッシュボードへリダイレクト
- [ ] 権限チェック
  - [ ] 一般ユーザーで管理者画面アクセス不可
  - [ ] 管理者ユーザーで管理者画面アクセス可
- [ ] ログアウト
  - [ ] ログアウト成功
  - [ ] ログイン画面へリダイレクト

#### 5-2. 管理者CLI作成

**scripts/set-admin-role.js**:
```bash
# ファイル作成
touch scripts/set-admin-role.js

# Firebase Admin SDKインストール
npm install --save-dev firebase-admin

# サービスアカウントキー取得
# Firebase Console → プロジェクト設定 → サービスアカウント → 新しい秘密鍵の生成
# → firebase-admin-key.json として保存

# .gitignore に追加
echo "firebase-admin-key.json" >> .gitignore

# スクリプト実行
node scripts/set-admin-role.js
```

#### 5-3. 初期管理者設定

```bash
# suzuki.shunpei@altx.co.jp を管理者に設定
node scripts/set-admin-role.js
```

#### 5-4. TypeScriptエラー確認

```bash
npx tsc --noEmit
```

**期待結果**: エラーなし

#### 5-5. ビルド確認

```bash
npm run build
```

**期待結果**: ビルド成功

#### 5-6. コミット・プッシュ

```bash
git add .
git commit -m "feat: Firebase Authentication実装

- ユーザー登録機能（Email Link）
- パスワード設定機能
- ログイン機能
- ロールベースアクセス制御（admin/user）
- Firebase Emulator対応（ローカル開発）
- ドメイン制限（@altx.co.jp）

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin feature/firebase-authentication
```

#### 5-7. mainへマージ

```bash
git checkout main
git merge --no-ff feature/firebase-authentication
git push origin main
```

#### 5-8. GitHub Actions確認

- GitHub Actions が正常に実行されるか確認
- ビルドエラーがないか確認
- GitHub Pagesへデプロイ成功を確認

#### 5-9. 本番環境動作確認

**URL**: https://almlog.github.io/strengths-finder-standalone

**確認項目**:
- [ ] ログイン画面が表示される
- [ ] 登録画面が表示される
- [ ] メール送信機能（実際に送信されるか）
- [ ] ログイン成功
- [ ] 権限チェック
- [ ] ログアウト

---

## TDD手順

### 基本サイクル

```
┌─────────────────────────────────────────┐
│ 1. RED: テストを書く（失敗させる）      │
│    npm test -- --testNamePattern="..."  │
│    → FAIL を確認                        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 2. GREEN: 実装する（テストを通す）      │
│    コードを書く                          │
│    npm test -- --testNamePattern="..."  │
│    → PASS を確認                        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 3. REFACTOR: リファクタリング           │
│    重複削除、命名改善など                │
│    テストが引き続きPASSすることを確認    │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 4. 開発サーバーで動作確認（必須）        │
│    npm start                            │
│    → ブラウザで実際に機能を確認         │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 5. TypeScriptエラー確認                 │
│    npx tsc --noEmit                     │
│    → エラーなしを確認                    │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ 6. 全テスト実行                          │
│    npm test                             │
│    → 全てPASSを確認                     │
└──────────────┬──────────────────────────┘
               ↓
          Commit & Push
```

---

## リスクと対策

### リスク1: Firebase Emulator未経験

**リスク**: Emulatorのセットアップでつまずく可能性

**対策**:
- 公式ドキュメント参照: https://firebase.google.com/docs/emulator-suite
- エラー時は Claude に相談
- 最悪、開発環境も本番Firebaseを使用（非推奨）

---

### リスク2: ルーティング統合の複雑さ

**リスク**: 既存のApp.tsxとの統合が複雑

**対策**:
- 既存コードを慎重に読み取る
- 段階的に統合（まずログイン画面のみ）
- テストを書いてから統合

---

### リスク3: メール送信テスト

**リスク**: 本番環境でメール送信が失敗

**対策**:
- Emulatorで十分にテスト
- 本番では自分のメールアドレスで先にテスト
- Firebase Consoleでメール送信ログを確認

---

### リスク4: GitHub Actions での環境変数

**リスク**: GitHub Secretsの設定ミス

**対策**:
- .env.exampleを正確に作成
- GitHub Actions ログで環境変数を確認（値は隠される）
- ビルドエラー時はログを詳細に確認

---

## チェックリスト

### 実装前

- [x] 機能要件定義書レビュー
- [x] 技術仕様書レビュー
- [x] 実装計画書レビュー
- [ ] ユーザー（SHUMPEI）の承認

### Phase 1完了基準

- [x] Firebase SDK インストール
- [x] 基盤コンポーネント実装
- [ ] react-router-dom確認
- [ ] Emulator対応コード追加
- [ ] 環境変数ファイル整備

### Phase 2完了基準

- [ ] Firebaseプロジェクト作成
- [ ] Authentication設定
- [ ] Emulatorセットアップ
- [ ] 環境変数設定（ローカル・GitHub）

### Phase 3完了基準

- [ ] App.tsx統合
- [ ] ログアウトボタン追加
- [ ] 開発サーバーで動作確認

### Phase 4完了基準

- [ ] ユニットテスト実装
- [ ] コンポーネントテスト実装
- [ ] テストカバレッジ90%以上
- [ ] 全テストPASS

### Phase 5完了基準

- [ ] ローカル動作確認（全シナリオ）
- [ ] 管理者CLI作成・実行
- [ ] TypeScriptエラーゼロ
- [ ] ビルド成功
- [ ] mainにマージ
- [ ] GitHub Pages デプロイ成功
- [ ] 本番環境動作確認

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0 | 2025-12-23 | 初版作成 | SUZUKI Shunpei |
