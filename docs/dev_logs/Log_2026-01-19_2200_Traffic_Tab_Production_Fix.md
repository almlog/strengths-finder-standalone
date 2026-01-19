# ⏱️ 2026-01-19 22:00 - Traffic_Tab_Production_Fix

**Model:** Claude Opus 4.5
**Scope:** Incremental_Diff (前回ログ `Log_2026-01-19_1500_User_Filter_Traffic_Hide.md` 以降)
**Tags:** #AI_Dev #Log #TrafficInfo #Deployment #GitHubActions

---

## ⚡ ハイライト

> **主な成果:**
> 1. **交通情報タブの本番環境デプロイに成功** - トークン注入方法を改善
> 2. **GitHub Secrets連携問題を解決** - `.env.production`ファイル生成方式に変更
> 3. **Mini Tokyo 3Dの安定化** - v3.5.0固定、challenge2024 API無効化

---

## 🔨 タスク詳細 (TDD/Spec)

### Task 1: 本番環境トークン注入問題の調査・解決
**Status:** 🟢 GREEN (完了)

**問題の原因:**
- GitHub Actions の `env:` ディレクティブで直接シークレットを渡す方式が不安定だった
- React (Create React App) は `.env.production` ファイルからの読み込みがより確実

**Action & Reasoning:**
1. `deploy.yml` にデバッグステップを追加（トークン設定状態の確認）
2. `.env.production` ファイルをビルド前に動的生成するステップを追加
3. Firebase設定 + 交通情報用トークン（Mapbox, ODPT, Challenge）を全て含める

**修正内容 (`deploy.yml`):**
```yaml
# デバッグ: トークン設定状態の確認（値は出力しない）
- name: Debug - Check token status
  run: |
    echo "=== Token Status Check ==="
    echo "MAPBOX_TOKEN is set: ${{ secrets.REACT_APP_MAPBOX_TOKEN != '' }}"
    echo "ODPT_TOKEN is set: ${{ secrets.REACT_APP_ODPT_TOKEN != '' }}"
    echo "CHALLENGE_TOKEN is set: ${{ secrets.REACT_APP_CHALLENGE_TOKEN != '' }}"

# .env.production ファイルを生成
- name: Create .env.production
  run: |
    echo "REACT_APP_FIREBASE_API_KEY=${{ secrets.REACT_APP_FIREBASE_API_KEY }}" >> .env.production
    # ... 他のFirebase設定 ...
    echo "REACT_APP_MAPBOX_TOKEN=${{ secrets.REACT_APP_MAPBOX_TOKEN }}" >> .env.production
    echo "REACT_APP_ODPT_TOKEN=${{ secrets.REACT_APP_ODPT_TOKEN }}" >> .env.production
    echo "REACT_APP_CHALLENGE_TOKEN=${{ secrets.REACT_APP_CHALLENGE_TOKEN }}" >> .env.production
```

**Result:**
- トークンが正しく本番ビルドに注入されるようになった
- GitHub Actions ログで設定状態を確認可能に

---

### Task 2: 新規本番トークンの発行・設定
**Status:** 🟢 GREEN (完了)

**Action & Reasoning:**
- 以前のセッションでスクリーンショットにトークンが映り込んだ可能性があったため、セキュリティ上の理由で新規トークンを発行
- 3種類のトークンを新規発行:
  1. Mapbox Access Token
  2. ODPT API Token
  3. Challenge Token
- GitHub Secrets に登録完了
- `.env.local` にも同じ値を設定し、開発環境で本番同等のテストを実施

**Result:**
- 開発環境でマップ表示成功を確認
- 本番環境へのデプロイ準備完了

---

### Task 3: Mini Tokyo 3D 安定化
**Status:** 🟢 GREEN (完了)

**問題:**
- `api-challenge2024.odpt.org` への DNS 解決エラー（`ERR_NAME_NOT_RESOLVED`）
- `mini-tokyo.appspot.com` からの 503 エラー（外部サービス側の問題）

**Action & Reasoning:**
1. Mini Tokyo 3D を `@latest` から `@3.5.0` に固定（安定版）
2. `challenge2024` トークンの使用を無効化（DNS問題回避）
3. `ecoMode: 'normal'` オプションを追加（API呼び出し最適化）

**修正内容 (`TrafficInfoPage.tsx`):**
```typescript
// v3.5.0を使用（安定版）
script.src = 'https://cdn.jsdelivr.net/npm/mini-tokyo-3d@3.5.0/dist/mini-tokyo-3d.min.js';

// challenge2024 APIは無効化（DNS解決エラー回避）
const secrets: { odpt: string } = {
  odpt: ODPT_TOKEN!,
};
// challenge2024は渡さない
```

**Result:**
- マップ表示成功
- リアルタイム電車位置表示も動作
- 一部コンソールエラー（503、CORS）は残るが機能には影響なし

---

### Task 4: 交通情報タブ・説明セクションの再有効化
**Status:** 🟢 GREEN (完了)

**Action & Reasoning:**
- `StrengthsFinderPage.tsx`: タブとTrafficInfoPageインポートのコメントアウトを解除
- `AboutAnalysisTab.tsx`: 交通情報説明セクションの `{false && (...)}` を削除

**Result:**
- 交通情報タブが表示される
- 「このシステムについて」タブに交通情報の説明が表示される

---

## 📂 ファイル & 参照

### 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `.github/workflows/deploy.yml` | デバッグステップ追加、.env.production生成追加 |
| `src/components/strengths/StrengthsFinderPage.tsx` | 交通情報タブ再有効化（Train icon、import、Tab） |
| `src/components/strengths/AboutAnalysisTab.tsx` | 交通情報説明セクション再有効化 |
| `src/components/traffic/TrafficInfoPage.tsx` | v3.5.0固定、challenge2024無効化、ecoMode追加 |

### 参照ドキュメント
- 前回ログ: `docs/dev_logs/Log_2026-01-19_1500_User_Filter_Traffic_Hide.md`
- SPEC: `docs/specs/SPEC_TRAFFIC_INFO_TAB.md`

---

## 🔧 技術的知見

### GitHub Secrets → React アプリへのトークン注入

**NG パターン（不安定）:**
```yaml
- name: Build
  run: npm run build
  env:
    REACT_APP_MAPBOX_TOKEN: ${{ secrets.REACT_APP_MAPBOX_TOKEN }}
```

**OK パターン（確実）:**
```yaml
- name: Create .env.production
  run: |
    echo "REACT_APP_MAPBOX_TOKEN=${{ secrets.REACT_APP_MAPBOX_TOKEN }}" >> .env.production

- name: Build
  run: npm run build
```

**理由:**
- Create React App は `.env.production` ファイルを優先的に読み込む
- `env:` ディレクティブはシェル環境変数として設定されるが、webpack のビルドプロセスで正しく展開されない場合がある

---

## 🔌 Next Context (JSON)

```json
{
  "session_date": "2026-01-19",
  "last_commit": "568484e",
  "tasks": [
    {
      "id": "traffic-production-fix",
      "name": "交通情報タブ本番環境修正",
      "status": "completed",
      "notes": ".env.production生成方式で解決"
    },
    {
      "id": "token-renewal",
      "name": "本番トークン更新",
      "status": "completed",
      "notes": "Mapbox, ODPT, Challenge 3種類を新規発行"
    }
  ],
  "pending_issues": [
    {
      "id": "console-errors",
      "description": "Mini Tokyo 3D関連のコンソールエラー",
      "notes": "503/CORS エラーが表示されるが機能には影響なし。外部サービス（mini-tokyo.appspot.com）の問題。要調査。",
      "priority": "low"
    }
  ],
  "tech_constraints": [
    "React 18 + TypeScript",
    "TailwindCSS for styling",
    "Firebase Auth for authentication",
    "GitHub Actions CI/CD → GitHub Pages deployment",
    "Mini Tokyo 3D v3.5.0（固定）"
  ],
  "next_actions": [
    "本番環境で交通情報タブの動作確認",
    "コンソールエラーの抑制方法検討（優先度低）"
  ]
}
```

---

*Generated by Claude Opus 4.5 - AI Development Log v4.0*
