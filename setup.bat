@echo off
chcp 65001 > nul
echo.
echo ============================================
echo   ストレングスファインダー分析ツール
echo        セットアップスクリプト
echo ============================================
echo.

REM Node.jsのバージョンチェック
echo [1/4] Node.jsの確認...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.jsがインストールされていません
    echo    Node.js 18.x以上をインストールしてください: https://nodejs.org/
    pause
    exit /b 1
)

for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% が見つかりました

REM npmのバージョンチェック
echo.
echo [2/4] npmの確認...
npm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npmが利用できません
    pause
    exit /b 1
)

for /f "delims=" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% が見つかりました

REM 依存関係のインストール
echo.
echo [3/4] 依存関係をインストール中...
npm install
if %errorlevel% neq 0 (
    echo ❌ 依存関係のインストールに失敗しました
    pause
    exit /b 1
)
echo ✅ 依存関係のインストール完了

REM セットアップ完了
echo.
echo [4/4] セットアップ完了確認...
if not exist "node_modules" (
    echo ❌ セットアップが正常に完了していません
    pause
    exit /b 1
)

echo ✅ セットアップが正常に完了しました！
echo.
echo ============================================
echo           起動方法
echo ============================================
echo.
echo 開発サーバーを起動するには:
echo   npm start
echo.
echo 本番用ビルドを作成するには:
echo   npm run build
echo.
echo ============================================
echo.

REM 自動起動するかの選択
set /p choice="開発サーバーを今すぐ起動しますか？ (y/n): "
if /i "%choice%"=="y" (
    echo.
    echo 開発サーバーを起動中...
    echo ブラウザで http://localhost:3005 が開きます
    echo.
    echo サーバーを停止するには Ctrl+C を押してください
    echo.
    npm start
) else (
    echo.
    echo 後で 'npm start' コマンドで起動してください
    pause
)