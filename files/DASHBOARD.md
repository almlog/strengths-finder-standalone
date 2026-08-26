# Dashboard

## 現在のステータス

| 項目 | 状態 |
|------|------|
| 最終更新 | 2026-08-26 |
| ブランチ | main |
| テスト | ⚠️ 全体で既存失敗86件/19スイート（電車遅延関連の書き直しで91件→86件に改善。残りは下記残タスク参照） |
| CIビルド | ✅ 成功（`CI=true` で `Compiled successfully.`） |
| 未コミット変更 | files/（ドキュメントのみ） |
| 最新コミット | `f4ff9c3` fix(traffic): dedupe delay history entries |
| 本番デプロイ | ✅ GitHub Actions success（バンドル反映＋ユーザー動作確認済み） |
| Cloud Functions | ✅ `fetchTrainInfo` デプロイ済み（asia-northeast1、2026-08-26） |

---

## 本セッション（2026-08-26）の成果

### 交通情報: 遅延情報収集の復旧（v3.9.3）
- [x] 原因特定: allorigins.winプロキシ完全ダウン＋Yahoo!ページ刷新でパース全滅の複合障害
- [x] Cloud Function `fetchTrainInfo` 新設・デプロイ（Auth必須・許可リスト・10秒タイムアウト）
- [x] `__NEXT_DATA__` 埋め込みJSONパースを主要方式に変更（HTMLパターンはフォールバック）
- [x] 遅延履歴の二重追加バグ修正
- [x] 死んだJR東日本RSS経路（403/404）削除
- [x] テスト書き直し・追加（関連3スイート33件PASS、全体既知失敗91→86件）
- [x] 本番反映＋実遅延3件の表示をユーザー確認済み
- [x] firebase CLIログイン済み（syunpeman@gmail.com、このマシン）

---

## 前回セッション（2026-07-31）の成果

### 勤怠分析: 出社2/出社3ギャップの休憩補正（v3.9.2）
- [x] 課題特定: 午前有休時に所定休憩が計上されず、出社2運用の休憩が認められないため休憩不足を誤検出
- [x] `getGapBreakMinutes()` 実装（退社→出社2、退社2→出社3のギャップを休憩に加算）
- [x] テスト11件（RED→GREEN）、既存AttendanceService系18スイートに新規失敗なし
- [x] 実データ検証: 31名×31日=961レコードで休憩違反2件→0件（午前有休の2日のみ解消、副作用なし）
- [x] `CI=true` ビルド成功、ユーザー目視確認済み
- [x] ドキュメント更新（README / SPEC_ATTENDANCE_ANALYSIS / CHANGELOG / dev_log）
- [x] テスト用xlsx作成（`server/data/テスト用_出勤簿_日別詳細.xlsx`、合成データ）→ ブラウザE2Eで期待どおり違反3件を確認
- [x] コミット `395500b` → mainマージ `4e9161f` → push → CI/CD success → 本番バンドル反映確認（`main.8a7aecfc.js` に `getGapBreakMinutes` 存在確認）

### 環境整備（このマシン）
- [x] ローカルmainがorigin/mainから267コミット遅れていたのを同期（旧状態は `backup/local-main-20260731` とstashに保全）
- [x] `.env.local` 再作成（本番バンドルからFirebase公開設定を取得、`REACT_APP_USE_EMULATOR=false`）
- [x] 個人データ（`server/data/`）を `.git/info/exclude` でローカル除外

---

## 前回セッション（2026-03-31）の成果

### スタラジ（Podcast）タブ追加（v3.9）
- [x] 型定義（`src/types/podcast.ts`）
- [x] PodcastService実装（fetch-on-demand + localStorageキャッシュ1h TTL）
- [x] テスト21件 全PASS（URL構築/キャッシュ/fetch/ユーティリティ）
- [x] AudioPlayer（HTML5 audio再生コントロール）
- [x] EpisodeList（最新強調+過去折りたたみ+カレンダービュー）
- [x] EpisodeDetail（タイトル→再生枠→キャスト→セグメント）
- [x] PodcastPlayerPage（レスポンシブ+説明ボックス）
- [x] StrengthsFinderPage タブ登録
- [x] CI=true ビルド成功
- [x] 本番デプロイ成功（GitHub Actions）
- [x] ユーザー本番確認済み

---

## SPEC文書の状態

| SPEC | ステータス | 概要 |
|------|----------|------|
| SPEC_ATTENDANCE_ANALYSIS | ✅ 完了 | 楽楽勤怠XLSX分析（違反検出・36協定チェック・予兆アラート） |
| SPEC_ATTENDANCE_VISUAL_ENHANCEMENT | ✅ 完了 | 部門別残業チャート・違反種別円グラフ |
| SPEC_INDIVIDUAL_ATTENDANCE_PDF | ✅ 実装済み | 個人勤怠分析PDF出力（v3.4.3で実装済み、SPECステータス未更新） |
| SPEC_TRAFFIC_INFO_TAB | ✅ 実装済み | Mini Tokyo 3D統合（v3.5で実装済み、SPECステータス未更新） |
| SPEC_DELAY_TICKER | ✅ 実装済み | 遅延情報ティッカー・履歴モーダル（実装済み、SPECステータス未更新） |
| SPEC_DELAY_REPORT_COMPOSER | 🔧 進行中 | 遅延報告メッセージ作成機能 |
| SPEC_ATTENDANCE_CROWN_BADGE | 🔧 進行中 | 従業員別タブの役職バッジ表示 |
| SPEC_BULK_SELECTION | 📋 未着手 | メンバー一括選択機能 |
| SPEC_USER_FILTER | 📋 未着手 | 勤怠分析ユーザーフィルター機能 |

---

## 残タスク・クリーンアップ

### 優先度: 高
- [ ] **テスト失敗86件（19スイート）の調査** — mainのHEADで発生。CIワークフローはテスト未実行のため見逃されていた。実アサーション失敗（FinancialServiceのポジション別内訳、AttendanceService FN301等）と環境系（localStorage undefined）の混在。切り分けと修正が必要（2026-08-26: 電車遅延関連の書き直しで91→86件に改善済み）
- [ ] **遅延情報ステップ③: 取得失敗の可視化** — fetch失敗時に「平常運転」ではなく「取得失敗」を表示する（DelayTicker + TrainDelayService）
- [ ] GitHub Actions CI/CD結果の確認（`505a17f` push後）
- [ ] 本番環境で「このシステムについて」タブの表示確認

### 優先度: 中
- [ ] Firebase Secret Managerから未使用の `LINEWORKS_CHANNEL_ID` を削除
- [ ] 実装済みSPEC文書のステータスを「完了」に更新（TRAFFIC_INFO_TAB, DELAY_TICKER, INDIVIDUAL_ATTENDANCE_PDF）
- [ ] D-001（複数Webhook対応マイグレーション）はCloud Function移行で不要になった → DECISIONS.md更新

### 優先度: 低
- [ ] SPEC_BULK_SELECTION の着手判断
- [ ] SPEC_USER_FILTER の着手判断
- [ ] deploy.yml のNode.js 20非推奨警告対応（actions/deploy-pages@v4 がNode 24強制実行。動作影響なし）
- [ ] Cloud Functions: Node.js 20ランタイム廃止（2026-10-30）前にNode 22へ更新＋firebase-functionsパッケージ更新（breaking changesあり）

---

## 次回セッションでやること

1. **未コミット変更の整理** — useAuth.ts(デモモード), Tabs.tsx(data-testid), simulation系, package.json等の別セッション変更をコミットまたは破棄
2. **untracked ファイルの整理** — e2e-demos/, remotion/, videos/, .temp/, .env.demo 等を.gitignore追加または削除
3. **クリーンアップ** — 未使用シークレット削除、SPEC文書ステータス更新
4. **次の開発タスクの選定** — ユーザーと相談
