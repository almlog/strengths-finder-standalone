// src/components/strengths/StrengthsFinderPage.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Award, Plus, Users, Building, CheckSquare, Download, Upload, Search, Settings, FlaskConical } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import { useManagerMode } from '../../hooks/useManagerMode';
import { ThemeSwitcher } from '../theme/ThemeSwitcher';
import MemberForm from './MemberForm';
import MembersList from './MembersList';
import DepartmentAnalysis from './DepartmentAnalysis';
import SelectedAnalysis from './SelectedAnalysis';
import IndividualStrengths from './IndividualStrengths';
import StrengthsAnalysis from './StrengthsAnalysis';
import TeamSimulation from './TeamSimulation';
import { StageMasterSettings } from './StageMasterSettings';
import { MemberRateSettings } from './MemberRateSettings';
import ImportConflictDialog, { ImportConflictInfo, ImportStrategy } from './ImportConflictDialog';
import { Tabs, Tab } from '../ui/Tabs';
import { MigrationService } from '../../services/MigrationService';

type AnalysisTab = 'individual' | 'department' | 'selected' | 'strengths' | 'simulation' | 'settings';

// スクロール処理の遅延時間（ms）
// DOMの更新を待つために必要
const SCROLL_DELAY_MS = 100;

// インポート・エクスポートボタンコンポーネント
const ImportExportButtons: React.FC = () => {
  const { exportData, importData } = useStrengths();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ImportConflictInfo | null>(null);
  const [resolveConflict, setResolveConflict] = useState<((strategy: ImportStrategy) => void) | null>(null);

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
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = event.target?.result as string;

        // データが正常に読み込まれたか検証
        if (!jsonData || jsonData.trim().length === 0) {
          console.error('ファイルが空または読み込みに失敗しました');
          return;
        }

        // 衝突解決コールバックを提供してインポート
        await importData(jsonData, (conflictData) => {
          return new Promise<ImportStrategy>((resolve) => {
            // ダイアログに表示する情報を設定
            setConflictInfo({
              existingCount: conflictData.existingMembers.length,
              newCount: conflictData.newMembers.length,
              duplicateIds: conflictData.duplicateIds,
            });

            // ユーザーの選択を解決するコールバックを保存
            setResolveConflict(() => (strategy: ImportStrategy) => {
              setShowConflictDialog(false);
              setConflictInfo(null);
              setResolveConflict(null);
              resolve(strategy);
            });

            // ダイアログを表示
            setShowConflictDialog(true);
          });
        });
      } catch (err) {
        console.error('ファイルの読み込みに失敗しました:', err);
      } finally {
        // ファイル読み込み完了後にファイル選択をリセット
        // （同じファイルを再度選択できるように）
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      console.error('ファイルの読み込み中にエラーが発生しました');
      // エラー時もファイル選択をリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  return (
    <>
      <div className="flex space-x-2">
        {/* サンプルダウンロードボタン */}
        <button
          className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 text-white px-3 py-2 rounded flex items-center"
          onClick={handleSampleDownload}
          title="サンプルデータをダウンロード"
        >
          <Download className="w-4 h-4 mr-1" />
          <span>サンプル</span>
        </button>

        {/* エクスポートボタン */}
        <button
          className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-3 py-2 rounded flex items-center"
          onClick={handleExport}
          title="データをJSONファイルとしてエクスポート"
        >
          <Download className="w-4 h-4 mr-1" />
          <span>エクスポート</span>
        </button>

        {/* インポートボタン */}
        <button
          className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 text-white px-3 py-2 rounded flex items-center"
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

      {/* インポート競合ダイアログ */}
      {showConflictDialog && conflictInfo && resolveConflict && (
        <ImportConflictDialog
          conflictInfo={conflictInfo}
          onSelect={resolveConflict}
        />
      )}
    </>
  );
};

const StrengthsFinderPage: React.FC = () => {
  const { error, successMessage, clearMessages } = useStrengths();
  const isManagerMode = useManagerMode();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('individual');
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const analysisAreaRef = useRef<HTMLDivElement>(null);

  // 初回マウント時にデータマイグレーションを実行
  useEffect(() => {
    if (MigrationService.needsMigration()) {
      console.log('[Migration] 単価情報の分離マイグレーションを開始します');
      MigrationService.migrateMemberRatesToSeparateStorage();
      console.log('[Migration] マイグレーション完了');
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as AnalysisTab);
  };

  const handleMemberSelect = (memberId: string | null) => {
    setSelectedMemberId(memberId);
    // メンバー選択時に分析エリアにスクロール
    // DOMの更新を待ってからスクロールするため遅延を設定
    setTimeout(() => {
      analysisAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, SCROLL_DELAY_MS);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <Award className="w-6 h-6 mr-2 text-blue-600" />
          メンバープロファイル分析
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          <ThemeSwitcher />
          <ImportExportButtons />
          <button
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white px-4 py-2 rounded flex items-center"
            onClick={() => setShowMemberForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            メンバーを追加
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative">
          {error}
          <button
            onClick={clearMessages}
            className="absolute top-2 right-2 text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
            aria-label="Close error message"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded relative">
          {successMessage}
          <button
            onClick={clearMessages}
            className="absolute top-2 right-2 text-green-700 dark:text-green-200 hover:text-green-900 dark:hover:text-green-100"
            aria-label="Close success message"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* メンバーリスト */}
        <div className="col-span-12 md:col-span-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-800 dark:text-gray-100">
            <Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            メンバー一覧
          </h3>
          <MembersList
            onSelect={handleMemberSelect}
            selectedMemberId={selectedMemberId}
          />
        </div>

        {/* 分析エリア */}
        <div ref={analysisAreaRef} className="col-span-12 md:col-span-8 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
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
                <span>所有者分析</span>
              </div>
            }>
              <StrengthsAnalysis />
            </Tab>
            <Tab id="simulation" label={
              <div className="flex items-center">
                <FlaskConical className="w-4 h-4 mr-1" />
                <span>チームシミュレーション</span>
              </div>
            }>
              <TeamSimulation />
            </Tab>
            {isManagerMode && (
              <Tab id="settings" label={
                <div className="flex items-center">
                  <Settings className="w-4 h-4 mr-1" />
                  <span>マネージャー設定</span>
                </div>
              }>
                <div className="space-y-8">
                  {/* ステージマスタ設定セクション */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b dark:border-gray-700">
                      ステージマスタ設定
                    </h3>
                    <StageMasterSettings />
                  </div>

                  {/* 単価設定セクション */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-2 border-b dark:border-gray-700">
                      単価情報管理
                    </h3>
                    <MemberRateSettings />
                  </div>
                </div>
              </Tab>
            )}
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
