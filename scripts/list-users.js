#!/usr/bin/env node
/**
 * ユーザー一覧表示スクリプト
 *
 * Firebase Admin SDKを使用して登録ユーザーを一覧表示
 *
 * 使用方法:
 *   npm run admin:list
 *
 * 前提条件:
 *   1. Firebase サービスアカウントキー (firebase-service-account.json) が必要
 *   2. キーファイルは scripts/ または プロジェクトルートに配置
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
  process.exit(1);
}

// Firebase Admin SDK初期化
const admin = require('firebase-admin');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function listUsers() {
  try {
    const listResult = await admin.auth().listUsers(100);

    if (listResult.users.length === 0) {
      console.log('登録ユーザーはいません');
      return;
    }

    console.log('📋 登録ユーザー一覧');
    console.log('='.repeat(80));
    console.log('');

    listResult.users.forEach((user, index) => {
      const claims = user.customClaims || {};
      const role = claims.role || 'user';
      const roleIcon = role === 'admin' ? '👑' : '👤';

      console.log(`${index + 1}. ${roleIcon} ${user.email}`);
      console.log(`   UID: ${user.uid}`);
      console.log(`   ロール: ${role}`);
      console.log(`   作成日: ${user.metadata.creationTime}`);
      console.log(`   最終ログイン: ${user.metadata.lastSignInTime || '未ログイン'}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log(`合計: ${listResult.users.length} ユーザー`);

    const adminCount = listResult.users.filter(u => (u.customClaims || {}).role === 'admin').length;
    console.log(`管理者: ${adminCount} 名`);

  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

listUsers().then(() => {
  process.exit(0);
});
