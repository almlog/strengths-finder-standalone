// src/components/podcast/PodcastPlayerPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, RefreshCw, AlertCircle, Cpu, Newspaper, Mic, Rss } from 'lucide-react';
import { PodcastEpisode, CharacterMap, EpisodeFilter } from '../../types/podcast';
import { PodcastService } from '../../services/PodcastService';
import EpisodeList from './EpisodeList';
import EpisodeDetail from './EpisodeDetail';
import { AudioPlayerHandle } from './AudioPlayer';

const PodcastPlayerPage: React.FC = () => {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [characters, setCharacters] = useState<CharacterMap>({});
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);
  const [filter, setFilter] = useState<EpisodeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eps, chars] = await Promise.all([
        PodcastService.fetchEpisodes(),
        PodcastService.fetchCharacters(),
      ]);
      const sorted = PodcastService.sortByDateDesc(eps);
      setEpisodes(sorted);
      setCharacters(chars);
      if (sorted.length > 0 && !selectedEpisode) {
        setSelectedEpisode(sorted[0]);
      }
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [selectedEpisode]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    PodcastService.clearCache();
    loadData();
  }, [loadData]);

  const filteredEpisodes = PodcastService.filterByMode(episodes, filter);

  // ローディング
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">読み込み中...</span>
        </div>
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
          <button
            onClick={handleRefresh}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* メインコンテンツ */}
      <div className="flex flex-col md:flex-row" style={{ minHeight: '400px' }}>
        {/* エピソード一覧（左サイドバー） */}
        <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r dark:border-gray-700 flex-shrink-0 md:h-[500px]">
          <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">スタラジ</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {episodes.length}件
              </span>
            </div>
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
              title="再読み込み"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <EpisodeList
            episodes={filteredEpisodes}
            characters={characters}
            selectedId={selectedEpisode?.id || null}
            filter={filter}
            onSelect={setSelectedEpisode}
            onFilterChange={setFilter}
          />
        </div>

        {/* エピソード詳細（メインエリア） */}
        <div className="flex-1 overflow-y-auto md:h-[500px]">
          {selectedEpisode ? (
            <EpisodeDetail
              episode={selectedEpisode}
              characters={characters}
              audioPlayerRef={audioPlayerRef}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm py-20">
              エピソードを選択してください
            </div>
          )}
        </div>
      </div>

      {/* スタラジについて（説明ボックス） */}
      <AboutStarRadio />
    </div>
  );
};

// ── 説明ボックス ──────────────────────────────────────

const AboutStarRadio: React.FC = () => (
  <div className="mt-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-xl p-5 sm:p-6 border border-blue-100 dark:border-gray-700">
    <div className="flex items-center gap-2 mb-4">
      <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
        スタラジとは
      </h3>
    </div>

    <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 space-y-2">
      <p>
        AI自動生成ポッドキャスト「スタラジ」—
        <br />
        メインパーソナリティ・ゲスト・アシスタントの3人の掛け合いで最新ニュースをお届けします。
      </p>
      <p>
        平日は毎朝の日刊配信、土曜日にはその週のトピックを振り返る増刊号を配信しています。
      </p>
    </div>

    {/* 仕組み */}
    <div className="mb-4 p-3 rounded-lg bg-white/60 dark:bg-gray-900/40 border border-blue-100 dark:border-gray-600">
      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">仕組み</div>
      <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 font-mono flex-wrap">
        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">Raspberry Pi</span>
        <span>→</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">台本生成</span>
        <span>→</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">TTS音声生成</span>
        <span>→</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">git push</span>
        <span>→</span>
        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">GitHub Pages 自動deploy</span>
      </div>
      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
        毎朝 05:30 に cron で自動実行
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex-shrink-0">
          <Newspaper className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">ニュース収集</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">世界のメディアから最新ニュースを自動収集</div>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex-shrink-0">
          <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">AI台本作成</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">話題のトピックをAIが選定し台本を自動生成</div>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/40 flex-shrink-0">
          <Mic className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">TTS音声合成</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">Google TTSで自然な掛け合いを音声化</div>
        </div>
      </div>
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex-shrink-0">
          <Rss className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">GitHub Pages 配信</div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">静的HTML + GitHub Actions で自動デプロイ</div>
        </div>
      </div>
    </div>

    {/* 技術スタック・Podcast RSS */}
    <div className="mt-4 flex flex-wrap gap-1.5">
      {['Raspberry Pi', 'GitHub Pages', 'GitHub Actions', 'HTML5 Audio', 'Podcast RSS 2.0'].map(tag => (
        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
          {tag}
        </span>
      ))}
    </div>

    <div className="mt-3 pt-3 border-t border-blue-100 dark:border-gray-600 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
      <span>Developed by suzuki.shunpei</span>
      <a
        href="https://almlog.github.io/starradio-feed/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 dark:text-blue-400 hover:underline"
      >
        配信サイト
      </a>
    </div>
  </div>
);

export default PodcastPlayerPage;
