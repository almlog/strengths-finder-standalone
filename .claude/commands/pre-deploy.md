デプロイ前の検証を実施します。対象: $ARGUMENTS

## 目的
本番環境への反映前に、全ての検証ステップを完了する。
過去の失敗（E2Eテスト未実施で本番404、CI未検証でビルド失敗等）を防止する。

## 検証ステップ（全項目必須・スキップ禁止）

### Phase 1: 静的検証
- [ ] `npx tsc --noEmit` — TypeScriptエラーなし（既存テストファイルのエラーは除外可）
- [ ] 変更対象ファイルに未使用import/変数がないこと

### Phase 2: ユニットテスト
- [ ] 変更に関連するテストファイルを特定
- [ ] `npx react-scripts test --testPathPattern="[対象]" --watchAll=false` — 全PASS
- [ ] 新規ロジックにテストが存在すること（テストなしの実装は禁止）

### Phase 3: CIビルド検証
- [ ] `set CI=true && npm run build` (Windows) — `Compiled successfully.`
- [ ] ESLint警告がエラーに昇格していないこと

### Phase 4: 開発環境E2Eテスト（該当時）
外部API連携・UI変更を含む場合は必須:
- [ ] 開発サーバー起動: `npm start` → http://localhost:3006
- [ ] 変更した機能をブラウザで実際に操作
- [ ] 外部API呼び出しが成功することを確認（レスポンス確認）
- [ ] エラーケースも手動テスト（未設定時、ネットワークエラー等）
- [ ] コンソールにエラーが出ていないこと

### Phase 5: Cloud Function変更時（該当時）
- [ ] `cd functions && npm run build` — ビルド成功
- [ ] `firebase deploy --only functions` — デプロイ成功
- [ ] 開発環境からCloud Functionを呼び出して動作確認
- [ ] Cloud Functionのログ確認: Firebase Console → Functions → ログ

## 検証結果の報告

全Phase完了後、以下の形式で報告:

```
## デプロイ前検証結果

| Phase | 結果 | 備考 |
|-------|------|------|
| 1. 静的検証 | PASS/FAIL | |
| 2. ユニットテスト | PASS/FAIL | N件中N件PASS |
| 3. CIビルド | PASS/FAIL | |
| 4. E2Eテスト | PASS/FAIL/N/A | |
| 5. Cloud Function | PASS/FAIL/N/A | |

全Phase PASS → commit & push 可能
いずれかFAIL → 修正してから再検証
```

## 禁止事項
- Phase 4（E2Eテスト）をスキップしてpushしない
- 「ユニットテスト通ったから大丈夫」で済ませない
- Cloud Function変更時、ローカルビルドだけでデプロイせずにpushしない
- 検証結果を報告せずにcommitしない
