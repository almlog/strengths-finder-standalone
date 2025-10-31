# 完了済み仕様書アーカイブ

このディレクトリには、実装が完了した仕様書（SPEC）が保管されています。

## 📋 完了済み仕様書一覧

### チームシミュレーション機能
- **TEAM_SIMULATION_GROUP_ANALYSIS_SPEC.md** (v3.2.1)
  - チーム特性ナラティブ機能
  - 資質頻度集計、カテゴリ分布分析
  - 部署分析3カラムUI（円グラフ・棒グラフ・分析コメント）
  - 完了日: 2025-11-01

- **TEAM_SIMULATION_SPEC.md** (v3.2)
  - チームシミュレーション基本機能
  - ドラッグ&ドロップによるメンバー移動
  - グループ分析とリアルタイム可視化

### マネージャー機能
- **MANAGER_FEATURE_SPEC_V3.1_UNIFIED_REVISED.md** (v3.1 - 最終版)
  - 利益率計算機能
  - ステージマスタ管理
  - 雇用形態別原価計算

- **MANAGER_FEATURE_SPEC_V3.1_UNIFIED.md** (v3.1)
- **MANAGER_FEATURE_SPEC_V3.md** (v3.0)
- **MANAGER_FEATURE_SPEC_V2.md** (v2.0)
- **MANAGER_FEATURE_SPEC.md** (v1.0)
- **MANAGER_V3.1_ISSUES_AND_IMPLEMENTATION_PLAN.md**
- **MEMBER_RATE_SEPARATION_SPEC.md**
  - メンバー単価情報の分離仕様

### 16Personalities統合
- **16PERSONALITIES_INTEGRATION_SPEC.md**
  - 16Personalities APIの統合仕様
  - 性格タイプ分析の実装

- **16PERSONALITIES_TDD_TEST_PLAN.md**
  - TDDによるテスト計画
  - テストカバレッジ戦略

### UI/UXテーマ
- **DARKMODE_GRAPH_SPEC.md**
  - ダークモード対応グラフ仕様
  - Recharts暗黒テーマ実装

- **THEME_IMPLEMENTATION_PLAN.md**
  - Light/Darkテーマ切り替え実装計画
  - Tailwind CSS設定

### その他
- **IMPLEMENTATION_STATUS_REBUTTAL.md**
  - 実装状況の確認と整理

## 📖 現行ドキュメント（ルートディレクトリ）

以下のドキュメントは引き続きルートディレクトリで管理されています：

- **README.md** - プロジェクト概要とクイックスタート
- **CLAUDE.md** - Claude Code開発ガイド
- **DEVELOPMENT.md** - 開発者向け詳細ガイド
- **CHANGELOG.md** - 変更履歴
- **ANALYSIS_METHODOLOGY.md** - 分析理論とロジック
- **DEVELOPMENT_QUALITY_PLEDGE.md** - 開発品質誓約書

## 🔍 仕様書の参照方法

完了済み仕様書を参照する場合：

```bash
# 特定の仕様書を読む
cat docs/completed-specs/TEAM_SIMULATION_GROUP_ANALYSIS_SPEC.md

# 検索
grep -r "calculateTeamNarrative" docs/completed-specs/
```

## ⚠️ 注意事項

- これらの仕様書は**アーカイブ**であり、現在のコードベースとの完全な一致は保証されません
- 最新の実装詳細は、実際のソースコード（`src/`）とREADME.mdを参照してください
- 新機能の開発時には、これらの仕様書を参考資料として活用できます
