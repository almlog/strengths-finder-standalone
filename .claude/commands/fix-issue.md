GitHub Issue を分析して修正します。Issue: $ARGUMENTS

## 手順
1. `gh issue view $ARGUMENTS` で Issue の詳細を取得
2. 問題を理解し、関連ファイルをコードベースから検索
3. feature ブランチを作成: `git checkout -b fix/issue-$ARGUMENTS`
4. TDD サイクルに従って修正:
   - テストを先に書く (RED)
   - 最小限のコードで修正 (GREEN)
   - REFACTOR 6項目チェック
5. lint / typecheck を実行して品質確認
6. 変更内容を説明するコミットメッセージを作成
7. Push して PR を作成: `gh pr create`

注意: 修正範囲は Issue に記載された問題のみ。関連する別の問題を発見した場合は報告のみ。
