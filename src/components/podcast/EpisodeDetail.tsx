// src/components/podcast/EpisodeDetail.tsx
import React from 'react';
import { Users, ListMusic } from 'lucide-react';
import { PodcastEpisode, CharacterMap } from '../../types/podcast';
import { PodcastService } from '../../services/PodcastService';
import AudioPlayer, { AudioPlayerHandle } from './AudioPlayer';

interface EpisodeDetailProps {
  episode: PodcastEpisode;
  characters: CharacterMap;
  audioPlayerRef: React.RefObject<AudioPlayerHandle | null>;
}

const EpisodeDetail: React.FC<EpisodeDetailProps> = ({
  episode,
  characters,
  audioPlayerRef,
}) => {
  const handleSegmentClick = (startSec: number) => {
    audioPlayerRef.current?.seekTo(startSec);
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* タイトル */}
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
        {episode.title}
      </h2>

      {/* オーディオプレーヤー */}
      <AudioPlayer
        ref={audioPlayerRef}
        audioFile={episode.audioFile}
      />

      {/* キャスト */}
      <section>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          <Users className="w-4 h-4" />
          キャスト
        </h3>
        <div className="flex flex-wrap gap-2">
          {episode.cast.map(name => {
            const char = characters[name];
            return (
              <div
                key={name}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: char?.color || '#9ca3af' }}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {name}
                  </div>
                  {char && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      {char.name} — {char.role}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* セグメント */}
      {episode.segments.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            <ListMusic className="w-4 h-4" />
            セグメント
          </h3>
          <div className="space-y-1">
            {episode.segments.map((seg, idx) => (
              <button
                key={idx}
                onClick={() => handleSegmentClick(seg.startSec)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
              >
                <span className="text-xs text-gray-400 dark:text-gray-500 w-10 flex-shrink-0 font-mono">
                  {PodcastService.formatTime(seg.startSec)}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {seg.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default EpisodeDetail;
