# Claude Code 開発ガイド

## Claudeでストレングスファインダー分析ツールを開発する際の手順

### 🚀 初回起動時のセットアップ

#### 新規クローンの場合
```bash
# 1. リポジトリをクローン
git clone https://github.com/almlog/strengths-finder-standalone.git
cd strengths-finder-standalone

# 2. セットアップスクリプトを実行（推奨）
# Windows:
setup.bat

# Mac/Linux:
./setup.sh
```

#### 既存プロジェクトの場合
```bash
# 1. プロジェクトディレクトリに移動
cd strengths-finder-standalone

# 2. 現在の状況を確認
ls -la
git status

# 3. 必要に応じて依存関係をインストール
npm install

# 4. 開発サーバーを起動
npm start
```

**開発サーバーURL**: http://localhost:3005

### 💡 セットアップスクリプトの活用

**setup.bat / setup.sh の利点:**
- ✅ Node.js/npmの自動チェック
- ✅ 依存関係の自動インストール  
- ✅ エラー時の詳細ガイダンス
- ✅ 開発サーバーの自動起動オプション

**手動セットアップが必要な場合:**
- カスタムNode.jsバージョンの使用
- 特定の npm オプション指定
- 企業プロキシ環境での実行

### 📂 プロジェクト構造の理解

このプロジェクトの主要ファイル：

```
strengths-finder-standalone/
├── src/
│   ├── App.tsx                           # メインアプリ
│   ├── components/strengths/             # ストレングス関連コンポーネント
│   │   ├── StrengthsFinderPage.tsx      # メインページ
│   │   ├── MemberForm.tsx               # メンバー追加/編集
│   │   ├── MembersList.tsx              # メンバー一覧
│   │   ├── IndividualStrengths.tsx      # 個人分析
│   │   ├── DepartmentAnalysis.tsx       # 部署分析
│   │   ├── SelectedAnalysis.tsx         # 選択メンバー分析
│   │   └── StrengthsAnalysis.tsx        # 資質分析
│   ├── contexts/StrengthsContext.tsx    # 状態管理
│   ├── services/StrengthsService.ts     # ビジネスロジック
│   └── models/StrengthsTypes.ts         # 型定義
├── README.md                            # プロジェクト概要
├── DEVELOPMENT.md                       # 開発者ガイド
└── CLAUDE.md                           # このファイル
```

### 🔧 よく使用するコマンド

```bash
# 開発サーバー起動
npm start

# 本番ビルド
npm run build

# ビルドのプレビュー
npm run preview

# テスト実行
npm test
```

### 🎯 開発の進め方

#### 1. 新機能を追加する場合

1. **Issue/要件の確認**
   ```bash
   # まず現在の動作を確認
   npm start
   ```

2. **コンポーネントの作成**
   ```bash
   # 新しいコンポーネントファイルを作成
   touch src/components/strengths/NewFeature.tsx
   ```

3. **型定義の追加**
   - `src/models/StrengthsTypes.ts` に新しい型を追加

4. **サービスロジックの実装**
   - `src/services/StrengthsService.ts` にビジネスロジックを追加

5. **状態管理の更新**
   - `src/contexts/StrengthsContext.tsx` に状態を追加

#### 2. バグ修正の場合

1. **問題の再現**
   ```bash
   npm start
   # ブラウザで問題を確認
   ```

2. **ログの確認**
   - ブラウザのDevToolsのConsoleタブを確認
   - Networkタブでリクエストエラーを確認

3. **該当ファイルの特定**
   ```bash
   # エラーメッセージから該当ファイルを探す
   grep -r "エラーメッセージ" src/
   ```

#### 3. スタイル調整の場合

- Tailwind CSSクラスを使用
- カスタムスタイルは最小限に
- レスポンシブデザインを考慮

### 🐛 トラブルシューティング

#### よくある問題と解決方法

1. **開発サーバーが起動しない**
   ```bash
   # ポートを確認
   netstat -an | findstr :3005
   
   # ポートを変更
   echo "PORT=3006" > .env
   npm start
   ```

2. **Tailwind CSSが効かない**
   ```bash
   # 設定ファイルを確認
   cat postcss.config.js
   cat tailwind.config.js
   
   # 再インストール
   npm install tailwindcss@3.4.1
   ```

3. **TypeScriptエラー**
   ```bash
   # 設定を確認
   cat tsconfig.json
   
   # 型チェック
   npx tsc --noEmit
   ```

4. **ビルドエラー**
   ```bash
   # 詳細なエラー情報を表示
   npm run build -- --verbose
   ```

### 📝 コーディング規約

#### ファイル命名規則
- コンポーネント: `PascalCase.tsx`
- ユーティリティ: `camelCase.ts`
- 型定義: `PascalCaseTypes.ts`

#### コンポーネント設計
```typescript
// 良い例
interface Props {
  member: Member;
  onUpdate: (member: Member) => void;
}

const MemberCard: React.FC<Props> = ({ member, onUpdate }) => {
  // 実装
};

export default MemberCard;
```

#### 状態管理
- LocalStorageへの保存は `StrengthsContext` で管理
- 一時的な状態は各コンポーネントの `useState` を使用

### 🔍 デバッグのヒント

#### 1. React Developer Tools
```javascript
// コンソールで状態を確認
$r.props
$r.state
```

#### 2. ローカルストレージの確認
```javascript
// ブラウザのConsoleで実行
console.log(localStorage.getItem('strengths-members'));
```

#### 3. サービスロジックのテスト
```javascript
// 34の資質一覧を確認
import StrengthsService from './services/StrengthsService';
console.log(StrengthsService.getAllStrengths());
```

### 🚀 デプロイ手順

```bash
# 本番ビルド
npm run build

# ビルド結果の確認
ls -la build/

# 静的ファイルとしてデプロイ
# buildフォルダの内容をWebサーバーにアップロード
```

### 📋 開発時のチェックリスト

- [ ] 開発サーバーが正常に起動する
- [ ] TypeScriptエラーがない
- [ ] Tailwind CSSが適用されている
- [ ] レスポンシブデザインが機能している
- [ ] ローカルストレージでデータが保存される
- [ ] インポート/エクスポート機能が動作する
- [ ] 各分析画面でグラフが表示される

### 🔗 関連リンク

- [README.md](./README.md) - プロジェクト概要
- [DEVELOPMENT.md](./DEVELOPMENT.md) - 詳細な開発ガイド
- [React公式ドキュメント](https://react.dev/)
- [Tailwind CSS公式ドキュメント](https://tailwindcss.com/)
- [Recharts公式ドキュメント](https://recharts.org/)

### 💡 開発Tips

1. **効率的な開発環境**
   ```bash
   # 自動保存でホットリロード
   # VS Codeの設定: "files.autoSave": "afterDelay"
   ```

2. **エラー解決のアプローチ**
   - エラーメッセージを正確に読む
   - 関連ファイルの imports/exports を確認
   - ブラウザのDevToolsを活用

3. **新機能開発時の順序**
   1. 型定義 → 2. サービス → 3. コンポーネント → 4. 統合

この手順に従うことで、Claudeを使った効率的な開発が可能になります。