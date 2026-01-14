# 勤怠分析ビジュアル強化 仕様書 (v3.5)

## 概要

勤怠分析のサマリータブにグラフィカルな可視化を追加し、ストレングスファインダー分析と統一されたUXを提供する。

## 目的

1. **データの可視化**: 数字だけでなく視覚的にデータを理解できるようにする
2. **UX統一**: StrengthsFinder分析のグラフパターンを踏襲
3. **意思決定支援**: 経営者・管理者が一目で状況を把握できる

## 機能要件

### FR-001: 部門別残業時間チャート

**表示位置**: サマリータブの全体統計/違反サマリーの下
**チャートタイプ**: 横棒グラフ (BarChart - vertical layout)
**データソース**: `departmentSummaries[].averageOvertimeMinutes`

| 項目 | 仕様 |
|------|------|
| 棒の色 | 36協定アラートレベルに応じた色分け |
| ラベル | 部門名（Y軸） |
| 値 | 平均残業時間（X軸、時間:分形式） |
| ソート | 残業時間降順 |
| 表示数 | 全部門（上限なし） |

### FR-002: 違反種別分布チャート

**表示位置**: 部門別残業時間チャートの隣
**チャートタイプ**: 円グラフ (PieChart)
**データソース**: `allViolations[]` を種別でグループ化

| 項目 | 仕様 |
|------|------|
| セグメント色 | VIOLATION_CHART_COLORS定数 |
| ラベル | 違反種別名 + パーセンテージ |
| ツールチップ | 違反種別名 + 件数 |
| 表示条件 | 違反がある場合のみ表示 |

### FR-003: 36協定アラート分布チャート

**表示位置**: 部門別/違反チャートの下
**チャートタイプ**: 横棒グラフ (BarChart - vertical layout)
**データソース**: `employeeSummaries[]` をアラートレベルでグループ化

| 項目 | 仕様 |
|------|------|
| 棒の色 | ALERT_CHART_COLORS定数（7段階） |
| ラベル | アラートレベル名（Y軸） |
| 値 | 該当人数（X軸） |
| ソート | 正常 → 注意 → 警告 → ... → 法令違反 |

## 非機能要件

### NFR-001: ダークモード対応

- チャートコンテナ: `dark:bg-gray-800`
- ツールチップ: `dark:bg-gray-700 dark:text-gray-100`
- 軸ラベル: ダークモードで視認性確保

### NFR-002: レスポンシブ対応

- デスクトップ: 2カラムグリッド
- モバイル: 1カラム縦積み
- チャート最小高さ: 250px

### NFR-003: パフォーマンス

- Recharts ResponsiveContainer使用
- 不要な再レンダリング防止（useMemo活用）

## テスト計画

### 単体テスト

| テストID | テスト内容 | 期待結果 |
|----------|-----------|----------|
| TC-VIS-001 | 部門別残業チャートがレンダリングされる | BarChartコンポーネントが存在 |
| TC-VIS-002 | 違反円グラフがレンダリングされる | PieChartコンポーネントが存在 |
| TC-VIS-003 | アラート分布チャートがレンダリングされる | BarChartコンポーネントが存在 |
| TC-VIS-004 | 違反がない場合は円グラフ非表示 | PieChartコンポーネントが存在しない |
| TC-VIS-005 | データ変換が正しく行われる | chartDataが期待値と一致 |

### 統合テスト

| テストID | テスト内容 | 期待結果 |
|----------|-----------|----------|
| TC-VIS-010 | ファイルアップロード後にチャートが表示 | 3種類のチャートが表示される |
| TC-VIS-011 | ダークモードでチャートが正しく表示 | コントラスト/視認性が確保される |

## 実装詳細

### カラー定数

```typescript
const ALERT_CHART_COLORS: Record<OvertimeAlertLevel, string> = {
  normal: '#10B981',     // Green
  warning: '#F59E0B',    // Yellow
  exceeded: '#F97316',   // Orange
  caution: '#EA580C',    // Dark Orange
  serious: '#EF4444',    // Red
  severe: '#DC2626',     // Dark Red
  critical: '#B91C1C',   // Darker Red
  illegal: '#991B1B',    // Darkest Red
};

const VIOLATION_CHART_COLORS: Record<ViolationType, string> = {
  missing_clock: '#EF4444',
  break_violation: '#8B5CF6',
  late_application_missing: '#F59E0B',
  early_leave_application_missing: '#F97316',
  early_start_application_missing: '#3B82F6',
  time_leave_punch_missing: '#06B6D4',
  night_break_application_missing: '#6366F1',
  remarks_missing: '#64748B',
  remarks_format_warning: '#94A3B8',
};
```

### データ変換関数

```typescript
// 部門別残業データ
const departmentOvertimeData = useMemo(() => {
  return departmentSummaries
    .map(dept => ({
      name: dept.department,
      value: dept.averageOvertimeMinutes,
      fill: getOvertimeColor(dept.averageOvertimeMinutes),
    }))
    .sort((a, b) => b.value - a.value);
}, [departmentSummaries]);

// 違反種別データ
const violationDistributionData = useMemo(() => {
  const counts: Record<string, number> = {};
  allViolations.forEach(v => {
    counts[v.type] = (counts[v.type] || 0) + 1;
  });
  return Object.entries(counts).map(([type, count]) => ({
    name: VIOLATION_DISPLAY_INFO[type].displayName,
    value: count,
    fill: VIOLATION_CHART_COLORS[type],
  }));
}, [allViolations]);

// アラートレベル分布データ
const alertDistributionData = useMemo(() => {
  const counts: Record<OvertimeAlertLevel, number> = { ... };
  employeeSummaries.forEach(emp => {
    const level = AttendanceService.calculateOvertimeAlert(emp.totalOvertimeMinutes).level;
    counts[level]++;
  });
  return Object.entries(counts)
    .filter(([_, count]) => count > 0)
    .map(([level, count]) => ({
      name: OVERTIME_ALERT_INFO[level].label,
      value: count,
      fill: ALERT_CHART_COLORS[level],
    }));
}, [employeeSummaries]);
```

## UIレイアウト

```
┌─────────────────────────────────────────────────────┐
│ [サマリー] [従業員別] [部門別] [違反一覧]            │
├─────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐           │
│ │ 全体統計（既存） │ │ 違反サマリー     │           │
│ └──────────────────┘ └──────────────────┘           │
├─────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐           │
│ │ 部門別残業時間   │ │ 違反種別の分布   │ ← NEW     │
│ │ [横棒グラフ]     │ │ [円グラフ]       │           │
│ └──────────────────┘ └──────────────────┘           │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐         │
│ │ 36協定アラート分布 [横棒グラフ]         │ ← NEW   │
│ └─────────────────────────────────────────┘         │
├─────────────────────────────────────────────────────┤
│ 36協定 残業アラート（既存テーブル）                 │
└─────────────────────────────────────────────────────┘
```

## 成果物リスト

- [x] カラー定数の定義
- [x] データ変換関数（useMemo）
- [x] 部門別残業チャートコンポーネント
- [x] 違反種別円グラフコンポーネント
- [x] 36協定セクション統合（※チャートではなく状態表示+テーブル統合に変更）
- [x] ダークモード対応
- [x] レスポンシブ対応
- [ ] 単体テスト (TC-VIS-001〜005)
- [ ] 統合テスト (TC-VIS-010〜011)

## 完了条件

- [ ] 全テストがPASS
- [x] ダークモードで正しく表示される
- [x] モバイルでレイアウトが崩れない
- [x] 既存機能に影響がない
- [x] ビルドが成功する
- [x] 開発環境で動作確認済み
- [x] 本番環境で動作確認済み

## 設計変更履歴

### v3.5.0 最終実装（2026-01-14）

**36協定セクションの設計変更**:
- 当初案: 36協定アラート分布を横棒グラフで表示
- 最終実装: 「全員正常」または「要注意者テーブル」の2状態表示に変更

**理由**:
- 36協定違反は本来発生してはならない（99%が正常）
- グラフで分布を見せる意味がない
- 既存の「36協定アラートテーブル」と情報が重複していた
- 統合することで冗長性を排除

**レイアウト変更**:
- 当初案: 3カラム（部門別残業 + 違反種別 + 36協定状況）
- 最終実装: 2カラム（部門別残業 + 違反種別）+ 36協定統合セクション

---

*作成日: 2026-01-14*
*更新日: 2026-01-14*
*作成者: Claude Opus 4.5*
*デプロイ: commit ae33926*
