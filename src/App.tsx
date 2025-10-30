import React, { useEffect } from 'react';
import StrengthsFinderPage from './components/strengths/StrengthsFinderPage';
import { StrengthsProvider } from './contexts/StrengthsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { migrateV2ToV3, needsMigration } from './utils/dataMigration';

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
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <StrengthsProvider>
          <StrengthsFinderPage />
        </StrengthsProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
