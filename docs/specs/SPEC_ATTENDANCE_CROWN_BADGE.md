# 勤怠分析従業員別タブ：役職別バッジ表示仕様

## 概要

勤怠分析の従業員別タブにおいて、StrengthsFinder登録メンバーの役職に応じて
個人分析と同じクラウンアイコンを表示する。

## 現状

### 個人分析（IndividualStrengths）
- 役職に応じてクラウン/サークルアイコンを表示
- lucide-react の `Crown` コンポーネントを使用
- 一般社員は非表示

### 勤怠分析（AttendanceAnalysisPage）
- SF登録メンバーには一律 `Award` アイコン（黄色）を表示
- ホバーで Top 5 Strengths と MBTI を表示

## 変更仕様

### アイコン表示ルール

| 役職 | Position Enum | アイコン | 色 |
|------|---------------|---------|-----|
| 部長 | `DIRECTOR` | Crown | `#F44336` (赤) |
| 課長 | `MANAGER` | Crown | `#2196F3` (青) |
| 副課長 | `DEPUTY_MANAGER` | Crown | `#00C853` (緑) |
| グループリーダー | `GL` | Crown | `#FFD700` (金) |
| 契約社員 | `CONTRACT` | Circle | `#ADD8E6` (薄青) |
| BP | `BP` | Circle | `#90EE90` (薄緑) |
| 一般社員 | `GENERAL` | Award | `#EAB308` (黄) |
| 役職未設定 | undefined | Award | `#EAB308` (黄) |
| カスタム役職 | ユーザー定義 | 定義に従う | 定義に従う |

### 表示条件

1. StrengthsFinder登録がない場合 → アイコン表示なし（氏名のみ）
2. SF登録あり＋役職情報あり → 役職に応じたアイコン
3. SF登録あり＋役職なし/一般 → Award アイコン

### ツールチップ

ホバー時のツールチップは現行維持：
- Top 5 Strengths 一覧
- MBTI型（存在する場合）
- 役職名を追加表示

## 実装箇所

### 変更ファイル
- `src/components/attendance/AttendanceAnalysisPage.tsx`
  - `EmployeeNameWithStrengths` コンポーネント

### 依存関係
- `lucide-react` の `Crown`, `Award` コンポーネント
- `StrengthsService.getPositionInfo()` メソッド
- `Position` enum（StrengthsTypes.ts）

## テストケース

### 単体テスト

1. **部長の表示**
   - SF登録あり＋役職=DIRECTOR → Crown（赤）が表示される

2. **課長の表示**
   - SF登録あり＋役職=MANAGER → Crown（青）が表示される

3. **一般社員の表示**
   - SF登録あり＋役職=GENERAL → Award（黄）が表示される

4. **役職未設定の表示**
   - SF登録あり＋役職=undefined → Award（黄）が表示される

5. **SF未登録の表示**
   - SF登録なし → アイコン表示なし

6. **契約社員の表示**
   - SF登録あり＋役職=CONTRACT → Circle（薄青）が表示される

7. **カスタム役職の表示**
   - SF登録あり＋カスタム役職 → カスタム設定のアイコン/色

### 統合テスト

1. 従業員別タブで複数役職のメンバーが正しく表示される
2. ツールチップに役職名が表示される
3. ダークモードで正しく表示される

## UI/UXの考慮事項

- アイコンサイズは現行維持（w-4 h-4）
- ホバー時の動作は現行維持
- アクセシビリティ: title属性で役職名を設定

## 実装手順

1. `EmployeeNameWithStrengths` に役職判定ロジックを追加
2. Crown/Circle/Award の条件分岐レンダリングを実装
3. ツールチップに役職名を追加
4. テスト作成・実行
5. ダークモード確認

## 完了条件

- [ ] 全役職で正しいアイコン・色が表示される
- [ ] ツールチップに役職名が表示される
- [ ] 既存のStrengths/MBTIツールチップ機能が維持される
- [ ] ダークモードで正しく表示される
- [ ] 全テストがパスする
