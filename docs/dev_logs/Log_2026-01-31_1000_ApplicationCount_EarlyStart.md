# 2026-01-31 10:00 - ApplicationCount_EarlyStart

**Model:** Claude Opus 4.5
**Scope:** Feature Enhancement & Refactoring
**Tags:** #AI_Dev #Log #Attendance #ApplicationCount #EarlyStart #SheetName

---

## ハイライト

> **主な成果:**
> 1. **申請カウント機能の完全リニューアル** - 楽楽勤怠マニュアルの24種類の申請タイプに対応
> 2. **シート名からの始業時刻抽出** - 早出判定の精度向上
> 3. **出勤率計算の修正** - 欠勤のみが出勤率に影響するよう修正
> 4. **従業員一覧に欠勤カラム追加** - 視認性向上

---

## タスク詳細

### Task 1: 申請カウント機能のリニューアル
**Status:** COMPLETED

**問題:**
- 有休取得しているのに有休カウントが0
- 出勤率が100%になるべきケースで低く表示される
- スケジュール情報のみ（例: `900-1730/1200-1300/7.75/5`）が申請としてカウントされていた

**解決策:**
楽楽勤怠マニュアルに記載された24種類の申請タイプに完全対応：

```typescript
export interface ApplicationCounts {
  // === 勤務関連（9項目） ===
  overtime: number;               // 残業申請
  earlyStart: number;             // 早出申請
  earlyStartBreak: number;        // 早出中抜け時間帯申請
  lateEarlyLeave: number;         // 遅刻・早退申請
  trainDelay: number;             // 電車遅延申請
  flextime: number;               // 時差出勤申請
  breakModification: number;      // 休憩時間修正申請
  standby: number;                // 待機申請
  nightDuty: number;              // 宿直申請

  // === 休暇・休日関連（15項目） ===
  annualLeave: number;            // 有休申請（全休）
  amLeave: number;                // 午前有休
  pmLeave: number;                // 午後有休
  hourlyLeave: number;            // 時間有休申請
  holidayWork: number;            // 休出申請（休日出勤）
  substituteWork: number;         // 振替出勤申請
  substituteHoliday: number;      // 振替休日申請
  compensatoryLeave: number;      // 代休申請
  absence: number;                // 欠勤申請
  specialLeave: number;           // 特休申請
  menstrualLeave: number;         // 生理休暇申請
  childCareLeave: number;         // 子の看護休暇申請
  hourlyChildCareLeave: number;   // 時間子の看護休暇申請
  nursingCareLeave: number;       // 介護休暇申請
  hourlyNursingCareLeave: number; // 時間介護休暇申請
  postNightLeave: number;         // 明け休申請

  // === その他 ===
  other: number;                  // その他（マニュアル一覧外の申請）
}
```

**申請内容パターン判定:**
```
有休 → annualLeave（全休）
午前有休 → amLeave
午後有休,900-1730/... → pmLeave（カンマ以降はスケジュール情報）
900-1730/1200-1300/7.75/5 → スキップ（スケジュールのみ）
電車遅延 → trainDelay
生理休暇 → menstrualLeave
```

**影響範囲:**
- `src/models/AttendanceTypes.ts` - ApplicationCounts型の完全再設計
- `src/services/AttendanceService.ts` - countApplicationsメソッドの完全書き換え
- `src/components/attendance/AttendanceAnalysisPage.tsx` - PDF申請サマリー表示の更新

---

### Task 2: シート名からの始業時刻抽出
**Status:** COMPLETED

**問題:**
- 申請内容が空の場合、デフォルトの9時基準で早出判定される
- シート名 `KDDI_日勤_800-1630～930-1800_1200...` に始業時刻情報があるのに活用されていない

**解決策:**
始業時刻の判定優先順位を以下のように設計：

```
1. 申請内容（applicationContent）にスケジュールがある → その時刻を使用
2. シート名にスケジュールパターンがある → その時刻を使用
3. どちらもない → デフォルト9時基準
```

**新規メソッド:**
```typescript
/**
 * シート名から始業時刻を抽出
 * 形式: "KDDI_日勤_800-1630～930-1800_1200..." → { hour: 8, minute: 0 }
 */
static parseScheduledStartTimeFromSheetName(sheetName: string): { hour: number; minute: number } | null {
  if (!sheetName) return null;

  // パターン1: _800-1630 形式（3-4桁の数字）
  const matchNumeric = sheetName.match(/[_-](\d{3,4})-\d{3,4}/);
  if (matchNumeric) {
    const startTimeStr = matchNumeric[1];
    if (startTimeStr.length === 3) {
      // 800 → 8:00
      return { hour: parseInt(startTimeStr[0], 10), minute: parseInt(startTimeStr.slice(1), 10) };
    } else {
      // 0830 → 8:30
      return { hour: parseInt(startTimeStr.slice(0, 2), 10), minute: parseInt(startTimeStr.slice(2), 10) };
    }
  }

  // パターン2: _9:00-17:30 形式（コロン区切り）
  const matchColon = sheetName.match(/[_-](\d{1,2}):(\d{2})-\d{1,2}:\d{2}/);
  if (matchColon) {
    return { hour: parseInt(matchColon[1], 10), minute: parseInt(matchColon[2], 10) };
  }

  return null;
}
```

**早出判定ロジック更新（hasEarlyStartViolation）:**
```typescript
// 1. 申請内容から始業時刻を抽出（既存）
let scheduledStart = this.parseScheduledStartTime(record.applicationContent || '');

// 2. 申請内容になければシート名から抽出（新規追加）
if (!scheduledStart) {
  scheduledStart = this.parseScheduledStartTimeFromSheetName(record.sheetName || '');
}

// 3. どちらもなければデフォルト9時（既存）
const scheduledHour = scheduledStart?.hour ?? STANDARD_WORK_START_HOUR;
const scheduledMinute = scheduledStart?.minute ?? 0;
```

**影響範囲:**
- `src/services/AttendanceService.ts` - parseScheduledStartTimeFromSheetName追加、hasEarlyStartViolation修正

---

### Task 3: 出勤率計算の修正
**Status:** COMPLETED

**問題:**
- 有休を取得すると出勤率が下がる
- 本来、欠勤以外は出勤扱いで100%になるべき

**解決策:**
出勤率の計算式を修正：

```typescript
// 修正前
const attendanceRate = (employee.totalWorkDays / employee.totalWeekdaysInMonth) * 100;

// 修正後
const attendanceRate = employee.totalWeekdaysInMonth > 0
  ? Math.round(((employee.totalWeekdaysInMonth - employee.applicationCounts.absence) / employee.totalWeekdaysInMonth) * 100)
  : 0;
```

**計算ロジック:**
```
出勤率 = (月間平日日数 - 欠勤日数) / 月間平日日数 × 100
```

- 有休、振休、特休などは「出勤扱い」
- 欠勤のみが出勤率に影響

---

### Task 4: 従業員一覧に欠勤カラム追加
**Status:** COMPLETED

**変更内容:**
- ヘッダー行に「欠勤」列を追加
- 欠勤カウントを表示（0より大きい場合は赤色でハイライト）

```tsx
// ヘッダー
<th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">欠勤</th>

// データ行
<td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
  {emp.applicationCounts.absence > 0 ? (
    <span className="text-red-600 dark:text-red-400 font-medium">{emp.applicationCounts.absence}</span>
  ) : (
    emp.applicationCounts.absence
  )}
</td>
```

---

## ファイル & 参照

### 変更ファイル
| ファイル | 変更内容 |
|---------|---------|
| `src/models/AttendanceTypes.ts` | ApplicationCounts型を24項目に完全再設計 |
| `src/services/AttendanceService.ts` | countApplications書き換え、parseScheduledStartTimeFromSheetName追加、hasEarlyStartViolation修正 |
| `src/components/attendance/AttendanceAnalysisPage.tsx` | 出勤率計算修正、PDF申請サマリー更新、欠勤カラム追加 |
| `src/__tests__/services/AttendanceService.ApplicationCount.test.ts` | 38テストケース新規作成 |
| `src/__tests__/services/AttendanceService.EarlyStart.test.ts` | シート名パース・統合テスト16件追加 |

### 参照ドキュメント
| ファイル | 説明 |
|---------|------|
| `docs/rakurakukintai/各種申請.txt` | 楽楽勤怠マニュアル記載の24種類の申請一覧 |
| `docs/rakurakukintai/申請内容.txt` | 実際の申請内容カラムの記載パターン |

---

## 技術的知見

### 始業時刻判定の優先順位

```
優先度1: 申請内容のスケジュール
  例: "午後有休,900-1730/1200-1300/7.75/5" → 9:00始業

優先度2: シート名のスケジュール
  例: "KDDI_日勤_800-1630～930-1800_1200..." → 8:00始業

優先度3: デフォルト
  → 9:00始業
```

### 申請内容パターンの分類

```
■ 申請キーワード + スケジュール
  例: "午後有休,900-1730/1200-1300/7.75/5"
  → カンマ前の「午後有休」を申請としてカウント
  → カンマ後はスケジュール情報として始業時刻抽出に使用

■ スケジュールのみ
  例: "900-1730/1200-1300/7.75/5"
  → 申請としてはカウントしない（isScheduleOnly判定）
  → 始業時刻抽出には使用

■ 申請キーワードのみ
  例: "有休"、"電車遅延"
  → 申請としてカウント
```

### スケジュールのみ判定（isScheduleOnly）

```typescript
private static isScheduleOnly(applicationContent: string): boolean {
  if (!applicationContent) return true;
  // パターン: 900-1730/1200-1300/7.75/5
  const schedulePattern = /^\d{3,4}-\d{3,4}\/\d{3,4}-\d{3,4}\/[\d.]+\/\d+$/;
  return schedulePattern.test(applicationContent.trim());
}
```

---

## メトリクス

| 項目 | 値 |
|------|-----|
| 申請タイプ数（新） | 24種類 + その他 |
| 申請タイプ数（旧） | 9種類 |
| ApplicationCount新規テスト | 38件 |
| EarlyStartシート名テスト | 16件 |
| テスト成功率 | 100% |

---

## Next Context (JSON)

```json
{
  "session_date": "2026-01-31",
  "tasks": [
    {
      "id": "application-count-redesign",
      "name": "申請カウント機能リニューアル",
      "status": "completed",
      "notes": "24種類の申請タイプ対応、スケジュールのみ除外"
    },
    {
      "id": "sheet-name-start-time",
      "name": "シート名からの始業時刻抽出",
      "status": "completed",
      "notes": "800-1630形式、9:00-17:30形式に対応"
    },
    {
      "id": "attendance-rate-fix",
      "name": "出勤率計算修正",
      "status": "completed",
      "notes": "欠勤のみが出勤率に影響"
    },
    {
      "id": "absence-column",
      "name": "従業員一覧に欠勤カラム追加",
      "status": "completed",
      "notes": "赤色ハイライト表示"
    }
  ],
  "pending_issues": [],
  "tech_constraints": [
    "申請内容の形式: カンマ区切りでスケジュール情報が付加される",
    "シート名の形式: プロジェクト名_勤務形態_時刻パターン"
  ]
}
```

---

*Generated by Claude Opus 4.5 - AI Development Log v4.0*
