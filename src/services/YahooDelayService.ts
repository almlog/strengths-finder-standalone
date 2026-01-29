/**
 * Yahoo!路線情報から遅延履歴を取得するサービス
 * @module services/YahooDelayService
 */

import { DelayHistoryEntry, TrainStatus } from '../types/trainDelay';

/**
 * Yahoo!路線情報のURL（関東エリア）
 */
const YAHOO_TRANSIT_URL = 'https://transit.yahoo.co.jp/traininfo/area/4/';

/**
 * CORSプロキシ（開発・テスト用）
 * 本番環境では自前のプロキシサーバーを使用することを推奨
 */
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

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

// extractText関数は将来の拡張用に保持（現在はHTMLパターンマッチで代替）

/**
 * ステータスを判定
 */
function parseStatus(text: string): TrainStatus {
  if (text.includes('見合わせ') || text.includes('運休') || text.includes('不通')) {
    return 'suspended';
  }
  if (text.includes('遅れ') || text.includes('遅延') || text.includes('ダイヤ乱れ')) {
    return 'delayed';
  }
  return 'unknown';
}

/**
 * Yahoo!路線情報から遅延履歴を取得
 */
export async function fetchYahooDelayHistory(): Promise<DelayHistoryEntry[]> {
  try {
    console.log('[YahooDelayService] Fetching from Yahoo Transit...');

    const url = CORS_PROXY + encodeURIComponent(YAHOO_TRANSIT_URL);
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();
    console.log('[YahooDelayService] Received HTML, length:', html.length);

    // デバッグ: HTMLの一部を出力
    console.log('[YahooDelayService] HTML preview:', html.substring(0, 1000));

    // 遅延情報を解析
    const entries: DelayHistoryEntry[] = [];
    const now = new Date().toISOString();

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

  } catch (error) {
    console.error('[YahooDelayService] Fetch error:', error);
    return [];
  }
}

/**
 * エントリを追加するヘルパー関数
 * 実際に遅延・運休がある路線のみを追加
 */
function addEntry(
  entries: DelayHistoryEntry[],
  railwayName: string,
  infoText: string,
  now: string
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
    infoText.includes('ダイヤ乱れ') ||
    infoText.includes('見合わせ') ||
    infoText.includes('運休') ||
    infoText.includes('不通') ||
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
    operatorName: 'Yahoo!路線情報',
    status: status !== 'unknown' ? status : 'delayed',
    delayMinutes,
    informationText: infoText,
    fetchedAt: now,
    recordedAt: now,
  });

  console.log('[YahooDelayService] Added delay entry:', normalizedName, status, infoText.substring(0, 50));
}

/**
 * JR東日本運行情報RSSから遅延情報を取得
 */
export async function fetchJRRssDelays(): Promise<DelayHistoryEntry[]> {
  try {
    console.log('[YahooDelayService] Fetching JR East RSS...');

    // JR東日本の運行情報RSS（複数のURLを試す）
    const rssUrls = [
      'https://www.jreast.co.jp/info/rss/traininfo_area_kanto.xml',
      'https://traininfo.jreast.co.jp/train_info/service.atom',
    ];

    for (const rssUrl of rssUrls) {
      try {
        const url = CORS_PROXY + encodeURIComponent(rssUrl);
        const response = await fetch(url);

        if (!response.ok) {
          console.log('[YahooDelayService] RSS not available:', rssUrl, response.status);
          continue;
        }

        const xml = await response.text();
        console.log('[YahooDelayService] Received RSS from', rssUrl, ', length:', xml.length);
        console.log('[YahooDelayService] RSS preview:', xml.substring(0, 500));

        // XMLがエラーページでないか確認
        if (xml.includes('<!DOCTYPE html>') || xml.includes('<html')) {
          console.log('[YahooDelayService] Received HTML instead of RSS, skipping');
          continue;
        }

        const entries: DelayHistoryEntry[] = [];
        const now = new Date().toISOString();

        // RSSのitem要素を解析
        const itemPattern = /<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<description>([^<]*)<\/description>[\s\S]*?(?:<pubDate>([^<]+)<\/pubDate>)?[\s\S]*?<\/item>/gi;

        let match;
        while ((match = itemPattern.exec(xml)) !== null) {
          const title = match[1].trim();
          const description = (match[2] || '').trim();
          const pubDate = (match[3] || '').trim();

          console.log('[YahooDelayService] RSS item:', title, description.substring(0, 50));

          // 平常運転以外を抽出
          if (title.includes('平常') || description.includes('平常どおり') || description.includes('平常運転')) {
            continue;
          }

          // 遅延・運休情報のみ追加
          if (!title.includes('遅') && !title.includes('運休') && !title.includes('見合') &&
              !description.includes('遅') && !description.includes('運休') && !description.includes('見合')) {
            continue;
          }

          const status = parseStatus(description || title);
          const delayMatch = (description || title).match(/(\d+)分/);
          const delayMinutes = delayMatch ? parseInt(delayMatch[1], 10) : undefined;

          // pubDateをISO形式に変換
          let recordedAt = now;
          if (pubDate) {
            try {
              recordedAt = new Date(pubDate).toISOString();
            } catch {
              // パース失敗時は現在時刻を使用
            }
          }

          entries.push({
            id: `jrrss-${title}-${recordedAt}`,
            railway: `jrrss.Railway:${title}`,
            railwayName: title,
            operator: 'JR-East',
            operatorName: 'JR東日本',
            status: status !== 'unknown' ? status : 'delayed',
            delayMinutes,
            informationText: description || title,
            fetchedAt: now,
            recordedAt,
          });

          console.log('[YahooDelayService] Found JR delay:', title, status);
        }

        // Atom形式も試す
        if (entries.length === 0) {
          const atomPattern = /<entry>[\s\S]*?<title[^>]*>([^<]+)<\/title>[\s\S]*?(?:<summary[^>]*>([^<]*)<\/summary>)?[\s\S]*?(?:<updated>([^<]+)<\/updated>)?[\s\S]*?<\/entry>/gi;

          while ((match = atomPattern.exec(xml)) !== null) {
            const title = match[1].trim();
            const summary = (match[2] || '').trim();
            const updated = (match[3] || '').trim();

            if (title.includes('平常') || summary.includes('平常')) {
              continue;
            }

            if (!title.includes('遅') && !title.includes('運休') && !summary.includes('遅') && !summary.includes('運休')) {
              continue;
            }

            const status = parseStatus(summary || title);
            const delayMatch = (summary || title).match(/(\d+)分/);
            const delayMinutes = delayMatch ? parseInt(delayMatch[1], 10) : undefined;

            let recordedAt = now;
            if (updated) {
              try {
                recordedAt = new Date(updated).toISOString();
              } catch {
                // ignore
              }
            }

            entries.push({
              id: `jratom-${title}-${recordedAt}`,
              railway: `jratom.Railway:${title}`,
              railwayName: title,
              operator: 'JR-East',
              operatorName: 'JR東日本',
              status: status !== 'unknown' ? status : 'delayed',
              delayMinutes,
              informationText: summary || title,
              fetchedAt: now,
              recordedAt,
            });

            console.log('[YahooDelayService] Found JR Atom delay:', title);
          }
        }

        if (entries.length > 0) {
          console.log('[YahooDelayService] JR RSS entries:', entries.length);
          return entries;
        }
      } catch (urlError) {
        console.log('[YahooDelayService] Error fetching', rssUrl, urlError);
      }
    }

    console.log('[YahooDelayService] No JR RSS entries found');
    return [];

  } catch (error) {
    console.error('[YahooDelayService] JR RSS fetch error:', error);
    return [];
  }
}

/**
 * 複数のソースから遅延履歴を取得して統合
 */
export async function fetchExternalDelayHistory(): Promise<DelayHistoryEntry[]> {
  console.log('[YahooDelayService] Fetching from external sources...');

  // 並列で取得
  const [yahooEntries, jrEntries] = await Promise.all([
    fetchYahooDelayHistory().catch(() => [] as DelayHistoryEntry[]),
    fetchJRRssDelays().catch(() => [] as DelayHistoryEntry[]),
  ]);

  // 統合して重複を除去
  const allEntries = [...yahooEntries, ...jrEntries];

  // 路線名でグループ化し、最新のエントリのみを保持
  const uniqueEntries = new Map<string, DelayHistoryEntry>();
  for (const entry of allEntries) {
    const key = entry.railwayName;
    const existing = uniqueEntries.get(key);
    if (!existing || entry.recordedAt > existing.recordedAt) {
      uniqueEntries.set(key, entry);
    }
  }

  const result = Array.from(uniqueEntries.values());
  console.log('[YahooDelayService] Total unique entries:', result.length);

  return result;
}
