// src/types/podcast.ts

export interface PodcastSegment {
  name: string;
  startSec: number;
}

export interface PodcastSource {
  source: string;
  title: string;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  date: string;
  broadcastMode: 'daily' | 'weekly';
  durationSec: number;
  durationFormatted: string;
  cast: string[];
  segments: PodcastSegment[];
  sources: PodcastSource[];
  audioFile: string;
  scriptFile: string;
  publishedAt: string;
}

export interface PodcastCharacter {
  name: string;
  role: string;
  category: string;
  description: string;
  color: string;
}

export type CharacterMap = Record<string, PodcastCharacter>;

export type EpisodeFilter = 'all' | 'daily' | 'weekly';

export const PODCAST_BASE_URL = 'https://almlog.github.io/starradio-feed';
export const PODCAST_CACHE_TTL_MS = 60 * 60 * 1000; // 1時間
/**
 * 配信停止と判定する閾値（日）
 * 最新回の日付がこれより古ければ「配信が止まっている」とみなす。
 * 日曜は配信なし・月曜早朝は前日分未生成のため、2日以内は正常扱い。
 */
export const PODCAST_STALE_THRESHOLD_DAYS = 2;
