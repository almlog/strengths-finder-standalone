// src/services/PodcastService.ts
import {
  PodcastEpisode,
  CharacterMap,
  EpisodeFilter,
  PODCAST_BASE_URL,
  PODCAST_CACHE_TTL_MS,
} from '../types/podcast';

const CACHE_PREFIX = 'podcast-cache-';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class PodcastService {
  // ── URL構築 ──────────────────────────────────────

  static getAudioUrl(audioFile: string): string {
    return `${PODCAST_BASE_URL}/audio/${audioFile}`;
  }

  static getScriptUrl(scriptFile: string): string {
    return `${PODCAST_BASE_URL}/scripts/${scriptFile}`;
  }

  static getEpisodesUrl(): string {
    return `${PODCAST_BASE_URL}/episodes.json`;
  }

  static getCharactersUrl(): string {
    return `${PODCAST_BASE_URL}/characters.json`;
  }

  // ── キャッシュ ──────────────────────────────────────

  static getFromCache<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      if (Date.now() - entry.timestamp > PODCAST_CACHE_TTL_MS) {
        localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  static saveToCache<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  }

  static clearCache(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  // ── データ取得 ──────────────────────────────────────

  static async fetchEpisodes(): Promise<PodcastEpisode[]> {
    const cached = this.getFromCache<PodcastEpisode[]>('episodes');
    if (cached) return cached;

    try {
      const res = await fetch(this.getEpisodesUrl());
      if (!res.ok) return [];
      const data: PodcastEpisode[] = await res.json();
      this.saveToCache('episodes', data);
      return data;
    } catch {
      return [];
    }
  }

  static async fetchCharacters(): Promise<CharacterMap> {
    const cached = this.getFromCache<CharacterMap>('characters');
    if (cached) return cached;

    try {
      const res = await fetch(this.getCharactersUrl());
      if (!res.ok) return {};
      const data: CharacterMap = await res.json();
      this.saveToCache('characters', data);
      return data;
    } catch {
      return {};
    }
  }

  // ── ユーティリティ ──────────────────────────────────

  static sortByDateDesc(episodes: PodcastEpisode[]): PodcastEpisode[] {
    return [...episodes].sort((a, b) => b.date.localeCompare(a.date));
  }

  static filterByMode(episodes: PodcastEpisode[], filter: EpisodeFilter): PodcastEpisode[] {
    if (filter === 'all') return episodes;
    return episodes.filter(e => e.broadcastMode === filter);
  }

  static formatTime(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
