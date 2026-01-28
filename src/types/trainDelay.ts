/**
 * 遅延情報関連の型定義
 * @module types/trainDelay
 */

/**
 * 運行ステータス
 */
export type TrainStatus = 'delayed' | 'suspended' | 'normal' | 'unknown';

/**
 * 事業者グループ
 */
export type OperatorGroup = 'JR' | 'metro' | 'toei' | 'private' | 'all';

/**
 * 遅延情報
 */
export interface TrainDelayInfo {
  /** 一意識別子 */
  id: string;
  /** 路線ID (例: odpt.Railway:JR-East.ChuoRapid) */
  railway: string;
  /** 路線名 (例: 中央線快速) */
  railwayName: string;
  /** 事業者ID (例: odpt.Operator:JR-East) */
  operator: string;
  /** 事業者名 (例: JR東日本) */
  operatorName: string;
  /** 運行ステータス */
  status: TrainStatus;
  /** 遅延時間（分） */
  delayMinutes?: number;
  /** 遅延原因 */
  cause?: string;
  /** 運行情報テキスト */
  informationText: string;
  /** 取得時刻 (ISO8601) */
  fetchedAt: string;
}

/**
 * 遅延履歴エントリ
 */
export interface DelayHistoryEntry extends TrainDelayInfo {
  /** 記録時刻 (ISO8601) */
  recordedAt: string;
}

/**
 * サービスの状態
 */
export interface DelayServiceState {
  /** 現在の遅延情報 */
  currentDelays: TrainDelayInfo[];
  /** 履歴 */
  history: DelayHistoryEntry[];
  /** 最終更新時刻 */
  lastUpdated: string | null;
  /** ローディング中 */
  isLoading: boolean;
  /** エラーメッセージ */
  error: string | null;
}

/**
 * ODPT API レスポンスの型
 */
export interface ODPTTrainInformationResponse {
  '@context': string;
  '@id': string;
  '@type': 'odpt:TrainInformation';
  'dc:date': string;
  'odpt:operator': string;
  'odpt:railway'?: string;
  'odpt:trainInformationStatus'?: string;
  'odpt:trainInformationText': string;
  'odpt:trainInformationCause'?: string;
}

/**
 * 事業者マッピング
 */
export const OPERATOR_NAMES: Record<string, string> = {
  'odpt.Operator:JR-East': 'JR東日本',
  'odpt.Operator:TokyoMetro': '東京メトロ',
  'odpt.Operator:Toei': '都営地下鉄',
  'odpt.Operator:Tokyu': '東急電鉄',
  'odpt.Operator:Odakyu': '小田急電鉄',
  'odpt.Operator:Keio': '京王電鉄',
  'odpt.Operator:Seibu': '西武鉄道',
  'odpt.Operator:Tobu': '東武鉄道',
  'odpt.Operator:Keikyu': '京急電鉄',
  'odpt.Operator:Keisei': '京成電鉄',
  'odpt.Operator:TWR': 'りんかい線',
  'odpt.Operator:MIR': 'つくばエクスプレス',
  'odpt.Operator:YokohamaMunicipal': '横浜市営地下鉄',
};

/**
 * 路線名マッピング（主要路線）
 */
export const RAILWAY_NAMES: Record<string, string> = {
  // JR東日本
  'odpt.Railway:JR-East.ChuoRapid': '中央線快速',
  'odpt.Railway:JR-East.ChuoSobuLocal': '中央・総武線各停',
  'odpt.Railway:JR-East.Yamanote': '山手線',
  'odpt.Railway:JR-East.SobuRapid': '総武線快速',
  'odpt.Railway:JR-East.Tokaido': '東海道線',
  'odpt.Railway:JR-East.Keihin-Tohoku': '京浜東北線',
  'odpt.Railway:JR-East.Saikyo': '埼京線',
  'odpt.Railway:JR-East.Takasaki': '高崎線',
  'odpt.Railway:JR-East.Utsunomiya': '宇都宮線',
  'odpt.Railway:JR-East.Yokohama': '横浜線',
  'odpt.Railway:JR-East.Nambu': '南武線',
  'odpt.Railway:JR-East.Musashino': '武蔵野線',
  'odpt.Railway:JR-East.Chuo': '中央本線',
  // 東京メトロ
  'odpt.Railway:TokyoMetro.Ginza': '銀座線',
  'odpt.Railway:TokyoMetro.Marunouchi': '丸ノ内線',
  'odpt.Railway:TokyoMetro.Hibiya': '日比谷線',
  'odpt.Railway:TokyoMetro.Tozai': '東西線',
  'odpt.Railway:TokyoMetro.Chiyoda': '千代田線',
  'odpt.Railway:TokyoMetro.Yurakucho': '有楽町線',
  'odpt.Railway:TokyoMetro.Hanzomon': '半蔵門線',
  'odpt.Railway:TokyoMetro.Namboku': '南北線',
  'odpt.Railway:TokyoMetro.Fukutoshin': '副都心線',
  // 都営地下鉄
  'odpt.Railway:Toei.Asakusa': '都営浅草線',
  'odpt.Railway:Toei.Mita': '都営三田線',
  'odpt.Railway:Toei.Shinjuku': '都営新宿線',
  'odpt.Railway:Toei.Oedo': '都営大江戸線',
  // 私鉄（主要路線）
  'odpt.Railway:Tokyu.Toyoko': '東急東横線',
  'odpt.Railway:Tokyu.DenEnToshi': '東急田園都市線',
  'odpt.Railway:Odakyu.Odawara': '小田急小田原線',
  'odpt.Railway:Keio.Keio': '京王線',
  'odpt.Railway:Keio.Inokashira': '京王井の頭線',
  'odpt.Railway:Seibu.Ikebukuro': '西武池袋線',
  'odpt.Railway:Seibu.Shinjuku': '西武新宿線',
  'odpt.Railway:Tobu.Tojo': '東武東上線',
  'odpt.Railway:Tobu.Skytree': '東武スカイツリーライン',
};

/**
 * 事業者グループマッピング
 */
export const OPERATOR_GROUPS: Record<string, OperatorGroup> = {
  'odpt.Operator:JR-East': 'JR',
  'odpt.Operator:TokyoMetro': 'metro',
  'odpt.Operator:Toei': 'toei',
  'odpt.Operator:Tokyu': 'private',
  'odpt.Operator:Odakyu': 'private',
  'odpt.Operator:Keio': 'private',
  'odpt.Operator:Seibu': 'private',
  'odpt.Operator:Tobu': 'private',
  'odpt.Operator:Keikyu': 'private',
  'odpt.Operator:Keisei': 'private',
  'odpt.Operator:TWR': 'private',
  'odpt.Operator:MIR': 'private',
};

/**
 * LocalStorage キー
 */
export const DELAY_STORAGE_KEY = 'train-delay-history';

/**
 * 履歴保持時間（ミリ秒）- 6時間
 */
export const HISTORY_RETENTION_MS = 6 * 60 * 60 * 1000;

/**
 * API更新間隔（ミリ秒）- 5分
 */
export const UPDATE_INTERVAL_MS = 5 * 60 * 1000;
