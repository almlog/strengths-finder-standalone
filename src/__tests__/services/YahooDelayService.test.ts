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

    it('プロキシがエラーの場合は空配列を返す', async () => {
      mockFetchTrainInfoContent.mockRejectedValueOnce(new Error('unavailable'));

      const entries = await fetchYahooDelayHistory();

      expect(entries).toEqual([]);
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

    it('プロキシがエラーの場合は空配列を返す', async () => {
      mockFetchTrainInfoContent.mockRejectedValueOnce(new Error('unavailable'));

      const entries = await fetchExternalDelayHistory();

      expect(entries).toEqual([]);
    });
  });
});
