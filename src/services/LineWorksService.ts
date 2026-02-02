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
import { ExtendedAnalysisResult, OvertimeAlertLevel, OVERTIME_THRESHOLDS } from '../models/AttendanceTypes';
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
   * 残業時間からアラートレベルを判定
   */
  private static getOvertimeAlertLevel(overtimeMinutes: number): OvertimeAlertLevel {
    const hours = overtimeMinutes / 60;
    if (hours >= OVERTIME_THRESHOLDS.SPECIAL_LIMIT_HOURS) return 'illegal';
    if (hours >= OVERTIME_THRESHOLDS.CRITICAL_HOURS) return 'critical';
    if (hours >= OVERTIME_THRESHOLDS.SEVERE_HOURS) return 'severe';
    if (hours >= OVERTIME_THRESHOLDS.SERIOUS_HOURS) return 'serious';
    if (hours >= OVERTIME_THRESHOLDS.CAUTION_HOURS) return 'caution';
    if (hours >= OVERTIME_THRESHOLDS.LIMIT_HOURS) return 'exceeded';
    if (hours >= OVERTIME_THRESHOLDS.WARNING_HOURS) return 'warning';
    return 'normal';
  }

  /**
   * アラートレベルの表示情報
   */
  private static readonly ALERT_DISPLAY: Record<OvertimeAlertLevel, { label: string; action: string }> = {
    illegal: { label: '違法', action: '即時是正必須' },
    critical: { label: '危険', action: '医師面接指導' },
    severe: { label: '重大', action: '親会社への報告' },
    serious: { label: '深刻', action: '残業禁止措置の検討' },
    caution: { label: '警戒', action: '残業抑制指示' },
    exceeded: { label: '超過', action: '特別条項確認' },
    warning: { label: '注意', action: '上長への報告が必要です' },
    normal: { label: '正常', action: '' },
  };

  /**
   * 月末予測残業時間を計算
   */
  private static calculateProjectedOvertime(
    currentMinutes: number,
    passedWeekdays: number,
    totalWeekdaysInMonth: number
  ): number {
    if (passedWeekdays <= 0) return currentMinutes;
    return Math.round(currentMinutes * (totalWeekdaysInMonth / passedWeekdays));
  }

  /**
   * 分を時:分形式に変換
   */
  private static formatMinutesToHM(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * 勤怠サマリーメッセージを構築
   */
  static buildAttendanceMessage(result: ExtendedAnalysisResult): string {
    const { summary, employeeSummaries, departmentSummaries, allViolations } = result;
    const dateRange = `${this.formatDate(summary.analysisDateRange.start)}〜${this.formatDate(summary.analysisDateRange.end)}`;

    const lines: string[] = [
      '【勤怠分析サマリー】',
      `期間: ${dateRange}`,
      '',
    ];

    // ■ 全体統計
    const totalOvertimeMinutes = employeeSummaries.reduce(
      (sum, emp) => sum + emp.totalOvertimeMinutes, 0
    );
    lines.push('■ 全体統計');
    lines.push(`  対象者: ${summary.totalEmployees}名`);
    lines.push(`  問題あり: ${summary.employeesWithIssues}名`);
    lines.push(`  総残業時間: ${this.formatMinutesToHM(totalOvertimeMinutes)}`);

    // ■ 違反サマリー
    lines.push('', '■ 違反サマリー');

    // 高緊急度（法令違反）
    lines.push(`  高緊急度: ${summary.highUrgencyCount}名`);
    lines.push(`    （休憩違反/深夜休憩届出漏れ）`);

    // 中緊急度（届出漏れ）
    lines.push(`  中緊急度: ${summary.mediumUrgencyCount}名`);
    lines.push(`    （遅刻/早退/早出届出漏れ）`);

    // 違反種別の内訳
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

      lines.push('  内訳:');
      Object.entries(violationCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          const label = violationLabels[type] || type;
          lines.push(`    ${label}: ${count}件`);
        });
    }

    // ■ 部門別平均残業時間
    if (departmentSummaries.length > 0) {
      lines.push('', '■ 部門別平均残業時間');
      const sorted = [...departmentSummaries].sort(
        (a, b) => b.averageOvertimeMinutes - a.averageOvertimeMinutes
      );
      sorted.forEach((dept) => {
        lines.push(`  ${dept.department}: ${this.formatMinutesToHM(dept.averageOvertimeMinutes)}`);
      });
    }

    // ■ 残業状況（35h以上の月末予測者）
    const alertMembers: Array<{
      name: string;
      current: number;
      projected: number;
      level: string;
    }> = [];

    employeeSummaries.forEach((emp) => {
      const projectedMinutes = this.calculateProjectedOvertime(
        emp.totalOvertimeMinutes,
        emp.passedWeekdays,
        emp.totalWeekdaysInMonth
      );
      const level = this.getOvertimeAlertLevel(projectedMinutes);
      if (level !== 'normal') {
        alertMembers.push({
          name: emp.employeeName,
          current: emp.totalOvertimeMinutes,
          projected: projectedMinutes,
          level: this.ALERT_DISPLAY[level].label,
        });
      }
    });

    if (alertMembers.length > 0) {
      lines.push('', '■ 残業状況（36協定）');
      // 月末予測でソート（降順）
      alertMembers.sort((a, b) => b.projected - a.projected);
      alertMembers.forEach((m) => {
        lines.push(`  ${m.name}  ${this.formatMinutesToHM(m.current)} → ${this.formatMinutesToHM(m.projected)}  ${m.level}`);
      });
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
