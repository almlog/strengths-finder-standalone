# 個人勤怠分析PDF出力機能 仕様書

## 概要

従業員個人の勤怠データをパーソナライズしたPDFレポートとして出力する機能。
管理者・本人が個人の勤怠状況を一目で把握できるようにする。

## 目的

1. **個人への勤怠フィードバック**: 本人が自分の勤怠状況を確認
2. **面談資料**: 上長との1on1で使用する客観的データ
3. **36協定管理**: 個人の残業時間推移を可視化
4. **申請状況の把握**: 各種申請の利用状況を確認

## 機能要件

### FR-001: 個人PDF出力ボタン

- **場所**: 従業員別タブの各従業員カード内
- **トリガー**: ボタンクリック
- **出力**: A4縦向きPDF（1人1ページ）

### FR-002: PDF出力内容

#### ヘッダーセクション
| 項目 | 説明 | データソース |
|------|------|-------------|
| 氏名 | 従業員名 | `employeeName` |
| 社員番号 | 識別用 | `employeeId` |
| 部署 | 所属部門 | `department` |
| 分析期間 | 開始日〜終了日 | `analysisDateRange` |
| 出力日時 | PDF生成日時 | `new Date()` |

#### 勤務サマリーセクション
| 項目 | 説明 | データソース |
|------|------|-------------|
| 出勤日数 | 総出勤日数 | `totalWorkDays` |
| 営業日数 | 月間営業日数 | `totalWeekdaysInMonth` |
| 出勤率 | 出勤日/営業日 | 計算値 |
| 休日出勤 | 休日出勤日数 | `holidayWorkDays` |
| 定時退社日数 | 定時で退社した日数 | `timelyDepartureDays` |
| 定時退社率 | 定時退社/出勤日 | 計算値 |

#### 残業・36協定セクション
| 項目 | 説明 | データソース |
|------|------|-------------|
| 月間残業時間 | 36協定用残業時間 | `totalOvertimeMinutes` |
| 残業アラートレベル | 7段階評価 | `calculateOvertimeAlert()` |
| 月末予測残業時間 | 予兆アラート用 | 計算値 |
| 日平均残業時間 | 残業時間/出勤日数 | 計算値 |

#### 就業実績時間セクション
| 項目 | 説明 | データソース |
|------|------|-------------|
| 総就業時間 | 月間の総労働時間 | `totalWorkMinutes` |

#### 申請サマリーセクション

**勤務関連（9項目）**
| 項目 | 説明 | データソース |
|------|------|-------------|
| 遅刻申請 | 遅刻関連の申請 | `applicationCounts.lateApplication` |
| 早退申請 | 早退関連の申請 | `applicationCounts.earlyLeaveApplication` |
| 電車遅延 | 電車遅延申請 | `applicationCounts.trainDelayApplication` |
| 早出申請 | 早出申請/フラグ | `applicationCounts.earlyStartApplication` |
| 時差出勤 | 時差出勤申請 | `applicationCounts.flextimeApplication` |
| 直行 | 直行申請 | `applicationCounts.directGo` |
| 直帰 | 直帰申請 | `applicationCounts.directReturn` |
| 休憩修正 | 休憩時間修正申請 | `applicationCounts.breakModification` |
| 打刻修正 | 打刻修正申請 | `applicationCounts.clockModification` |

**休暇・休日関連（14項目）**
| 項目 | 説明 | データソース |
|------|------|-------------|
| 時間有休 | 時間単位の有休取得 | `applicationCounts.hourlyLeave` |
| 午前休 | 午前半休取得 | `applicationCounts.amLeave` |
| 午後休 | 午後半休取得 | `applicationCounts.pmLeave` |
| 振替出勤 | 振替出勤申請 | `applicationCounts.substituteWork` |
| 振替休日 | 振替休日取得 | `applicationCounts.substituteHoliday` |
| 休日出勤 | 休日出勤申請 | `applicationCounts.holidayWork` |
| 代休 | 代休取得 | `applicationCounts.compensatoryLeave` |
| 欠勤 | 欠勤 | `applicationCounts.absence` |
| 特休 | 特別休暇取得 | `applicationCounts.specialLeave` |
| 慶弔 | 慶弔休暇取得 | `applicationCounts.condolenceLeave` |
| 生理休暇 | 生理休暇取得 | `applicationCounts.menstrualLeave` |
| 子の看護休暇 | 子の看護休暇取得 | `applicationCounts.childCareLeave` |
| 介護休暇 | 介護休暇取得 | `applicationCounts.nursingCareLeave` |
| 明け休 | 夜勤明け休暇 | `applicationCounts.postNightLeave` |

#### 違反・注意事項セクション
| 項目 | 説明 | データソース |
|------|------|-------------|
| 打刻漏れ日数 | 打刻が欠けている日数 | `missingClockDays` |
| 休憩違反日数 | 法定休憩時間未取得 | `breakViolationDays` |
| 早出フラグ未入力日数 | 早出なのにフラグなし | `earlyStartViolationDays` |
| 遅刻日数 | 遅刻が発生した日数 | `lateDays` |
| 早退日数 | 早退が発生した日数 | `earlyLeaveDays` |
| 違反詳細リスト | 日付・種類・詳細 | `violations[]` |

### FR-003: 申請回数カウント機能

`EmployeeMonthlySummary` に以下のフィールドを追加:

```typescript
interface ApplicationCounts {
  // 勤務関連（9項目）
  lateApplication: number;        // 遅刻申請
  earlyLeaveApplication: number;  // 早退申請
  trainDelayApplication: number;  // 電車遅延申請
  earlyStartApplication: number;  // 早出申請/フラグ
  flextimeApplication: number;    // 時差出勤申請
  directGo: number;               // 直行
  directReturn: number;           // 直帰
  breakModification: number;      // 休憩修正申請
  clockModification: number;      // 打刻修正申請

  // 休暇・休日関連（14項目）
  hourlyLeave: number;            // 時間有休
  amLeave: number;                // 午前休
  pmLeave: number;                // 午後休
  substituteWork: number;         // 振替出勤
  substituteHoliday: number;      // 振替休日
  holidayWork: number;            // 休日出勤
  compensatoryLeave: number;      // 代休
  absence: number;                // 欠勤
  specialLeave: number;           // 特休
  condolenceLeave: number;        // 慶弔休暇
  menstrualLeave: number;         // 生理休暇
  childCareLeave: number;         // 子の看護休暇
  nursingCareLeave: number;       // 介護休暇
  postNightLeave: number;         // 明け休
}

interface EmployeeMonthlySummary {
  // 既存フィールド...

  // 申請カウント
  applicationCounts: ApplicationCounts;

  // 就業時間
  totalWorkMinutes: number;         // 月間総就業時間（分）
}
```

### FR-004: PDF生成処理

```typescript
async function exportIndividualPdf(
  employee: EmployeeMonthlySummary,
  analysisDateRange: { start: Date; end: Date }
): Promise<void> {
  // 1. HTMLテンプレートを生成
  // 2. html2canvasでキャプチャ
  // 3. jsPDFでPDF化
  // 4. ダウンロード
}
```

## 非機能要件

### NFR-001: パフォーマンス
- PDF生成は3秒以内に完了
- 複数人の一括PDF出力は別機能として検討

### NFR-002: ファイル命名規則
- `勤怠分析_[社員番号]_[氏名]_[期間].pdf`
- 例: `勤怠分析_12345_山田太郎_2026年1月.pdf`

### NFR-003: レイアウト
- A4縦向き（210mm x 297mm）
- 余白: 上下左右15mm
- フォント: 日本語対応（Noto Sans JP等）

## データフロー

```
┌─────────────────┐
│ XLSXファイル    │
│ (楽楽勤怠)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AttendanceService│
│ .parseXlsx()    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AttendanceService│
│ .analyzeExtended()│
│ ・申請カウント追加│
│ ・就業時間集計  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ EmployeeMonthlySummary │
│ (拡張版)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PDF生成         │
│ (html2canvas +  │
│  jsPDF)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PDFダウンロード │
└─────────────────┘
```

## UI設計

### 従業員別タブのカード内
```
┌──────────────────────────────────────────┐
│ 山田 太郎                    [PDF出力]   │
│ 12345 / 営業部                           │
│ ─────────────────────────────────────── │
│ 出勤: 18日  残業: 35.5h  違反: 2件       │
│ ─────────────────────────────────────── │
│ 36協定: ⚠️ 注意 (35h超過)               │
└──────────────────────────────────────────┘
```

### PDFレイアウト（A4縦）
```
┌─────────────────────────────────────┐
│       勤怠分析レポート              │
│  山田 太郎 (12345) - 営業部         │
│  分析期間: 2026/01/01 - 2026/01/31  │
├─────────────────────────────────────┤
│ ■ 勤務サマリー                      │
│ ┌─────────┬─────────┬─────────┐     │
│ │出勤日数 │営業日数 │出勤率   │     │
│ │  18日   │  20日   │  90%    │     │
│ ├─────────┼─────────┼─────────┤     │
│ │休日出勤 │定時退社 │定時退社率│    │
│ │   2日   │  10日   │  55%    │     │
│ └─────────┴─────────┴─────────┘     │
├─────────────────────────────────────┤
│ ■ 就業実績時間                      │
│ 総就業時間: 152:30                  │
├─────────────────────────────────────┤
│ ■ 残業・36協定                      │
│ 月間残業: 35.5時間                  │
│ アラート: ⚠️ 注意（上長報告必要）  │
│ 月末予測: 42.0時間                  │
├─────────────────────────────────────┤
│ ■ 申請サマリー                      │
│ 【勤務関連】                        │
│ 遅刻│早退│遅延│早出│時差│直行│直帰│休憩│打刻│
│  1 │ 0 │ 2 │ 3 │ 0 │ 1 │ 2 │ 0 │ 1 │
│ 【休暇・休日】                      │
│ 時有│午前│午後│振出│振休│休出│代休│欠勤│特休│
│  2 │ 1 │ 1 │ 0 │ 1 │ 0 │ 1 │ 0 │ 0 │
│ 慶弔│生理│看護│介護│明休│              │
│  0 │ 0 │ 0 │ 0 │ 0 │              │
├─────────────────────────────────────┤
│ ■ 注意事項                          │
│ • 01/15: 打刻漏れ（退勤）           │
│ • 01/22: 休憩時間違反（45分不足）   │
├─────────────────────────────────────┤
│ 出力日時: 2026/01/13 15:30          │
└─────────────────────────────────────┘
```

## 実装計画

### Phase 1: データ収集の拡張
1. `AttendanceTypes.ts` - `ApplicationCounts` 型追加
2. `AttendanceService.ts` - 申請カウントロジック追加
3. テスト作成

### Phase 2: PDF生成機能
1. `IndividualPdfExport.tsx` - PDF生成コンポーネント
2. `AttendanceAnalysisPage.tsx` - UI統合
3. テスト作成

### Phase 3: 将来拡張（別SPEC）
1. 複数月データの統合分析
2. 年間レポート生成
3. 月別推移グラフ

## テスト計画

### 単体テスト
- TC-IND-001: 申請カウントが正しく集計される
- TC-IND-002: 就業時間が正しく計算される
- TC-IND-003: PDF生成が3秒以内に完了する

### 統合テスト
- TC-IND-010: XLSXアップロード→個人PDF出力の一連の流れ
- TC-IND-011: 違反がない従業員のPDF出力
- TC-IND-012: 違反が多い従業員のPDF出力

## 関連ドキュメント

- [SPEC_ATTENDANCE_ANALYSIS.md](./SPEC_ATTENDANCE_ANALYSIS.md) - 勤怠分析機能仕様
- [AttendanceTypes.ts](../../src/models/AttendanceTypes.ts) - 型定義
- [AttendanceService.ts](../../src/services/AttendanceService.ts) - サービス層

---

*作成日: 2026-01-13*
*更新日: 2026-01-14*
*作成者: Claude Opus 4.5*
