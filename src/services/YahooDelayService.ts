/**
 * Yahoo!路線情報から遅延履歴を取得するサービス
 * @module services/YahooDelayService
 */

import { DelayHistoryEntry, TrainStatus } from '../types/trainDelay';
import { fetchTrainInfoContent } from './TrainInfoProxy';

/**
 * 路線名の正規化マッピング
 */
const RAILWAY_NAME_NORMALIZE: Record<string, string> = {
  '中央線快速': '中央線快速',
  '中央快速線': '中央線快速',
  '中央・総武線': '中央・総武線各停',
  '中央総武線': '中央・総武線各停',
  '総武線各駅停車': '中央・総武線各停',
  '山手線': '山手線',
  '京浜東北線': '京浜東北線',
  '埼京線': '埼京線',
  '東海道線': '東海道線',
  '横須賀線': '横須賀線',
  '小田急小田原線': '小田急小田原線',
  '小田急線': '小田急小田原線',
  '京王線': '京王線',
  '京王井の頭線': '京王井の頭線',
  '東急東横線': '東急東横線',
  '東急田園都市線': '東急田園都市線',
  '銀座線': '銀座線',
  '丸ノ内線': '丸ノ内線',
  '日比谷線': '日比谷線',
  '東西線': '東西線',
  '千代田線': '千代田線',
  '有楽町線': '有楽町線',
  '半蔵門線': '半蔵門線',
  '南北線': '南北線',
  '副都心線': '副都心線',
  '都営浅草線': '都営浅草線',
  '都営三田線': '都営三田線',
  '都営新宿線': '都営新宿線',
  '都営大江戸線': '都営大江戸線',
};

/**
 * ステータスを判定
 */
function parseStatus(text: string): TrainStatus {
  if (
    text.includes('見合わせ') ||
    text.includes('運休') ||
    text.includes('不通') ||
    text.includes('取りやめ')
  ) {
    return 'suspended';
  }
  if (text.includes('遅れ') || text.includes('遅延') || text.includes('ダイヤ乱れ')) {
    return 'delayed';
  }
  return 'unknown';
}

/**
 * __NEXT_DATA__埋め込みJSON内の路線ノード
 */
interface YahooDiainfoItem {
  status?: string;
  message?: string;
}

interface YahooLineNode {
  displayName: string;
  companyName?: string;
  diainfo: YahooDiainfoItem[];
}

/**
 * オブジェクトツリーを再帰的に走査し、diainfoを持つ路線ノードを収集する
 * （Yahoo!のJSON階層構造の変化に依存しないため）
 */
function collectLineNodes(node: unknown, result: YahooLineNode[], depth = 0): void {
  if (depth > 20 || node === null || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    node.forEach((item) => collectLineNodes(item, result, depth + 1));
    return;
  }

  const obj = node as Record<string, unknown>;
  if (typeof obj.displayName === 'string' && Array.isArray(obj.diainfo)) {
    result.push({
      displayName: obj.displayName,
      companyName: typeof obj.companyName === 'string' ? obj.companyName : undefined,
      diainfo: obj.diainfo as YahooDiainfoItem[],
    });
    return;
  }

  Object.values(obj).forEach((value) => collectLineNodes(value, result, depth + 1));
}

/**
 * __NEXT_DATA__埋め込みJSONから遅延・運休エントリを抽出する
 * （2026-08のYahoo!ページ刷新後の主要データソース）
 * @returns JSONが存在しない・壊れている場合はnull（HTMLパターン解析へフォールバック）
 */
function parseEmbeddedNextData(html: string, now: string): DelayHistoryEntry[] | null {
  const scriptMatch = html.match(
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  );
  if (!scriptMatch) return null;

  let data: unknown;
  try {
    data = JSON.parse(scriptMatch[1]);
  } catch {
    console.log('[YahooDelayService] __NEXT_DATA__ JSON parse failed, falling back to HTML patterns');
    return null;
  }

  const lineNodes: YahooLineNode[] = [];
  collectLineNodes(data, lineNodes);
  console.log('[YahooDelayService] __NEXT_DATA__ line nodes found:', lineNodes.length);

  const entries: DelayHistoryEntry[] = [];
  lineNodes.forEach((line) => {
    line.diainfo.forEach((info) => {
      const status = info.status || '';
      const message = info.message || '';

      // 平常運転は除外
      if (status.includes('平常') || message.includes('平常通り') || message.includes('平常どおり')) {
        return;
      }
      // ステータスもメッセージも空なら情報なし
      if (!status && !message) return;

      addEntry(entries, line.displayName, `${message}`.trim() || status, now, line.companyName);
    });
  });

  return entries;
}

/**
 * Yahoo!路線情報から遅延履歴を取得
 * 取得はCloud Function（fetchTrainInfo）経由。CORSプロキシは使用しない。
 * @throws 取得失敗時（「取得失敗」と「遅延なし」を呼び出し元で区別できるようにするため）
 */
export async function fetchYahooDelayHistory(): Promise<DelayHistoryEntry[]> {
  console.log('[YahooDelayService] Fetching from Yahoo Transit via Cloud Function...');

  const html = await fetchTrainInfoContent('yahooTraininfo');
  console.log('[YahooDelayService] Received HTML, length:', html.length);

    const now = new Date().toISOString();

    // 主要パターン: __NEXT_DATA__埋め込みJSON（最も堅牢）
    const jsonEntries = parseEmbeddedNextData(html, now);
    if (jsonEntries !== null) {
      console.log('[YahooDelayService] Entries from __NEXT_DATA__:', jsonEntries.length);
      return jsonEntries;
    }

    // フォールバック: HTMLパターン解析（旧ページ構造用）
    const entries: DelayHistoryEntry[] = [];

    // パターンA: 「現在運行情報のある路線」テーブルを探す
    // Yahoo!路線情報の構造: 路線名 | 状況 | 詳細
    // 重要: このテーブルには実際に遅延がある路線のみが含まれる
    const troubleTableMatch = html.match(/現在運行情報のある路線[\s\S]*?<\/table>/i);
    if (troubleTableMatch) {
      const troubleTable = troubleTableMatch[0];
      console.log('[YahooDelayService] Found trouble table, length:', troubleTable.length);

      // テーブル行を解析（非貪欲マッチ）
      const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      while ((rowMatch = rowPattern.exec(troubleTable)) !== null) {
        const rowHtml = rowMatch[1];

        // 路線名を抽出（リンクテキスト）
        const linkMatch = rowHtml.match(/<a[^>]*>([^<]+)<\/a>/);
        if (!linkMatch) continue;
        const railwayName = linkMatch[1].trim();

        // ヘッダー行やナビゲーションリンクを除外
        if (
          (railwayName.includes('JR') && railwayName.length < 5) ||
          railwayName === '詳細' ||
          railwayName === '運行情報' ||
          railwayName.includes('路線を選択')
        ) {
          continue;
        }

        // 行のテキスト全体を抽出（HTMLタグを除去）
        const rowText = rowHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        // 遅延・運休の状態キーワードを探す
        const hasDelayStatus =
          rowText.includes('遅れ') ||
          rowText.includes('見合わせ') ||
          rowText.includes('運休') ||
          rowText.includes('不通') ||
          rowText.includes('振替') ||
          rowText.includes('直通運転中止');

        if (hasDelayStatus) {
          console.log('[YahooDelayService] Pattern A delay row:', railwayName, rowText.substring(0, 60));
          addEntry(entries, railwayName, rowText, now);
        }
      }
    }

    // パターンA2: 別の構造（直接テーブル行を探す - 遅延キーワード必須）
    if (entries.length === 0) {
      // 遅延・運休情報を含む行のみマッチ
      const tableRowPattern = /<tr[^>]*>[\s\S]*?<a[^>]*>([^<]+(?:線|ライン)[^<]*)<\/a>[\s\S]*?<td[^>]*>([^<]*(?:遅れ|見合わせ|運休|不通|振替)[^<]*)<\/td>[\s\S]*?<\/tr>/gi;

      let match;
      while ((match = tableRowPattern.exec(html)) !== null) {
        const railwayName = match[1].trim();
        const status = match[2].trim();
        console.log('[YahooDelayService] Pattern A2 match:', railwayName, status);
        addEntry(entries, railwayName, status, now);
      }
    }

    // パターンB: リスト形式で路線名と状況が分離（遅延キーワード必須）
    if (entries.length === 0) {
      // 遅延・運休情報を含む行のみマッチ
      const listPattern = /<a[^>]*>([^<]*(?:線|ライン)[^<]*)<\/a>[\s\S]{0,200}?(?:遅れ|見合わせ|運休|不通|振替)[\s\S]{0,100}?([^<]{10,}?(?:の影響|対応|により|発生|分遅れ))/gi;
      let match;
      while ((match = listPattern.exec(html)) !== null) {
        const railwayName = match[1].trim();
        const detail = match[2].trim();
        console.log('[YahooDelayService] Pattern B match:', railwayName, detail.substring(0, 40));
        addEntry(entries, railwayName, detail, now);
      }
    }

    // パターンC: シンプルに路線名のリンクを探して、近くの遅延情報を取得
    if (entries.length === 0) {
      // 路線名を含むアンカータグを全て抽出
      const railwayLinks = html.match(/<a[^>]*>([^<]*(?:中央|総武|山手|京浜東北|埼京|小田急|京王|東急|銀座|丸ノ内|日比谷|東西|千代田|有楽町|半蔵門|南北|副都心|都営|りんかい|東葉)[^<]*(?:線|ライン)[^<]*)<\/a>/gi);
      if (railwayLinks) {
        console.log('[YahooDelayService] Pattern C - Found railway links:', railwayLinks.length);
        railwayLinks.forEach(linkHtml => {
          const nameMatch = linkHtml.match(/>([^<]+)</);
          if (nameMatch) {
            const railwayName = nameMatch[1].trim();
            // 状況を近くから探す（linkの後の300文字以内）
            const linkIndex = html.indexOf(linkHtml);
            const nearbyText = html.substring(linkIndex, linkIndex + 300);

            // 遅延・運休キーワードが近くにあるか確認
            const hasDelayKeyword =
              nearbyText.includes('遅れ') ||
              nearbyText.includes('見合わせ') ||
              nearbyText.includes('運休') ||
              nearbyText.includes('不通') ||
              nearbyText.includes('振替');

            if (hasDelayKeyword) {
              const detailMatch = nearbyText.match(/(?:遅れ|見合わせ|運休|不通|振替)[^<]*?([^<]{5,80})/);
              const detail = detailMatch ? detailMatch[0].trim() : '運行に遅れ';
              console.log('[YahooDelayService] Pattern C match:', railwayName, detail.substring(0, 40));
              addEntry(entries, railwayName, detail, now);
            }
          }
        });
      }
    }

    // パターンD: 最もシンプルに「運行情報のある路線」セクション内のテキストを解析
    if (entries.length === 0) {
      // 運行情報セクションを抽出
      const sectionMatch = html.match(/現在運行情報のある路線[\s\S]*?(?=<\/table>|<\/div>|$)/i);
      if (sectionMatch) {
        const sectionHtml = sectionMatch[0];
        console.log('[YahooDelayService] Pattern D - Section found, length:', sectionHtml.length);

        // セクション内の路線名を抽出
        const lineNames = [
          '中央総武線', '中央線', '総武線', '山手線', '京浜東北線', '埼京線', '埼京川越線',
          '小田急小田原線', '小田急線', '京王線', '東急東横線', '東急田園都市線',
          '銀座線', '丸ノ内線', '日比谷線', '東西線', '千代田線', '有楽町線',
          '半蔵門線', '南北線', '副都心線',
          '都営浅草線', '都営三田線', '都営新宿線', '都営大江戸線',
          'りんかい線', '東葉高速線', '東京メトロ東西線', '東京メトロ千代田線'
        ];

        lineNames.forEach(lineName => {
          if (sectionHtml.includes(lineName)) {
            // この路線の詳細を探す
            const lineIndex = sectionHtml.indexOf(lineName);
            const context = sectionHtml.substring(lineIndex, lineIndex + 200);

            // 遅延・運休キーワードが存在するか確認
            const hasDelayKeyword =
              context.includes('遅れ') ||
              context.includes('見合わせ') ||
              context.includes('運休') ||
              context.includes('不通') ||
              context.includes('振替');

            if (hasDelayKeyword) {
              const detail = context.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
              console.log('[YahooDelayService] Pattern D match:', lineName, detail.substring(0, 50));
              addEntry(entries, lineName, detail, now);
            }
          }
        });
      }
    }

    console.log('[YahooDelayService] Total entries found:', entries.length);
    return entries;
}

/**
 * エントリを追加するヘルパー関数
 * 実際に遅延・運休がある路線のみを追加
 */
function addEntry(
  entries: DelayHistoryEntry[],
  railwayName: string,
  infoText: string,
  now: string,
  operatorName?: string
): void {
  // 平常運転や遅延情報なしは除外
  if (
    infoText.includes('平常運転') ||
    infoText.includes('遅延情報はありません') ||
    infoText.includes('運行情報はありません') ||
    infoText.includes('平常どおり')
  ) {
    return;
  }

  // 実際の遅延・運休キーワードが含まれていない場合は除外
  // 注意: 「運転状況」「列車遅延」はラベルであり、遅延を示すものではない
  const hasDelayKeyword =
    infoText.includes('遅れ') ||
    infoText.includes('遅延') ||
    infoText.includes('ダイヤ乱れ') ||
    infoText.includes('見合わせ') ||
    infoText.includes('運休') ||
    infoText.includes('不通') ||
    infoText.includes('取りやめ') ||
    infoText.includes('振替輸送') ||
    infoText.includes('直通運転中止');

  if (!hasDelayKeyword) {
    console.log('[YahooDelayService] Skipped (no delay keyword):', railwayName, infoText.substring(0, 40));
    return;
  }

  const normalizedName = RAILWAY_NAME_NORMALIZE[railwayName] || railwayName;
  const status = parseStatus(infoText);

  // 遅延時間を抽出
  const delayMatch = infoText.match(/(\d+)分/);
  const delayMinutes = delayMatch ? parseInt(delayMatch[1], 10) : undefined;

  // 重複チェック
  if (entries.some(e => e.railwayName === normalizedName)) {
    return;
  }

  entries.push({
    id: `yahoo-${railwayName}-${now}`,
    railway: `yahoo.Railway:${railwayName}`,
    railwayName: normalizedName,
    operator: 'yahoo',
    operatorName: operatorName || 'Yahoo!路線情報',
    status: status !== 'unknown' ? status : 'delayed',
    delayMinutes,
    informationText: infoText,
    fetchedAt: now,
    recordedAt: now,
  });

  console.log('[YahooDelayService] Added delay entry:', normalizedName, status, infoText.substring(0, 50));
}

/**
 * 外部ソースから遅延履歴を取得して統合
 *
 * 現在のソースはYahoo!路線情報のみ。
 * JR東日本RSS（traininfo_area_kanto.xml / service.atom）は配信終了（403/404）のため
 * 2026-08-26に削除した。
 * @throws 取得失敗時（呼び出し元でエラー表示に使う）
 */
export async function fetchExternalDelayHistory(): Promise<DelayHistoryEntry[]> {
  console.log('[YahooDelayService] Fetching from external sources...');

  const entries = await fetchYahooDelayHistory();

  console.log('[YahooDelayService] Total unique entries:', entries.length);
  return entries;
}
