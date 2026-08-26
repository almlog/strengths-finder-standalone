# Handoff Prompt

最終更新: 2026-08-26（遅延情報収集復旧セッション）

## 今すぐやること（次セッションの最優先）

1. **セッション開始時に必ず `git fetch origin` → `git rev-list --count main..origin/main` でリモート乖離を確認する**
2. **テスト失敗86件（19スイート）の調査**（DASHBOARD 残タスク優先度:高、91件から改善済み）

※遅延情報ステップ③（取得失敗の可視化）は2026-08-26に実装完了（コミット e277393）

## 現在の進捗

- **遅延情報収集の復旧（v3.9.3）は本番適用済み・ユーザー確認済み**
  - 障害原因: ①allorigins.winプロキシ完全ダウン ②Yahoo!ページ刷新でHTML正規表現パース全滅（実体は `__NEXT_DATA__` JSONに移行）
  - 対応: Cloud Function `fetchTrainInfo`（asia-northeast1デプロイ済み）＋ `TrainInfoProxy` ＋ `__NEXT_DATA__` JSONパース ＋ 履歴二重追加バグ修正
  - コミット: `3d8b7b9`（プロキシ）→ `38d9e06`（JSONパース）→ `f4ff9c3`（履歴dedupe）
- 詳細は files/CHANGELOG.md の v3.9.3 を参照

## このマシン固有の注意

- `server/data/` に実勤怠データ（個人情報）あり。`.git/info/exclude` でローカル除外済み。**絶対にコミット禁止**
- firebase CLIログイン済み（syunpeman@gmail.com）。関数デプロイは `npx firebase-tools deploy --only functions:名前 --project strengths-finder-auth`（権限クラシファイアにブロックされる場合はユーザーが `!` プレフィックスで実行）
- `.env.local` は本番Firebase設定で作成済み（`REACT_APP_USE_EMULATOR=false`）
- 旧ローカル状態の保全: ブランチ `backup/local-main-20260731`、stash `pre-sync-to-origin-main-20260731`（不要と確認できたら削除してよい）
