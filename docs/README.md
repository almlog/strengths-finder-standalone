# ドキュメント一覧

このディレクトリにはプロジェクトの各種ドキュメントが整理されています。

## ディレクトリ構成

```
docs/
├── README.md                      # このファイル（ドキュメントインデックス）
├── DEVELOPMENT_QUALITY_PLEDGE.md  # 開発品質誓約書
├── notebooklm/                    # NotebookLM・スライド生成用ドキュメント
│   ├── 00_OVERVIEW.md             # システム概要
│   ├── 01_USER_MANUAL.md          # ユーザーマニュアル
│   ├── 02_ADMINISTRATOR_GUIDE.md  # 管理者ガイド
│   ├── 03_SYSTEM_SPECIFICATION.md # システム仕様書
│   ├── 04_ANALYSIS_THEORY.md      # 分析理論
│   ├── 05_DEVELOPMENT_ROADMAP.md  # 開発ロードマップ
│   └── 06_API_REFERENCE.md        # APIリファレンス
├── auth/                          # 認証機能ドキュメント
│   ├── AUTHENTICATION_REQUIREMENTS.md  # 認証要件定義
│   ├── IMPLEMENTATION_PLAN.md          # 実装計画
│   └── TECHNICAL_SPECIFICATION.md      # 技術仕様書
├── analysis/                      # 分析ロジックドキュメント
│   ├── ANALYSIS_METHODOLOGY.md    # 分析手法の理論的背景
│   └── ANALYSIS_EXPLANATION.md    # 分析機能の説明
├── completed-specs/               # 完了済み仕様書アーカイブ
│   └── README.md                  # 完了済み仕様書一覧
├── specs/                         # 進行中・保留中の仕様書
│   └── SPEC_BULK_SELECTION.md     # 一括選択機能仕様
├── slides/                        # プレゼンテーション資料
│   └── PRESENTATION.md            # Marp対応スライド（経営・管理者・人事・利用者向け）
└── dev_logs/                      # 開発ログ
```

## 主要ドキュメント

### NotebookLM用ドキュメント (docs/notebooklm/)

NotebookLMやスライド生成ツール向けに最適化された包括的なドキュメント群です。
システム全体の理解、ユーザー教育、管理者トレーニングに使用できます。

| ファイル | 説明 |
|---------|------|
| [00_OVERVIEW.md](notebooklm/00_OVERVIEW.md) | システム概要・クイックリファレンス |
| [01_USER_MANUAL.md](notebooklm/01_USER_MANUAL.md) | 全機能の操作ガイド（登録〜分析〜勤怠） |
| [02_ADMINISTRATOR_GUIDE.md](notebooklm/02_ADMINISTRATOR_GUIDE.md) | Firebase管理、ユーザー管理、トラブルシュート |
| [03_SYSTEM_SPECIFICATION.md](notebooklm/03_SYSTEM_SPECIFICATION.md) | 技術アーキテクチャ、データモデル、サービス層 |
| [04_ANALYSIS_THEORY.md](notebooklm/04_ANALYSIS_THEORY.md) | 分析手法の理論的背景（MBTI×資質、Belbin） |
| [05_DEVELOPMENT_ROADMAP.md](notebooklm/05_DEVELOPMENT_ROADMAP.md) | バージョン履歴、今後の計画、技術的負債 |
| [06_API_REFERENCE.md](notebooklm/06_API_REFERENCE.md) | サービス/Hook/Context のAPI仕様 |

### プレゼンテーション資料 (docs/slides/)

Marp対応のスライド資料です。経営層・管理者・人事・利用者向けの統合説明資料として使用できます。

| ファイル | 説明 |
|---------|------|
| [PRESENTATION.md](slides/PRESENTATION.md) | システム説明スライド（約48スライド、Marp形式） |

**使用方法:**
- Marp CLI: `marp slides/PRESENTATION.md -o presentation.pdf`
- VS Code: Marp拡張機能でプレビュー・エクスポート

### 開発ガイド（ルートディレクトリ）
| ファイル | 説明 |
|---------|------|
| [README.md](../README.md) | プロジェクト概要、機能説明、クイックスタート |
| [CLAUDE.md](../CLAUDE.md) | Claude Code開発ガイド（TDD必須ルール） |
| [DEVELOPMENT.md](../DEVELOPMENT.md) | 開発者向け詳細ガイド |
| [CHANGELOG.md](../CHANGELOG.md) | 変更履歴 |

### 認証機能 (docs/auth/)
Firebase Authenticationを使用したユーザー認証システムの設計・実装ドキュメント。

| ファイル | 説明 |
|---------|------|
| [AUTHENTICATION_REQUIREMENTS.md](auth/AUTHENTICATION_REQUIREMENTS.md) | 認証機能の要件定義 |
| [IMPLEMENTATION_PLAN.md](auth/IMPLEMENTATION_PLAN.md) | 段階的な実装計画 |
| [TECHNICAL_SPECIFICATION.md](auth/TECHNICAL_SPECIFICATION.md) | 技術仕様、管理者権限設定方法 |

### 分析ロジック (docs/analysis/)
プロファイル分析機能の理論的背景と計算ロジックの説明。

| ファイル | 説明 |
|---------|------|
| [ANALYSIS_METHODOLOGY.md](analysis/ANALYSIS_METHODOLOGY.md) | MBTI×資質統合分析の理論 |
| [ANALYSIS_EXPLANATION.md](analysis/ANALYSIS_EXPLANATION.md) | 分析機能のユーザー向け説明 |

### 品質管理 (docs/)
| ファイル | 説明 |
|---------|------|
| [DEVELOPMENT_QUALITY_PLEDGE.md](DEVELOPMENT_QUALITY_PLEDGE.md) | TDD・Spec駆動開発の品質誓約 |

### 完了済み仕様書 (docs/completed-specs/)
実装が完了した機能の仕様書アーカイブ。詳細は [completed-specs/README.md](completed-specs/README.md) を参照。

- チームシミュレーション機能
- マネージャーモード（利益率計算）
- 16Personalities統合
- ダークモード対応

### 進行中仕様書 (docs/specs/)
| ファイル | 説明 |
|---------|------|
| [SPEC_BULK_SELECTION.md](specs/SPEC_BULK_SELECTION.md) | メンバー一括選択機能（保留中） |

## 開発時の参照順序

1. **タスク開始前**: [DEVELOPMENT_QUALITY_PLEDGE.md](DEVELOPMENT_QUALITY_PLEDGE.md) を確認
2. **機能理解**: [../README.md](../README.md) で概要を把握
3. **開発環境**: [../DEVELOPMENT.md](../DEVELOPMENT.md) でセットアップ
4. **Claude Code使用時**: [../CLAUDE.md](../CLAUDE.md) でルールを確認
5. **認証機能**: [auth/](auth/) ディレクトリを参照
6. **分析ロジック**: [analysis/](analysis/) ディレクトリを参照
7. **過去の仕様**: [completed-specs/](completed-specs/) で参考資料を確認

## 管理ポリシー

- 実装完了した仕様書は `completed-specs/` に移動
- 新機能は `specs/` に仕様書を作成してから実装
- TDDを遵守し、テストを先に書く
- コード変更後は必ず関連ドキュメントを更新
