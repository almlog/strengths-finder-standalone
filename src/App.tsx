import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StrengthsFinderPage from './components/strengths/StrengthsFinderPage';
import { StrengthsProvider } from './contexts/StrengthsContext';
import { SimulationProvider } from './contexts/SimulationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { migrateV2ToV3, needsMigration } from './utils/dataMigration';

// 認証コンポーネント
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import SetPasswordPage from './components/auth/SetPasswordPage';
import PasswordResetPage from './components/auth/PasswordResetPage';
import { PrivateRoute } from './components/auth/PrivateRoute';

function App() {
  // アプリ起動時にデータ移行を実行
  useEffect(() => {
    if (needsMigration()) {
      const result = migrateV2ToV3();
      if (result.migrated) {
        console.log(`[Data Migration] v2.0 → v3.1 移行完了`);
        console.log(`  - メンバー数: ${result.memberCount}`);
        console.log(`  - 単価情報移行数: ${result.ratesMigrated}`);
      }
      if (result.error) {
        console.error(`[Data Migration] エラー: ${result.error}`);
      }
    }
  }, []);

  return (
    <ThemeProvider>
      <BrowserRouter basename="/strengths-finder-standalone">
        <Routes>
          {/* 公開ルート（認証不要） */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />

          {/* 認証必須ルート */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                  <StrengthsProvider>
                    <SimulationProvider>
                      <StrengthsFinderPage />
                    </SimulationProvider>
                  </StrengthsProvider>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
