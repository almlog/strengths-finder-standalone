# Firebase Authentication 技術仕様書

**バージョン**: 1.0
**作成日**: 2025-12-23
**プロジェクト**: StrengthsFinder統合分析ツール
**担当**: SUZUKI Shunpei

---

## 📋 目次

1. [ルーティング設計（GitHub Pages対応）](#ルーティング設計github-pages対応)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [技術スタック](#技術スタック)
4. [環境構成](#環境構成)
5. [データモデル](#データモデル)
6. [認証フロー](#認証フロー)
7. [API設計](#api設計)
8. [セキュリティ設計](#セキュリティ設計)
9. [エラーハンドリング](#エラーハンドリング)
10. [テスト戦略](#テスト戦略)

---

## ルーティング設計（GitHub Pages対応）

### 重要な制約事項

**本アプリはGitHub Pagesのサブディレクトリにデプロイされます。**

| 環境 | ベースURL |
|-----|----------|
| **本番** | `https://almlog.github.io/strengths-finder-standalone/` |
| **ローカル** | `http://localhost:3006/strengths-finder-standalone/` |

### BrowserRouterのbasename設定

```typescript
// src/App.tsx
<BrowserRouter basename="/strengths-finder-standalone">
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    {/* 他のルート */}
  </Routes>
</BrowserRouter>
```

### ナビゲーション実装ルール

| 実装方法 | basename適用 | 使用可否 |
|---------|-------------|---------|
| `<Link to="/login">` | ✅ 自動適用 | ✅ 推奨 |
| `navigate('/login')` | ✅ 自動適用 | ✅ 推奨 |
| `<Navigate to="/login">` | ✅ 自動適用 | ✅ 推奨 |
| `<a href="/login">` | ❌ 適用されない | ❌ 禁止 |
| `window.location.href = '/login'` | ❌ 適用されない | ❌ 禁止 |

### 正しい実装例

```typescript
// ✅ 正しい: Link コンポーネント
import { Link } from 'react-router-dom';
<Link to="/login">ログイン</Link>
// → /strengths-finder-standalone/login

// ✅ 正しい: useNavigate フック
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/');
// → /strengths-finder-standalone/

// ✅ 正しい: Navigate コンポーネント
import { Navigate } from 'react-router-dom';
<Navigate to="/login" replace />
// → /strengths-finder-standalone/login
```

### 間違った実装例（絶対に使わない）

```typescript
// ❌ 間違い: aタグのhref
<a href="/login">ログイン</a>
// → /login（basenameが適用されない）

// ❌ 間違い: window.location
window.location.href = '/login';
// → /login（basenameが適用されない）

// ❌ 間違い: パスにbasenameを含める
<Link to="/strengths-finder-standalone/login">
// → /strengths-finder-standalone/strengths-finder-standalone/login（二重適用）
```

### 外部リンクの例外

外部URLやmailtoリンクは`<a>`タグを使用してOK:

```typescript
// ✅ 外部リンクはaタグを使用
<a href="mailto:admin@example.com">お問い合わせ</a>
<a href="https://firebase.google.com">Firebase Docs</a>
```

---

## システムアーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────────────────────┐
│ フロントエンド（React + TypeScript）                     │
│ GitHub Pages: https://almlog.github.io/...              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ルーティング層（React Router）                       │ │
│ │  - PublicRoute: /login, /register, /set-password    │ │
│ │  - PrivateRoute: /dashboard, /*                     │ │
│ │  - AdminRoute: /manager-mode, /team-simulation      │ │
│ └─────────────────────────────────────────────────────┘ │
│                      ↕                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 認証層（Custom Hooks）                               │ │
│ │  - useAuth: 認証状態管理                            │ │
│ │  - PrivateRoute: ルート保護                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                      ↕                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Firebase SDK                                        │ │
│ │  - auth: Authentication管理                         │ │
│ │  - signInWithEmailAndPassword                       │ │
│ │  - sendSignInLinkToEmail                            │ │
│ │  - onAuthStateChanged                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                      ↕                                  │
└─────────────────────────────────────────────────────────┘
                      ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│ Firebase Authentication（外部サービス）                 │
├─────────────────────────────────────────────────────────┤
│ 本番環境:                                                │
│  - Firebase Production Project                          │
│  - ユーザー管理、トークン発行、セッション管理           │
│                                                          │
│ 開発環境:                                                │
│  - Firebase Emulator Suite (localhost:9099)             │
│  - ローカルで完結、本番データに影響なし                 │
└─────────────────────────────────────────────────────────┘
```

### レイヤー設計

```
Presentation Layer (UI Components)
├── RegisterPage.tsx
├── SetPasswordPage.tsx
├── LoginPage.tsx
└── PrivateRoute.tsx

Application Layer (Custom Hooks)
└── useAuth.ts

Infrastructure Layer (External Services)
├── firebase.ts (Firebase設定)
└── domainValidator.ts (ドメイン検証)
```

---

## 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| React | 19.1.1 | UIフレームワーク |
| TypeScript | 4.9.5 | 型安全性 |
| React Router | 6.x | ルーティング |
| Tailwind CSS | 3.4.1 | スタイリング |

### 認証

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| Firebase SDK | ^10.x | Authentication |
| Firebase Admin SDK | ^12.x | 管理者用CLI |

### 開発ツール

| 技術 | バージョン | 用途 |
|-----|-----------|------|
| Firebase Emulator Suite | latest | ローカル開発 |
| Jest | ^27.5.2 | ユニットテスト |
| React Testing Library | ^16.3.0 | コンポーネントテスト |

---

## 環境構成

### 環境の種類

| 環境 | URL | Firebase | 用途 |
|-----|-----|----------|------|
| **ローカル開発** | localhost:3006 | Emulator | 開発・テスト |
| **本番** | almlog.github.io/... | Production | 実運用 |

### 環境変数

#### ローカル開発（.env.local）

```bash
# Firebase Emulator使用フラグ
REACT_APP_USE_EMULATOR=true

# Firebase設定（本番と同じプロジェクト）
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

#### 本番環境（GitHub Secrets）

```bash
# Firebase Emulator使用フラグ
REACT_APP_USE_EMULATOR=false

# Firebase設定（本番プロジェクト）
REACT_APP_FIREBASE_API_KEY=***
REACT_APP_FIREBASE_AUTH_DOMAIN=***
REACT_APP_FIREBASE_PROJECT_ID=***
REACT_APP_FIREBASE_STORAGE_BUCKET=***
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=***
REACT_APP_FIREBASE_APP_ID=***
```

### Firebase Emulator設定

```json
// firebase.json
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

### ローカル開発環境のセットアップ

#### 1. Emulatorの起動（データ永続化あり）

```bash
# データが保存されるEmulator起動（推奨）
npm run emulator

# データを保存しないクリーン起動
npm run emulator:fresh
```

**データ保存先**: `.emulator-data/` （.gitignore済み）

#### 2. ローカルユーザーの作成

```bash
# 一般ユーザーを作成
npm run create:user

# 管理者ユーザーを作成
npm run create:admin
```

**デフォルトユーザー情報**:
| 項目 | 値 |
|------|-----|
| Email | `suzuki.shunpei@example.com` |
| Password | `password123` |

#### 3. ローカル環境での管理者判定

Firebase Emulatorではカスタムクレームの設定が制限されるため、
`useAuth.ts` の `LOCAL_ADMIN_EMAILS` で管理者を判定します。

```typescript
// src/hooks/useAuth.ts
const LOCAL_ADMIN_EMAILS = ['suzuki.shunpei@example.com'];

// REACT_APP_USE_EMULATOR=true の場合のみ適用
if (
  process.env.REACT_APP_USE_EMULATOR === 'true' &&
  firebaseUser.email &&
  LOCAL_ADMIN_EMAILS.includes(firebaseUser.email)
) {
  userRole = 'admin';
}
```

**本番環境では**:
- カスタムクレーム（`role: admin`）で判定
- `LOCAL_ADMIN_EMAILS` は無視される

---

## データモデル

### ユーザーオブジェクト（Firebase Auth）

```typescript
interface FirebaseUser {
  uid: string;                    // 一意識別子
  email: string;                  // メールアドレス（@example.com）
  emailVerified: boolean;         // メール確認済みフラグ
  metadata: {
    creationTime: string;         // アカウント作成日時
    lastSignInTime: string;       // 最終ログイン日時
  };
}
```

### カスタムクレーム（ロール情報）

```typescript
interface CustomClaims {
  role: 'admin' | 'user';         // ロール
}

// IDトークンに含まれる
interface IDTokenResult {
  token: string;
  claims: {
    email: string;
    role: 'admin' | 'user';       // カスタムクレーム
    // その他のFirebase標準クレーム
  };
}
```

### 認証状態（アプリケーション内）

```typescript
interface AuthState {
  user: User | null;              // Firebaseユーザーオブジェクト
  role: 'admin' | 'user' | null;  // ロール
  loading: boolean;               // 読み込み中フラグ
  isAuthenticated: boolean;       // 認証済みフラグ
  isAdmin: boolean;               // 管理者フラグ
}
```

---

## 認証フロー

### 1. 登録フロー

```
┌─────────────────┐
│ ユーザー        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 1. RegisterPage                     │
│    - メールアドレス入力             │
│    - ドメイン検証（@example.com）   │
└────────┬────────────────────────────┘
         │ sendSignInLinkToEmail()
         ▼
┌─────────────────────────────────────┐
│ 2. Firebase Authentication          │
│    - Email Link生成                 │
│    - メール送信                      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. メール受信                        │
│    - リンククリック                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. SetPasswordPage                  │
│    - メールアドレス確認             │
│    - パスワード入力（8文字以上）    │
│    - パスワード確認                  │
└────────┬────────────────────────────┘
         │ signInWithEmailLink()
         │ + linkWithCredential()
         ▼
┌─────────────────────────────────────┐
│ 5. Firebase Authentication          │
│    - アカウント作成                  │
│    - Email/Password認証リンク       │
│    - デフォルトロール: user         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 6. ログイン画面へリダイレクト        │
└─────────────────────────────────────┘
```

### 2. ログインフロー

```
┌─────────────────┐
│ ユーザー        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 1. LoginPage                        │
│    - メールアドレス入力             │
│    - パスワード入力                  │
└────────┬────────────────────────────┘
         │ signInWithEmailAndPassword()
         ▼
┌─────────────────────────────────────┐
│ 2. Firebase Authentication          │
│    - 認証情報検証                    │
│    - IDトークン発行                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 3. useAuth Hook                     │
│    - onAuthStateChanged監視         │
│    - IDトークン取得                 │
│    - カスタムクレーム（ロール）取得 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 4. ダッシュボードへリダイレクト      │
└─────────────────────────────────────┘
```

### 3. 権限チェックフロー

```
┌─────────────────┐
│ ユーザー        │
│ /manager-mode   │
│ にアクセス      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ 1. PrivateRoute Component           │
│    - useAuth()で認証状態取得        │
└────────┬────────────────────────────┘
         │
         ▼
      認証済み？
         ├─ No → LoginPageへリダイレクト
         │
         └─ Yes
                ▼
┌─────────────────────────────────────┐
│ 2. 権限チェック                      │
│    - requireAdmin === true?         │
└────────┬────────────────────────────┘
         │
         ▼
      Admin？
         ├─ No → アクセス拒否画面
         │
         └─ Yes → コンポーネント表示
```

---

## API設計

### Firebase Authentication API

#### 1. ユーザー登録（Email Link送信）

```typescript
import { sendSignInLinkToEmail } from 'firebase/auth';

const actionCodeSettings = {
  url: `${window.location.origin}/strengths-finder-standalone/set-password`,
  handleCodeInApp: true,
};

await sendSignInLinkToEmail(auth, email, actionCodeSettings);
```

#### 2. パスワード設定（アカウント作成）

```typescript
import {
  signInWithEmailLink,
  linkWithCredential,
  EmailAuthProvider
} from 'firebase/auth';

// Email Linkでサインイン
const result = await signInWithEmailLink(auth, email, window.location.href);

// パスワード認証をリンク
const credential = EmailAuthProvider.credential(email, password);
await linkWithCredential(result.user, credential);
```

#### 3. ログイン

```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';

await signInWithEmailAndPassword(auth, email, password);
```

#### 4. ログアウト

```typescript
import { signOut } from 'firebase/auth';

await signOut(auth);
```

#### 5. 認証状態監視

```typescript
import { onAuthStateChanged } from 'firebase/auth';

const unsubscribe = onAuthStateChanged(auth, async (user) => {
  if (user) {
    const idTokenResult = await user.getIdTokenResult();
    const role = idTokenResult.claims.role || 'user';
    // 状態更新
  } else {
    // 未認証
  }
});
```

### Firebase Admin SDK（管理者CLI）

#### ロール設定

```javascript
const admin = require('firebase-admin');

// 管理者ロール付与
await admin.auth().setCustomUserClaims(uid, { role: 'admin' });

// 一般ユーザーロール付与
await admin.auth().setCustomUserClaims(uid, { role: 'user' });
```

---

## セキュリティ設計

### 1. ドメイン制限

**実装箇所**: `src/utils/auth/domainValidator.ts`

```typescript
const ALLOWED_DOMAINS = ['altx.co.jp'];

export function isAllowedDomain(email: string): boolean {
  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}
```

**適用箇所**:
- 登録フォーム（RegisterPage）
- サーバーサイド検証は不可（GitHub Pages）
- クライアントサイドのみで強制

### 2. パスワードポリシー

**Firebase標準**:
- 最小長: 6文字（Firebase標準）
- 本アプリ: 8文字以上を推奨

**実装**:
```typescript
// HTML5バリデーション
<input type="password" minLength={8} required />

// JavaScriptバリデーション
if (password.length < 8) {
  setError('パスワードは8文字以上にしてください');
  return;
}
```

### 3. ロールベースアクセス制御（RBAC）

**実装箇所**: `src/components/auth/PrivateRoute.tsx`

```typescript
if (requireAdmin && !isAdmin) {
  return <AccessDeniedPage />;
}
```

**Custom Claims**:
- Firebase Admin SDKでのみ設定可能
- IDトークンに含まれる（改ざん不可）
- クライアントで検証

### 4. HTTPS通信

- GitHub Pages: 強制的にHTTPS
- Firebase: すべての通信がHTTPS

### 5. XSS/CSRF対策

- React: デフォルトでXSS対策
- Firebase: CSRFトークン自動管理

---

## エラーハンドリング

### Firebase Authenticationエラー

| エラーコード | 意味 | ユーザーメッセージ |
|------------|------|------------------|
| `auth/invalid-email` | 無効なメール | 無効なメールアドレスです |
| `auth/invalid-credential` | 認証情報不正 | メールアドレスまたはパスワードが正しくありません |
| `auth/user-not-found` | アカウント不存在 | アカウントが見つかりません |
| `auth/wrong-password` | パスワード不正 | メールアドレスまたはパスワードが正しくありません |
| `auth/too-many-requests` | 試行回数超過 | ログイン試行回数が多すぎます。しばらく待ってから再試行してください |
| `auth/invalid-action-code` | リンク無効 | リンクが無効または期限切れです |
| `auth/expired-action-code` | リンク期限切れ | リンクの有効期限が切れています |
| `auth/email-already-in-use` | メール重複 | このメールアドレスは既に登録されています |
| `auth/weak-password` | 弱いパスワード | パスワードが弱すぎます |

### エラーハンドリング実装

```typescript
try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (err: any) {
  console.error(err);
  if (err.code === 'auth/invalid-credential') {
    setError('メールアドレスまたはパスワードが正しくありません');
  } else if (err.code === 'auth/user-not-found') {
    setError('アカウントが見つかりません');
  } else {
    setError('ログインに失敗しました');
  }
}
```

---

## テスト戦略

### ユニットテスト

**対象**:
- `useAuth.ts`
- `domainValidator.ts`

**ツール**: Jest

**例**:
```typescript
describe('domainValidator', () => {
  it('@example.com のメールを許可する', () => {
    expect(isAllowedDomain('user@example.com')).toBe(true);
  });

  it('@gmail.com のメールを拒否する', () => {
    expect(isAllowedDomain('user@gmail.com')).toBe(false);
  });
});
```

### コンポーネントテスト

**対象**:
- `RegisterPage.tsx`
- `LoginPage.tsx`
- `PrivateRoute.tsx`

**ツール**: React Testing Library

**例**:
```typescript
describe('LoginPage', () => {
  it('正しい認証情報でログイン成功', async () => {
    // モック設定
    // レンダリング
    // 入力
    // 送信
    // 検証
  });
});
```

### E2Eテスト（手動）

**シナリオ**:
1. 登録フロー
2. ログインフロー
3. 権限チェック
4. ログアウト

---

## 管理者権限管理

### 概要

本番環境での管理者権限は Firebase Custom Claims で管理します。
管理用スクリプトを使用して権限を付与・確認できます。

### 前提条件: サービスアカウントキーの取得

1. Firebase Console にアクセス
   https://console.firebase.google.com/project/strengths-finder-auth/settings/serviceaccounts/adminsdk

2. 「新しい秘密鍵の生成」をクリック

3. ダウンロードしたJSONファイルを `firebase-service-account.json` にリネーム

4. `scripts/` ディレクトリに配置

**注意**: このファイルは `.gitignore` で除外されています。絶対にコミットしないでください。

### 管理者権限の付与

```bash
npm run admin:set <email>

# 例
npm run admin:set suzuki.shunpei@example.com
```

### ユーザー一覧の確認

```bash
npm run admin:list
```

### 権限反映のタイミング

カスタムクレームを設定した後、ユーザーは以下のいずれかを行う必要があります:

1. ログアウト → 再ログイン
2. IDトークンの有効期限切れを待つ（最大1時間）

### ローカル開発環境での管理者判定

ローカル開発環境（Firebase Emulator使用時）では、`useAuth.ts` の `LOCAL_ADMIN_EMAILS` 配列で管理者を判定します。
本番環境では Custom Claims が優先されます。

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0 | 2025-12-23 | 初版作成 | SUZUKI Shunpei |
| 1.1 | 2026-01-08 | パスワードリセット機能追加、管理者権限管理スクリプト追加 | SUZUKI Shunpei |
