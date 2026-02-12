# Changelog

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
