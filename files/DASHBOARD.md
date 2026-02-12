# Dashboard

## 現在のステータス

| 項目 | 状態 |
|------|------|
| 最終更新 | 2026-02-12 |
| ブランチ | main |
| テスト | ✅ 全件PASS |
| CIビルド | ✅ 成功 |
| 未コミット変更 | あり（LINE WORKS機能 + Claude Code設定） |

---

## 進行中の作業

### LINE WORKS 複数Webhook対応
- [x] 型定義の更新
- [x] サービス層の実装（CRUD + マイグレーション）
- [x] テスト作成（37件）
- [x] ボタンサイズ修正
- [x] 設定モーダル（複数Webhook管理UI）
- [x] プレビューモーダル（ルーム選択）
- [ ] コミット・プッシュ

### Claude Code 設定整備
- [x] グローバル設定（~/.claude/）
- [x] プロジェクト設定（.claude/）
- [x] MCP設定（.mcp.json）
- [x] ドキュメント整備

---

## 未コミットの変更ファイル

### Modified
- `CLAUDE.md` - Session Lifecycle, Slash Commands, Gotchas セクション追加
- `src/types/lineworks.ts` - 複数Webhook対応型定義
- `src/services/LineWorksService.ts` - Webhook CRUD メソッド
- `src/components/lineworks/LineWorksSendButton.tsx` - サイズ修正
- `src/components/lineworks/LineWorksSettingsModal.tsx` - 複数Webhook管理UI
- `src/components/lineworks/LineWorksPreviewModal.tsx` - ルーム選択
- `src/__tests__/services/LineWorksService.test.ts` - テスト追加

### New
- `.claude/settings.json` - プロジェクトhooks設定
- `.claude/commands/` - スラッシュコマンド
- `.mcp.json` - MCP設定
- `files/` - ドキュメントファイル

---

## 次回セッションでやること

1. 未コミット変更のレビューとコミット
2. 開発環境での動作確認（複数Webhook登録・選択・送信）
3. 必要に応じてE2Eテスト追加
