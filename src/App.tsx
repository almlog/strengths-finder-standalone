import React from 'react';
import StrengthsFinderPage from './components/strengths/StrengthsFinderPage';
import { StrengthsProvider } from './contexts/StrengthsContext';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <StrengthsProvider>
        <StrengthsFinderPage />
      </StrengthsProvider>
    </div>
  );
}

export default App;
