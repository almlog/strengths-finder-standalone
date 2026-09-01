// src/services/PodcastService.ts
import {
  PodcastEpisode,
  CharacterMap,
  EpisodeFilter,
  PODCAST_BASE_URL,
  PODCAST_CACHE_TTL_MS,
  PODCAST_STALE_THRESHOLD_DAYS,
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

  // ── 配信停止検知 ──────────────────────────────────────

  /** 最新エピソードの日付（'YYYY-MM-DD'）。空ならnull */
  static getLatestEpisodeDate(episodes: PodcastEpisode[]): string | null {
    if (episodes.length === 0) return null;
    return episodes.reduce((max, e) => (e.date > max ? e.date : max), episodes[0].date);
  }

  /**
   * 新しい回の配信が止まっているか
   * 最新回の日付が PODCAST_STALE_THRESHOLD_DAYS より古ければ true。
   * エピソードが空の場合は判定不能として false（取得失敗は別途扱う）。
   */
  static isBroadcastStale(episodes: PodcastEpisode[], now: Date = new Date()): boolean {
    const latest = this.getLatestEpisodeDate(episodes);
    if (!latest) return false;

    const [y, m, d] = latest.split('-').map(Number);
    const latestDate = new Date(y, m - 1, d);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((today.getTime() - latestDate.getTime()) / 86_400_000);

    return diffDays > PODCAST_STALE_THRESHOLD_DAYS;
  }
}
