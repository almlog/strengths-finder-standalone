/**
 * TrainInfoProxy テスト
 * Cloud Functions経由で外部運行情報を取得するプロキシクライアント
 * @module __tests__/services/TrainInfoProxy.test
 */

// firebase config のモック（初期化を回避）
jest.mock('../../config/firebase', () => ({
  functions: {},
}));

// httpsCallable のモック
// 注意: CRAのjest設定は resetMocks: true のため、jest.fn(impl) の実装は各テスト前に消える。
// 実装は素のアロー関数に持たせ、jest.fn() は呼び出し記録のみに使う。
const mockCallable = jest.fn();
const mockHttpsCallable = jest.fn();
jest.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => {
    mockHttpsCallable(...args);
    return mockCallable;
  },
}));

import { fetchTrainInfoContent } from '../../services/TrainInfoProxy';

describe('TrainInfoProxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Cloud Function "fetchTrainInfo" をソース名付きで呼び出し、contentを返す', async () => {
    mockCallable.mockResolvedValueOnce({
      data: { content: '<html>test</html>', fetchedAt: '2026-08-26T00:00:00.000Z' },
    });

    const content = await fetchTrainInfoContent('yahooTraininfo');

    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'fetchTrainInfo');
    expect(mockCallable).toHaveBeenCalledWith({ source: 'yahooTraininfo' });
    expect(content).toBe('<html>test</html>');
  });

  it('Cloud Functionがエラーを返した場合は例外を伝播する', async () => {
    mockCallable.mockRejectedValueOnce(new Error('unavailable'));

    await expect(fetchTrainInfoContent('yahooTraininfo')).rejects.toThrow('unavailable');
  });

  it('contentが文字列でないレスポンスは例外にする', async () => {
    mockCallable.mockResolvedValueOnce({ data: {} });

    await expect(fetchTrainInfoContent('yahooTraininfo')).rejects.toThrow();
  });
});
