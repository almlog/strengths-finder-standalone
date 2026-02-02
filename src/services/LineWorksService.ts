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
   * 勤怠サマリーメッセージを構築（リーダー向けアクション形式）
   */
  static buildAttendanceMessage(result: ExtendedAnalysisResult): string {
    const { summary, employeeSummaries } = result;
    const dateRange = `${this.formatDate(summary.analysisDateRange.start)}〜${this.formatDate(summary.analysisDateRange.end)}`;

    const lines: string[] = [
      '【勤怠アラート】',
      `期間: ${dateRange}`,
      '',
    ];

    // アラートレベルごとにグループ化
    const alertGroups: Record<OvertimeAlertLevel, Array<{
      name: string;
      id: string;
      overtime: string;
    }>> = {
      illegal: [],
      critical: [],
      severe: [],
      serious: [],
      caution: [],
      exceeded: [],
      warning: [],
      normal: [],
    };

    employeeSummaries.forEach((emp) => {
      const level = this.getOvertimeAlertLevel(emp.totalOvertimeMinutes);
      const hours = Math.floor(emp.totalOvertimeMinutes / 60);
      const mins = emp.totalOvertimeMinutes % 60;
      alertGroups[level].push({
        name: emp.employeeName,
        id: emp.employeeId,
        overtime: `${hours}:${mins.toString().padStart(2, '0')}`,
      });
    });

    // 高い緊急度から順に表示（normalは除く）
    const alertOrder: OvertimeAlertLevel[] = [
      'illegal', 'critical', 'severe', 'serious', 'caution', 'exceeded', 'warning'
    ];

    let hasAlerts = false;

    alertOrder.forEach((level) => {
      const members = alertGroups[level];
      if (members.length === 0) return;

      hasAlerts = true;
      const { label, action } = this.ALERT_DISPLAY[level];

      lines.push(`■ ${label}（${members.length}名）`);
      lines.push(`  → ${action}`);

      // 残業時間でソート（降順）
      members.sort((a, b) => {
        const aMin = parseInt(a.overtime.split(':')[0]) * 60 + parseInt(a.overtime.split(':')[1]);
        const bMin = parseInt(b.overtime.split(':')[0]) * 60 + parseInt(b.overtime.split(':')[1]);
        return bMin - aMin;
      });

      members.forEach((m) => {
        lines.push(`  ${m.name}  ${m.id}  ${m.overtime}`);
      });
      lines.push('');
    });

    if (!hasAlerts) {
      lines.push('対応が必要なメンバーはいません。');
    }

    // 基準説明
    lines.push('---');
    lines.push('36協定基準: 35h注意/45h超過/55h警戒/65h深刻/70h重大/80h危険/100h違法');

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
