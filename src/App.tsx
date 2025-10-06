import React from 'react';
import StrengthsFinderPage from './components/strengths/StrengthsFinderPage';
import { StrengthsProvider } from './contexts/StrengthsContext';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
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
