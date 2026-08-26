/**
 * YahooDelayService テスト
 * Cloud Functionsプロキシ経由での遅延情報取得とHTML解析
 * @module __tests__/services/YahooDelayService.test
 */

// firebase config のモック（初期化を回避）
jest.mock('../../config/firebase', () => ({
  functions: {},
}));

// TrainInfoProxy のモック
const mockFetchTrainInfoContent = jest.fn();
jest.mock('../../services/TrainInfoProxy', () => ({
  fetchTrainInfoContent: (...args: unknown[]) => mockFetchTrainInfoContent(...args),
}));

import {
  fetchYahooDelayHistory,
  fetchExternalDelayHistory,
} from '../../services/YahooDelayService';

/** 遅延ありのYahoo!路線情報風HTML（テーブル形式） */
const HTML_WITH_DELAYS = `
<html><body>
<table>
<tr><th>路線名</th><th>状況</th><th>詳細</th></tr>
<tr><td><a href="/traininfo/detail/21/0/">山手線</a></td><td>列車遅延</td><td>荒天の影響で、一部列車に遅れが出ています。</td></tr>
<tr><td><a href="/traininfo/detail/38/0/">常磐線</a></td><td>運転見合わせ</td><td>荒天の影響で、運転を見合わせています。</td></tr>
</table>
</body></html>
`;

/** 遅延なしのHTML */
const HTML_WITHOUT_DELAYS = `
<html><body>
<p>現在、事故・遅延に関する情報はありません。</p>
</body></html>
`;

/** __NEXT_DATA__埋め込みJSON形式のHTML（2026-08 Yahoo!ページ刷新後の構造） */
function makeNextDataHtml(lines: unknown[]): string {
  const nextData = {
    props: {
      pageProps: {
        area: { routes: lines },
      },
    },
  };
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
    nextData
  )}</script></body></html>`;
}

const JSON_LINE_DELAYED = {
  displayName: '常磐線[品川～水戸]',
  companyName: 'JR東日本',
  diainfo: [
    {
      status: '列車遅延',
      message: '土浦駅での車内安全確認の影響で、一部列車に約15分の遅れが出ています。',
      updateDate: '2026-08-26 20:20:00',
    },
  ],
};

const JSON_LINE_SUSPENDED = {
  displayName: '小湊鐵道線',
  companyName: '小湊鐵道',
  diainfo: [
    {
      status: 'その他',
      message: '大雨災害の影響で、里見〜上総中野駅間の運転を見合わせています。',
      updateDate: '2026-08-26 22:20:00',
    },
  ],
};

const JSON_LINE_NORMAL = {
  displayName: '山手線',
  companyName: 'JR東日本',
  diainfo: [
    {
      status: '平常運転',
      message: '22:20現在、ほぼ平常通り運転しています。',
      updateDate: '2026-08-26 22:20:00',
    },
  ],
};

describe('YahooDelayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchYahooDelayHistory', () => {
    it('プロキシ経由で取得したHTMLから遅延エントリを抽出する', async () => {
      mockFetchTrainInfoContent.mockResolvedValueOnce(HTML_WITH_DELAYS);

      const entries = await fetchYahooDelayHistory();

      expect(mockFetchTrainInfoContent).toHaveBeenCalledWith('yahooTraininfo');
      expect(entries.length).toBeGreaterThanOrEqual(2);

      const yamanote = entries.find((e) => e.railwayName === '山手線');
      expect(yamanote).toBeDefined();
      expect(yamanote!.status).toBe('delayed');

      const joban = entries.find((e) => e.railwayName === '常磐線');
      expect(joban).toBeDefined();
      expect(joban!.status).toBe('suspended');
    });

    it('遅延情報がないHTMLでは空配列を返す', async () => {
      mockFetchTrainInfoContent.mockResolvedValueOnce(HTML_WITHOUT_DELAYS);

      const entries = await fetchYahooDelayHistory();

      expect(entries).toEqual([]);
    });

    it('プロキシがエラーの場合は例外を伝播する（取得失敗と遅延なしを区別するため）', async () => {
      mockFetchTrainInfoContent.mockRejectedValueOnce(new Error('unavailable'));

      await expect(fetchYahooDelayHistory()).rejects.toThrow('unavailable');
    });

    it('__NEXT_DATA__埋め込みJSONから遅延・見合わせを抽出する（平常運転は除外）', async () => {
      mockFetchTrainInfoContent.mockResolvedValueOnce(
        makeNextDataHtml([JSON_LINE_DELAYED, JSON_LINE_SUSPENDED, JSON_LINE_NORMAL])
      );

      const entries = await fetchYahooDelayHistory();

      expect(entries).toHaveLength(2);

      const joban = entries.find((e) => e.railwayName === '常磐線[品川～水戸]');
      expect(joban).toBeDefined();
      expect(joban!.status).toBe('delayed');
      expect(joban!.delayMinutes).toBe(15);
      expect(joban!.operatorName).toBe('JR東日本');
      expect(joban!.informationText).toContain('車内安全確認');

      const kominato = entries.find((e) => e.railwayName === '小湊鐵道線');
      expect(kominato).toBeDefined();
      expect(kominato!.status).toBe('suspended');
      expect(kominato!.operatorName).toBe('小湊鐵道');
    });

    it('__NEXT_DATA__があり全路線平常運転なら空配列を返す', async () => {
      mockFetchTrainInfoContent.mockResolvedValueOnce(makeNextDataHtml([JSON_LINE_NORMAL]));

      const entries = await fetchYahooDelayHistory();

      expect(entries).toEqual([]);
    });

    it('__NEXT_DATA__のJSONが壊れている場合はHTMLパターン解析にフォールバックする', async () => {
      const html = `<html><body><script id="__NEXT_DATA__" type="application/json">{broken json</script>
<table>
<tr><td><a href="/x">山手線</a></td><td>列車遅延</td><td>荒天の影響で、一部列車に遅れが出ています。</td></tr>
</table></body></html>`;
      mockFetchTrainInfoContent.mockResolvedValueOnce(html);

      const entries = await fetchYahooDelayHistory();

      expect(entries).toHaveLength(1);
      expect(entries[0].railwayName).toBe('山手線');
    });

    it('同一路線の重複エントリは1件にまとめる', async () => {
      mockFetchTrainInfoContent.mockResolvedValueOnce(
        makeNextDataHtml([JSON_LINE_DELAYED, JSON_LINE_DELAYED])
      );

      const entries = await fetchYahooDelayHistory();

      expect(entries).toHaveLength(1);
    });
  });

  describe('fetchExternalDelayHistory', () => {
    it('Yahoo!のみを取得する（廃止されたJR RSSは呼ばない）', async () => {
      mockFetchTrainInfoContent.mockResolvedValueOnce(HTML_WITH_DELAYS);

      const entries = await fetchExternalDelayHistory();

      // プロキシ呼び出しはYahoo!の1回のみ
      expect(mockFetchTrainInfoContent).toHaveBeenCalledTimes(1);
      expect(mockFetchTrainInfoContent).toHaveBeenCalledWith('yahooTraininfo');
      expect(entries.length).toBeGreaterThanOrEqual(2);
    });

    it('プロキシがエラーの場合は例外を伝播する', async () => {
      mockFetchTrainInfoContent.mockRejectedValueOnce(new Error('unavailable'));

      await expect(fetchExternalDelayHistory()).rejects.toThrow('unavailable');
    });
  });
});
