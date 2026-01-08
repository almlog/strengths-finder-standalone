#!/usr/bin/env node
/**
 * 管理者権限付与スクリプト
 *
 * Firebase Admin SDKを使用してユーザーにadminロールを付与
 *
 * 使用方法:
 *   npm run admin:set <email>
 *   npm run admin:set suzuki.shunpei@altx.co.jp
 *
 * 前提条件:
 *   1. Firebase サービスアカウントキー (firebase-service-account.json) が必要
 *   2. キーファイルは scripts/ または プロジェクトルートに配置
 *
 * サービスアカウントキーの取得:
 *   1. Firebase Console → プロジェクト設定 → サービスアカウント
 *   2. 「新しい秘密鍵の生成」をクリック
 *   3. ダウンロードしたJSONを firebase-service-account.json にリネーム
 *   4. scripts/ ディレクトリに配置
 */

const fs = require('fs');
const path = require('path');

// サービスアカウントキーのパスを探す
const possiblePaths = [
  path.join(__dirname, 'firebase-service-account.json'),
  path.join(__dirname, '..', 'firebase-service-account.json'),
  path.join(__dirname, 'service-account.json'),
  path.join(__dirname, '..', 'service-account.json'),
];

let serviceAccountPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    serviceAccountPath = p;
    break;
  }
}

if (!serviceAccountPath) {
  console.error('❌ エラー: サービスアカウントキーが見つかりません');
  console.error('');
  console.error('以下の手順でキーを取得してください:');
  console.error('1. Firebase Console → プロジェクト設定 → サービスアカウント');
  console.error('   https://console.firebase.google.com/project/strengths-finder-auth/settings/serviceaccounts/adminsdk');
  console.error('2. 「新しい秘密鍵の生成」をクリック');
  console.error('3. ダウンロードしたJSONを firebase-service-account.json にリネーム');
  console.error('4. scripts/ ディレクトリに配置');
  console.error('');
  console.error('期待されるパス:');
  possiblePaths.forEach(p => console.error(`  - ${p}`));
  process.exit(1);
}

// Firebase Admin SDK初期化
const admin = require('firebase-admin');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function setAdminRole(email) {
  try {
    // ユーザーを取得
    const user = await admin.auth().getUserByEmail(email);
    console.log(`✅ ユーザー発見: ${user.email} (UID: ${user.uid})`);

    // 現在のカスタムクレームを確認
    const currentClaims = user.customClaims || {};
    console.log(`   現在のロール: ${currentClaims.role || '未設定'}`);

    if (currentClaims.role === 'admin') {
      console.log('ℹ️  既に管理者です');
      return;
    }

    // 管理者ロールを設定
    await admin.auth().setCustomUserClaims(user.uid, { ...currentClaims, role: 'admin' });
    console.log(`✅ 管理者権限を付与しました: ${email}`);
    console.log('');
    console.log('⚠️  注意: ユーザーは一度ログアウトして再ログインする必要があります');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ エラー: ユーザーが見つかりません: ${email}`);
    } else {
      console.error('❌ エラー:', error.message);
    }
    process.exit(1);
  }
}

// メイン処理
const email = process.argv[2];

if (!email) {
  console.log('管理者権限付与スクリプト');
  console.log('');
  console.log('使用方法:');
  console.log('  npm run admin:set <email>');
  console.log('');
  console.log('例:');
  console.log('  npm run admin:set suzuki.shunpei@altx.co.jp');
  process.exit(0);
}

setAdminRole(email).then(() => {
  process.exit(0);
});
