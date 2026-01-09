# 勤怠分析システム テスト報告書

**作成日**: 2026年1月9日
**対象システム**: 楽楽勤怠連携 勤怠分析サービス (AttendanceService)
**テスト実施者**: Claude Code
**テストフレームワーク**: Jest + React Testing Library

---

## 1. テスト概要

### 1.1 目的
楽楽勤怠から連携されたデータに基づき、以下の届出漏れ・違反を正確に検出できることを検証する。

### 1.2 検出対象の違反タイプ

| 違反タイプ | 内部コード | 説明 |
|-----------|-----------|------|
| 打刻漏れ | `missing_clock` | 出退勤時刻が未入力 |
| 休憩時間違反 | `break_violation` | 法定休憩時間の不足 |
| 遅刻届出漏れ | `late_application_missing` | 遅刻発生時に適切な届出がない |
| 早退届出漏れ | `early_leave_application_missing` | 早退発生時に適切な届出がない |
| 早出届出漏れ | `early_start_application_missing` | 早出勤務時にフラグ/申請がない |
| 時間有休打刻漏れ | `time_leave_punch_missing` | 時間有休申請時に私用外出/戻り打刻がない |
| 深夜休憩届出漏れ | `night_break_application_missing` | 深夜労働時に休憩時間修正申請がない |

### 1.3 勤務条件（テスト前提）
- **出社時刻**: 9:00
- **退社時刻**: 17:30
- **休憩時間**: 12:00-13:00（1時間）
- **カレンダー**: 平日

---

## 2. テスト環境

### 2.1 実行環境
```
Node.js: v18.x
npm: v9.x
Jest: v29.x
TypeScript: v4.x
OS: Windows 11
```

### 2.2 テストファイル構成
```
src/__tests__/services/
├── AttendanceService.8HourSchedule.test.ts     # 8時スケジュール関連 (24件)
├── AttendanceService.ApplicationMissing.test.ts # 申請漏れ検出 (25件)
└── AttendanceService.Integration.test.ts        # 統合テスト (38件)
```

### 2.3 テスト対象ソースファイル
```
src/services/AttendanceService.ts      # メインサービスロジック
src/models/AttendanceTypes.ts          # 型定義・定数
```

---

## 3. テスト結果サマリー

### 3.1 全体結果
| 項目 | 結果 |
|------|------|
| テストスイート | 3件 全てパス |
| テストケース | 87件 全てパス |
| 失敗 | 0件 |
| スキップ | 0件 |
| 実行時間 | 約4.4秒 |

### 3.2 カテゴリ別結果

| カテゴリ | テスト件数 | パス | 失敗 |
|---------|-----------|------|------|
| 正常ケース | 3 | 3 | 0 |
| 遅刻関連 | 5 | 5 | 0 |
| 早退関連 | 4 | 4 | 0 |
| 早出関連 | 5 | 5 | 0 |
| 時間有休打刻 | 5 | 5 | 0 |
| 深夜休憩 | 4 | 4 | 0 |
| 複合ケース | 3 | 3 | 0 |
| エッジケース | 4 | 4 | 0 |
| キーワードバリエーション | 4 | 4 | 0 |
| 8時スケジュール | 24 | 24 | 0 |
| 申請漏れ基本 | 25 | 25 | 0 |
| 表示情報検証 | 1 | 1 | 0 |

---

## 4. 詳細テストケース

### 4.1 正常ケース（違反なしを確認）

| ID | テスト名 | 入力条件 | 期待結果 | 実際結果 |
|----|---------|---------|---------|---------|
| 001 | 正常出勤 | 9:00出社、17:30退社、休憩1時間 | violations = [] | ✓ パス |
| 002 | 時差出勤（事前申請） | 10:00出社、applicationContent='時差出勤申請' | late_application_missing なし | ✓ パス |
| 003 | 半休（午前） | 13:00出社、lateMinutes='4:00'、applicationContent='午前半休' | late_application_missing なし | ✓ パス |

### 4.2 遅刻関連の違反検出

| ID | テスト名 | 入力条件 | 期待結果 | 実際結果 |
|----|---------|---------|---------|---------|
| 101 | 遅刻（申請なし） | 9:30出社、lateMinutes='0:30'、applicationContent='' | late_application_missing 検出 | ✓ パス |
| 102 | 遅刻（遅刻申請あり） | 9:30出社、lateMinutes='0:30'、applicationContent='遅刻申請' | late_application_missing なし | ✓ パス |
| 103 | 電車遅延（申請あり） | 9:20出社、lateMinutes='0:20'、applicationContent='電車遅延申請' | late_application_missing なし | ✓ パス |
| 104 | 大幅遅刻（申請なし） | 12:00出社、lateMinutes='3:00'、applicationContent='' | late_application_missing 検出 | ✓ パス |
| 105 | 大幅遅刻（午前半休） | 12:00出社、lateMinutes='3:00'、applicationContent='午前半休' | late_application_missing なし | ✓ パス |

### 4.3 早退関連の違反検出

| ID | テスト名 | 入力条件 | 期待結果 | 実際結果 |
|----|---------|---------|---------|---------|
| 201 | 早退（申請なし） | 16:30退社、earlyLeaveMinutes='1:00'、applicationContent='' | early_leave_application_missing 検出 | ✓ パス |
| 202 | 早退（早退申請あり） | 16:30退社、earlyLeaveMinutes='1:00'、applicationContent='早退申請' | early_leave_application_missing なし | ✓ パス |
| 203 | 早退（午後半休） | 13:00退社、earlyLeaveMinutes='4:30'、applicationContent='午後半休' | early_leave_application_missing なし | ✓ パス |
| 204 | 早退（遅刻・早退申請） | 15:00退社、earlyLeaveMinutes='2:30'、applicationContent='遅刻・早退申請' | early_leave_application_missing なし | ✓ パス |

### 4.4 早出関連の違反検出

| ID | テスト名 | 入力条件 | 期待結果 | 実際結果 |
|----|---------|---------|---------|---------|
| 301 | 早出（フラグなし・申請なし） | 8:00出社、earlyStartFlag=false、applicationContent='' | early_start_application_missing 検出 | ✓ パス |
| 302 | 早出（フラグあり） | 8:00出社、earlyStartFlag=true | early_start_application_missing なし | ✓ パス |
| 303 | 早出（早出申請あり） | 7:30出社、earlyStartFlag=false、applicationContent='早出申請' | early_start_application_missing なし | ✓ パス |
| 304 | ギリギリ早出（8:59） | 8:59出社、earlyStartFlag=false | early_start_application_missing 検出 | ✓ パス |
| 305 | 9時ちょうど出社 | 9:00出社、earlyStartFlag=false | early_start_application_missing なし | ✓ パス |

### 4.5 時間有休打刻関連

| ID | テスト名 | 入力条件 | 期待結果 | 実際結果 |
|----|---------|---------|---------|---------|
| 401 | 時間有休（打刻なし） | applicationContent='時間有休申請'、privateOutTime=null、privateReturnTime=null | time_leave_punch_missing 検出 | ✓ パス |
| 402 | 時間有休（打刻あり） | applicationContent='時間有休申請'、privateOutTime=14:00、privateReturnTime=15:00 | time_leave_punch_missing なし | ✓ パス |
| 403 | 時間有休（外出のみ） | applicationContent='時間有休申請'、privateOutTime=14:00、privateReturnTime=null | time_leave_punch_missing 検出 | ✓ パス |
| 404 | 時間有休（戻りのみ） | applicationContent='時間有休申請'、privateOutTime=null、privateReturnTime=15:00 | time_leave_punch_missing 検出 | ✓ パス |
| 405 | 時間有休申請なし | applicationContent=''、privateOutTime=null、privateReturnTime=null | time_leave_punch_missing なし | ✓ パス |

### 4.6 深夜休憩関連

| ID | テスト名 | 入力条件 | 期待結果 | 実際結果 |
|----|---------|---------|---------|---------|
| 501 | 深夜労働（休憩修正なし） | nightWorkMinutes='1:00'、nightBreakModification=''、applicationContent='' | night_break_application_missing 検出 | ✓ パス |
| 502 | 深夜労働（休憩修正あり） | nightWorkMinutes='1:00'、nightBreakModification='0:15' | night_break_application_missing なし | ✓ パス |
| 503 | 深夜労働（申請あり） | nightWorkMinutes='1:00'、applicationContent='休憩時間修正申請' | night_break_application_missing なし | ✓ パス |
| 504 | 深夜労働なし | nightWorkMinutes='' | night_break_application_missing なし | ✓ パス |

### 4.7 複合ケース

| ID | テスト名 | 入力条件 | 期待結果 | 実際結果 |
|----|---------|---------|---------|---------|
| 601 | 遅刻＋早退（両方申請なし） | lateMinutes='0:30'、earlyLeaveMinutes='1:00'、applicationContent='' | 両方検出 | ✓ パス |
| 602 | 早出＋深夜（両方申請なし） | 7:00出社、earlyStartFlag=false、nightWorkMinutes='1:00' | 両方検出 | ✓ パス |
| 603 | 時間有休＋遅刻 | lateMinutes='1:00'、applicationContent='時間有休申請'、打刻なし | 両方検出 | ✓ パス |

### 4.8 エッジケース

| ID | テスト名 | 入力条件 | 期待結果 | 実際結果 |
|----|---------|---------|---------|---------|
| 701 | 遅刻0分 | lateMinutes='0:00' | late_application_missing なし | ✓ パス |
| 702 | 早退0分 | earlyLeaveMinutes='0:00' | early_leave_application_missing なし | ✓ パス |
| 703 | 深夜労働0分 | nightWorkMinutes='0:00' | night_break_application_missing なし | ✓ パス |
| 704 | 空文字の遅刻時間 | lateMinutes='' | late_application_missing なし | ✓ パス |

---

## 5. 申請キーワード除外ロジック

### 5.1 遅刻届出漏れ (`late_application_missing`) の除外条件

以下のキーワードが `applicationContent` に含まれる場合、違反として検出しない：

| キーワード | 説明 |
|-----------|------|
| `遅刻` | 遅刻申請、遅刻・早退申請 など |
| `電車遅延` | 電車遅延申請 |
| `時差出勤` | 時差出勤申請（事前申請） |
| `半休` | 半休申請 |
| `午前半休` | 午前半休 |
| `午後半休` | 午後半休 |

**ソースコード参照**: `AttendanceService.ts:762-780` (`hasLateApplicationMissingWithMinutes`)

### 5.2 早退届出漏れ (`early_leave_application_missing`) の除外条件

| キーワード | 説明 |
|-----------|------|
| `早退` | 早退申請、遅刻・早退申請 など |
| `半休` | 半休申請 |
| `午前半休` | 午前半休 |
| `午後半休` | 午後半休 |

**ソースコード参照**: `AttendanceService.ts:786-804` (`hasEarlyLeaveApplicationMissing`)

### 5.3 早出届出漏れ (`early_start_application_missing`) の除外条件

| 条件 | 説明 |
|------|------|
| `earlyStartFlag = true` | 早出フラグが入力されている |
| `applicationContent` に `早出` を含む | 早出申請がある |

**ソースコード参照**: `AttendanceService.ts:698-731` (`hasEarlyStartViolation`)

---

## 6. 8時スケジュール特殊処理

### 6.1 概要
シート名に `800-` パターンを含む場合、8時スケジュールと判定し、以下の特殊処理を行う。

### 6.2 処理内容

| 処理 | 説明 | ソースコード参照 |
|------|------|----------------|
| 残業時間0 | 8時スケジュールは残業計算対象外 | `AttendanceService.ts:595-597` |
| 1時間遅刻除外 | 9時出社で1時間遅刻の場合、除外判定 | `AttendanceService.ts:665-689` |

### 6.3 テスト結果
8時スケジュール関連のテスト24件が全てパス。

---

## 7. 型定義・表示情報

### 7.1 ViolationType 定義

```typescript
export type ViolationType =
  | 'missing_clock'                    // 出退勤時刻なし
  | 'break_violation'                  // 休憩時間違反
  | 'late_application_missing'         // 遅刻届出漏れ
  | 'early_leave_application_missing'  // 早退届出漏れ
  | 'early_start_application_missing'  // 早出届出漏れ
  | 'time_leave_punch_missing'         // 時間有休打刻漏れ
  | 'night_break_application_missing'; // 深夜休憩届出漏れ
```

### 7.2 VIOLATION_DISPLAY_INFO

各違反タイプには以下の表示情報が定義されている：
- `displayName`: 一覧表示用の名称
- `possibleApplications`: 可能性のある届出一覧（ツールチップ用）
- `notes`: 注意書き（マニュアル v02 に基づく）

**ソースコード参照**: `AttendanceTypes.ts:206-252`

---

## 8. テストカバレッジ分析

### 8.1 カバー済み機能

| 機能 | カバレッジ |
|------|-----------|
| 遅刻検出ロジック | ✓ 完全 |
| 早退検出ロジック | ✓ 完全 |
| 早出検出ロジック | ✓ 完全 |
| 時間有休打刻検出 | ✓ 完全 |
| 深夜休憩検出 | ✓ 完全 |
| 8時スケジュール処理 | ✓ 完全 |
| 申請キーワード除外 | ✓ 完全 |
| 複合違反検出 | ✓ 部分的 |
| エッジケース | ✓ 部分的 |

### 8.2 未カバー・要追加検討

| 項目 | 説明 |
|------|------|
| 休日出勤ケース | `calendarType !== 'weekday'` の場合の検証 |
| 打刻漏れ (`missing_clock`) | 統合テストでは未検証 |
| 休憩違反 (`break_violation`) | 統合テストでは未検証 |
| XLSXパース処理 | 実際のファイル読み込みテスト |
| 月次サマリー生成 | `createEmployeeMonthlySummary` のテスト |

---

## 9. 既知の制限事項

### 9.1 申請キーワードの部分一致
- 申請内容は `includes()` による部分一致で判定
- 例: 「遅刻」が含まれていれば「遅刻連絡」「遅刻申請」などすべて該当

### 9.2 時間文字列のフォーマット
- 遅刻・早退時間は `'H:MM'` 形式を想定
- 例: `'0:30'`, `'1:00'`, `'3:00'`

### 9.3 8時スケジュール判定
- シート名のパターン `/[_-]800[-_～]/` で判定
- カレンダー種別 (`calendarRaw`) の `'8時～'` も補助的に使用

---

## 10. 推奨事項

### 10.1 追加テスト
1. 実際のXLSXファイルを使用した E2E テスト
2. 休日出勤シナリオの追加
3. 月次集計機能のテスト

### 10.2 コード改善
1. 申請キーワードの定数化（現在はハードコード）
2. 時間パースのバリデーション強化
3. エラーハンドリングの追加

---

## 11. 結論

**テスト結果**: 全87件パス（成功率 100%）

本テストにより、勤怠分析システムの届出漏れ検出機能が、定義された仕様に従って正しく動作することを確認した。遅刻、早退、早出、時間有休、深夜休憩の各シナリオについて、申請の有無による検出/除外が適切に行われている。

8時スケジュールの特殊処理も正常に機能しており、シート名パターンに基づく残業除外・遅刻除外が正しく実装されている。

---

## 付録A: テスト実行コマンド

```bash
# 全AttendanceServiceテスト実行
npm test -- --testPathPattern="AttendanceService" --watchAll=false

# 統合テストのみ実行
npm test -- --testPathPattern="AttendanceService.Integration" --watchAll=false

# 詳細出力
npm test -- --testPathPattern="AttendanceService" --watchAll=false --verbose
```

## 付録B: ソースファイル一覧

| ファイル | 行数 | 説明 |
|---------|------|------|
| `src/services/AttendanceService.ts` | ~1100行 | メインサービス |
| `src/models/AttendanceTypes.ts` | ~300行 | 型定義・定数 |
| `src/__tests__/services/AttendanceService.Integration.test.ts` | ~400行 | 統合テスト |
| `src/__tests__/services/AttendanceService.ApplicationMissing.test.ts` | ~300行 | 申請漏れテスト |
| `src/__tests__/services/AttendanceService.8HourSchedule.test.ts` | ~280行 | 8時スケジュールテスト |

---

**報告書終了**
