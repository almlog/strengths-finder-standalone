# e-staffing 勤怠データ取得スクリプト

e-staffing の勤怠実績サマリーを自動取得し、CSV に書き出すツールです。

---

## 前提条件

| 必要なもの | バージョン | 確認コマンド |
|-----------|-----------|-------------|
| Node.js | 18 以上 | `node -v` |
| npm | 8 以上 | `npm -v` |

> **管理者権限について** → [管理者権限がない場合](#管理者権限がない場合)を参照

---

## セットアップ

### 1. 依存パッケージのインストール

プロジェクトルートで実行します（初回のみ）。

```
npm install
```

### 2. Playwright ブラウザのインストール

Chromium ブラウザをダウンロードします（初回のみ、約 150 MB）。

```
npx playwright install chromium
```

**管理者権限は不要**です。ユーザーフォルダ（`%USERPROFILE%\AppData\Local\ms-playwright`）にインストールされます。

### 3. 認証情報の設定

`scripts/estaffing.config.example.js` をコピーして設定ファイルを作成します。

```
copy scripts\estaffing.config.example.js scripts\estaffing.config.js
```

`scripts/estaffing.config.js` を開き、実際の値を入力します。

```js
module.exports = {
  company: 'altx2023',   // 会社コード
  user:    '0807008',    // ユーザーID
  pass:    'your-pass',  // パスワード
  dept:    'SI1',        // 部署フィルターキーワード
};
```

> `estaffing.config.js` は `.gitignore` 対象です。Git にコミットされることはありません。

---

## 実行

```
npm run scrape:estaffing
```

または対象月を指定する場合:

```
node scripts/scrape-estaffing.js --year 2026 --month 07
```

**出力先**: `C:\Users\<ユーザー名>\Downloads\estaffing_attendance_YYYYMM.csv`

---

## 管理者権限がない場合

### Node.js がインストールできない

**方法 A: IT部門に依頼する（推奨）**

Node.js 18 以上のインストールを IT 部門に依頼してください。インストール後は以下の手順（`npm install` と `npx playwright install chromium`）は管理者権限なしで実行できます。

**方法 B: ポータブル版を使う（IT依頼なしで試したい場合）**

1. https://nodejs.org/en/download から「Prebuilt Binaries」→「Windows」→「zip」を選択してダウンロード
2. 任意のフォルダに解凍する（例: `C:\Users\<ユーザー名>\nodejs`）
3. そのフォルダを Windows のユーザー環境変数 `PATH` に追加する
   - スタートメニュー →「環境変数を編集」→「ユーザー環境変数」→ `Path` → 編集 → 新規追加
4. ターミナルを再起動して `node -v` で確認

### `npm install` が失敗する

社内プロキシが原因の場合、IT 部門にプロキシ設定を確認してください。

```
npm config set proxy http://proxy.example.com:8080
npm config set https-proxy http://proxy.example.com:8080
```

### Playwright のブラウザが見つからないと言われる

`npx playwright install chromium` が完了しているか確認してください。
インストール先は `%USERPROFILE%\AppData\Local\ms-playwright` で、管理者権限は不要です。

---

## 注意事項

- `estaffing.config.js` にはパスワードが含まれます。他人に見せたり共有ドライブに置いたりしないでください。
- ブラウザウィンドウが自動で開きます。操作中は触らないでください。
- 実行中に「不正なブラウザ操作」が表示される場合は、別のブラウザやアプリで e-staffing を開いたまま実行しないようにしてください。
