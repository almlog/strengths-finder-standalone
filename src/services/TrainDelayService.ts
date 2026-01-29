/**
 * 遅延情報取得・管理サービス
 * @module services/TrainDelayService
 */

import {
  TrainDelayInfo,
  DelayHistoryEntry,
  ODPTTrainInformationResponse,
  OperatorGroup,
  TrainStatus,
  OPERATOR_NAMES,
  RAILWAY_NAMES,
  OPERATOR_GROUPS,
  DELAY_STORAGE_KEY,
  HISTORY_RETENTION_MS,
} from '../types/trainDelay';
import { fetchExternalDelayHistory } from './YahooDelayService';

/**
 * 運行情報テキストからステータスを判定
 */
export function parseDelayStatus(text: string | unknown): TrainStatus {
  // textが文字列でない場合はunknownを返す
  if (!text || typeof text !== 'string') return 'unknown';

  // 平常運転のキーワード
  if (
    text.includes('平常') ||
    text.includes('通常') ||
    text.includes('Normal')
  ) {
    return 'normal';
  }

  // 運転見合わせ/運休のキーワード
  if (
    text.includes('見合わせ') ||
    text.includes('運休') ||
    text.includes('不通')
  ) {
    return 'suspended';
  }

  // 遅延のキーワード
  if (
    text.includes('遅れ') ||
    text.includes('遅延') ||
    text.includes('ダイヤ乱れ')
  ) {
    return 'delayed';
  }

  return 'unknown';
}

/**
 * テキストから遅延時間（分）を抽出
 */
export function extractDelayMinutes(text: string | unknown): number | undefined {
  // textが文字列でない場合はundefinedを返す
  if (!text || typeof text !== 'string') return undefined;

  // 「約15分」「10分程度」「最大30分」などのパターンをマッチ
  const match = text.match(/(?:約|最大|)(\d+)分/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return undefined;
}

/**
 * 路線IDから路線名を取得
 */
export function getRailwayName(railwayId: string): string {
  if (RAILWAY_NAMES[railwayId]) {
    return RAILWAY_NAMES[railwayId];
  }
  // マッピングにない場合はIDから抽出
  const parts = railwayId.split('.');
  return parts[parts.length - 1] || railwayId;
}

/**
 * 事業者IDから事業者名を取得
 */
export function getOperatorName(operatorId: string): string {
  if (OPERATOR_NAMES[operatorId]) {
    return OPERATOR_NAMES[operatorId];
  }
  // マッピングにない場合はIDから抽出
  const parts = operatorId.split(':');
  return parts[parts.length - 1] || operatorId;
}

/**
 * 遅延情報サービス
 */
export class TrainDelayService {
  private token: string;
  private cache: TrainDelayInfo[] = [];
  private history: DelayHistoryEntry[] = [];
  private lastFetched: Date | null = null;

  constructor(token: string) {
    this.token = token;
    this.loadHistory();
  }

  /**
   * ODPT APIから遅延情報を取得
   */
  async fetchDelayInfo(): Promise<TrainDelayInfo[]> {
    const operators = [
      'odpt.Operator:JR-East',
      'odpt.Operator:TokyoMetro',
      'odpt.Operator:Toei',
      'odpt.Operator:Tokyu',
      'odpt.Operator:Odakyu',
      'odpt.Operator:Keio',
      'odpt.Operator:Seibu',
      'odpt.Operator:Tobu',
    ];

    const url = `https://api.odpt.org/api/v4/odpt:TrainInformation?odpt:operator=${operators.join(',')}&acl:consumerKey=${this.token}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ODPTTrainInformationResponse[] = await response.json();
      const now = new Date().toISOString();

      const delayInfos: TrainDelayInfo[] = data.map((item) => {
        const status = parseDelayStatus(item['odpt:trainInformationText']);
        return {
          id: item['@id'],
          railway: item['odpt:railway'] || '',
          railwayName: item['odpt:railway']
            ? getRailwayName(item['odpt:railway'])
            : getOperatorName(item['odpt:operator']),
          operator: item['odpt:operator'],
          operatorName: getOperatorName(item['odpt:operator']),
          status,
          delayMinutes: extractDelayMinutes(item['odpt:trainInformationText']),
          cause: item['odpt:trainInformationCause'],
          informationText: item['odpt:trainInformationText'],
          fetchedAt: now,
        };
      });

      this.cache = delayInfos;
      this.lastFetched = new Date();
      this.updateHistory(delayInfos);

      return delayInfos;
    } catch (error) {
      console.error('[TrainDelayService] Fetch error:', error);
      // エラー時はキャッシュを返す
      return this.cache;
    }
  }

  /**
   * 現在の遅延情報（遅延・運休のみ）を取得
   */
  getCurrentDelays(): TrainDelayInfo[] {
    return this.cache.filter(
      (info) => info.status === 'delayed' || info.status === 'suspended'
    );
  }

  /**
   * 全ての運行情報を取得
   */
  getAllInfo(): TrainDelayInfo[] {
    return this.cache;
  }

  /**
   * 事業者グループでフィルタ
   */
  filterByOperatorGroup(group: OperatorGroup): TrainDelayInfo[] {
    if (group === 'all') {
      return this.cache;
    }
    return this.cache.filter((info) => {
      const infoGroup = OPERATOR_GROUPS[info.operator];
      return infoGroup === group;
    });
  }

  /**
   * 履歴を取得（古いものを削除済み）
   */
  getHistory(): DelayHistoryEntry[] {
    this.pruneOldHistory();
    return this.history;
  }

  /**
   * ティッカー用のテキストを生成
   */
  getTickerText(): string {
    const delays = this.getCurrentDelays();

    if (delays.length === 0) {
      return '主要路線は平常運転です';
    }

    // 遅延情報をテキスト化
    const texts = delays.map((delay) => {
      let text = delay.railwayName;
      if (delay.delayMinutes) {
        text += ` 約${delay.delayMinutes}分遅れ`;
      } else if (delay.status === 'suspended') {
        text += ' 運転見合わせ';
      } else {
        text += ' 遅延';
      }
      return text;
    });

    return texts.join(' / ');
  }

  /**
   * 最終更新時刻を取得
   */
  getLastUpdated(): Date | null {
    return this.lastFetched;
  }

  /**
   * 履歴を更新
   */
  private updateHistory(infos: TrainDelayInfo[]): void {
    const now = new Date().toISOString();

    // 遅延・運休のみを履歴に追加
    const delayedInfos = infos.filter(
      (info) => info.status === 'delayed' || info.status === 'suspended'
    );

    console.log('[TrainDelayService] updateHistory - delayed infos:', delayedInfos.length);

    const newEntries: DelayHistoryEntry[] = delayedInfos.map((info) => ({
      ...info,
      recordedAt: now,
    }));

    // 重複を避けるため、同じ路線の直近のエントリは更新しない（5分以内）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    let addedCount = 0;
    newEntries.forEach((entry) => {
      const existingIndex = this.history.findIndex(
        (h) => h.railway === entry.railway && h.recordedAt > fiveMinutesAgo
      );

      if (existingIndex === -1) {
        this.history.unshift(entry);
        addedCount++;
        console.log('[TrainDelayService] Added history entry:', entry.railwayName);
      }
    });

    console.log('[TrainDelayService] History update complete:', {
      added: addedCount,
      total: this.history.length,
    });

    this.saveHistory();
  }

  /**
   * LocalStorageから履歴を読み込み
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(DELAY_STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
        console.log('[TrainDelayService] Loaded history from storage:', this.history.length, 'entries');
        this.pruneOldHistory();
        console.log('[TrainDelayService] After pruning:', this.history.length, 'entries');
      } else {
        console.log('[TrainDelayService] No history in storage');
      }
    } catch (error) {
      console.error('[TrainDelayService] Load history error:', error);
      this.history = [];
    }
  }

  /**
   * LocalStorageから履歴を再読み込み（外部から呼び出し可能）
   */
  reloadHistory(): void {
    this.loadHistory();
  }

  /**
   * 外部ソース（Yahoo!路線情報、JR東日本RSS）から遅延履歴を取得
   * ODPTのリアルタイムデータを補完
   */
  async fetchExternalHistory(): Promise<DelayHistoryEntry[]> {
    try {
      console.log('[TrainDelayService] Fetching external history...');
      const externalEntries = await fetchExternalDelayHistory();

      // 外部ソースのエントリを履歴にマージ
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      let addedCount = 0;
      externalEntries.forEach((entry) => {
        // 同じ路線の直近エントリがなければ追加
        const existingIndex = this.history.findIndex(
          (h) => h.railwayName === entry.railwayName && h.recordedAt > fiveMinutesAgo
        );

        if (existingIndex === -1) {
          this.history.unshift(entry);
          addedCount++;
          console.log('[TrainDelayService] Added external entry:', entry.railwayName);
        }
      });

      if (addedCount > 0) {
        this.saveHistory();
        console.log('[TrainDelayService] Added', addedCount, 'external entries');
      }

      return externalEntries;
    } catch (error) {
      console.error('[TrainDelayService] External fetch error:', error);
      return [];
    }
  }

  /**
   * LocalStorageに履歴を保存
   */
  private saveHistory(): void {
    try {
      localStorage.setItem(DELAY_STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error('[TrainDelayService] Save history error:', error);
    }
  }

  /**
   * 古い履歴エントリを削除
   */
  private pruneOldHistory(): void {
    const cutoff = new Date(Date.now() - HISTORY_RETENTION_MS).toISOString();
    this.history = this.history.filter((entry) => entry.recordedAt > cutoff);
    this.saveHistory();
  }
}

/**
 * シングルトンインスタンス用のファクトリ
 */
let serviceInstance: TrainDelayService | null = null;

export function getTrainDelayService(token: string): TrainDelayService {
  if (!serviceInstance) {
    serviceInstance = new TrainDelayService(token);
  }
  return serviceInstance;
}

export function resetTrainDelayService(): void {
  serviceInstance = null;
}
