// src/services/__tests__/PodcastService.test.ts
import { PodcastService } from '../PodcastService';
import { PODCAST_BASE_URL } from '../../types/podcast';

// テスト用エピソードデータ
const mockEpisodes = [
  {
    id: '20260331_daily',
    title: 'スタラジ 2026年3月31日 配信分',
    date: '2026-03-31',
    broadcastMode: 'daily' as const,
    durationSec: 432.984,
    durationFormatted: '7:12',
    cast: ['ヨースケ', 'もえちゃん'],
    segments: [
      { name: 'オープニング', startSec: 0 },
      { name: 'AIトラスト問題', startSec: 28.1 },
    ],
    sources: [{ source: 'TechCrunch', title: 'AI Trust Article' }],
    audioFile: '20260331_daily.mp3',
    scriptFile: '20260331_daily.md',
    publishedAt: '2026-03-30T20:43:50.728Z',
  },
  {
    id: '20260325_weekly',
    title: 'スタラジ 増刊号 2026年3月25日',
    date: '2026-03-25',
    broadcastMode: 'weekly' as const,
    durationSec: 600,
    durationFormatted: '10:00',
    cast: ['みのりん'],
    segments: [{ name: 'オープニング', startSec: 0 }],
    sources: [],
    audioFile: '20260325_weekly.mp3',
    scriptFile: '20260325_weekly.md',
    publishedAt: '2026-03-24T20:00:00.000Z',
  },
  {
    id: '20260328_daily',
    title: 'スタラジ 2026年3月28日 配信分',
    date: '2026-03-28',
    broadcastMode: 'daily' as const,
    durationSec: 400,
    durationFormatted: '6:40',
    cast: ['ホリケイ'],
    segments: [],
    sources: [],
    audioFile: '20260328_daily.mp3',
    scriptFile: '20260328_daily.md',
    publishedAt: '2026-03-27T20:00:00.000Z',
  },
];

const mockCharacters = {
  'ヨースケ': { name: '桜庭 陽介', role: '金曜MC', category: 'メインMC', description: 'desc', color: '#FF6B35' },
};

// ── URL構築 ──────────────────────────────────────────

describe('PodcastService URL構築', () => {
  test('getAudioUrl は正しい音声URLを返す', () => {
    expect(PodcastService.getAudioUrl('20260331_daily.mp3'))
      .toBe(`${PODCAST_BASE_URL}/audio/20260331_daily.mp3`);
  });

  test('getScriptUrl は正しい台本URLを返す', () => {
    expect(PodcastService.getScriptUrl('20260331_daily.md'))
      .toBe(`${PODCAST_BASE_URL}/scripts/20260331_daily.md`);
  });

  test('getEpisodesUrl はエピソード一覧URLを返す', () => {
    expect(PodcastService.getEpisodesUrl())
      .toBe(`${PODCAST_BASE_URL}/episodes.json`);
  });

  test('getCharactersUrl はキャスト情報URLを返す', () => {
    expect(PodcastService.getCharactersUrl())
      .toBe(`${PODCAST_BASE_URL}/characters.json`);
  });
});

// ── キャッシュ ────────────────────────────────────────

describe('PodcastService キャッシュ', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('saveToCache と getFromCache でデータを保存・取得できる', () => {
    PodcastService.saveToCache('test-key', { foo: 'bar' });
    expect(PodcastService.getFromCache('test-key')).toEqual({ foo: 'bar' });
  });

  test('TTL超過後はnullを返す', () => {
    // 過去のタイムスタンプでキャッシュを直接セット
    const expired = JSON.stringify({
      data: 'old',
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2時間前
    });
    localStorage.setItem('podcast-cache-expired-key', expired);
    expect(PodcastService.getFromCache('expired-key')).toBeNull();
  });

  test('不正なJSONはnullを返す', () => {
    localStorage.setItem('podcast-cache-bad', 'not-json');
    expect(PodcastService.getFromCache('bad')).toBeNull();
  });

  test('clearCache はpodcastキャッシュのみ削除する', () => {
    PodcastService.saveToCache('ep', [1, 2]);
    localStorage.setItem('other-key', 'keep');
    PodcastService.clearCache();
    expect(PodcastService.getFromCache('ep')).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('keep');
  });
});

// ── fetch ──────────────────────────────────────────

describe('PodcastService fetch', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('fetchEpisodes はキャッシュがあればfetchしない', async () => {
    PodcastService.saveToCache('episodes', mockEpisodes);
    const spy = jest.spyOn(global, 'fetch');
    const result = await PodcastService.fetchEpisodes();
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual(mockEpisodes);
  });

  test('fetchEpisodes はキャッシュがなければfetchしてキャッシュに保存する', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockEpisodes,
    });

    const result = await PodcastService.fetchEpisodes();
    expect(result).toEqual(mockEpisodes);
    expect(PodcastService.getFromCache('episodes')).toEqual(mockEpisodes);
  });

  test('fetchEpisodes はfetch失敗時に空配列を返す', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    const result = await PodcastService.fetchEpisodes();
    expect(result).toEqual([]);
  });

  test('fetchCharacters はキャッシュがなければfetchする', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockCharacters,
    });

    const result = await PodcastService.fetchCharacters();
    expect(result).toEqual(mockCharacters);
  });

  test('fetchCharacters はfetch失敗時に空オブジェクトを返す', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));
    const result = await PodcastService.fetchCharacters();
    expect(result).toEqual({});
  });
});

// ── ユーティリティ ────────────────────────────────────

describe('PodcastService ユーティリティ', () => {
  test('sortByDateDesc は日付降順にソートする', () => {
    const sorted = PodcastService.sortByDateDesc([...mockEpisodes]);
    expect(sorted[0].date).toBe('2026-03-31');
    expect(sorted[1].date).toBe('2026-03-28');
    expect(sorted[2].date).toBe('2026-03-25');
  });

  test('filterByMode "all" は全エピソードを返す', () => {
    expect(PodcastService.filterByMode(mockEpisodes, 'all')).toHaveLength(3);
  });

  test('filterByMode "daily" はdailyのみ返す', () => {
    const result = PodcastService.filterByMode(mockEpisodes, 'daily');
    expect(result).toHaveLength(2);
    expect(result.every(e => e.broadcastMode === 'daily')).toBe(true);
  });

  test('filterByMode "weekly" はweeklyのみ返す', () => {
    const result = PodcastService.filterByMode(mockEpisodes, 'weekly');
    expect(result).toHaveLength(1);
    expect(result[0].broadcastMode).toBe('weekly');
  });

  test('formatTime は秒を "M:SS" 形式に変換する', () => {
    expect(PodcastService.formatTime(0)).toBe('0:00');
    expect(PodcastService.formatTime(65)).toBe('1:05');
    expect(PodcastService.formatTime(432)).toBe('7:12');
    expect(PodcastService.formatTime(3661)).toBe('61:01');
  });

  test('formatTime は小数点以下を切り捨てる', () => {
    expect(PodcastService.formatTime(65.9)).toBe('1:05');
  });

  test('formatTime は負数を 0:00 にする', () => {
    expect(PodcastService.formatTime(-10)).toBe('0:00');
  });

  test('formatTime はNaNを 0:00 にする', () => {
    expect(PodcastService.formatTime(NaN)).toBe('0:00');
  });
});
