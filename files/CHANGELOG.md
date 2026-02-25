# Changelog

## [Unreleased] - 2026-02-13

### Changed

#### 残業時間計算ロジック改修 — 所定超過/法定外超過の2値分離
- **定数定義**: `STANDARD_WORK_MINUTES`(465分=7h45m) / `LEGAL_WORK_MINUTES`(480分=8h) を `AttendanceTypes.ts` に追加
- **計算ロジック**: `calculateOvertimeDetails()` を新設 — 実働時間から所定超過(残業)と法定外超過(36協定対象)を同時算出
  - 平日: 残業 = max(0, 実働-465分), 法定外 = max(0, 実働-480分)
  - 休日: 両方とも実働時間全体
- **型拡張**: `DailyAttendanceAnalysis`, `EmployeeMonthlySummary`, `DepartmentSummary` に `legalOvertimeMinutes` / `totalLegalOvertimeMinutes` 追加
- **36協定判定**: 全箇所を `totalLegalOvertimeMinutes` ベースに切替（UI/LINE WORKS/CSV出力）
- **UI**: 個人PDFに「法定外残業」表示行を追加、OvertimeCellで2値表示対応
- **テスト**: 17件の新規テスト + 既存テスト期待値更新（385件PASS）

### Fixed

#### 備考欄チェック統合テストの不整合修正
- `AttendanceService.Remarks.test.ts`: 統合テスト(analyzeDailyRecord)が備考欄違反の検出を期待していたが、実装は2026-01-30に楽楽勤怠側管理のため無効化済み
- テスト期待値を「違反が検出されない」に修正（全20件PASS）

### Added

#### LINE WORKS送信 Firebase Cloud Function連携（v3.6）
- **Cloud Functionプロキシ**: LINE WORKS送信をFirebase Cloud Function経由に変更
  - CORS問題（ブラウザからworksapis.comへの直接fetchブロック）を解決
  - Firebase Auth検証により認証済みユーザーのみ送信可能
  - Node.js 20ランタイム、asia-northeast1リージョン
- **セキュリティ強化**: Webhook URLをフロントエンドJSバンドルからCloud Functionシークレットに移動
  - `REACT_APP_LINEWORKS_WEBHOOK_URL` → Firebase Secret Manager `LINEWORKS_WEBHOOK_URL`
  - `REACT_APP_LINEWORKS_CHANNEL_ID` → 削除（Incoming Webhook方式では不要）
- **フロントエンド変更**: `httpsCallable` によるCloud Function呼び出しに統一
  - `src/config/firebase.ts`: Functions初期化追加（asia-northeast1リージョン）
  - `src/services/LineWorksService.ts`: fetch → httpsCallable に変更
  - `REACT_APP_LINEWORKS_ENABLED` フラグで送信ボタン表示を制御
- **開発品質スキル追加**:
  - `/project:plan-research`: プラン策定前の調査チェックリスト
  - `/project:pre-deploy`: デプロイ前検証の5フェーズチェックリスト

#### このシステムについてタブ更新
- 勤怠分析セクションに「サマリー表示・PDF出力」「LINE WORKS通知」の説明を追加
- v3.6リリースノートを追加

### Changed

#### LINE WORKS Webhook URL管理を環境変数ベースに移行
- **環境変数化**: `REACT_APP_LINEWORKS_WEBHOOK_URL` / `REACT_APP_LINEWORKS_ROOM_NAME` で管理
- **localStorage設定管理の撤廃**: getConfig/setConfig/addWebhook/removeWebhook等を削除
- **設定モーダル削除**: `LineWorksSettingsModal.tsx` を完全削除（UI設定不要）
- **PreviewModal簡素化**: Webhookドロップダウン削除、環境変数から自動取得
- **不要な型削除**: `LineWorksConfig`, `LineWorksConfigLegacy`, `LineWorksWebhookEntry` を削除

#### LINE WORKS メッセージ改善
- 「部門別平均残業時間（/人）」→「部門別平均残業時間（/所属人数）」に修正

## [Unreleased] - 2026-02-12

### Added

#### 初回ログイン説明モーダル
- **WelcomeModal**: ログイン画面に初回アクセス時の説明モーダルを追加
  - 3ステップ構成（ようこそ → できること → はじめかた）
  - 5機能のスクリーンショット付きカード表示（個人分析・チーム分析・シミュレーション・勤怠分析・資質分析）
  - localStorage で表示済みフラグを管理し、2回目以降は自動表示しない
  - 「このシステムについて」ボタンで再表示可能
  - 「アカウント作成」リンクから /register に直接遷移可能

#### LINE WORKS 複数Webhook対応
- **複数Webhook管理機能**: 複数の通知先ルーム（Webhook URL）を登録・管理可能に
- **ルーム選択UI**: プレビューモーダルで送信先ルームをドロップダウンから選択
- **デフォルトWebhook設定**: よく使うルームをデフォルトとして設定可能（★マーク表示）
- **送信履歴にルーム名表示**: どのルームに送信したか履歴で確認可能
- **後方互換性**: 既存の単一Webhook設定を自動的に新形式にマイグレーション

#### Claude Code 設定整備
- **グローバル設定** (`~/.claude/`):
  - TDD必須ルール、行動分類（🟢/🟡/🔴）
  - 読み取り系操作の自動許可
  - セッション終了時のCHANGELOG更新リマインダー
  - `/user:tdd-cycle` コマンド
- **プロジェクト設定** (`.claude/`):
  - コミット前テスト自動実行フック
  - `/project:session-start`, `/project:fix-issue`, `/project:spec-review` コマンド
- **MCP設定** (`.mcp.json`):
  - context7: ライブラリドキュメント参照（常時有効）
  - playwright: E2Eテスト用（必要時有効化）

### Changed

- **LineWorksSendButton**: ボタンサイズを他のボタン（PDF出力等）と統一
  - Before: `px-2 py-1 text-xs`（小さい）
  - After: `px-3 sm:px-4 py-2 text-sm`（標準）

### Technical Details

- `src/types/lineworks.ts`: `LineWorksWebhookEntry`, `LineWorksConfigLegacy` 型追加
- `src/services/LineWorksService.ts`: CRUD操作メソッド追加（`getWebhooks`, `addWebhook`, `removeWebhook`, `setDefaultWebhook` 等）
- `src/components/lineworks/LineWorksSettingsModal.tsx`: 複数Webhook管理UI実装
- `src/components/lineworks/LineWorksPreviewModal.tsx`: ルーム選択ドロップダウン追加
- テスト: 37件のテストケース追加（全てPASS）

---

## 過去のリリース

### 2026-02-03
- feat: 残業状況ヘッダーに残り営業日数を追加
- fix: 違反サマリーの内訳を緊急度別に分類
- fix: 部門別平均残業時間を一人あたりと明示
- fix: 残業状況に「現在」「見込」のラベルを追加
- fix: 部門別平均残業時間をID順（昇順）でソート
