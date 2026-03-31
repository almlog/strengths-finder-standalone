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
