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
- [ ] ビルド成果物に変更内容が実際に含まれているか検証（`build/static/js/main.*.js` 内を検索）
  - 日本語テキストはUnicodeエスケープされるため、英数字キーワード（バージョン番号、クラス名、固有名詞等）で検索
  - 例: `node -e "const js=require('fs').readFileSync('build/static/js/main.*.js','utf8'); console.log(js.includes('v3.6'))"`

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

### Phase 6: 完了報告前の検証（必須）
commit/push前に `/project:completion-report` の手順に従い以下を確認:
- [ ] 変更成果物が実際に期待通りか実データで確認した
- [ ] git status で未コミット変更を確認した
- [ ] 完了事項と未完了事項の両方を明示した
- [ ] デプロイ状態（commit/push/CI/CD/Cloud Function）を明示した

## 禁止事項
- Phase 4（E2Eテスト）をスキップしてpushしない
- 「ユニットテスト通ったから大丈夫」で済ませない
- Cloud Function変更時、ローカルビルドだけでデプロイせずにpushしない
- 検証結果を報告せずにcommitしない
- ビルド成功だけ確認して成果物の中身を検証しない
- 未完了事項（未commit/未push等）を報告から省略しない
