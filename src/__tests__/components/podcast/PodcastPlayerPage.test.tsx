/**
 * PodcastPlayerPage テスト
 * 配信停止時の「確認中」バナー表示
 * @module __tests__/components/podcast/PodcastPlayerPage.test
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PodcastService } from '../../../services/PodcastService';
import { PodcastEpisode } from '../../../types/podcast';
import PodcastPlayerPage from '../../../components/podcast/PodcastPlayerPage';

// jsdomはHTMLMediaElementの再生を実装していないためスタブ
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: () => Promise.resolve(),
});
Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: () => undefined,
});

const STALE_NOTICE = '新しい回の配信が止まっています';

function makeEpisode(date: string): PodcastEpisode {
  return {
    id: `${date.replace(/-/g, '')}_daily`,
    title: `スタラジ ${date} 配信分`,
    date,
    broadcastMode: 'daily',
    durationSec: 300,
    durationFormatted: '5:00',
    cast: ['ヨースケ'],
    segments: [{ name: 'オープニング', startSec: 0 }],
    sources: [],
    audioFile: `${date}.mp3`,
    scriptFile: `${date}.md`,
    publishedAt: `${date}T20:50:00.000Z`,
  };
}

/** 今日からN日前の 'YYYY-MM-DD' */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('PodcastPlayerPage 配信停止バナー', () => {
  beforeEach(() => {
    jest.spyOn(PodcastService, 'fetchCharacters').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('最新回が5日前なら「確認中」バナーを表示し、過去配信分が聴けることを案内する', async () => {
    const latest = daysAgo(5);
    jest
      .spyOn(PodcastService, 'fetchEpisodes')
      .mockResolvedValue([makeEpisode(daysAgo(6)), makeEpisode(latest)]);

    render(<PodcastPlayerPage />);

    await waitFor(() => {
      expect(screen.getByText(STALE_NOTICE)).toBeInTheDocument();
    });
    expect(screen.getByText(/調査中/)).toBeInTheDocument();
    expect(screen.getByText(/過去の配信分はこれまでどおり聴けます/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`最新回: ${latest}`))).toBeInTheDocument();
  });

  it('最新回が今日ならバナーを表示しない', async () => {
    jest.spyOn(PodcastService, 'fetchEpisodes').mockResolvedValue([makeEpisode(daysAgo(0))]);

    render(<PodcastPlayerPage />);

    await waitFor(() => {
      expect(screen.getByText('スタラジ')).toBeInTheDocument();
    });
    expect(screen.queryByText(STALE_NOTICE)).not.toBeInTheDocument();
  });

  it('エピソードが取得できない（空）場合はバナーを表示しない', async () => {
    jest.spyOn(PodcastService, 'fetchEpisodes').mockResolvedValue([]);

    render(<PodcastPlayerPage />);

    await waitFor(() => {
      expect(screen.getByText('スタラジ')).toBeInTheDocument();
    });
    expect(screen.queryByText(STALE_NOTICE)).not.toBeInTheDocument();
  });
});
