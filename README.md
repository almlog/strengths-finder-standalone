# ストレングスファインダー分析ツール

## 概要
このツールは、チームメンバーのストレングスファインダー結果を管理・分析するためのWebアプリケーションです。完全にクライアントサイドで動作し、個人情報はブラウザのローカルストレージにのみ保存されます。

## 🌐 公開URL
**https://almlog.github.io/strengths-finder-standalone**

GitHub Pagesでホスティングされており、インストール不要で即座に利用できます。

## 特徴
- 🔒 **プライバシー重視**: すべてのデータはローカルに保存され、外部サーバーには送信されません
- 📊 **多角的な分析**: 個人分析、部署分析、選択メンバー分析、資質分析
- 💾 **データのインポート/エクスポート**: JSON形式でバックアップと共有が可能
- 🎯 **34の資質対応**: ストレングスファインダーの全資質に対応
- 📱 **レスポンシブデザイン**: デスクトップ・タブレット・モバイルに対応
- 👥 **カスタム役職機能**: 標準役職に加え、自由に役職を追加可能

## クイックスタート

### オンライン利用（推奨）
ブラウザで以下のURLにアクセスするだけで利用できます：
**https://almlog.github.io/strengths-finder-standalone**

### ローカル開発環境のセットアップ

#### 依存関係のインストール
```bash
git clone https://github.com/almlog/strengths-finder-standalone.git
cd strengths-finder-standalone
npm install
```

#### 開発サーバーの起動
```bash
npm start
```
開発サーバー: http://localhost:3000

#### 本番用ビルド
```bash
npm run build
```

## 主な機能

### メンバー管理
- メンバーの追加・編集・削除
- 社員番号、氏名、部署コード、役職の管理
- 5つの強み（資質）の順位付け
- カスタム役職の追加（JSONで色とアイコンをカスタマイズ可能）

### 分析機能
- **個人分析**: 選択したメンバーの強みを視覚的に分析
- **部署分析**: 部署コードごとの強みの傾向を分析
- **選択メンバー分析**: 複数メンバーを選択して集計分析
- **資質分析**: 特定の資質を持つメンバーの検索と分析

### データ管理
- **エクスポート**: 現在のデータをJSONファイルとして保存
- **インポート**: JSONファイルからデータを復元
- **ローカルストレージ**: ブラウザにデータを自動保存

## デプロイ

このアプリケーションは GitHub Actions による自動デプロイが設定されています。

### 自動デプロイ（GitHub Pages）
`main` ブランチへのpush時に自動的に以下が実行されます：
1. Node.js環境のセットアップ
2. 依存関係のインストール (`npm ci`)
3. プロダクションビルド (`npm run build`)
4. GitHub Pagesへのデプロイ

公開URL: **https://almlog.github.io/strengths-finder-standalone**

### 手動デプロイ
他の静的Webホスティングサービスにデプロイする場合：

```bash
# ビルドを作成
npm run build

# buildフォルダの内容を以下のいずれかにアップロード：
# - 社内Webサーバー
# - Azure Static Web Apps
# - AWS S3 + CloudFront
# - Netlify/Vercel
```

## データフォーマット

### メンバーデータ
```json
{
  "customPositions": [
    {
      "id": "CUSTOM_1234567890",
      "name": "副事業部長",
      "displayName": "副事業部長",
      "color": "#9E9E9E",
      "icon": "crown"
    }
  ],
  "members": [
    {
      "id": "12345678",
      "name": "山田太郎",
      "department": "13D12345",
      "position": "MANAGER",
      "strengths": [
        { "id": 1, "score": 1 },
        { "id": 16, "score": 2 },
        { "id": 31, "score": 3 },
        { "id": 4, "score": 4 },
        { "id": 22, "score": 5 }
      ]
    }
  ]
}
```

### カスタム役職のカスタマイズ
エクスポートしたJSONファイル内でカスタム役職の色とアイコンを変更できます：
- **color**: HEX形式のカラーコード（例: `#FF5722`）
- **icon**: `"crown"` | `"circle"` | `"star"`

## 技術スタック
- React 19 + TypeScript
- Tailwind CSS 3.4.1
- Recharts (グラフ表示)
- LocalStorage API
- GitHub Actions (CI/CD)
- GitHub Pages (ホスティング)

## 開発者
**SUZUKI Shunpei**
suzuki.shunpei@altx.co.jp

## ライセンス
社内利用限定