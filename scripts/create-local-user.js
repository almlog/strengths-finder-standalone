/**
 * ローカル開発用ユーザー作成スクリプト
 *
 * Firebase Emulatorにユーザーを直接作成します。
 *
 * 使用方法:
 *   node scripts/create-local-user.js
 *   node scripts/create-local-user.js --admin  # 管理者ユーザーを作成
 */

const http = require('http');

// Firebase Emulator設定
const EMULATOR_HOST = 'localhost';
const EMULATOR_PORT = 9099;
const PROJECT_ID = process.env.REACT_APP_FIREBASE_PROJECT_ID || 'demo-project';

// デフォルトユーザー設定
const DEFAULT_USER = {
  email: 'suzuki.shunpei@example.com',
  password: 'password123',
  displayName: '管理者A',
};

/**
 * Firebase Emulator REST APIでユーザーを作成
 */
async function createUser(email, password, displayName, isAdmin = false) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    });

    const options = {
      hostname: EMULATOR_HOST,
      port: EMULATOR_PORT,
      path: `/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString();
          const result = JSON.parse(body);
          if (result.error) {
            reject(new Error(result.error.message));
          } else {
            resolve(result);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * カスタムクレーム（ロール）を設定
 * 注意: Firebase Emulatorでは標準のREST APIでカスタムクレームを設定できないため、
 * 代替手段としてEmulator内部APIを使用
 */
async function setCustomClaims(uid, claims) {
  return new Promise((resolve, reject) => {
    // Emulatorの内部API（accounts:update）でカスタムクレームを設定
    const data = JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(claims),
    });

    const options = {
      hostname: EMULATOR_HOST,
      port: EMULATOR_PORT,
      path: `/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString();
          if (!body) {
            // 空のレスポンスは成功として扱う
            resolve({ success: true });
            return;
          }
          const result = JSON.parse(body);
          if (result.error) {
            reject(new Error(result.error.message));
          } else {
            resolve(result);
          }
        } catch (e) {
          // JSONパースエラーは無視（成功の可能性がある）
          resolve({ success: true });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const isAdmin = process.argv.includes('--admin');
  const role = isAdmin ? 'admin' : 'user';

  console.log('========================================');
  console.log('Firebase Emulator ユーザー作成スクリプト');
  console.log('========================================\n');

  console.log('📧 Emulator接続先: http://' + EMULATOR_HOST + ':' + EMULATOR_PORT);
  console.log('📧 作成するユーザー:');
  console.log('   Email: ' + DEFAULT_USER.email);
  console.log('   Password: ' + DEFAULT_USER.password);
  console.log('   Role: ' + role);
  console.log('');

  try {
    // Emulatorが起動しているか確認
    const checkEmulator = () => new Promise((resolve, reject) => {
      const req = http.get(`http://${EMULATOR_HOST}:${EMULATOR_PORT}/`, (res) => {
        resolve(true);
      });
      req.on('error', () => reject(new Error('Firebase Emulatorに接続できません')));
      req.setTimeout(3000, () => reject(new Error('接続タイムアウト')));
    });

    await checkEmulator();
    console.log('✅ Firebase Emulator接続確認OK\n');

    // ユーザー作成
    console.log('👤 ユーザーを作成中...');
    const user = await createUser(
      DEFAULT_USER.email,
      DEFAULT_USER.password,
      DEFAULT_USER.displayName,
      isAdmin
    );
    console.log('✅ ユーザー作成成功! UID: ' + user.localId + '\n');

    // 管理者の場合、カスタムクレームを設定を試みる
    if (isAdmin) {
      console.log('🔐 管理者権限を設定中...');
      try {
        await setCustomClaims(user.localId, { role: 'admin' });
        console.log('✅ 管理者権限設定完了!\n');
      } catch (claimError) {
        console.log('⚠️  カスタムクレーム設定はEmulatorで未サポート');
        console.log('   → useAuth.ts の LOCAL_ADMIN_EMAILS で管理者を判定します\n');
      }
    }

    console.log('========================================');
    console.log('🎉 完了!');
    console.log('========================================');
    console.log('\n以下の情報でログインできます:');
    console.log('  Email: ' + DEFAULT_USER.email);
    console.log('  Password: ' + DEFAULT_USER.password);
    console.log('  Role: ' + role);
    console.log('\nログインURL: http://localhost:3006/strengths-finder-standalone/login');

  } catch (error) {
    if (error.message.includes('EMAIL_EXISTS')) {
      console.log('⚠️  このメールアドレスは既に登録されています');
      console.log('\n既存のユーザーでログインしてください:');
      console.log('  Email: ' + DEFAULT_USER.email);
      console.log('  Password: ' + DEFAULT_USER.password);
    } else {
      console.error('❌ エラー:', error.message);
      console.log('\n確認事項:');
      console.log('  1. Firebase Emulatorが起動していますか?');
      console.log('     → npm run emulator');
      console.log('  2. ポート9099が使用可能ですか?');
    }
    process.exit(1);
  }
}

main();
