// src/components/attendance/AttendanceAnalysisPage.tsx
// 勤怠分析メインページ

import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  FileText,
  X,
  UserCheck,
  Moon,
} from 'lucide-react';
import UserFilterPanel from './UserFilterPanel';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import AttendanceService from '../../services/AttendanceService';
import { LineWorksService } from '../../services/LineWorksService';
import { LineWorksSendButton } from '../lineworks';
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
  VIOLATION_URGENCY,
  countHighUrgencyViolations,
  countMediumUrgencyViolations,
  NightWorkRecord,
} from '../../models/AttendanceTypes';
import { useStrengths } from '../../contexts/StrengthsContext';
import { MemberStrengths, Position } from '../../models/StrengthsTypes';
import StrengthsService from '../../services/StrengthsService';

type TabType = 'summary' | 'employees' | 'departments' | 'violations';

// サマリーカード詳細モーダル用の型
type SummaryModalType = 'issues' | 'highUrgency' | 'mediumUrgency' | null;

// チャート用カラー定数
const ALERT_CHART_COLORS: Record<OvertimeAlertLevel, string> = {
  normal: '#10B981',     // Green
  warning: '#F59E0B',    // Yellow
  exceeded: '#F97316',   // Orange
  caution: '#EA580C',    // Dark Orange
  serious: '#EF4444',    // Red
  severe: '#DC2626',     // Dark Red
  critical: '#B91C1C',   // Darker Red
  illegal: '#991B1B',    // Darkest Red
};

// 違反種別カラー
const VIOLATION_CHART_COLORS: Record<ViolationType, string> = {
  missing_clock: '#EF4444',              // Red
  break_violation: '#8B5CF6',            // Purple
  late_application_missing: '#F59E0B',   // Yellow
  early_leave_application_missing: '#F97316', // Orange
  early_start_application_missing: '#3B82F6', // Blue
  time_leave_punch_missing: '#06B6D4',   // Cyan
  night_break_application_missing: '#6366F1', // Indigo
  remarks_missing: '#64748B',            // Slate
  remarks_format_warning: '#94A3B8',     // Light Slate
};

const AttendanceAnalysisPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setRecords] = useState<AttendanceRecord[]>([]);
  const [analysisResult, setAnalysisResult] = useState<ExtendedAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [includeToday, setIncludeToday] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [summaryModal, setSummaryModal] = useState<SummaryModalType>(null);
  const [exportingEmployeeId, setExportingEmployeeId] = useState<string | null>(null);

  // ユーザーフィルター用の状態
  const [rawRecords, setRawRecords] = useState<AttendanceRecord[]>([]);
  const [userSelections, setUserSelections] = useState<Map<string, boolean>>(new Map());
  const [showUserFilter, setShowUserFilter] = useState(false);

  // PDF出力用のref
  const summaryRef = useRef<HTMLDivElement>(null);
  const individualPdfRef = useRef<HTMLDivElement>(null);

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

  // ユーザー選択の初期化（全員選択状態）
  const initializeUserSelections = useCallback((records: AttendanceRecord[]) => {
    const selections = new Map<string, boolean>();
    const uniqueEmployees = new Set(records.map(r => r.employeeId));
    uniqueEmployees.forEach(id => selections.set(id, true));
    return selections;
  }, []);

  // 選択されたユーザーのみでレコードをフィルター
  const filterRecordsBySelection = useCallback((records: AttendanceRecord[], selections: Map<string, boolean>) => {
    return records.filter(r => selections.get(r.employeeId) === true);
  }, []);

  // 分析を実行（フィルター済みレコードで）
  const executeAnalysis = useCallback((records: AttendanceRecord[]) => {
    const filteredRecords = filterRecordsBySelection(records, userSelections);
    setRecords(filteredRecords);
    const result = AttendanceService.analyzeExtended(filteredRecords, { includeToday });
    setAnalysisResult(result);
  }, [userSelections, includeToday, filterRecordsBySelection]);

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

      // 生データを保存（ユーザーフィルター用）
      setRawRecords(parsedRecords);

      // ユーザー選択を初期化（全員選択状態）
      const initialSelections = initializeUserSelections(parsedRecords);
      setUserSelections(initialSelections);

      // 分析実行（全員選択状態で）
      setRecords(parsedRecords);
      const result = AttendanceService.analyzeExtended(parsedRecords, { includeToday });
      setAnalysisResult(result);

    } catch (err) {
      setError(err instanceof Error ? err.message : '分析中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [includeToday, initializeUserSelections]);

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

  const handleExportPdf = useCallback(async () => {
    if (!summaryRef.current || !analysisResult) return;

    setIsExportingPdf(true);

    // Reactの再レンダリングを待つ（縦並びレイアウトが適用されるまで）
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // html2canvasでキャプチャ
      const canvas = await html2canvas(summaryRef.current, {
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: summaryRef.current.scrollWidth,
        windowHeight: summaryRef.current.scrollHeight,
      } as Parameters<typeof html2canvas>[1]);

      // A4横向きでPDF作成
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      // 画像のアスペクト比を維持してフィット
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(contentWidth / imgWidth, contentHeight / imgHeight);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      // 中央配置
      const x = margin + (contentWidth - scaledWidth) / 2;
      const y = margin;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

      // ファイル名に日付を含める
      const dateStr = AttendanceService.formatDate(new Date());
      pdf.save(`勤怠分析サマリー_${dateStr}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF出力中にエラーが発生しました');
    } finally {
      setIsExportingPdf(false);
    }
  }, [analysisResult]);

  const handleReset = useCallback(() => {
    setRecords([]);
    setAnalysisResult(null);
    setError(null);
    setFilterDepartment('all');
    setRawRecords([]);
    setUserSelections(new Map());
    setShowUserFilter(false);
  }, []);

  // ユーザー選択の変更ハンドラ
  const handleUserSelectionChange = useCallback((employeeId: string, isSelected: boolean) => {
    setUserSelections(prev => {
      const next = new Map(prev);
      next.set(employeeId, isSelected);
      return next;
    });
  }, []);

  // 全員選択
  const handleSelectAllUsers = useCallback(() => {
    setUserSelections(prev => {
      const next = new Map(prev);
      next.forEach((_, key) => next.set(key, true));
      return next;
    });
  }, []);

  // 全員解除
  const handleDeselectAllUsers = useCallback(() => {
    setUserSelections(prev => {
      const next = new Map(prev);
      next.forEach((_, key) => next.set(key, false));
      return next;
    });
  }, []);

  // ユーザー選択確定（再分析）
  const handleConfirmUserSelection = useCallback(() => {
    executeAnalysis(rawRecords);
    setShowUserFilter(false);
  }, [executeAnalysis, rawRecords]);

  // ユーザー選択キャンセル
  const handleCancelUserSelection = useCallback(() => {
    // 選択状態を現在の分析結果に基づいてリセット（分析済みのレコードから）
    // ただし、初期状態に戻すのが複雑なので、単にモーダルを閉じるだけ
    setShowUserFilter(false);
  }, []);

  // 個人PDF出力
  const handleExportIndividualPdf = useCallback(async (employee: EmployeeMonthlySummary) => {
    if (!analysisResult) return;

    // 先にstateを設定してDOMをレンダリング
    setExportingEmployeeId(employee.employeeId);

    try {
      // DOMがレンダリングされるまで待機
      await new Promise(resolve => setTimeout(resolve, 200));

      // refが設定されているか確認
      if (!individualPdfRef.current) {
        console.error('PDF content ref is not available');
        alert('PDF出力の準備ができませんでした。再度お試しください。');
        return;
      }

      // html2canvasでキャプチャ
      const canvas = await html2canvas(individualPdfRef.current, {
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scale: 2, // 高解像度
      } as Parameters<typeof html2canvas>[1]);

      // A4縦向きでPDF作成
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      // 画像のアスペクト比を維持してフィット
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(contentWidth / imgWidth, (contentHeight - 10) / imgHeight);

      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      // 上部に配置
      const x = margin + (contentWidth - scaledWidth) / 2;
      const y = margin;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

      // ファイル名: 勤怠分析_社員番号_氏名_期間.pdf
      const period = analysisResult.summary.analysisDateRange;
      const startMonth = `${period.start.getFullYear()}年${period.start.getMonth() + 1}月`;
      pdf.save(`勤怠分析_${employee.employeeId}_${employee.employeeName}_${startMonth}.pdf`);
    } catch (err) {
      console.error('Individual PDF export error:', err);
      alert('PDF出力中にエラーが発生しました');
    } finally {
      setExportingEmployeeId(null);
    }
  }, [analysisResult]);

  // 部門でフィルターされた従業員サマリー
  const filteredEmployees = analysisResult?.employeeSummaries.filter(
    s => filterDepartment === 'all' || s.department === filterDepartment
  ) ?? [];

  // サマリーカード用: 各カテゴリの該当者リスト
  const summaryDetails = useMemo(() => {
    if (!analysisResult) return { issues: [], highUrgency: [], mediumUrgency: [] };

    // 問題あり（違反がある従業員）
    const issues = analysisResult.employeeSummaries.filter(emp => emp.violations.length > 0);

    // 高緊急度（法定外残業45時間以上 OR 法令違反の可能性がある違反）
    const highUrgency = analysisResult.employeeSummaries.filter(emp => {
      const overtimeLevel = AttendanceService.getOvertimeAlertLevel(emp.totalLegalOvertimeMinutes);
      const isOvertimeHigh = ['exceeded', 'caution', 'serious', 'severe', 'critical', 'illegal'].includes(overtimeLevel);
      const hasHighViolation = emp.violations.some(v => VIOLATION_URGENCY[v.type] === 'high');
      return isOvertimeHigh || hasHighViolation;
    });

    // 中緊急度（VIOLATION_URGENCYで 'medium' に分類される違反がある従業員）
    const mediumUrgency = analysisResult.employeeSummaries.filter(emp =>
      emp.violations.some(v => VIOLATION_URGENCY[v.type] === 'medium')
    );

    return { issues, highUrgency, mediumUrgency };
  }, [analysisResult]);

  return (
    <div className="space-y-6" data-testid="attendance-page">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">勤怠分析</h1>
        </div>
        {analysisResult && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline">CSV出力</span>
              <span className="xs:hidden">CSV</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf || activeTab !== 'summary'}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              title={activeTab !== 'summary' ? 'サマリータブでのみPDF出力可能です' : ''}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden xs:inline">{isExportingPdf ? '出力中...' : 'PDF出力'}</span>
              <span className="xs:hidden">PDF</span>
            </button>
            <LineWorksSendButton
              type="attendance-summary"
              buildMessage={() => LineWorksService.buildAttendanceMessage(analysisResult!)}
              disabled={!analysisResult || activeTab !== 'summary'}
            />
            <button
              onClick={() => setShowUserFilter(true)}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
              title="分析対象ユーザーを選択"
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">ユーザー選択</span>
              <span className="sm:hidden">選択</span>
            </button>
            <button
              onClick={handleReset}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">リセット</span>
            </button>
          </div>
        )}
      </div>

      {/* ユーザー選択パネル（モーダル） */}
      {showUserFilter && rawRecords.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <UserFilterPanel
              records={rawRecords}
              userSelections={userSelections}
              onSelectionChange={handleUserSelectionChange}
              onSelectAll={handleSelectAllUsers}
              onDeselectAll={handleDeselectAllUsers}
              onConfirm={handleConfirmUserSelection}
              onCancel={handleCancelUserSelection}
            />
          </div>
        </div>
      )}

      {/* ファイルアップロード */}
      {!analysisResult && (
        <>
          {/* コンパクトな注意事項 + ファイルドロップエリア */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* 薄い注意バナー */}
            <div className="bg-amber-50 dark:bg-amber-900/30 px-4 py-2 border-b border-amber-200 dark:border-amber-800">
              <div className="flex items-center space-x-2 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>楽楽勤怠エクスポートの<strong>XLSXファイルをそのまま</strong>アップロード（シート名変更不可・10MB以下）</span>
              </div>
            </div>

            {/* 分析オプション */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">分析オプション</span>
                </div>
                {/* 今日を含めるトグル */}
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-medium ${includeToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {includeToday ? '今日を含めて分析' : '今日を除外して分析'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {includeToday ? '退勤前でも違反判定される場合あり' : '退勤前の誤検出を防止'}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={includeToday}
                      onChange={(e) => setIncludeToday(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${includeToday ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${includeToday ? 'translate-x-5' : ''}`} />
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* ファイルドロップエリア */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="p-8 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            >
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
                data-testid="file-upload-input"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {isLoading ? (
                  <div className="flex flex-col items-center">
                    <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                    <p className="text-gray-600 dark:text-gray-300">分析中...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileSpreadsheet className="w-10 h-10 text-gray-400 mb-3" />
                    <p className="text-base text-gray-600 dark:text-gray-300 mb-1">
                      XLSXファイルをドロップまたはクリックして選択
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      楽楽勤怠「出勤簿_日別詳細」ファイル
                    </p>
                    <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-md max-w-sm">
                      <p className="font-medium mb-1">💡 当日分の分析について</p>
                      <p>デフォルトでは当日分は除外されます。月末締め日など本日分も分析したい場合は、上の「分析オプション」で切り替えてください。</p>
                    </div>
                  </div>
                )}
              </label>
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
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              icon={<Users className="w-6 h-6" />}
              label="総従業員数"
              value={analysisResult.summary.totalEmployees}
              color="blue"
            />
            <SummaryCard
              icon={<span className="text-xl">{URGENCY_ICONS.high}</span>}
              label="高緊急度"
              value={analysisResult.summary.highUrgencyCount}
              color="red"
              onClick={() => setSummaryModal('highUrgency')}
            />
            <SummaryCard
              icon={<span className="text-xl">{URGENCY_ICONS.medium}</span>}
              label="中緊急度"
              value={analysisResult.summary.mediumUrgencyCount}
              color="yellow"
              onClick={() => setSummaryModal('mediumUrgency')}
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
          <div className="border-b border-gray-200 dark:border-gray-700" data-testid="attendance-tabs">
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
              <div ref={summaryRef}>
                <SummaryTab result={analysisResult} isExportingPdf={isExportingPdf} />
              </div>
            )}
            {activeTab === 'employees' && (
              <EmployeesTab
                employees={filteredEmployees}
                strengthsMemberMap={strengthsMemberMap}
                onExportPdf={handleExportIndividualPdf}
                exportingEmployeeId={exportingEmployeeId}
              />
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

      {/* サマリーカード詳細モーダル */}
      {summaryModal && analysisResult && (
        <SummaryDetailModal
          type={summaryModal}
          employees={
            summaryModal === 'issues' ? summaryDetails.issues :
            summaryModal === 'highUrgency' ? summaryDetails.highUrgency :
            summaryDetails.mediumUrgency
          }
          onClose={() => setSummaryModal(null)}
        />
      )}

      {/* 個人PDF出力用の非表示コンテンツ */}
      {exportingEmployeeId && analysisResult && (
        <div
          ref={individualPdfRef}
          className="fixed left-[-9999px] top-0 bg-white p-6"
          style={{ width: '595px' }} // A4縦幅（72dpi相当）
        >
          <IndividualPdfContent
            employee={analysisResult.employeeSummaries.find(e => e.employeeId === exportingEmployeeId)!}
            analysisResult={analysisResult}
          />
        </div>
      )}
    </div>
  );
};

// サマリーカード詳細モーダル
const SummaryDetailModal: React.FC<{
  type: 'issues' | 'highUrgency' | 'mediumUrgency';
  employees: EmployeeMonthlySummary[];
  onClose: () => void;
}> = ({ type, employees, onClose }) => {
  const modalConfig = {
    issues: {
      title: '確認が必要なメンバー',
      description: '打刻漏れ・届出漏れなど、勤怠に関する確認事項があるメンバーです',
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    highUrgency: {
      title: '緊急対応が必要な対象者',
      description: '残業45時間超過（36協定上限）または休憩時間違反など、法令に抵触する可能性があるメンバーです',
      icon: <span className="text-xl">{URGENCY_ICONS.high}</span>,
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-800',
    },
    mediumUrgency: {
      title: '届出漏れがある対象者',
      description: '遅刻・早退・早出などの申請が必要なメンバーです',
      icon: <span className="text-xl">{URGENCY_ICONS.medium}</span>,
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
  };

  const config = modalConfig[type];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden ${config.borderColor} border-2`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className={`${config.bgColor} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            {config.icon}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{config.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{config.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* メンバーリスト */}
        <div className="overflow-y-auto max-h-[60vh]">
          {employees.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              該当するメンバーはいません
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">社員番号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">氏名</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">部門</th>
                  {type === 'highUrgency' && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">残業時間</th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {type === 'highUrgency' ? '問題数' : '違反数'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {type === 'highUrgency' ? '問題内容' : '主な違反'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {employees.map(emp => {
                  // 緊急度に応じた違反をフィルター
                  const targetUrgency = type === 'highUrgency' ? 'high' : 'medium';
                  const relevantViolations = type === 'issues'
                    ? emp.violations
                    : emp.violations.filter(v => VIOLATION_URGENCY[v.type] === targetUrgency);

                  // 違反種類をグループ化してカウント
                  const violationTypeCounts: Record<string, number> = {};
                  relevantViolations.forEach(v => {
                    const displayName = VIOLATION_DISPLAY_INFO[v.type]?.displayName || v.type;
                    violationTypeCounts[displayName] = (violationTypeCounts[displayName] || 0) + 1;
                  });

                  // 残業情報（highUrgency用）- 36協定判定は法定外残業ベース
                  const overtimeLevel = AttendanceService.getOvertimeAlertLevel(emp.totalLegalOvertimeMinutes);
                  const isOvertimeHigh = ['exceeded', 'caution', 'serious', 'severe', 'critical', 'illegal'].includes(overtimeLevel);
                  const overtimeHours = Math.round(emp.totalLegalOvertimeMinutes / 60 * 10) / 10;

                  return (
                    <tr key={emp.employeeId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{emp.employeeId}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{emp.employeeName}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{emp.department}</td>
                      {type === 'highUrgency' && (
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isOvertimeHigh
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {overtimeHours}h
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          // highUrgencyの場合、残業超過も問題としてカウント
                          const problemCount = type === 'highUrgency' && isOvertimeHigh
                            ? relevantViolations.length + 1
                            : relevantViolations.length;
                          return (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              problemCount > 0
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {problemCount}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        <div className="flex flex-wrap gap-1">
                          {type === 'highUrgency' && isOvertimeHigh && (
                            <span className="inline-flex px-2 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                              残業超過（36協定上限）
                            </span>
                          )}
                          {Object.entries(violationTypeCounts).slice(0, 3).map(([typeName, count]) => (
                            <span
                              key={typeName}
                              className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                            >
                              {typeName}{count > 1 ? ` ×${count}` : ''}
                            </span>
                          ))}
                          {Object.keys(violationTypeCounts).length > 3 && (
                            <span className="text-xs text-gray-400">+{Object.keys(violationTypeCounts).length - 3}種類</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            該当: {employees.length}名
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

// サマリーカード
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'red' | 'yellow' | 'green';
  onClick?: () => void;
}> = ({ icon, label, value, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  };

  const isClickable = onClick && value > 0;

  return (
    <div
      className={`rounded-lg p-4 ${colorClasses[color]} ${isClickable ? 'cursor-pointer hover:opacity-80 hover:shadow-md transition-all' : ''}`}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <p className="text-sm opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {isClickable && (
            <p className="text-xs opacity-60 mt-1">クリックで詳細表示</p>
          )}
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
// 部門別残業時間の色を決定するヘルパー関数
const getOvertimeBarColor = (minutes: number): string => {
  const level = AttendanceService.getOvertimeAlertLevel(minutes);
  return ALERT_CHART_COLORS[level];
};

// カスタムツールチップコンポーネント
const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ payload: { name: string; value: number; displayValue?: string }; }>;
  label?: string;
  formatter?: (value: number) => string;
}> = ({ active, payload, formatter }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
        <p className="text-gray-600 dark:text-gray-300">
          {data.displayValue || (formatter ? formatter(data.value) : data.value)}
        </p>
      </div>
    );
  }
  return null;
};

const SummaryTab: React.FC<{ result: ExtendedAnalysisResult; isExportingPdf?: boolean }> = ({ result, isExportingPdf = false }) => {
  // 部門別残業データ（横棒グラフ用）
  const departmentOvertimeData = useMemo(() => {
    return result.departmentSummaries
      .map(dept => ({
        name: dept.department,
        value: dept.averageOvertimeMinutes,
        displayValue: AttendanceService.formatMinutesToTime(dept.averageOvertimeMinutes),
        fill: getOvertimeBarColor(dept.averageLegalOvertimeMinutes),
      }))
      .sort((a, b) => b.value - a.value);
  }, [result.departmentSummaries]);

  // 違反種別分布データ（円グラフ用）
  const violationDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    result.allViolations.forEach(v => {
      counts[v.type] = (counts[v.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: VIOLATION_DISPLAY_INFO[type as ViolationType]?.displayName || type,
      value: count,
      fill: VIOLATION_CHART_COLORS[type as ViolationType] || '#64748B',
    }));
  }, [result.allViolations]);

  // 36協定アラートレベル分布データ（横棒グラフ用）- 正常を除外
  const alertDistributionData = useMemo(() => {
    const counts: Record<OvertimeAlertLevel, number> = {
      normal: 0, warning: 0, exceeded: 0, caution: 0,
      serious: 0, severe: 0, critical: 0, illegal: 0,
    };
    result.employeeSummaries.forEach(emp => {
      const level = AttendanceService.getOvertimeAlertLevel(emp.totalLegalOvertimeMinutes);
      counts[level]++;
    });
    // レベル順にソート（注意 → 警告 → ... → 法令違反）- 正常は除外
    const orderedLevels: OvertimeAlertLevel[] = [
      'warning', 'exceeded', 'caution', 'serious', 'severe', 'critical', 'illegal'
    ];
    return orderedLevels
      .filter(level => counts[level] > 0)
      .map(level => ({
        name: OVERTIME_ALERT_INFO[level].label,
        value: counts[level],
        fill: ALERT_CHART_COLORS[level],
      }));
  }, [result.employeeSummaries]);

  // アラート対象者の割合を計算
  const alertStats = useMemo(() => {
    const total = result.employeeSummaries.length;
    const alertCount = result.employeeSummaries.filter(emp => {
      const level = AttendanceService.getOvertimeAlertLevel(emp.totalLegalOvertimeMinutes);
      return level !== 'normal';
    }).length;
    const percentage = total > 0 ? (alertCount / total) * 100 : 0;
    return { total, alertCount, percentage };
  }, [result.employeeSummaries]);

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

  // 部署コード一覧を取得
  const departmentCodes = result.departmentSummaries.map(d => d.department);

  // 現在日時を取得
  const exportDateTime = new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

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
      alertLevel: AttendanceService.getOvertimeAlertLevel(emp.totalLegalOvertimeMinutes),
    }))
    .filter(emp => emp.alertLevel !== 'normal')
    .sort((a, b) => {
      // アラートレベル順（7段階: illegal > critical > severe > serious > caution > exceeded > warning）
      const levelOrder: Record<OvertimeAlertLevel, number> = {
        illegal: 7, critical: 6, severe: 5, serious: 4, caution: 3, exceeded: 2, warning: 1, normal: 0
      };
      return levelOrder[b.alertLevel] - levelOrder[a.alertLevel];
    });

  // 残業ペース予測（月末見込み）対象者を抽出
  // 経過営業日から月末の法定外残業時間を予測し、35h超の全員を表示
  const paceAlerts = result.employeeSummaries
    .filter(emp => {
      // 経過営業日がない場合は除外
      if (emp.passedWeekdays <= 0) return false;
      // 営業日ベースで月末予測が35時間超（注意レベル到達見込み）かチェック（法定外残業ベース）
      const predictedOvertime = Math.round((emp.totalLegalOvertimeMinutes / emp.passedWeekdays) * emp.totalWeekdaysInMonth);
      return predictedOvertime > 35 * 60; // 注意レベル到達見込み
    })
    .map(emp => {
      // 月末予測を計算（営業日ベース・法定外残業）
      const predictedOvertime = Math.round((emp.totalLegalOvertimeMinutes / emp.passedWeekdays) * emp.totalWeekdaysInMonth);
      // 予測レベルを判定
      const predictedLevel = AttendanceService.getOvertimeAlertLevel(predictedOvertime);
      return { ...emp, predictedOvertime, predictedLevel };
    })
    .sort((a, b) => b.predictedOvertime - a.predictedOvertime);

  return (
    <div className="space-y-6">
      {/* PDF用ヘッダー: 分析対象情報 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white print:bg-blue-700">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">勤怠分析サマリー</h2>
            <div className="space-y-1 text-blue-100">
              <p>
                <span className="font-medium text-white">分析対象期間:</span>{' '}
                {AttendanceService.formatDateRange(
                  result.summary.analysisDateRange.start,
                  result.summary.analysisDateRange.end
                )}
              </p>
              <p>
                <span className="font-medium text-white">対象部署:</span>{' '}
                {departmentCodes.length > 0 ? departmentCodes.join(' / ') : '全部署'}
              </p>
              <p>
                <span className="font-medium text-white">対象人数:</span>{' '}
                {result.summary.totalEmployees}名
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-blue-200">
            <p>分析実行日時</p>
            <p className="font-medium text-white">{exportDateTime}</p>
          </div>
        </div>
      </div>

      <div className={isExportingPdf ? "grid grid-cols-2 gap-6" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
        <div className={isExportingPdf ? "bg-white p-6" : "bg-white dark:bg-gray-800 rounded-lg shadow p-6"}>
          <h3 className={isExportingPdf ? "text-lg font-semibold text-gray-900 mb-4" : "text-lg font-semibold text-gray-900 dark:text-white mb-4"}>
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
              ※ 残業時間は実働時間から独自計算（所定超過: 実働-7h45m、法定外超過: 実働-8h）
            </p>
          </div>
        </div>

        <div className={isExportingPdf ? "bg-white p-6" : "bg-white dark:bg-gray-800 rounded-lg shadow p-6"}>
          <h3 className={isExportingPdf ? "text-lg font-semibold text-gray-900 mb-4" : "text-lg font-semibold text-gray-900 dark:text-white mb-4"}>
            違反サマリー
          </h3>
          {(() => {
            const exceededCount = result.employeeSummaries.filter(
              emp => emp.totalLegalOvertimeMinutes >= 45 * 60
            ).length;
            const hasViolations = result.allViolations.length > 0 || exceededCount > 0;
            return (
              <div className="space-y-2">
                {!hasViolations ? (
                  <p className="text-gray-500 dark:text-gray-400">違反はありません</p>
                ) : (
                  <>
                    {result.allViolations.length > 0 && (
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
                    {exceededCount > 0 && (
                      <div className={result.allViolations.length > 0 ? "mt-3 pt-3 border-t border-gray-200 dark:border-gray-700" : ""}>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-600 dark:text-red-400 font-medium">36協定超過（法定外45h以上）</span>
                          <span className="font-bold text-red-600 dark:text-red-400">{exceededCount}名</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })()}
          {/* 深夜帯勤務実績（注意喚起） */}
          {result.nightWorkRecords.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">深夜帯勤務実績（22:00超）</span>
                <span className="font-medium text-gray-900 dark:text-white">{result.nightWorkRecords.length}件</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* グラフセクション: 部門別残業 + 違反種別（WEB:横並び、PDF:縦並び・中央揃え） */}
      <div className={isExportingPdf ? "flex flex-col items-center gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
        {/* 部門別残業時間チャート */}
        {departmentOvertimeData.length > 0 && (
          <div className={isExportingPdf ? "bg-white p-4 w-full max-w-2xl" : "bg-white dark:bg-gray-800 rounded-lg shadow p-6"}>
            <h3 className={isExportingPdf ? "text-base font-semibold text-gray-900 mb-3 text-center" : "text-lg font-semibold text-gray-900 dark:text-white mb-4"}>
              部門別 平均残業時間
            </h3>
            <div style={{ height: isExportingPdf ? Math.min(180, Math.max(120, departmentOvertimeData.length * 25)) : Math.max(250, departmentOvertimeData.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentOvertimeData}
                  layout="vertical"
                  margin={{ top: 5, right: isExportingPdf ? 30 : 30, left: isExportingPdf ? 5 : 80, bottom: 20 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#E5E7EB" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => `${Math.floor(value / 60)}h`}
                    stroke="#9CA3AF"
                    fontSize={isExportingPdf ? 9 : 12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#9CA3AF"
                    fontSize={isExportingPdf ? 8 : 12}
                    width={isExportingPdf ? 65 : 75}
                    tick={{ textAnchor: 'end' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={isExportingPdf ? 18 : 30}>
                    {departmentOvertimeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* 違反種別分布チャート */}
        {violationDistributionData.length > 0 && (
          <div className={isExportingPdf ? "bg-white p-4 w-full max-w-2xl" : "bg-white dark:bg-gray-800 rounded-lg shadow p-6"}>
            <h3 className={isExportingPdf ? "text-base font-semibold text-gray-900 mb-3 text-center" : "text-lg font-semibold text-gray-900 dark:text-white mb-4"}>
              違反種別の分布
            </h3>
            <div style={{ height: isExportingPdf ? 200 : 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={violationDistributionData}
                    cx="50%"
                    cy={isExportingPdf ? "42%" : "40%"}
                    outerRadius={isExportingPdf ? 65 : 80}
                    innerRadius={isExportingPdf ? 25 : 40}
                    paddingAngle={2}
                    dataKey="value"
                    label={isExportingPdf ? false : (props: { name?: string; percent?: number }) => {
                      const { name, percent } = props;
                      return `${name || ''}: ${((percent || 0) * 100).toFixed(0)}%`;
                    }}
                    labelLine={isExportingPdf ? false : { stroke: '#9CA3AF', strokeWidth: 1 }}
                  >
                    {violationDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v}件`} />} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ paddingTop: isExportingPdf ? 8 : 10, fontSize: isExportingPdf ? 10 : 11 }}
                    formatter={(value) => {
                      const item = violationDistributionData.find(d => d.name === value);
                      const percent = item ? ((item.value / violationDistributionData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(0) : '0';
                      return `${value}: ${percent}%`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 36協定 残業状況（統合版） */}
      {alertStats.alertCount === 0 ? (
        /* 全員正常 */
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center justify-center py-4">
            <CheckCircle className="w-8 h-8 text-green-500 dark:text-green-400 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                36協定 残業状況: 全員正常
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {alertStats.total}名全員が月間残業時間の基準内です
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* 要注意者あり - 詳細テーブル付き */
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">
                36協定 残業状況: {alertStats.alertCount}名が要注意
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {alertDistributionData.map((item) => (
                <span
                  key={item.name}
                  className="inline-flex items-center justify-center px-2 py-1 rounded-full text-white text-xs font-medium leading-none"
                  style={{ backgroundColor: item.fill }}
                >
                  {item.name}: {item.value}名
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            以下の{alertStats.alertCount}名（{alertStats.total}名中 {alertStats.percentage.toFixed(1)}%）は月間法定外残業時間が基準を超過しています。
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mb-4">
            ※ 法定外残業 = 実働時間 - 法定労働時間（8時間）。所定超過（7時間45分基準）とは異なります。
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-red-700 dark:text-red-300 uppercase">
                  <th className="px-3 py-2">氏名</th>
                  <th className="px-3 py-2">部門</th>
                  <th className="px-3 py-2 text-right">法定外残業</th>
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
                        {AttendanceService.formatMinutesToTime(emp.totalLegalOvertimeMinutes)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium leading-none ${alertColorClass[emp.alertLevel]}`}>
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
              （営業日ベース）
            </span>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            現在のペースで月末まで働いた場合の法定外残業時間の予測です（月末予測35時間超の対象者）。予測レベルに応じた早期対応をご検討ください。
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-amber-700 dark:text-amber-300 uppercase">
                  <th className="px-3 py-2">氏名</th>
                  <th className="px-3 py-2">部門</th>
                  <th className="px-3 py-2 text-right">現在の残業</th>
                  <th className="px-3 py-2 text-center">経過/全営業日</th>
                  <th className="px-3 py-2 text-right">月末予測</th>
                  <th className="px-3 py-2 text-center">予測レベル</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200 dark:divide-amber-800">
                {paceAlerts.map(emp => {
                  // 予測レベルに応じた色とラベル
                  const levelConfig: Record<string, { bg: string; text: string; label: string }> = {
                    illegal: { bg: 'bg-black', text: 'text-white', label: '違法(100h超)' },
                    critical: { bg: 'bg-red-900', text: 'text-white', label: '危険(80h超)' },
                    severe: { bg: 'bg-purple-700', text: 'text-white', label: '重大(70h超)' },
                    serious: { bg: 'bg-red-600', text: 'text-white', label: '深刻(65h超)' },
                    caution: { bg: 'bg-red-500', text: 'text-white', label: '警戒(55h超)' },
                    exceeded: { bg: 'bg-orange-500', text: 'text-white', label: '超過(45h超)' },
                    warning: { bg: 'bg-yellow-400', text: 'text-gray-900', label: '注意(35h超)' },
                    normal: { bg: 'bg-gray-200', text: 'text-gray-700', label: '正常' },
                  };
                  const config = levelConfig[emp.predictedLevel] || levelConfig.normal;
                  return (
                    <tr key={emp.employeeId} className="text-sm">
                      <td className="px-3 py-2 text-amber-900 dark:text-amber-100 font-medium">{emp.employeeName}</td>
                      <td className="px-3 py-2 text-amber-700 dark:text-amber-300">{emp.department}</td>
                      <td className="px-3 py-2 text-right text-amber-900 dark:text-amber-100">
                        {AttendanceService.formatMinutesToTime(emp.totalLegalOvertimeMinutes)}
                      </td>
                      <td className="px-3 py-2 text-center text-amber-700 dark:text-amber-300">
                        {emp.passedWeekdays}/{emp.totalWeekdaysInMonth}日
                      </td>
                      <td className="px-3 py-2 text-right text-amber-900 dark:text-amber-100 font-medium">
                        {AttendanceService.formatMinutesToTime(emp.predictedOvertime)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">予兆判定の計算方法（営業日ベース・法定外残業）:</p>
            <p>月末予測 = (現在の法定外残業時間 ÷ 経過営業日数) × 月間営業日数</p>
            <p className="mt-1">※ 法定外残業 = 実働時間 - 法定労働時間（8時間）。36協定の対象となる時間です。</p>
            <p className="mt-1">※ 月末予測が法定外35時間超の全対象者を表示しています。</p>
            <p className="mt-1 text-amber-600 dark:text-amber-400">
              ※ 営業日はカレンダー種別「平日」のレコードから算出しています。
            </p>
          </div>
        </div>
      )}

      {/* 深夜帯勤務実績（22:00超退勤）詳細テーブル */}
      {result.nightWorkRecords.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Moon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
              深夜帯勤務実績（22:00超退勤）
            </h3>
            <span className="text-sm text-indigo-700 dark:text-indigo-300">
              {result.nightWorkRecords.length}件
            </span>
          </div>
          <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-4">
            以下のメンバーは22:00以降に退勤しています。法令違反ではありませんが、健康リスクや36協定超過の前兆となり得るためご確認ください。
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-indigo-700 dark:text-indigo-300 uppercase">
                  <th className="px-3 py-2">氏名</th>
                  <th className="px-3 py-2">部門</th>
                  <th className="px-3 py-2">日付</th>
                  <th className="px-3 py-2">退勤時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-200 dark:divide-indigo-800">
                {result.nightWorkRecords.map((rec: NightWorkRecord, idx: number) => (
                  <tr key={idx} className="text-sm">
                    <td className="px-3 py-2 text-indigo-900 dark:text-indigo-100 font-medium">{rec.employeeName}</td>
                    <td className="px-3 py-2 text-indigo-700 dark:text-indigo-300">{rec.department}</td>
                    <td className="px-3 py-2 text-indigo-900 dark:text-indigo-100">
                      {AttendanceService.formatDate(rec.date)}
                    </td>
                    <td className="px-3 py-2 text-indigo-900 dark:text-indigo-100 font-medium">
                      {`${rec.clockOut.getHours()}:${String(rec.clockOut.getMinutes()).padStart(2, '0')}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
// overtimeMinutes: 所定超過(7h45m基準), legalOvertimeMinutes: 法定外(8h基準・36協定用)
const OvertimeCell: React.FC<{ overtimeMinutes: number; legalOvertimeMinutes: number }> = ({ overtimeMinutes, legalOvertimeMinutes }) => {
  const alertLevel = AttendanceService.getOvertimeAlertLevel(legalOvertimeMinutes);
  const alertInfo = OVERTIME_ALERT_INFO[alertLevel];
  // 36協定アラートは法定外残業ベースなので、表示も法定外残業時間を使用
  const formattedTime = AttendanceService.formatMinutesToTime(legalOvertimeMinutes);

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
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium cursor-help ${alertColors[alertLevel]}`}
        title={alertInfo.description}
      >
        {alertInfo.label}
      </span>
      <span className="text-gray-900 dark:text-white">{formattedTime}</span>
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

// 従業員タブ（Strengths連携対応 + 個人PDF出力）
const EmployeesTab: React.FC<{
  employees: EmployeeMonthlySummary[];
  strengthsMemberMap: Map<string, MemberStrengths>;
  onExportPdf: (employee: EmployeeMonthlySummary) => void;
  exportingEmployeeId: string | null;
}> = ({ employees, strengthsMemberMap, onExportPdf, exportingEmployeeId }) => {
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
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">欠勤</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">違反</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PDF</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {employees.map(emp => {
            const strengthsMember = strengthsMemberMap.get(emp.employeeName);
            const isExporting = exportingEmployeeId === emp.employeeId;
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
                  <OvertimeCell overtimeMinutes={emp.totalOvertimeMinutes} legalOvertimeMinutes={emp.totalLegalOvertimeMinutes} />
                </td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{emp.holidayWorkDays}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{emp.lateDays}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{emp.earlyLeaveDays}</td>
                <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                  {emp.applicationCounts.absence > 0 ? (
                    <span className="text-red-600 dark:text-red-400 font-medium">{emp.applicationCounts.absence}</span>
                  ) : (
                    emp.applicationCounts.absence
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {emp.violations.length > 0 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                      {emp.violations.length}
                    </span>
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onExportPdf(emp)}
                    disabled={isExporting}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="個人分析PDFを出力"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </button>
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
  const exceededEmployees = result.employeeSummaries.filter(
    emp => emp.totalLegalOvertimeMinutes >= 45 * 60
  );

  if (violations.length === 0 && exceededEmployees.length === 0) {
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
      {violations.length > 0 && (
        <>
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
        </>
      )}
      {exceededEmployees.length > 0 && (
        <div className={violations.length > 0 ? "pt-4 border-t border-gray-200 dark:border-gray-700" : ""}>
          <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            36協定超過（法定外45h以上）: {exceededEmployees.length}名
          </p>
          <div className="space-y-1">
            {exceededEmployees.map(emp => (
              <div key={emp.employeeId} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">{emp.employeeName}（{emp.employeeId}）</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {AttendanceService.formatMinutesToTime(emp.totalLegalOvertimeMinutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 個人PDF出力用コンテンツ
const IndividualPdfContent: React.FC<{
  employee: EmployeeMonthlySummary;
  analysisResult: ExtendedAnalysisResult;
}> = ({ employee, analysisResult }) => {
  const alertLevel = AttendanceService.getOvertimeAlertLevel(employee.totalLegalOvertimeMinutes);
  const alertInfo = OVERTIME_ALERT_INFO[alertLevel];

  // 出勤率（欠勤以外は出勤とみなす：有休・代休・特休等は出勤率に影響しない）
  const attendanceRate = employee.totalWeekdaysInMonth > 0
    ? Math.round(((employee.totalWeekdaysInMonth - employee.applicationCounts.absence) / employee.totalWeekdaysInMonth) * 100)
    : 0;

  // 定時退社率
  const timelyDepartureRate = employee.totalWorkDays > 0
    ? Math.round((employee.timelyDepartureDays / employee.totalWorkDays) * 100)
    : 0;

  // 日平均残業時間（分）
  const avgOvertimePerDay = employee.totalWorkDays > 0
    ? Math.round(employee.totalOvertimeMinutes / employee.totalWorkDays)
    : 0;

  // 月末予測残業時間（分）- 法定外残業ベース
  const predictedOvertime = employee.passedWeekdays > 0
    ? Math.round((employee.totalLegalOvertimeMinutes / employee.passedWeekdays) * employee.totalWeekdaysInMonth)
    : 0;
  const predictedLevel = AttendanceService.getOvertimeAlertLevel(predictedOvertime);
  const predictedInfo = OVERTIME_ALERT_INFO[predictedLevel];

  // 分析期間
  const period = analysisResult.summary.analysisDateRange;
  const periodStr = `${period.start.getFullYear()}年${period.start.getMonth() + 1}月${period.start.getDate()}日 〜 ${period.end.getFullYear()}年${period.end.getMonth() + 1}月${period.end.getDate()}日`;

  // 出力日時
  const exportDateTime = new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // 違反種別ごとの件数
  const violationCounts: Record<string, number> = {};
  employee.violations.forEach(v => {
    const displayName = VIOLATION_DISPLAY_INFO[v.type]?.displayName || v.type;
    violationCounts[displayName] = (violationCounts[displayName] || 0) + 1;
  });

  // 高緊急度・中緊急度の違反カウント
  const highUrgencyCount = countHighUrgencyViolations(employee.violations);
  const mediumUrgencyCount = countMediumUrgencyViolations(employee.violations);

  return (
    <div className="font-sans text-gray-900" style={{ width: '100%', fontSize: '11px' }}>
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <h1 className="text-xl font-bold mb-1">勤怠分析レポート</h1>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-lg font-semibold">{employee.employeeName}</p>
            <p className="text-blue-200">
              {employee.employeeId} / {employee.department}
            </p>
          </div>
          <div className="text-right text-blue-200">
            <p className="text-white font-medium">{periodStr}</p>
            <p>出力: {exportDateTime}</p>
          </div>
        </div>
      </div>

      {/* 勤務サマリー */}
      <div className="border-x border-gray-300 p-4">
        <h2 className="text-sm font-bold text-gray-800 border-b border-gray-300 pb-1 mb-3">
          勤務サマリー
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500 text-xs">出勤日数</p>
            <p className="text-lg font-bold">{employee.totalWorkDays}日</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500 text-xs">営業日数</p>
            <p className="text-lg font-bold">{employee.totalWeekdaysInMonth}日</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500 text-xs">出勤率</p>
            <p className="text-lg font-bold">{attendanceRate}%</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500 text-xs">休日出勤</p>
            <p className="text-lg font-bold">{employee.holidayWorkDays}日</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500 text-xs">定時退社日数</p>
            <p className="text-lg font-bold">{employee.timelyDepartureDays}日</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-gray-500 text-xs">定時退社率</p>
            <p className="text-lg font-bold">{timelyDepartureRate}%</p>
          </div>
        </div>
      </div>

      {/* 就業実績時間 */}
      <div className="border-x border-gray-300 p-4 bg-blue-50">
        <h2 className="text-sm font-bold text-gray-800 border-b border-blue-200 pb-1 mb-3">
          就業実績時間
        </h2>
        <div className="flex justify-center items-center">
          <span className="text-gray-600 mr-4">総就業時間</span>
          <span className="text-2xl font-bold text-blue-700">
            {AttendanceService.formatMinutesToTime(employee.totalWorkMinutes)}
          </span>
        </div>
      </div>

      {/* 残業・36協定 */}
      <div className="border-x border-gray-300 p-4 bg-red-50">
        <h2 className="text-sm font-bold text-gray-800 border-b border-red-200 pb-1 mb-3">
          残業・36協定
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">月間残業時間</span>
              <span className="text-xl font-bold">
                {AttendanceService.formatMinutesToTime(employee.totalOvertimeMinutes)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">法定外残業</span>
              <span className="text-lg font-bold text-red-600">
                {AttendanceService.formatMinutesToTime(employee.totalLegalOvertimeMinutes)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">日平均残業</span>
              <span className="font-medium">
                {AttendanceService.formatMinutesToTime(avgOvertimePerDay)}
              </span>
            </div>
          </div>
          <div>
            <div className="mb-2">
              <span className="text-gray-600 mr-2">アラート:</span>
              <span className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                alertLevel === 'normal' ? 'bg-green-100 text-green-800' :
                alertLevel === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                alertLevel === 'exceeded' ? 'bg-orange-100 text-orange-800' :
                alertLevel === 'caution' ? 'bg-orange-200 text-orange-900' :
                'bg-red-200 text-red-900'
              }`}>
                {alertInfo.label}
              </span>
            </div>
            <div className="mb-2">
              <span className="text-gray-600 mr-2">月末予測:</span>
              <span className="font-medium">
                {AttendanceService.formatMinutesToTime(predictedOvertime)}
              </span>
              {predictedLevel !== 'normal' && (
                <span className={`ml-1 text-xs px-1 py-0.5 rounded ${
                  predictedLevel === 'warning' ? 'bg-yellow-200 text-yellow-800' :
                  'bg-red-200 text-red-800'
                }`}>
                  {predictedInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 申請サマリー */}
      <div className="border-x border-gray-300 p-2">
        <h2 className="text-xs font-bold text-gray-800 border-b border-gray-300 pb-1 mb-2">
          申請サマリー
        </h2>
        {/* 勤務関連 */}
        <p className="text-xs text-gray-600 mb-1">勤務関連</p>
        <div className="grid grid-cols-9 gap-1 mb-2">
          <div className="text-center p-1 bg-orange-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>残業</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.overtime}</p>
          </div>
          <div className="text-center p-1 bg-green-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>早出</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.earlyStart}</p>
          </div>
          <div className="text-center p-1 bg-green-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>早出中抜</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.earlyStartBreak}</p>
          </div>
          <div className="text-center p-1 bg-yellow-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>遅刻早退</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.lateEarlyLeave}</p>
          </div>
          <div className="text-center p-1 bg-purple-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>電車遅延</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.trainDelay}</p>
          </div>
          <div className="text-center p-1 bg-green-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>時差出勤</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.flextime}</p>
          </div>
          <div className="text-center p-1 bg-indigo-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>休憩修正</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.breakModification}</p>
          </div>
          <div className="text-center p-1 bg-slate-100 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>待機</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.standby}</p>
          </div>
          <div className="text-center p-1 bg-slate-100 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>宿直</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.nightDuty}</p>
          </div>
        </div>
        {/* 休暇・休日関連 */}
        <p className="text-xs text-gray-600 mb-1">休暇・休日</p>
        <div className="grid grid-cols-9 gap-1 mb-2">
          <div className="text-center p-1 bg-blue-100 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>有休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.annualLeave}</p>
          </div>
          <div className="text-center p-1 bg-blue-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>午前休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.amLeave}</p>
          </div>
          <div className="text-center p-1 bg-blue-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>午後休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.pmLeave}</p>
          </div>
          <div className="text-center p-1 bg-blue-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>時間有休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.hourlyLeave}</p>
          </div>
          <div className="text-center p-1 bg-amber-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>休出</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.holidayWork}</p>
          </div>
          <div className="text-center p-1 bg-cyan-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>振替出勤</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.substituteWork}</p>
          </div>
          <div className="text-center p-1 bg-cyan-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>振休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.substituteHoliday}</p>
          </div>
          <div className="text-center p-1 bg-amber-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>代休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.compensatoryLeave}</p>
          </div>
          <div className="text-center p-1 bg-gray-200 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>欠勤</p>
            <p style={{ fontSize: '11px' }} className="font-bold text-red-600">{employee.applicationCounts.absence}</p>
          </div>
        </div>
        <div className="grid grid-cols-9 gap-1">
          <div className="text-center p-1 bg-pink-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>特休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.specialLeave}</p>
          </div>
          <div className="text-center p-1 bg-pink-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>生理休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.menstrualLeave}</p>
          </div>
          <div className="text-center p-1 bg-teal-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>看護休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.childCareLeave}</p>
          </div>
          <div className="text-center p-1 bg-teal-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>時間看護</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.hourlyChildCareLeave}</p>
          </div>
          <div className="text-center p-1 bg-teal-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>介護休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.nursingCareLeave}</p>
          </div>
          <div className="text-center p-1 bg-teal-50 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>時間介護</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.hourlyNursingCareLeave}</p>
          </div>
          <div className="text-center p-1 bg-slate-100 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>明け休</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.postNightLeave}</p>
          </div>
          <div className="text-center p-1 bg-gray-100 rounded">
            <p className="text-gray-500" style={{ fontSize: '8px' }}>その他</p>
            <p style={{ fontSize: '11px' }} className="font-bold">{employee.applicationCounts.other}</p>
          </div>
          <div></div>
        </div>
      </div>

      {/* 違反・注意事項 */}
      <div className="border border-gray-300 p-4 rounded-b-lg">
        <h2 className="text-sm font-bold text-gray-800 border-b border-gray-300 pb-1 mb-3">
          注意事項
        </h2>

        {employee.violations.length === 0 ? (
          <div className="text-center py-4 text-green-600">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">違反はありません</p>
          </div>
        ) : (
          <>
            {/* 違反サマリー */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className={`text-center p-1 rounded ${highUrgencyCount > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">高緊急度</p>
                <p className={`font-bold ${highUrgencyCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {highUrgencyCount}件
                </p>
              </div>
              <div className={`text-center p-1 rounded ${mediumUrgencyCount > 0 ? 'bg-yellow-100' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">中緊急度</p>
                <p className={`font-bold ${mediumUrgencyCount > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {mediumUrgencyCount}件
                </p>
              </div>
              <div className={`text-center p-1 rounded ${employee.missingClockDays > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">打刻漏れ</p>
                <p className={`font-bold ${employee.missingClockDays > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {employee.missingClockDays}日
                </p>
              </div>
              <div className={`text-center p-1 rounded ${employee.breakViolationDays > 0 ? 'bg-purple-100' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500">休憩違反</p>
                <p className={`font-bold ${employee.breakViolationDays > 0 ? 'text-purple-600' : 'text-gray-600'}`}>
                  {employee.breakViolationDays}日
                </p>
              </div>
            </div>

            {/* 違反詳細リスト（最大10件） */}
            <div className="text-xs">
              <p className="font-medium text-gray-600 mb-1">違反詳細:</p>
              <ul className="space-y-1">
                {employee.violations.slice(0, 10).map((v, idx) => (
                  <li key={idx} className="flex items-start text-gray-700">
                    <span className="text-gray-400 mr-2 flex-shrink-0">
                      {AttendanceService.formatDate(v.date)}
                    </span>
                    <span className="font-medium mr-1 flex-shrink-0">
                      {VIOLATION_DISPLAY_INFO[v.type]?.displayName || v.type}:
                    </span>
                    <span className="text-gray-500">{v.details}</span>
                  </li>
                ))}
                {employee.violations.length > 10 && (
                  <li className="text-gray-400">...他{employee.violations.length - 10}件</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceAnalysisPage;
