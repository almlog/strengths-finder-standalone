/**
 * LINE WORKS Webhook送信サービス
 *
 * @module services/LineWorksService
 * @description LINE WORKS Webhook Bot APIを使用した通知機能
 */

import {
  LineWorksConfig,
  LineWorksMessage,
  LineWorksSendHistory,
  LineWorksSendResult,
  NotificationType,
  LINEWORKS_STORAGE_KEYS,
  LINEWORKS_HISTORY_MAX_ENTRIES,
} from '../types/lineworks';
import { ExtendedAnalysisResult } from '../models/AttendanceTypes';
import { StrengthsAnalysisResult, MemberStrengths, StrengthGroup } from '../models/StrengthsTypes';

/**
 * LINE WORKS Webhook送信サービス
 */
export class LineWorksService {

  // ==================== 設定管理 ====================

  /**
   * Webhook設定を取得
   */
  static getConfig(): LineWorksConfig | null {
    try {
      const stored = localStorage.getItem(LINEWORKS_STORAGE_KEYS.CONFIG);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Webhook URLを設定
   */
  static setConfig(webhookUrl: string): void {
    const config: LineWorksConfig = {
      webhookUrl,
      configuredAt: Date.now(),
    };
    localStorage.setItem(LINEWORKS_STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }

  /**
   * 設定をクリア
   */
  static clearConfig(): void {
    localStorage.removeItem(LINEWORKS_STORAGE_KEYS.CONFIG);
  }

  /**
   * 設定済みかどうか
   */
  static isConfigured(): boolean {
    const config = this.getConfig();
    return config !== null && config.webhookUrl.length > 0;
  }

  // ==================== メッセージ送信 ====================

  /**
   * メッセージを送信
   */
  static async send(
    type: NotificationType,
    text: string
  ): Promise<LineWorksSendResult> {
    const config = this.getConfig();
    if (!config?.webhookUrl) {
      return { success: false, error: 'Webhook URLが設定されていません' };
    }

    const message: LineWorksMessage = {
      content: { type: 'text', text },
    };

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      const success = response.ok;

      // 履歴を保存
      this.addHistory({
        id: crypto.randomUUID(),
        type,
        sentAt: Date.now(),
        success,
        messagePreview: text.substring(0, 100),
        error: success ? undefined : `HTTP ${response.status}`,
      });

      // 最終送信日時を更新
      if (success) {
        const updatedConfig: LineWorksConfig = { ...config, lastSentAt: Date.now() };
        localStorage.setItem(LINEWORKS_STORAGE_KEYS.CONFIG, JSON.stringify(updatedConfig));
      }

      return { success, error: success ? undefined : `送信エラー: ${response.status}` };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';

      this.addHistory({
        id: crypto.randomUUID(),
        type,
        sentAt: Date.now(),
        success: false,
        messagePreview: text.substring(0, 100),
        error: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  }

  // ==================== メッセージ構築 ====================

  /**
   * 勤怠サマリーメッセージを構築
   */
  static buildAttendanceMessage(result: ExtendedAnalysisResult): string {
    const { summary, departmentSummaries, allViolations, employeeSummaries } = result;
    const dateRange = `${this.formatDate(summary.analysisDateRange.start)}〜${this.formatDate(summary.analysisDateRange.end)}`;

    const lines: string[] = [
      '【勤怠分析サマリー】',
      `期間: ${dateRange}`,
      '',
    ];

    // ■ 全体統計
    lines.push('■ 全体統計');
    lines.push(`  対象者: ${summary.totalEmployees}名`);
    lines.push(`  問題あり: ${summary.employeesWithIssues}名`);

    // 全体の総残業時間を計算
    const totalOvertimeMinutes = employeeSummaries.reduce(
      (sum, emp) => sum + emp.totalOvertimeMinutes, 0
    );
    const totalOvertimeHours = Math.floor(totalOvertimeMinutes / 60);
    const totalOvertimeMins = totalOvertimeMinutes % 60;
    lines.push(`  総残業時間: ${totalOvertimeHours}h${totalOvertimeMins}m`);

    // ■ 違反サマリー
    lines.push('', '■ 違反サマリー');
    lines.push(`  高緊急度: ${summary.highUrgencyCount}件`);
    lines.push(`  中緊急度: ${summary.mediumUrgencyCount}件`);
    lines.push(`  低緊急度: ${summary.lowUrgencyCount}件`);

    // 違反種別ごとの件数
    const violationCounts: Record<string, number> = {};
    allViolations.forEach((v) => {
      violationCounts[v.type] = (violationCounts[v.type] || 0) + 1;
    });

    if (Object.keys(violationCounts).length > 0) {
      const violationLabels: Record<string, string> = {
        missing_clock: '打刻漏れ',
        break_violation: '休憩違反',
        late_application_missing: '遅刻届出漏れ',
        early_leave_application_missing: '早退届出漏れ',
        early_start_application_missing: '早出届出漏れ',
        time_leave_punch_missing: '時間有休打刻漏れ',
        night_break_application_missing: '深夜休憩届出漏れ',
        remarks_missing: '備考未入力',
        remarks_format_warning: '備考フォーマット',
      };

      lines.push('  【内訳】');
      Object.entries(violationCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          const label = violationLabels[type] || type;
          lines.push(`    ${label}: ${count}件`);
        });
    }

    // ■ 部門別 平均残業時間
    if (departmentSummaries.length > 0) {
      lines.push('', '■ 部門別 平均残業時間');
      const sorted = [...departmentSummaries].sort(
        (a, b) => b.averageOvertimeMinutes - a.averageOvertimeMinutes
      );
      sorted.forEach((dept) => {
        const avgHours = Math.floor(dept.averageOvertimeMinutes / 60);
        const avgMins = dept.averageOvertimeMinutes % 60;
        lines.push(`  ${dept.department}(${dept.employeeCount}名): ${avgHours}h${avgMins}m`);
      });
    }

    // ■ 残業状況（45時間超過者）
    const overtimeWarning = employeeSummaries
      .filter((emp) => emp.totalOvertimeMinutes >= 45 * 60)
      .sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes);

    if (overtimeWarning.length > 0) {
      lines.push('', '■ 残業状況（45h超過）');
      overtimeWarning.slice(0, 5).forEach((emp) => {
        const hours = Math.floor(emp.totalOvertimeMinutes / 60);
        const mins = emp.totalOvertimeMinutes % 60;
        lines.push(`  ${emp.employeeName}(${emp.department}): ${hours}h${mins}m`);
      });
      if (overtimeWarning.length > 5) {
        lines.push(`  ...他${overtimeWarning.length - 5}名`);
      }
    }

    return lines.join('\n');
  }

  /**
   * チーム分析メッセージを構築
   */
  static buildTeamAnalysisMessage(
    result: StrengthsAnalysisResult,
    members: MemberStrengths[],
    departmentName?: string
  ): string {
    const { groupDistribution, topStrengths } = result;
    const title = departmentName ? `【${departmentName}チーム分析】` : '【チーム分析】';

    const lines: string[] = [
      title,
      `対象者: ${members.length}名`,
      '',
      '■ 強みグループ分布',
      `  実行力: ${groupDistribution[StrengthGroup.EXECUTING] || 0}`,
      `  影響力: ${groupDistribution[StrengthGroup.INFLUENCING] || 0}`,
      `  人間関係構築力: ${groupDistribution[StrengthGroup.RELATIONSHIP_BUILDING] || 0}`,
      `  戦略的思考力: ${groupDistribution[StrengthGroup.STRATEGIC_THINKING] || 0}`,
    ];

    // TOP5資質
    if (topStrengths && topStrengths.length > 0) {
      lines.push('', '■ 頻出資質TOP5');
      topStrengths.slice(0, 5).forEach((s, i) => {
        lines.push(`  ${i + 1}. ${s.name}`);
      });
    }

    return lines.join('\n');
  }

  // ==================== 履歴管理 ====================

  /**
   * 送信履歴を取得
   */
  static getHistory(): LineWorksSendHistory[] {
    try {
      const stored = localStorage.getItem(LINEWORKS_STORAGE_KEYS.HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 履歴を追加（最大件数を超えたら古いものを削除）
   */
  private static addHistory(entry: LineWorksSendHistory): void {
    try {
      const history = this.getHistory();
      history.unshift(entry);
      const trimmed = history.slice(0, LINEWORKS_HISTORY_MAX_ENTRIES);
      localStorage.setItem(LINEWORKS_STORAGE_KEYS.HISTORY, JSON.stringify(trimmed));
    } catch (error) {
      console.warn('[LineWorksService] 履歴保存エラー:', error);
    }
  }

  /**
   * 履歴をクリア
   */
  static clearHistory(): void {
    localStorage.removeItem(LINEWORKS_STORAGE_KEYS.HISTORY);
  }

  // ==================== ユーティリティ ====================

  /**
   * 日付をフォーマット（M/D形式）
   */
  private static formatDate(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
}
