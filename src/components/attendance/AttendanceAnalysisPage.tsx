// src/components/attendance/AttendanceAnalysisPage.tsx
// 勤怠分析メインページ

import React, { useState, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Users,
  Download,
  RefreshCw,
  CheckCircle,
  Award,
  TrendingUp,
  Crown,
} from 'lucide-react';
import AttendanceService from '../../services/AttendanceService';
import {
  AttendanceRecord,
  ExtendedAnalysisResult,
  EmployeeMonthlySummary,
  DepartmentSummary,
  URGENCY_ICONS,
  VIOLATION_DISPLAY_INFO,
  ViolationType,
  OVERTIME_ALERT_INFO,
  OvertimeAlertLevel,
} from '../../models/AttendanceTypes';
import { useStrengths } from '../../contexts/StrengthsContext';
import { MemberStrengths, Position } from '../../models/StrengthsTypes';
import StrengthsService from '../../services/StrengthsService';

type TabType = 'summary' | 'employees' | 'departments' | 'violations';

const AttendanceAnalysisPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setRecords] = useState<AttendanceRecord[]>([]);
  const [analysisResult, setAnalysisResult] = useState<ExtendedAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');

  // StrengthsFinder分析との連携用（閲覧のみ - 勤怠分析は独立機能）
  const { members: strengthsMembers } = useStrengths();

  // 従業員名からStrengthsメンバーを検索するマップ
  const strengthsMemberMap = useMemo(() => {
    const map = new Map<string, MemberStrengths>();
    strengthsMembers.forEach(member => {
      // 名前でマッチング（完全一致）
      map.set(member.name, member);
    });
    return map;
  }, [strengthsMembers]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      // ファイル形式チェック
      if (!file.name.endsWith('.xlsx')) {
        throw new Error('XLSXファイルのみ対応しています');
      }

      // ファイルサイズチェック (10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('ファイルサイズは10MB以下にしてください');
      }

      // パース
      const parsedRecords = await AttendanceService.parseXlsx(file);
      setRecords(parsedRecords);

      // 分析実行
      const result = AttendanceService.analyzeExtended(parsedRecords);
      setAnalysisResult(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : '分析中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleExportCsv = useCallback(() => {
    if (!analysisResult) return;

    const csv = AttendanceService.exportExtendedToCsv(analysisResult);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `勤怠分析_${AttendanceService.formatDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [analysisResult]);

  const handleReset = useCallback(() => {
    setRecords([]);
    setAnalysisResult(null);
    setError(null);
    setFilterDepartment('all');
  }, []);

  // 部門でフィルターされた従業員サマリー
  const filteredEmployees = analysisResult?.employeeSummaries.filter(
    s => filterDepartment === 'all' || s.department === filterDepartment
  ) ?? [];

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">勤怠分析</h1>
        </div>
        {analysisResult && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>CSV出力</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>リセット</span>
            </button>
          </div>
        )}
      </div>

      {/* ファイルアップロード */}
      {!analysisResult && (
        <>
          {/* 使い方・注意事項 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                  アップロード時の注意事項
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                  <li>楽楽勤怠からエクスポートした<strong>XLSXファイルをそのまま</strong>アップロードしてください</li>
                  <li><strong>シート名は変更しないでください</strong>（勤務形態の判定に使用します）</li>
                  <li>カラム順序や構成を変更すると正しく分析できません</li>
                  <li>ファイルサイズは10MB以下にしてください</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 分析内容・ルール説明 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 検出される違反 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                📋 検出される違反
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>打刻漏れ（出退勤時刻なし）</li>
                <li>休憩時間不足（6h超→45分、8h超→60分）</li>
                <li>届出漏れ（遅刻・早退・早出）</li>
                <li>時間有休の私用外出打刻漏れ</li>
                <li>深夜休憩の修正申請漏れ</li>
                <li><strong>備考欄の未入力・フォーマット不備</strong></li>
              </ul>
            </div>

            {/* 備考欄ルール */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                📝 備考欄の入力ルール
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                以下の申請時は備考欄に「【事由】＋【詳細】」を記載:
              </p>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-0.5 list-disc list-inside">
                <li>直行・直帰 → 訪問先・業務目的</li>
                <li>電車遅延 → 路線名・遅延時間</li>
                <li>打刻修正 → 修正理由</li>
                <li>AltX残業 → タスク内容</li>
              </ul>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                例: 「K社ビル（水道橋）面談のため」「JR山手線遅延 20分」
              </p>
            </div>

            {/* 36協定基準（7段階） */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                ⚠️ 36協定の残業上限（7段階）
              </p>
              <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5 list-disc list-inside">
                <li>月35h超: 注意（上長報告）</li>
                <li>月45h超: 超過（36協定基本上限）</li>
                <li>月55h超: 警戒（残業抑制指示）</li>
                <li>月65h超: 深刻（残業禁止措置検討）</li>
                <li>月70h超: 重大（親会社報告）</li>
                <li>月80h超: 危険（医師面接指導）</li>
                <li>月100h超: 違法（即時是正）</li>
              </ul>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                ※ 年間上限: 360時間
              </p>
            </div>

            {/* 申請必須の項目 */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <p className="font-medium text-purple-800 dark:text-purple-200 mb-2">
                🔔 申請が必要な項目
              </p>
              <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-0.5 list-disc list-inside">
                <li>深夜休憩 → 休憩時間修正申請</li>
                <li>時差出勤 → 時差出勤申請</li>
                <li>時間有休 → 申請＋私用外出打刻</li>
                <li>早出（内勤） → 早出申請</li>
                <li>早出（客先常駐） → 早出フラグ「1」</li>
              </ul>
            </div>
          </div>

          {/* ファイルドロップエリア */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
          >
            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {isLoading ? (
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">分析中...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                    XLSXファイルをドロップまたはクリックして選択
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    楽楽勤怠からエクスポートした「出勤簿_日別詳細」ファイル
                  </p>
                </div>
              )}
            </label>
          </div>
        </>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 dark:text-red-200">エラー</p>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* 分析結果 */}
      {analysisResult && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard
              icon={<Users className="w-6 h-6" />}
              label="総従業員数"
              value={analysisResult.summary.totalEmployees}
              color="blue"
            />
            <SummaryCard
              icon={<AlertTriangle className="w-6 h-6" />}
              label="問題あり"
              value={analysisResult.summary.employeesWithIssues}
              color="red"
            />
            <SummaryCard
              icon={<span className="text-xl">{URGENCY_ICONS.high}</span>}
              label="高緊急度"
              value={analysisResult.summary.highUrgencyCount}
              color="red"
            />
            <SummaryCard
              icon={<span className="text-xl">{URGENCY_ICONS.medium}</span>}
              label="中緊急度"
              value={analysisResult.summary.mediumUrgencyCount}
              color="yellow"
            />
          </div>

          {/* 分析期間 */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            分析期間: {AttendanceService.formatDateRange(
              analysisResult.summary.analysisDateRange.start,
              analysisResult.summary.analysisDateRange.end
            )}
            {' | '}
            シート数: {analysisResult.summary.sheetNames.length}
          </div>

          {/* タブナビゲーション */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-4">
              <TabButton
                active={activeTab === 'summary'}
                onClick={() => setActiveTab('summary')}
              >
                サマリー
              </TabButton>
              <TabButton
                active={activeTab === 'employees'}
                onClick={() => setActiveTab('employees')}
              >
                従業員別
              </TabButton>
              <TabButton
                active={activeTab === 'departments'}
                onClick={() => setActiveTab('departments')}
              >
                部門別
              </TabButton>
              <TabButton
                active={activeTab === 'violations'}
                onClick={() => setActiveTab('violations')}
              >
                違反一覧
              </TabButton>
            </nav>
          </div>

          {/* フィルター（従業員タブのみ） */}
          {activeTab === 'employees' && (
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-600 dark:text-gray-300">部門:</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">すべて</option>
                {analysisResult.departmentSummaries.map(d => (
                  <option key={d.department} value={d.department}>
                    {d.department}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* タブコンテンツ */}
          <div className="min-h-[400px]">
            {activeTab === 'summary' && (
              <SummaryTab result={analysisResult} />
            )}
            {activeTab === 'employees' && (
              <EmployeesTab employees={filteredEmployees} strengthsMemberMap={strengthsMemberMap} />
            )}
            {activeTab === 'departments' && (
              <DepartmentsTab departments={analysisResult.departmentSummaries} />
            )}
            {activeTab === 'violations' && (
              <ViolationsTab result={analysisResult} />
            )}
          </div>
        </>
      )}
    </div>
  );
};

// サマリーカード
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'red' | 'yellow' | 'green';
}> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <p className="text-sm opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

// タブボタン
const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
    }`}
  >
    {children}
  </button>
);

// サマリータブ
const SummaryTab: React.FC<{ result: ExtendedAnalysisResult }> = ({ result }) => {
  const stats = {
    // 基本情報
    totalEmployees: result.summary.totalEmployees,
    totalWorkDays: result.employeeSummaries.reduce((sum, s) => sum + s.totalWorkDays, 0),
    // 残業統計
    totalOvertime: result.employeeSummaries.reduce((sum, s) => sum + s.totalOvertimeMinutes, 0),
    // その他
    totalHolidayWork: result.employeeSummaries.reduce((sum, s) => sum + s.holidayWorkDays, 0),
    totalLateDays: result.employeeSummaries.reduce((sum, s) => sum + s.lateDays, 0),
    totalEarlyLeaveDays: result.employeeSummaries.reduce((sum, s) => sum + s.earlyLeaveDays, 0),
    totalMissingClocks: result.employeeSummaries.reduce((sum, s) => sum + s.missingClockDays, 0),
  };

  // 平均計算
  const avgOvertimePerEmployee = stats.totalEmployees > 0
    ? Math.round(stats.totalOvertime / stats.totalEmployees)
    : 0;
  const avgOvertimePerDay = stats.totalWorkDays > 0
    ? Math.round(stats.totalOvertime / stats.totalWorkDays)
    : 0;

  // 36協定アラート対象者を抽出
  const overtimeAlerts = result.employeeSummaries
    .map(emp => ({
      ...emp,
      alertLevel: AttendanceService.getOvertimeAlertLevel(emp.totalOvertimeMinutes),
    }))
    .filter(emp => emp.alertLevel !== 'normal')
    .sort((a, b) => {
      // アラートレベル順（7段階: illegal > critical > severe > serious > caution > exceeded > warning）
      const levelOrder: Record<OvertimeAlertLevel, number> = {
        illegal: 7, critical: 6, severe: 5, serious: 4, caution: 3, exceeded: 2, warning: 1, normal: 0
      };
      return levelOrder[b.alertLevel] - levelOrder[a.alertLevel];
    });

  // 予兆アラート（ペース超過）対象者を抽出
  // データの最終日をdayOfMonthとして使用
  const dayOfMonth = result.summary.analysisDateRange.end.getDate();
  const paceAlerts = result.employeeSummaries
    .filter(emp => {
      // すでに45時間超過している人は36協定アラートで表示されるので除外
      if (emp.totalOvertimeMinutes >= 45 * 60) return false;
      // 45時間上限に対してペース超過かチェック
      return AttendanceService.isOvertimeOnPaceToExceed(
        emp.totalOvertimeMinutes,
        dayOfMonth,
        45 * 60 // 月45時間上限（36協定基本上限）
      );
    })
    .map(emp => {
      // 月末予測を計算（単純按分）
      const predictedOvertime = Math.round((emp.totalOvertimeMinutes / dayOfMonth) * 30);
      return { ...emp, predictedOvertime };
    })
    .sort((a, b) => b.predictedOvertime - a.predictedOvertime);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            全体統計
          </h3>
          <dl className="space-y-3">
            {/* 基本情報 */}
            <StatItem label="対象従業員数" value={`${stats.totalEmployees}名`} />
            <StatItem label="総出勤日数" value={`${stats.totalWorkDays}日`} />
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3" />

            {/* 残業統計 */}
            <StatItem
              label="総残業時間"
              value={AttendanceService.formatMinutesToTime(stats.totalOvertime)}
              subLabel={`（${stats.totalEmployees}名 × ${stats.totalWorkDays}日分）`}
            />
            <StatItem
              label="平均残業（月/人）"
              value={AttendanceService.formatMinutesToTime(avgOvertimePerEmployee)}
            />
            <StatItem
              label="平均残業（日/人）"
              value={AttendanceService.formatMinutesToTime(avgOvertimePerDay)}
            />
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3" />

            {/* その他 */}
            <StatItem label="休日出勤" value={`${stats.totalHolidayWork}日`} />
            <StatItem label="遅刻" value={`${stats.totalLateDays}日`} />
            <StatItem label="早退" value={`${stats.totalEarlyLeaveDays}日`} />
            <StatItem label="出退勤なし" value={`${stats.totalMissingClocks}日`} />
          </dl>

          {/* 使用カラム説明 */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ※ 残業時間は「平日法定外残業(36協定用)」カラムを使用
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            違反サマリー
          </h3>
          <div className="space-y-2">
            {result.allViolations.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">違反はありません</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  総違反数: <span className="font-bold text-red-600 dark:text-red-400">{result.allViolations.length}</span>
                </p>
                <div className="space-y-1">
                  {(Object.keys(VIOLATION_DISPLAY_INFO) as ViolationType[]).map(type => {
                    const count = result.allViolations.filter(v => v.type === type).length;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">{VIOLATION_DISPLAY_INFO[type].displayName}</span>
                        <span className="font-medium text-gray-900 dark:text-white">{count}件</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 36協定アラート */}
      {overtimeAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
              36協定 残業時間アラート
            </h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            以下の従業員は月間残業時間が基準を超過しています。労務管理上の対応が必要です。
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-red-700 dark:text-red-300 uppercase">
                  <th className="px-3 py-2">氏名</th>
                  <th className="px-3 py-2">部門</th>
                  <th className="px-3 py-2 text-right">残業時間</th>
                  <th className="px-3 py-2">ステータス</th>
                  <th className="px-3 py-2">必要な対応</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200 dark:divide-red-800">
                {overtimeAlerts.map(emp => {
                  const alertInfo = OVERTIME_ALERT_INFO[emp.alertLevel];
                  const alertColorClass: Record<OvertimeAlertLevel, string> = {
                    normal: '',
                    warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
                    exceeded: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
                    caution: 'bg-orange-200 dark:bg-orange-800/50 text-orange-900 dark:text-orange-100',
                    serious: 'bg-amber-200 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100',
                    severe: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200',
                    critical: 'bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-100',
                    illegal: 'bg-red-300 dark:bg-red-700 text-red-900 dark:text-red-50 font-bold',
                  };
                  return (
                    <tr key={emp.employeeId} className="text-sm">
                      <td className="px-3 py-2 text-red-900 dark:text-red-100 font-medium">{emp.employeeName}</td>
                      <td className="px-3 py-2 text-red-700 dark:text-red-300">{emp.department}</td>
                      <td className="px-3 py-2 text-right text-red-900 dark:text-red-100 font-medium">
                        {AttendanceService.formatMinutesToTime(emp.totalOvertimeMinutes)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${alertColorClass[emp.alertLevel]}`}>
                          {alertInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-red-700 dark:text-red-300 text-xs">
                        {alertInfo.action}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-200">
            <p className="font-medium mb-1">36協定の基準（7段階）:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>月35時間超: 注意（上長への報告）</li>
              <li>月45時間超: 超過（36協定基本上限・特別条項確認）</li>
              <li>月55時間超: 警戒（残業抑制指示）</li>
              <li>月65時間超: 深刻（残業禁止措置の検討）</li>
              <li>月70時間超: 重大（親会社への報告）</li>
              <li>月80時間超: 危険（医師面接指導）</li>
              <li>月100時間超: 違法（即時是正必須）</li>
            </ul>
          </div>
        </div>
      )}

      {/* 予兆アラート（ペース超過警告） */}
      {paceAlerts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200">
              残業ペース超過 予兆アラート
            </h3>
            <span className="text-sm text-amber-700 dark:text-amber-300">
              （{dayOfMonth}日時点）
            </span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            以下の従業員は、現在のペースで月末まで働くと36協定基本上限（45時間）を超過する見込みです。早期対応をご検討ください。
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-amber-700 dark:text-amber-300 uppercase">
                  <th className="px-3 py-2">氏名</th>
                  <th className="px-3 py-2">部門</th>
                  <th className="px-3 py-2 text-right">現在の残業</th>
                  <th className="px-3 py-2 text-right">月末予測</th>
                  <th className="px-3 py-2 text-right">超過見込</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200 dark:divide-amber-800">
                {paceAlerts.map(emp => {
                  const exceededMinutes = emp.predictedOvertime - 45 * 60;
                  return (
                    <tr key={emp.employeeId} className="text-sm">
                      <td className="px-3 py-2 text-amber-900 dark:text-amber-100 font-medium">{emp.employeeName}</td>
                      <td className="px-3 py-2 text-amber-700 dark:text-amber-300">{emp.department}</td>
                      <td className="px-3 py-2 text-right text-amber-900 dark:text-amber-100">
                        {AttendanceService.formatMinutesToTime(emp.totalOvertimeMinutes)}
                      </td>
                      <td className="px-3 py-2 text-right text-amber-900 dark:text-amber-100 font-medium">
                        {AttendanceService.formatMinutesToTime(emp.predictedOvertime)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-amber-200 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100">
                          +{AttendanceService.formatMinutesToTime(exceededMinutes)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">予兆判定の計算方法:</p>
            <p>月末予測 = (現在の残業時間 ÷ {dayOfMonth}日) × 30日</p>
            <p className="mt-1 text-amber-600 dark:text-amber-400">
              ※ この予測は単純な按分計算です。実際の業務量により変動します。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// 統計項目
const StatItem: React.FC<{ label: string; value: string; subLabel?: string }> = ({ label, value, subLabel }) => (
  <div className="flex justify-between items-start">
    <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
    <dd className="text-right">
      <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      {subLabel && (
        <span className="block text-xs text-gray-500 dark:text-gray-400">{subLabel}</span>
      )}
    </dd>
  </div>
);

// 残業時間セル（36協定アラート付き・7段階）
const OvertimeCell: React.FC<{ overtimeMinutes: number }> = ({ overtimeMinutes }) => {
  const alertLevel = AttendanceService.getOvertimeAlertLevel(overtimeMinutes);
  const alertInfo = OVERTIME_ALERT_INFO[alertLevel];
  const formattedTime = AttendanceService.formatMinutesToTime(overtimeMinutes);

  // アラートレベルに応じた色定義（7段階）
  const alertColors: Record<OvertimeAlertLevel, string> = {
    normal: '',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    exceeded: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    caution: 'bg-orange-200 dark:bg-orange-800/40 text-orange-900 dark:text-orange-200',
    serious: 'bg-amber-200 dark:bg-amber-800/40 text-amber-900 dark:text-amber-200',
    severe: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    critical: 'bg-red-200 dark:bg-red-800/40 text-red-800 dark:text-red-200',
    illegal: 'bg-red-300 dark:bg-red-700/50 text-red-900 dark:text-red-100 font-bold',
  };

  if (alertLevel === 'normal') {
    return <span className="text-gray-900 dark:text-white">{formattedTime}</span>;
  }

  return (
    <div className="group relative inline-flex items-center justify-end space-x-1">
      <span className="text-gray-900 dark:text-white">{formattedTime}</span>
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium cursor-help ${alertColors[alertLevel]}`}
        title={alertInfo.description}
      >
        {alertInfo.label}
      </span>
      {/* ツールチップ */}
      <div className="invisible group-hover:visible absolute z-10 right-0 top-full mt-1 w-56 p-2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded shadow-lg">
        <p className="font-medium">{alertInfo.label}</p>
        <p className="mt-1 text-gray-300">{alertInfo.description}</p>
        {alertInfo.action && (
          <p className="mt-1 text-yellow-300 font-medium">📋 {alertInfo.action}</p>
        )}
      </div>
    </div>
  );
};

// 従業員タブ（Strengths連携対応）
const EmployeesTab: React.FC<{
  employees: EmployeeMonthlySummary[];
  strengthsMemberMap: Map<string, MemberStrengths>;
}> = ({ employees, strengthsMemberMap }) => {
  if (employees.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">従業員データがありません</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">社員番号</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">氏名</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">部門</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">出勤日</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">残業</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">休出</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">遅刻</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">早退</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">違反</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {employees.map(emp => {
            const strengthsMember = strengthsMemberMap.get(emp.employeeName);
            return (
              <tr key={emp.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{emp.employeeId}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  <EmployeeNameWithStrengths
                    employeeName={emp.employeeName}
                    strengthsMember={strengthsMember}
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{emp.department}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{emp.totalWorkDays}</td>
                <td className="px-4 py-3 text-sm text-right">
                  <OvertimeCell overtimeMinutes={emp.totalOvertimeMinutes} />
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{emp.holidayWorkDays}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{emp.lateDays}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{emp.earlyLeaveDays}</td>
                <td className="px-4 py-3 text-center">
                  {emp.violations.length > 0 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                      {emp.violations.length}
                    </span>
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/**
 * 役職に応じたバッジ情報を取得
 * @param position メンバーの役職
 * @returns バッジタイプと色
 */
const getPositionBadgeInfo = (position: Position | string | undefined): {
  type: 'crown' | 'circle' | 'award';
  color: string;
  displayName: string;
} => {
  // 役職情報を取得
  if (position && position !== Position.GENERAL) {
    const positionInfo = StrengthsService.getPositionInfo(position);
    if (positionInfo) {
      if (positionInfo.icon === 'crown') {
        return { type: 'crown', color: positionInfo.color, displayName: positionInfo.displayName };
      }
      if (positionInfo.icon === 'circle' || positionInfo.icon === 'star') {
        return { type: 'circle', color: positionInfo.color, displayName: positionInfo.displayName };
      }
    }
  }
  // デフォルト：一般社員/未設定はAward
  return { type: 'award', color: '#EAB308', displayName: '一般社員' };
};

// 従業員名（Strengths情報付きツールチップ + 役職別バッジ）
const EmployeeNameWithStrengths: React.FC<{
  employeeName: string;
  strengthsMember: MemberStrengths | undefined;
}> = ({ employeeName, strengthsMember }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!strengthsMember) {
    return <span>{employeeName}</span>;
  }

  // Top 5 Strengthsを取得
  const topStrengths = strengthsMember.strengths
    .slice(0, 5)
    .map(s => {
      const strength = StrengthsService.getStrengthById(s.id);
      return strength?.name || '';
    })
    .filter(Boolean);

  // 役職に応じたバッジ情報を取得
  const badgeInfo = getPositionBadgeInfo(strengthsMember.position);

  // バッジアイコンのレンダリング
  const renderBadgeIcon = () => {
    if (badgeInfo.type === 'crown') {
      return (
        <Crown
          className="w-4 h-4"
          style={{ color: badgeInfo.color }}
          fill={badgeInfo.color}
        />
      );
    }
    if (badgeInfo.type === 'circle') {
      return (
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: badgeInfo.color }}
          title={badgeInfo.displayName}
        />
      );
    }
    // デフォルト: Award
    return <Award className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="relative inline-block">
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-pointer flex items-center space-x-1"
        title={badgeInfo.displayName}
      >
        <span>{employeeName}</span>
        {renderBadgeIcon()}
      </span>

      {/* Strengthsツールチップ */}
      {showTooltip && (
        <div className="absolute z-50 left-0 top-full mt-1 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          {/* 役職表示（一般以外） */}
          {badgeInfo.type !== 'award' && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center space-x-1">
              {badgeInfo.type === 'crown' ? (
                <Crown className="w-3 h-3" style={{ color: badgeInfo.color }} fill={badgeInfo.color} />
              ) : (
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: badgeInfo.color }} />
              )}
              <span>{badgeInfo.displayName}</span>
            </div>
          )}
          <div className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center space-x-2">
            <Award className="w-4 h-4 text-yellow-500" />
            <span>StrengthsFinder Top 5</span>
          </div>
          <ol className="space-y-1">
            {topStrengths.map((name, idx) => (
              <li key={idx} className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                <span className="w-5 text-gray-400">{idx + 1}.</span>
                <span>{name}</span>
              </li>
            ))}
          </ol>
          {strengthsMember.mbti && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              MBTI: <span className="font-medium">{strengthsMember.mbti}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 部門タブ
const DepartmentsTab: React.FC<{ departments: DepartmentSummary[] }> = ({ departments }) => {
  if (departments.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">部門データがありません</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">部門</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">従業員数</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">総残業</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">平均残業</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">休日出勤</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">違反数</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {departments.map(dept => (
            <tr key={dept.department} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{dept.department}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{dept.employeeCount}</td>
              <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                {AttendanceService.formatMinutesToTime(dept.totalOvertimeMinutes)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                {AttendanceService.formatMinutesToTime(dept.averageOvertimeMinutes)}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{dept.holidayWorkCount}</td>
              <td className="px-4 py-3 text-sm text-right">
                {dept.totalViolations > 0 ? (
                  <span className="text-red-600 dark:text-red-400 font-medium">{dept.totalViolations}</span>
                ) : (
                  <span className="text-green-600 dark:text-green-400">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 違反タブ
const ViolationsTab: React.FC<{ result: ExtendedAnalysisResult }> = ({ result }) => {
  const violations = result.allViolations;

  if (violations.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <p className="text-lg text-gray-600 dark:text-gray-300">違反はありません</p>
      </div>
    );
  }

  // ViolationType に対応した色定義
  const typeColors: Record<ViolationType, string> = {
    missing_clock: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    break_violation: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    late_application_missing: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
    early_leave_application_missing: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    early_start_application_missing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    time_leave_punch_missing: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
    night_break_application_missing: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    remarks_missing: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
    remarks_format_warning: 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300',
  };

  // VIOLATION_DISPLAY_INFO からラベルとツールチップを取得するヘルパー
  const getViolationInfo = (type: ViolationType) => {
    const info = VIOLATION_DISPLAY_INFO[type];
    return {
      label: info?.displayName || type,
      tooltip: info?.possibleApplications?.join('、') || '',
      notes: info?.notes || '',
    };
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        総違反数: {violations.length}件
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">日付</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">社員番号</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">氏名</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">種類</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">詳細</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {violations.map((v, idx) => (
              <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                  {AttendanceService.formatDate(v.date)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{v.employeeId}</td>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{v.employeeName}</td>
                <td className="px-4 py-3">
                  <div className="group relative">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium cursor-help ${typeColors[v.type]}`}
                      title={`考えられる申請: ${getViolationInfo(v.type).tooltip}`}
                    >
                      {getViolationInfo(v.type).label}
                    </span>
                    {/* ツールチップ（ホバー時に表示） */}
                    <div className="invisible group-hover:visible absolute z-10 left-0 top-full mt-1 w-64 p-2 bg-gray-800 dark:bg-gray-700 text-white text-xs rounded shadow-lg">
                      <p className="font-medium mb-1">考えられる申請:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {getViolationInfo(v.type).tooltip.split('、').map((app, i) => (
                          <li key={i}>{app}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{v.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceAnalysisPage;
