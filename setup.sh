#!/bin/bash

# 色付きメッセージ用の関数
print_success() { echo -e "\033[32m✅ $1\033[0m"; }
print_error() { echo -e "\033[31m❌ $1\033[0m"; }
print_info() { echo -e "\033[34mℹ️  $1\033[0m"; }
print_header() { echo -e "\033[36m$1\033[0m"; }

clear
echo
print_header "============================================"
print_header "     メンバープロファイル分析"
print_header "        セットアップスクリプト"
print_header "============================================"
echo

# Node.jsのバージョンチェック
echo "[1/4] Node.jsの確認..."
if ! command -v node &> /dev/null; then
    print_error "Node.jsがインストールされていません"
    echo "   Node.js 18.x以上をインストールしてください: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION が見つかりました"

# npmのバージョンチェック
echo
echo "[2/4] npmの確認..."
if ! command -v npm &> /dev/null; then
    print_error "npmが利用できません"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm $NPM_VERSION が見つかりました"

# 依存関係のインストール
echo
echo "[3/4] 依存関係をインストール中..."
if ! npm install; then
    print_error "依存関係のインストールに失敗しました"
    exit 1
fi
print_success "依存関係のインストール完了"

# セットアップ完了確認
echo
echo "[4/4] セットアップ完了確認..."
if [ ! -d "node_modules" ]; then
    print_error "セットアップが正常に完了していません"
    exit 1
fi

print_success "セットアップが正常に完了しました！"
echo

print_header "============================================"
print_header "           起動方法"
print_header "============================================"
echo
echo "開発サーバーを起動するには:"
echo "  npm start"
echo
echo "本番用ビルドを作成するには:"
echo "  npm run build"
echo
print_header "============================================"
echo

# 自動起動するかの選択
read -p "開発サーバーを今すぐ起動しますか？ (y/n): " choice
case "$choice" in
    y|Y|yes|Yes|YES)
        echo
        print_info "開発サーバーを起動中..."
        print_info "ブラウザで http://localhost:3005 が開きます"
        echo
        print_info "サーバーを停止するには Ctrl+C を押してください"
        echo
        npm start
        ;;
    *)
        echo
        print_info "後で 'npm start' コマンドで起動してください"
        ;;
esac