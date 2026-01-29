/**
 * 駅データ取得・管理サービス
 * @module services/StationDataService
 *
 * 設計方針:
 * - 静的駅データを常に利用可能（API依存なし）
 * - ODPT APIはオプションの強化機能として扱う
 * - ローカルで動作することを優先
 */

import {
  StationInfo,
  StationDataCache,
  ODPTStationResponse,
  TARGET_OPERATORS,
  STATION_DATA_STORAGE_KEY,
  STATION_CACHE_TTL_MS,
} from '../types/station';
import { RAILWAY_NAMES } from '../types/trainDelay';

/**
 * 静的駅データ（主要路線の全駅）
 * これを基本データとして常に使用し、APIは補完用
 */
const STATIC_STATIONS: StationInfo[] = [
  // 中央線快速
  { id: 'fb-tokyo-chuo', name: '東京', railway: 'odpt.Railway:JR-East.ChuoRapid', railwayName: '中央線快速', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6812, longitude: 139.7671 } },
  { id: 'fb-shinjuku-chuo', name: '新宿', railway: 'odpt.Railway:JR-East.ChuoRapid', railwayName: '中央線快速', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6896, longitude: 139.7006 } },
  { id: 'fb-nakano', name: '中野', railway: 'odpt.Railway:JR-East.ChuoRapid', railwayName: '中央線快速', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7066, longitude: 139.6658 } },
  { id: 'fb-kichijoji', name: '吉祥寺', railway: 'odpt.Railway:JR-East.ChuoRapid', railwayName: '中央線快速', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7033, longitude: 139.5797 } },
  { id: 'fb-tachikawa', name: '立川', railway: 'odpt.Railway:JR-East.ChuoRapid', railwayName: '中央線快速', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6980, longitude: 139.4137 } },
  // 中央・総武線各停
  { id: 'fb-ochanomizu', name: '御茶ノ水', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6997, longitude: 139.7651 } },
  { id: 'fb-suidobashi', name: '水道橋', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7019, longitude: 139.7528 } },
  { id: 'fb-iidabashi', name: '飯田橋', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7019, longitude: 139.7456 } },
  { id: 'fb-yotsuya', name: '四ツ谷', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6860, longitude: 139.7302 } },
  { id: 'fb-shinjuku-sobu', name: '新宿', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6896, longitude: 139.7006 } },
  { id: 'fb-nakano-sobu', name: '中野', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7066, longitude: 139.6658 } },
  { id: 'fb-koenji', name: '高円寺', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7054, longitude: 139.6495 } },
  { id: 'fb-asagaya', name: '阿佐ヶ谷', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7045, longitude: 139.6356 } },
  { id: 'fb-ogikubo', name: '荻窪', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7036, longitude: 139.6202 } },
  { id: 'fb-nishi-ogikubo', name: '西荻窪', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7033, longitude: 139.5997 } },
  { id: 'fb-kichijoji-sobu', name: '吉祥寺', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7033, longitude: 139.5797 } },
  { id: 'fb-mitaka', name: '三鷹', railway: 'odpt.Railway:JR-East.ChuoSobuLocal', railwayName: '中央・総武線各停', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7028, longitude: 139.5606 } },
  // 山手線
  { id: 'fb-shibuya', name: '渋谷', railway: 'odpt.Railway:JR-East.Yamanote', railwayName: '山手線', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6580, longitude: 139.7016 } },
  { id: 'fb-shinjuku-yama', name: '新宿', railway: 'odpt.Railway:JR-East.Yamanote', railwayName: '山手線', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6896, longitude: 139.7006 } },
  { id: 'fb-ikebukuro', name: '池袋', railway: 'odpt.Railway:JR-East.Yamanote', railwayName: '山手線', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7295, longitude: 139.7109 } },
  { id: 'fb-ueno', name: '上野', railway: 'odpt.Railway:JR-East.Yamanote', railwayName: '山手線', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.7138, longitude: 139.7770 } },
  { id: 'fb-tokyo-yama', name: '東京', railway: 'odpt.Railway:JR-East.Yamanote', railwayName: '山手線', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6812, longitude: 139.7671 } },
  { id: 'fb-shinagawa', name: '品川', railway: 'odpt.Railway:JR-East.Yamanote', railwayName: '山手線', operator: 'odpt.Operator:JR-East', coordinate: { latitude: 35.6284, longitude: 139.7387 } },
  // 銀座線
  { id: 'fb-shibuya-ginza', name: '渋谷', railway: 'odpt.Railway:TokyoMetro.Ginza', railwayName: '銀座線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.6580, longitude: 139.7016 } },
  { id: 'fb-aoyama', name: '表参道', railway: 'odpt.Railway:TokyoMetro.Ginza', railwayName: '銀座線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.6653, longitude: 139.7122 } },
  { id: 'fb-akasakamitsuke', name: '赤坂見附', railway: 'odpt.Railway:TokyoMetro.Ginza', railwayName: '銀座線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.6770, longitude: 139.7378 } },
  { id: 'fb-ginza', name: '銀座', railway: 'odpt.Railway:TokyoMetro.Ginza', railwayName: '銀座線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.6716, longitude: 139.7638 } },
  { id: 'fb-nihombashi', name: '日本橋', railway: 'odpt.Railway:TokyoMetro.Ginza', railwayName: '銀座線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.6825, longitude: 139.7740 } },
  { id: 'fb-asakusa-ginza', name: '浅草', railway: 'odpt.Railway:TokyoMetro.Ginza', railwayName: '銀座線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.7114, longitude: 139.7972 } },
  // 丸ノ内線
  { id: 'fb-ogikubo-maru', name: '荻窪', railway: 'odpt.Railway:TokyoMetro.Marunouchi', railwayName: '丸ノ内線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.7036, longitude: 139.6202 } },
  { id: 'fb-shinjuku-maru', name: '新宿', railway: 'odpt.Railway:TokyoMetro.Marunouchi', railwayName: '丸ノ内線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.6896, longitude: 139.7006 } },
  { id: 'fb-ikebukuro-maru', name: '池袋', railway: 'odpt.Railway:TokyoMetro.Marunouchi', railwayName: '丸ノ内線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.7295, longitude: 139.7109 } },
  { id: 'fb-tokyo-maru', name: '東京', railway: 'odpt.Railway:TokyoMetro.Marunouchi', railwayName: '丸ノ内線', operator: 'odpt.Operator:TokyoMetro', coordinate: { latitude: 35.6812, longitude: 139.7671 } },
  // 都営三田線
  { id: 'fb-mejiro-mita', name: '目黒', railway: 'odpt.Railway:Toei.Mita', railwayName: '都営三田線', operator: 'odpt.Operator:Toei', coordinate: { latitude: 35.6337, longitude: 139.7158 } },
  { id: 'fb-hibiya-mita', name: '日比谷', railway: 'odpt.Railway:Toei.Mita', railwayName: '都営三田線', operator: 'odpt.Operator:Toei', coordinate: { latitude: 35.6755, longitude: 139.7594 } },
  { id: 'fb-otemachi-mita', name: '大手町', railway: 'odpt.Railway:Toei.Mita', railwayName: '都営三田線', operator: 'odpt.Operator:Toei', coordinate: { latitude: 35.6851, longitude: 139.7631 } },
  { id: 'fb-suidobashi-mita', name: '水道橋', railway: 'odpt.Railway:Toei.Mita', railwayName: '都営三田線', operator: 'odpt.Operator:Toei', coordinate: { latitude: 35.7019, longitude: 139.7528 } },
  { id: 'fb-sugamo-mita', name: '巣鴨', railway: 'odpt.Railway:Toei.Mita', railwayName: '都営三田線', operator: 'odpt.Operator:Toei', coordinate: { latitude: 35.7334, longitude: 139.7395 } },
  { id: 'fb-nishitakashimadaira', name: '西高島平', railway: 'odpt.Railway:Toei.Mita', railwayName: '都営三田線', operator: 'odpt.Operator:Toei', coordinate: { latitude: 35.7901, longitude: 139.6438 } },
  // 東急東横線
  { id: 'fb-shibuya-toyoko', name: '渋谷', railway: 'odpt.Railway:Tokyu.Toyoko', railwayName: '東急東横線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6580, longitude: 139.7016 } },
  { id: 'fb-nakameguro', name: '中目黒', railway: 'odpt.Railway:Tokyu.Toyoko', railwayName: '東急東横線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6444, longitude: 139.6994 } },
  { id: 'fb-jiyugaoka', name: '自由が丘', railway: 'odpt.Railway:Tokyu.Toyoko', railwayName: '東急東横線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6075, longitude: 139.6686 } },
  { id: 'fb-musashikosugi', name: '武蔵小杉', railway: 'odpt.Railway:Tokyu.Toyoko', railwayName: '東急東横線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.5769, longitude: 139.6595 } },
  { id: 'fb-yokohama-toyoko', name: '横浜', railway: 'odpt.Railway:Tokyu.Toyoko', railwayName: '東急東横線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.4661, longitude: 139.6226 } },
  // 東急田園都市線
  { id: 'fb-shibuya-dt', name: '渋谷', railway: 'odpt.Railway:Tokyu.DenEnToshi', railwayName: '東急田園都市線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6580, longitude: 139.7016 } },
  { id: 'fb-sangen', name: '三軒茶屋', railway: 'odpt.Railway:Tokyu.DenEnToshi', railwayName: '東急田園都市線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6436, longitude: 139.6702 } },
  { id: 'fb-futakotamagawa', name: '二子玉川', railway: 'odpt.Railway:Tokyu.DenEnToshi', railwayName: '東急田園都市線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6115, longitude: 139.6267 } },
  { id: 'fb-tama-plaza', name: 'たまプラーザ', railway: 'odpt.Railway:Tokyu.DenEnToshi', railwayName: '東急田園都市線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.5763, longitude: 139.5587 } },
  { id: 'fb-chuorinkan', name: '中央林間', railway: 'odpt.Railway:Tokyu.DenEnToshi', railwayName: '東急田園都市線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.5080, longitude: 139.4431 } },
  // 東急世田谷線
  { id: 'fb-sangenjaya-sg', name: '三軒茶屋', railway: 'odpt.Railway:Tokyu.Setagaya', railwayName: '東急世田谷線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6436, longitude: 139.6702 } },
  { id: 'fb-wakabayashi', name: '若林', railway: 'odpt.Railway:Tokyu.Setagaya', railwayName: '東急世田谷線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6461, longitude: 139.6598 } },
  { id: 'fb-kamimachi', name: '上町', railway: 'odpt.Railway:Tokyu.Setagaya', railwayName: '東急世田谷線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6467, longitude: 139.6512 } },
  { id: 'fb-miyanosaka', name: '宮の坂', railway: 'odpt.Railway:Tokyu.Setagaya', railwayName: '東急世田谷線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6473, longitude: 139.6458 } },
  { id: 'fb-yamashita', name: '山下', railway: 'odpt.Railway:Tokyu.Setagaya', railwayName: '東急世田谷線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6481, longitude: 139.6421 } },
  { id: 'fb-shimotakaido', name: '下高井戸', railway: 'odpt.Railway:Tokyu.Setagaya', railwayName: '東急世田谷線', operator: 'odpt.Operator:Tokyu', coordinate: { latitude: 35.6620, longitude: 139.6357 } },
  // 小田急小田原線
  { id: 'fb-shinjuku-odakyu', name: '新宿', railway: 'odpt.Railway:Odakyu.Odawara', railwayName: '小田急小田原線', operator: 'odpt.Operator:Odakyu', coordinate: { latitude: 35.6896, longitude: 139.7006 } },
  { id: 'fb-shimokitazawa', name: '下北沢', railway: 'odpt.Railway:Odakyu.Odawara', railwayName: '小田急小田原線', operator: 'odpt.Operator:Odakyu', coordinate: { latitude: 35.6619, longitude: 139.6666 } },
  { id: 'fb-machida', name: '町田', railway: 'odpt.Railway:Odakyu.Odawara', railwayName: '小田急小田原線', operator: 'odpt.Operator:Odakyu', coordinate: { latitude: 35.5418, longitude: 139.4455 } },
  // 京王線
  { id: 'fb-shinjuku-keio', name: '新宿', railway: 'odpt.Railway:Keio.Keio', railwayName: '京王線', operator: 'odpt.Operator:Keio', coordinate: { latitude: 35.6896, longitude: 139.7006 } },
  { id: 'fb-meidaimae', name: '明大前', railway: 'odpt.Railway:Keio.Keio', railwayName: '京王線', operator: 'odpt.Operator:Keio', coordinate: { latitude: 35.6714, longitude: 139.6501 } },
  { id: 'fb-chofu', name: '調布', railway: 'odpt.Railway:Keio.Keio', railwayName: '京王線', operator: 'odpt.Operator:Keio', coordinate: { latitude: 35.6510, longitude: 139.5439 } },
  // 京王井の頭線
  { id: 'fb-shibuya-inokashira', name: '渋谷', railway: 'odpt.Railway:Keio.Inokashira', railwayName: '京王井の頭線', operator: 'odpt.Operator:Keio', coordinate: { latitude: 35.6580, longitude: 139.7016 } },
  { id: 'fb-shimokita-inokashira', name: '下北沢', railway: 'odpt.Railway:Keio.Inokashira', railwayName: '京王井の頭線', operator: 'odpt.Operator:Keio', coordinate: { latitude: 35.6619, longitude: 139.6666 } },
  { id: 'fb-kichijoji-inokashira', name: '吉祥寺', railway: 'odpt.Railway:Keio.Inokashira', railwayName: '京王井の頭線', operator: 'odpt.Operator:Keio', coordinate: { latitude: 35.7033, longitude: 139.5797 } },
  // 西武池袋線
  { id: 'fb-ikebukuro-seibu', name: '池袋', railway: 'odpt.Railway:Seibu.Ikebukuro', railwayName: '西武池袋線', operator: 'odpt.Operator:Seibu', coordinate: { latitude: 35.7295, longitude: 139.7109 } },
  { id: 'fb-nerima', name: '練馬', railway: 'odpt.Railway:Seibu.Ikebukuro', railwayName: '西武池袋線', operator: 'odpt.Operator:Seibu', coordinate: { latitude: 35.7378, longitude: 139.6533 } },
  { id: 'fb-tokorozawa', name: '所沢', railway: 'odpt.Railway:Seibu.Ikebukuro', railwayName: '西武池袋線', operator: 'odpt.Operator:Seibu', coordinate: { latitude: 35.7862, longitude: 139.4690 } },
  // 西武新宿線
  { id: 'fb-seibu-shinjuku', name: '西武新宿', railway: 'odpt.Railway:Seibu.Shinjuku', railwayName: '西武新宿線', operator: 'odpt.Operator:Seibu', coordinate: { latitude: 35.6951, longitude: 139.6997 } },
  { id: 'fb-takadanobaba', name: '高田馬場', railway: 'odpt.Railway:Seibu.Shinjuku', railwayName: '西武新宿線', operator: 'odpt.Operator:Seibu', coordinate: { latitude: 35.7128, longitude: 139.7036 } },
  // 東武東上線
  { id: 'fb-ikebukuro-tobu', name: '池袋', railway: 'odpt.Railway:Tobu.Tojo', railwayName: '東武東上線', operator: 'odpt.Operator:Tobu', coordinate: { latitude: 35.7295, longitude: 139.7109 } },
  { id: 'fb-wakoshi', name: '和光市', railway: 'odpt.Railway:Tobu.Tojo', railwayName: '東武東上線', operator: 'odpt.Operator:Tobu', coordinate: { latitude: 35.7883, longitude: 139.6124 } },
  // 東武スカイツリーライン
  { id: 'fb-asakusa-tobu', name: '浅草', railway: 'odpt.Railway:Tobu.Skytree', railwayName: '東武スカイツリーライン', operator: 'odpt.Operator:Tobu', coordinate: { latitude: 35.7114, longitude: 139.7972 } },
  { id: 'fb-kitasenju', name: '北千住', railway: 'odpt.Railway:Tobu.Skytree', railwayName: '東武スカイツリーライン', operator: 'odpt.Operator:Tobu', coordinate: { latitude: 35.7494, longitude: 139.8052 } },
];

/**
 * 駅名を取得
 */
export function getStationName(title: string): string {
  return title;
}

/**
 * 路線IDから路線名を取得（駅用）
 */
export function getRailwayNameForStation(railwayId: string): string {
  if (RAILWAY_NAMES[railwayId]) {
    return RAILWAY_NAMES[railwayId];
  }
  // マッピングにない場合はIDから抽出
  const parts = railwayId.split('.');
  return parts[parts.length - 1] || railwayId;
}

/**
 * 駅データサービス
 */
export class StationDataService {
  private token: string;
  private stations: StationInfo[] = [];

  constructor(token: string) {
    this.token = token;
    // 起動時にキャッシュを読み込み
    const cached = this.loadFromCache();
    if (cached) {
      this.stations = cached;
    }
  }

  /**
   * ODPT APIから駅データを取得
   */
  async fetchStations(): Promise<StationInfo[]> {
    const operatorParam = TARGET_OPERATORS.join(',');
    const url = `https://api.odpt.org/api/v4/odpt:Station?odpt:operator=${operatorParam}&acl:consumerKey=${this.token}`;

    console.log('[StationDataService] Fetching stations...');
    console.log('[StationDataService] Token status:', this.token ? `set (${this.token.substring(0, 8)}...)` : 'NOT SET');
    console.log('[StationDataService] URL:', url.replace(this.token || '', '***'));

    try {
      const response = await fetch(url);
      console.log('[StationDataService] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ODPTStationResponse[] = await response.json();
      console.log('[StationDataService] Raw data count:', data.length);

      const stations: StationInfo[] = data
        // 座標がある駅のみ
        .filter((item) =>
          item['geo:lat'] !== undefined &&
          item['geo:long'] !== undefined &&
          TARGET_OPERATORS.includes(item['odpt:operator'] as typeof TARGET_OPERATORS[number])
        )
        .map((item) => ({
          id: item['@id'],
          name: getStationName(item['dc:title']),
          railway: item['odpt:railway'],
          railwayName: getRailwayNameForStation(item['odpt:railway']),
          operator: item['odpt:operator'],
          coordinate: {
            latitude: item['geo:lat']!,
            longitude: item['geo:long']!,
          },
        }));

      console.log('[StationDataService] Filtered stations count:', stations.length);

      // APIが0件を返した場合も静的データを使用
      if (stations.length === 0) {
        console.log('[StationDataService] API returned 0 stations, using static data');
        return this.getStaticStations();
      }

      if (stations.length > 0) {
        console.log('[StationDataService] Sample station:', stations[0]);
      }

      this.stations = stations;
      this.saveToCache(stations);

      return stations;
    } catch (error) {
      console.error('[StationDataService] Fetch error:', error);
      // エラー時はキャッシュを返す
      if (this.stations.length > 0) {
        console.log('[StationDataService] Using cached stations:', this.stations.length);
        return this.stations;
      }
      // キャッシュもない場合は静的データを使用
      console.log('[StationDataService] Using static stations');
      return this.getStaticStations();
    }
  }

  /**
   * 静的駅データを取得
   * API取得の成否に関わらず常に利用可能
   */
  getStaticStations(): StationInfo[] {
    return STATIC_STATIONS;
  }

  /**
   * キャッシュから駅データを取得
   * 空のキャッシュの場合はnullを返す
   */
  loadFromCache(): StationInfo[] | null {
    try {
      const stored = localStorage.getItem(STATION_DATA_STORAGE_KEY);
      if (stored) {
        const cache: StationDataCache = JSON.parse(stored);
        // 空のキャッシュはnullとして扱う
        if (!cache.stations || cache.stations.length === 0) {
          console.log('[StationDataService] Cache is empty, returning null');
          return null;
        }
        console.log('[StationDataService] Loaded from cache:', cache.stations.length, 'stations');
        return cache.stations;
      }
    } catch (error) {
      console.error('[StationDataService] Load cache error:', error);
    }
    return null;
  }

  /**
   * キャッシュに駅データを保存
   */
  saveToCache(stations: StationInfo[]): void {
    try {
      const cache: StationDataCache = {
        stations,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(STATION_DATA_STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('[StationDataService] Save cache error:', error);
    }
  }

  /**
   * キャッシュが有効かどうかを確認
   * - キャッシュが存在する
   * - キャッシュが有効期限内
   * - キャッシュに1件以上の駅データがある
   */
  isCacheValid(): boolean {
    try {
      const stored = localStorage.getItem(STATION_DATA_STORAGE_KEY);
      if (!stored) return false;

      const cache: StationDataCache = JSON.parse(stored);

      // 空のキャッシュは無効
      if (!cache.stations || cache.stations.length === 0) {
        console.log('[StationDataService] Cache is empty, treating as invalid');
        return false;
      }

      const cachedTime = new Date(cache.cachedAt).getTime();
      const now = Date.now();

      const isValid = now - cachedTime < STATION_CACHE_TTL_MS;
      console.log('[StationDataService] Cache valid:', isValid, 'stations:', cache.stations.length);
      return isValid;
    } catch {
      return false;
    }
  }

  /**
   * 路線IDで駅をフィルタ
   */
  filterByRailway(railwayId: string): StationInfo[] {
    return this.stations.filter((station) => station.railway === railwayId);
  }

  /**
   * 事業者IDで駅をフィルタ
   */
  filterByOperator(operatorId: string): StationInfo[] {
    return this.stations.filter((station) => station.operator === operatorId);
  }

  /**
   * 全駅データを取得
   */
  getAllStations(): StationInfo[] {
    return this.stations;
  }
}

/**
 * シングルトンインスタンス用のファクトリ
 */
let serviceInstance: StationDataService | null = null;

export function getStationDataService(token: string): StationDataService {
  if (!serviceInstance) {
    serviceInstance = new StationDataService(token);
  }
  return serviceInstance;
}

export function resetStationDataService(): void {
  serviceInstance = null;
}
