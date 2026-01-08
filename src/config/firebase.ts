/**
 * Firebase Configuration
 *
 * Firebase Authenticationの初期化設定
 * 環境変数から設定値を読み込み
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';

// Firebase設定（環境変数から読み込み）
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

// Firebaseアプリの初期化
let app: FirebaseApp;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  // Firebase Emulatorに接続（ローカル開発時のみ）
  if (process.env.REACT_APP_USE_EMULATOR === 'true') {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('🔧 Firebase Emulator接続: http://localhost:9099');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}

export { app, auth };
