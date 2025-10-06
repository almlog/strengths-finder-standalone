// src/components/strengths/StrengthsFinderPage.tsx
import React, { useState, useRef } from 'react';
import { Award, Plus, Users, Building, CheckSquare, Download, Upload, Search } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import MemberForm from './MemberForm';
import MembersList from './MembersList';
import DepartmentAnalysis from './DepartmentAnalysis';
import SelectedAnalysis from './SelectedAnalysis';
import IndividualStrengths from './IndividualStrengths';
import StrengthsAnalysis from './StrengthsAnalysis';
import { Tabs, Tab } from '../ui/Tabs';

type AnalysisTab = 'individual' | 'department' | 'selected' | 'strengths';

// インポート・エクスポートボタンコンポーネント
const ImportExportButtons: React.FC = () => {
  const { exportData, importData } = useStrengths();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // データのエクスポート処理
  const handleExport = () => {
    const jsonData = exportData();
    if (!jsonData) return;

    // Blobオブジェクトを作成
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // ダウンロードリンクを作成して自動クリック
    const a = document.createElement('a');
    a.href = url;
    a.download = `strengths-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();

    // クリーンアップ
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  // サンプルデータのダウンロード処理
  const handleSampleDownload = () => {
    const sampleUrl = `${process.env.PUBLIC_URL}/sample-data.json`;
    const a = document.createElement('a');
    a.href = sampleUrl;
    a.download = 'sample-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ファイル選択ダイアログを開く
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // ファイル選択後の処理
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = event.target?.result as string;
        importData(jsonData);
      } catch (err) {
        console.error('ファイルの読み込みに失敗しました:', err);
      }
    };
    reader.readAsText(file);
    
    // ファイル選択をリセット（同じファイルを再度選択できるように）
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <div className="flex space-x-2">
      {/* サンプルダウンロードボタン */}
      <button
        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded flex items-center"
        onClick={handleSampleDownload}
        title="サンプルデータをダウンロード"
      >
        <Download className="w-4 h-4 mr-1" />
        <span>サンプル</span>
      </button>

      {/* エクスポートボタン */}
      <button
        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded flex items-center"
        onClick={handleExport}
        title="データをJSONファイルとしてエクスポート"
      >
        <Download className="w-4 h-4 mr-1" />
        <span>エクスポート</span>
      </button>

      {/* インポートボタン */}
      <button
        className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded flex items-center"
        onClick={handleImportClick}
        title="JSONファイルからデータをインポート"
      >
        <Upload className="w-4 h-4 mr-1" />
        <span>インポート</span>
      </button>

      {/* 非表示のファイル入力 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />
    </div>
  );
};

const StrengthsFinderPage: React.FC = () => {
  const { error } = useStrengths();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('individual');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as AnalysisTab);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <Award className="w-6 h-6 mr-2 text-blue-600" />
          ストレングスファインダー分析
        </h2>
        <div className="flex space-x-2 items-center">
          <ThemeSwitcher />
          <ImportExportButtons />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center"
            onClick={() => setShowMemberForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            メンバーを追加
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* メンバーリスト */}
        <div className="col-span-12 md:col-span-4 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            メンバー一覧
          </h3>
          <MembersList 
            onSelect={setSelectedMemberId}
            selectedMemberId={selectedMemberId}
          />
        </div>

        {/* 分析エリア */}
        <div className="col-span-12 md:col-span-8 bg-white rounded-lg shadow p-4">
          <Tabs activeTab={activeTab} onTabChange={handleTabChange}>
            <Tab id="individual" label={
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                <span>個人分析</span>
              </div>
            }>
              <IndividualStrengths memberId={selectedMemberId} />
            </Tab>
            <Tab id="department" label={
              <div className="flex items-center">
                <Building className="w-4 h-4 mr-1" />
                <span>部署分析</span>
              </div>
            }>
              <DepartmentAnalysis />
            </Tab>
            <Tab id="selected" label={
              <div className="flex items-center">
                <CheckSquare className="w-4 h-4 mr-1" />
                <span>選択メンバー分析</span>
              </div>
            }>
              <SelectedAnalysis />
            </Tab>
            <Tab id="strengths" label={
              <div className="flex items-center">
                <Search className="w-4 h-4 mr-1" />
                <span>資質分析</span>
              </div>
            }>
              <StrengthsAnalysis />
            </Tab>
          </Tabs>
        </div>
      </div>

      {/* メンバー追加/編集モーダル */}
      {showMemberForm && (
        <MemberForm
          memberId={null}
          onClose={() => setShowMemberForm(false)}
        />
      )}
    </div>
  );
};

export default StrengthsFinderPage;
