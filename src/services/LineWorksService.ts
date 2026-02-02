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
    const { summary, departmentSummaries, allViolations } = result;
    const dateRange = `${this.formatDate(summary.analysisDateRange.start)}〜${this.formatDate(summary.analysisDateRange.end)}`;

    const lines: string[] = [
      '【勤怠分析サマリー】',
      `期間: ${dateRange}`,
      `対象者: ${summary.totalEmployees}名`,
      '',
      '■ アラート状況',
      `  高緊急度: ${summary.highUrgencyCount}件`,
      `  中緊急度: ${summary.mediumUrgencyCount}件`,
      `  低緊急度: ${summary.lowUrgencyCount}件`,
    ];

    // 部門別サマリー（上位3部門）
    if (departmentSummaries.length > 0) {
      lines.push('', '■ 部門別残業時間（TOP3）');
      const sorted = [...departmentSummaries].sort(
        (a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes
      );
      sorted.slice(0, 3).forEach((dept, i) => {
        const hours = Math.floor(dept.totalOvertimeMinutes / 60);
        const mins = dept.totalOvertimeMinutes % 60;
        lines.push(`  ${i + 1}. ${dept.department}: ${hours}h${mins}m`);
      });
    }

    // 高緊急度の違反（具体例）
    const highUrgency = allViolations.filter(
      (v) => v.type === 'missing_clock'
    );
    if (highUrgency.length > 0) {
      lines.push('', '■ 要対応（抜粋）');
      highUrgency.slice(0, 3).forEach((v) => {
        lines.push(`  • ${v.employeeName}: ${v.details}`);
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
