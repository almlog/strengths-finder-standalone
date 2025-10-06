/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // クラスベースのダークモード切り替え
  theme: {
    extend: {
      colors: {
        // カスタムテーマカラー（CSS変数を使用）
        'theme-bg': 'var(--theme-background)',
        'theme-text': 'var(--theme-text)',
        'theme-primary': 'var(--theme-primary)',
        'theme-secondary': 'var(--theme-secondary)',
        'theme-border': 'var(--theme-border)',
      },
    },
  },
  plugins: [],
}