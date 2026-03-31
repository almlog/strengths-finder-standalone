// src/components/podcast/EpisodeList.tsx
import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import { PodcastEpisode, EpisodeFilter, CharacterMap } from '../../types/podcast';

type ViewMode = 'list' | 'calendar';

interface EpisodeListProps {
  episodes: PodcastEpisode[];
  characters: CharacterMap;
  selectedId: string | null;
  filter: EpisodeFilter;
  onSelect: (episode: PodcastEpisode) => void;
  onFilterChange: (filter: EpisodeFilter) => void;
}

const FILTER_OPTIONS: { value: EpisodeFilter; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'daily', label: '日刊' },
  { value: 'weekly', label: '増刊号' },
];

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

// ── エピソードカード ──────────────────────────────────

const EpisodeCard: React.FC<{
  episode: PodcastEpisode;
  characters: CharacterMap;
  isSelected: boolean;
  isLatest: boolean;
  onSelect: () => void;
}> = ({ episode, characters, isSelected, isLatest, onSelect }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left p-3 border-b dark:border-gray-700 transition-colors ${
      isSelected
        ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500'
        : isLatest
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
          : 'hover:bg-gray-50 dark:hover:bg-gray-750 border-l-4 border-l-transparent'
    }`}
  >
    <div className="flex items-center gap-2 mb-1">
      {isLatest && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 font-bold">
          NEW
        </span>
      )}
      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
        {episode.date}
      </span>
      {episode.broadcastMode === 'weekly' && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
          増刊号
        </span>
      )}
      <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
        {episode.durationFormatted}
      </span>
    </div>
    <div className="flex flex-wrap gap-1">
      {episode.cast.map(name => {
        const char = characters[name];
        return (
          <span
            key={name}
            className="text-[10px] px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: char ? `${char.color}20` : '#e5e7eb',
              color: char?.color || '#6b7280',
            }}
          >
            {name}
          </span>
        );
      })}
    </div>
  </button>
);

// ── カレンダービュー ──────────────────────────────────

const CalendarView: React.FC<{
  episodes: PodcastEpisode[];
  selectedId: string | null;
  onSelect: (episode: PodcastEpisode) => void;
}> = ({ episodes, selectedId, onSelect }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  // エピソードを日付でマップ化
  const episodeMap = useMemo(() => {
    const map = new Map<string, PodcastEpisode>();
    episodes.forEach(ep => map.set(ep.date, ep));
    return map;
  }, [episodes]);

  // カレンダーのグリッド計算
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const monthLabel = `${year}年${month + 1}月`;

  return (
    <div className="p-2">
      {/* 月ナビ */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAY_LABELS.map(d => (
          <div key={d} className={`text-center text-[10px] font-medium ${
            d === '日' ? 'text-red-400' : d === '土' ? 'text-blue-400' : 'text-gray-400 dark:text-gray-500'
          }`}>
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const ep = episodeMap.get(dateStr);
          const isSelected = ep?.id === selectedId;
          const isToday = dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

          return (
            <button
              key={dateStr}
              onClick={() => ep && onSelect(ep)}
              disabled={!ep}
              className={`relative aspect-square flex items-center justify-center text-[11px] rounded transition-colors ${
                isSelected
                  ? 'bg-blue-500 text-white font-bold'
                  : ep
                    ? 'hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-800 dark:text-gray-200 font-medium cursor-pointer'
                    : 'text-gray-300 dark:text-gray-600 cursor-default'
              } ${isToday && !isSelected ? 'ring-1 ring-blue-400' : ''}`}
            >
              {day}
              {ep && !isSelected && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                  ep.broadcastMode === 'weekly' ? 'bg-purple-500' : 'bg-blue-500'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── メインコンポーネント ──────────────────────────────

const EpisodeList: React.FC<EpisodeListProps> = ({
  episodes,
  characters,
  selectedId,
  filter,
  onSelect,
  onFilterChange,
}) => {
  const [showPast, setShowPast] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const latestEpisode = episodes.length > 0 ? episodes[0] : null;
  const pastEpisodes = episodes.slice(1);

  return (
    <div className="flex flex-col h-full">
      {/* フィルター + ビュー切替 */}
      <div className="flex items-center gap-1 p-2 border-b dark:border-gray-700">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { onFilterChange(opt.value); setViewMode('list'); }}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              filter === opt.value && viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <div className="ml-auto flex gap-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'list'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="リスト表示"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'calendar'
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="カレンダー表示"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'calendar' ? (
          <CalendarView
            episodes={episodes}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ) : episodes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            エピソードがありません
          </div>
        ) : (
          <>
            {latestEpisode && (
              <EpisodeCard
                episode={latestEpisode}
                characters={characters}
                isSelected={latestEpisode.id === selectedId}
                isLatest={true}
                onSelect={() => onSelect(latestEpisode)}
              />
            )}
            {pastEpisodes.length > 0 && (
              <>
                <button
                  onClick={() => setShowPast(!showPast)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b dark:border-gray-700"
                >
                  <span>過去の配信 ({pastEpisodes.length}件)</span>
                  {showPast ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showPast && pastEpisodes.map(ep => (
                  <EpisodeCard
                    key={ep.id}
                    episode={ep}
                    characters={characters}
                    isSelected={ep.id === selectedId}
                    isLatest={false}
                    onSelect={() => onSelect(ep)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EpisodeList;
