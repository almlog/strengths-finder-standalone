/**
 * e-staffing スクレイパー設定ファイル（テンプレート）
 *
 * 使い方:
 *   このファイルをコピーして scripts/estaffing.config.js を作成し、
 *   実際の認証情報を入力してください。
 *   （estaffing.config.js は .gitignore で除外されているため安全）
 *
 * cp scripts/estaffing.config.example.js scripts/estaffing.config.js
 */

module.exports = {
  company: 'your-company-code', // 会社コード（例: altx2023）
  user:    'your-user-id',      // ユーザーID（例: 0807008）
  pass:    'your-password',     // パスワード
  dept:    'SI1',               // 部署フィルターキーワード
};
