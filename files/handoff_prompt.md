# Handoff Prompt

最終更新: 2026-07-31（休憩ギャップ補正セッション終了時）

## 今すぐやること（次セッションの最優先）

1. **セッション開始時に必ず `git fetch origin` → `git rev-list --count main..origin/main` でリモート乖離を確認する**
   - このマシンは過去に267コミット遅れで作業して重複実装事故を起こした
2. **テスト失敗91件（20スイート）の調査**（DASHBOARD 残タスク優先度:高）
   - mainのHEADで発生中。CIワークフロー（deploy.yml）は `npm test` を実行しないため見逃されてきた
   - 実アサーション失敗（FinancialServiceのポジション別内訳がundefined、AttendanceService FN301早退申請偽陰性）と環境系（localStorage undefined）の混在
   - 切り分け→修正、またはCIにテストステップ追加の検討

## 現在の進捗

- **休憩ギャップ補正（v3.9.2）は本番適用済み・完了**
  - 出社2/出社3のギャップ（退社→出社2、退社2→出社3）を休憩に加算して休憩不足を判定
  - コミット `395500b` → マージ `4e9161f` → CI/CD success → 本番バンドル反映確認済み
  - テスト14件（BreakGapCorrection）＋実データ961件検証＋ブラウザE2E確認済み
- ドキュメント更新済み: README / SPEC_ATTENDANCE_ANALYSIS / files/CHANGELOG / files/DASHBOARD / dev_log

## このマシン固有の注意

- `server/data/` に実勤怠データ（個人情報）あり。`.git/info/exclude` でローカル除外済み。**絶対にコミット禁止**
- テスト用合成データ: `server/data/テスト用_出勤簿_日別詳細.xlsx`（動作確認に再利用可）
- 旧ローカル状態の保全: ブランチ `backup/local-main-20260731`、stash `pre-sync-to-origin-main-20260731`（不要と確認できたら削除してよい）
- `.env.local` は本番Firebase設定で作成済み（`REACT_APP_USE_EMULATOR=false`）
