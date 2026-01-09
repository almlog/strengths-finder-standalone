# 勤怠分析機能 仕様書

## 1. 概要

### 1.1 目的
楽楽勤怠システムからエクスポートしたXLSXファイルをアップロードし、勤怠入力漏れ・違反・異常を自動検出・レポートする機能を提供する。

### 1.2 背景
- 従来VBAで実装していた勤怠分析機能を、新しいWEB勤怠システム（楽楽勤怠）のエクスポート形式に対応させる
- ユーザー利便性を考慮し、既存のStrengthsFinderアプリケーションに統合する

### 1.3 対象ユーザー
- リーダー以上（部下の勤怠を管理する必要がある人）
- 人事・総務担当者

## 2. 新エクスポートファイル形式

### 2.1 ファイル構造
- **形式**: XLSX（Excel形式）
- **ファイル名パターン**: `出勤簿_日別詳細_YYYYMMDDHHMMSS.xlsx`
- **シート構成**: プロジェクト/勤務形態別にシートが分かれる
  - 例: `KDDI_日勤_800-1630～930-1800_1200…`
  - 例: `mediba_日勤_900-1730_1200-1300_7…`

### 2.2 カラム構成（主要な61列）

| Index | カラム名 | 説明 | 分析に使用 |
|-------|----------|------|------------|
| 0 | 社員番号 | 一意の従業員ID | ✓ |
| 1 | 氏名 | 従業員名 | ✓ |
| 2 | 部門 | 部門コード | ✓ |
| 3 | 役職 | 一般、管理職など | |
| 4 | 日付 | 勤務日 (YYYY-MM-DD形式) | ✓ |
| 5 | 曜日 | 月〜日 | ✓ |
| 6 | カレンダー | 平日/法定外/法定休 | ✓ |
| 7 | 申請内容 | 有休、振休、残業申請など | ✓ |
| 8 | 出社 | 出勤打刻時刻 | ✓ |
| 9 | (元)出社 | 元の出勤打刻時刻 | ✓ |
| 10 | 退社 | 退勤打刻時刻 | ✓ |
| 11 | (元)退社 | 元の退勤打刻時刻 | ✓ |
| 12 | 早出フラグ | 客先常駐者の早出残業 | ✓ |
| 15 | AltX残業(始) | AltX残業開始時刻 | ✓ |
| 16 | AltX残業(終) | AltX残業終了時刻 | ✓ |
| 21 | 私用外出 | 私用外出時刻 | ✓ |
| 22 | 私用戻り | 私用戻り時刻 | ✓ |
| 36 | 休憩時間 | 休憩時間（分） | ✓ |
| 37 | 深夜休憩修正 | 深夜休憩の修正値 | ✓ |
| 38 | 深夜勤務 | 深夜勤務時間 | ✓ |
| 39 | 実働時間 | 実際の労働時間 | ✓ |
| 43 | 平日法定外残業 | 36協定用残業時間 | ✓ |
| 49 | 遅刻 | 遅刻時間 | ✓ |
| 50 | 早退 | 早退時間 | ✓ |
| 60 | 備考 | コメント | ✓ |

### 2.3 8時間勤務カレンダーの判定
以下のシート名パターンは8時間勤務者として判定：
- `8:00`～`17:00` を含むシート名
- `8時間`を含むシート名
- `900-1800`を含むシート名
- カレンダー列に`8時間`を含む

## 3. 機能要件

### 3.1 ファイルアップロード機能

#### 3.1.1 対応形式
- `.xlsx` ファイルのみ対応
- ファイルサイズ上限: 10MB

#### 3.1.2 バリデーション
- ファイル形式チェック
- 必須カラムの存在チェック
- データ形式チェック（日付、時刻）

#### 3.1.3 UI要件
- ドラッグ＆ドロップ対応
- ファイル選択ダイアログ対応
- アップロード進捗表示
- エラー時の明確なメッセージ表示

### 3.2 違反検出機能

#### 3.2.1 検出する違反タイプ（ViolationType）

| 違反タイプ | 説明 | 検出条件 |
|-----------|------|----------|
| `missing_clock` | 打刻漏れ | 出勤/退勤打刻がない（休暇以外） |
| `break_violation` | 休憩時間不足 | 法定休憩時間を満たしていない |
| `late_application_missing` | 遅刻申請漏れ | 遅刻しているが申請がない |
| `early_leave_application_missing` | 早退申請漏れ | 早退しているが申請がない |
| `early_start_application_missing` | 早出申請漏れ | 早出しているが申請がない |
| `time_leave_punch_missing` | 時間有休打刻漏れ | 時間有休申請があるが私用外出/戻りがない |
| `night_break_application_missing` | 深夜休憩申請漏れ | 深夜勤務があるが深夜休憩修正がない |
| `remarks_missing` | 備考欄未記入 | 特定申請で備考欄が空 |
| `remarks_format_warning` | 備考欄フォーマット警告 | 備考が5文字未満 |

#### 3.2.2 備考欄が必要な申請内容
以下のキーワードを含む申請は備考欄が必須：
- 直行、直帰 → 訪問先・業務目的
- 遅延（電車遅延含む） → 路線名・遅延時間
- 打刻修正、修正申請 → 理由
- AltX残業がある場合 → タスク内容

### 3.3 36協定残業時間チェック（7段階）

#### 3.3.1 アラートレベル定義

| レベル | 閾値 | ラベル | 対応 |
|--------|------|--------|------|
| `normal` | 35h以下 | - | - |
| `warning` | 35h超 | 注意 | 上長報告 |
| `exceeded` | 45h超 | 超過 | 36協定基本上限・特別条項確認 |
| `caution` | 55h超 | 警戒 | 残業抑制指示 |
| `serious` | 65h超 | 深刻 | 残業禁止措置の検討 |
| `severe` | 70h超 | 重大 | 親会社への報告 |
| `critical` | 80h超 | 危険 | 医師面接指導 |
| `illegal` | 100h超 | 違法 | 即時是正必須 |

#### 3.3.2 年間上限
- 年間360時間を超過した場合も警告

### 3.4 予兆アラート機能

#### 3.4.1 概要
月の途中時点で、月末までの残業時間を予測し、上限超過が見込まれる従業員を早期に検出する。

#### 3.4.2 計算方法
```
月末予測 = (現在の残業時間 ÷ データ最終日) × 30
```

#### 3.4.3 表示内容
- 対象者リスト（氏名、部門）
- 現在の残業時間
- 月末予測時間
- 超過見込み時間

### 3.5 8時間勤務者への特別処理

#### 3.5.1 遅刻除外ルール
8時間勤務カレンダーの場合、以下の条件で遅刻を許容：
- 遅刻が30分以下の場合
- 実働時間が7時間30分以上の場合
- 定時後退勤の場合

### 3.6 分析レポート表示

#### 3.6.1 タブ構成
1. **サマリー** - 全体統計、36協定アラート、予兆アラート
2. **従業員別** - 従業員ごとの勤怠詳細
3. **部門別** - 部門ごとの集計
4. **違反一覧** - 全違反の詳細リスト

#### 3.6.2 サマリータブ
- 対象従業員数、総出勤日数
- 総残業時間、平均残業（月/人、日/人）
- 休日出勤、遅刻、早退、打刻なし日数
- 違反サマリー（種類別件数）
- 36協定アラート対象者リスト
- 予兆アラート対象者リスト

#### 3.6.3 従業員タブ
- 社員番号、氏名、部門
- 出勤日数、残業時間（36協定アラート付き）
- 休日出勤、遅刻、早退
- 違反件数
- StrengthsFinder連携（登録済みの場合はTop5表示）

#### 3.6.4 情報パネル
アップロード画面に以下の参考情報を表示：
- 検出される違反の種類
- 備考欄の入力ルール
- 36協定の残業上限（7段階）
- 申請が必要な項目

### 3.7 エクスポート機能

#### 3.7.1 出力形式
- CSV形式でダウンロード
- Excelで開けるUTF-8 BOM付きCSV

#### 3.7.2 出力内容
従業員別サマリー、違反詳細を出力

## 4. 技術設計

### 4.1 ファイル構成

```
src/
├── components/
│   └── attendance/
│       └── AttendanceAnalysisPage.tsx    # メインページ（統合コンポーネント）
├── services/
│   └── AttendanceService.ts              # 分析ロジック
└── models/
    └── AttendanceTypes.ts                # 型定義
```

### 4.2 主要な型定義

```typescript
// 違反タイプ
export type ViolationType =
  | 'missing_clock'
  | 'break_violation'
  | 'late_application_missing'
  | 'early_leave_application_missing'
  | 'early_start_application_missing'
  | 'time_leave_punch_missing'
  | 'night_break_application_missing'
  | 'remarks_missing'
  | 'remarks_format_warning';

// 36協定アラートレベル
export type OvertimeAlertLevel =
  | 'normal'
  | 'warning'
  | 'exceeded'
  | 'caution'
  | 'serious'
  | 'severe'
  | 'critical'
  | 'illegal';
```

### 4.3 主要なサービスメソッド

```typescript
class AttendanceService {
  // ファイル解析
  static async parseXlsx(file: File): Promise<AttendanceRecord[]>

  // 日次分析
  static analyzeDailyRecord(record: AttendanceRecord): DailyAttendanceAnalysis

  // 拡張分析（月次）
  static analyzeExtended(records: AttendanceRecord[]): ExtendedAnalysisResult

  // 36協定チェック
  static getOvertimeAlertLevel(overtimeMinutes: number): OvertimeAlertLevel

  // 予兆判定
  static isOvertimeOnPaceToExceed(
    currentOvertimeMinutes: number,
    dayOfMonth: number,
    limitMinutes: number
  ): boolean

  // 備考欄チェック
  static checkRemarksRequired(record: AttendanceRecord): {
    isRequired: boolean;
    isMissing: boolean;
    requiredReason?: string;
  }

  static checkRemarksFormat(remarks: string): {
    isValid: boolean;
    warning?: string;
  }

  // 8時間勤務者判定
  static is8HourCalendar(calendarRaw: string): boolean
  static is8HourScheduleFromSheetName(sheetName: string): boolean
  static shouldExcludeLateFor8HourSchedule(
    record: AttendanceRecord,
    lateMinutes: number
  ): boolean
}
```

## 5. テスト

### 5.1 テストファイル構成
```
src/__tests__/services/
├── AttendanceService.36Agreement.test.ts    # 36協定チェック
├── AttendanceService.8HourSchedule.test.ts  # 8時間勤務者処理
├── AttendanceService.ApplicationMissing.test.ts  # 申請漏れ検出
└── AttendanceService.Remarks.test.ts        # 備考欄チェック
```

### 5.2 カバレッジ対象
- 全違反タイプの検出
- 36協定7段階判定
- 予兆判定ロジック
- 8時間勤務者の遅刻除外
- 備考欄必須チェック
- 備考欄フォーマットチェック

## 6. 非機能要件

### 6.1 パフォーマンス
- 1000行のXLSXファイルを5秒以内に分析完了
- UIはブロッキングせずローディング表示

### 6.2 セキュリティ
- ファイルはサーバーに保存しない（クライアントサイドのみで処理）
- LocalStorageに個人情報は保存しない
- 分析結果のみ一時保存可能（ユーザー選択）

### 6.3 ブラウザ対応
- Chrome (最新版)
- Edge (最新版)
- Firefox (最新版)

## 7. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2026-01-08 | 1.0 | 初版作成 |
| 2026-01-09 | 2.0 | 36協定7段階チェック、予兆アラート、備考欄チェック、8時間勤務者対応を追加 |
