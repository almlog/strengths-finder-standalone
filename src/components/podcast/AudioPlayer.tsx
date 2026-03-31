// src/components/podcast/AudioPlayer.tsx
import React, { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { PodcastService } from '../../services/PodcastService';

export interface AudioPlayerHandle {
  seekTo: (seconds: number) => void;
}

interface AudioPlayerProps {
  audioFile: string | null;
  episodeTitle?: string;
}

const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  ({ audioFile, episodeTitle }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (audioRef.current) {
          audioRef.current.currentTime = seconds;
          if (!isPlaying) {
            audioRef.current.play().catch(() => {});
            setIsPlaying(true);
          }
        }
      },
    }));

    // audioFile変更時にリセット
    useEffect(() => {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }, [audioFile]);

    const handlePlayPause = useCallback(() => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const handleTimeUpdate = useCallback(() => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    }, []);

    const handleLoadedMetadata = useCallback(() => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    }, []);

    const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (audioRef.current) {
        audioRef.current.currentTime = time;
        setCurrentTime(time);
      }
    }, []);

    const handleEnded = useCallback(() => {
      setIsPlaying(false);
    }, []);

    const toggleMute = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
      }
    }, [isMuted]);

    if (!audioFile) {
      return (
        <div className="bg-gray-100 dark:bg-gray-800 border-t dark:border-gray-700 p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
          エピソードを選択してください
        </div>
      );
    }

    const audioUrl = PodcastService.getAudioUrl(audioFile);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-3 sm:p-4">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <div className="flex items-center gap-3">
          {/* 再生/一時停止ボタン */}
          <button
            onClick={handlePlayPause}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
            aria-label={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          {/* 時間表示 */}
          <span className="text-xs text-gray-600 dark:text-gray-300 w-12 text-right flex-shrink-0">
            {PodcastService.formatTime(currentTime)}
          </span>

          {/* シークバー */}
          <div className="flex-1 relative">
            <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              aria-label="シーク"
            />
          </div>

          {/* 残り時間 */}
          <span className="text-xs text-gray-600 dark:text-gray-300 w-12 flex-shrink-0">
            {PodcastService.formatTime(duration)}
          </span>

          {/* ミュートボタン */}
          <button
            onClick={toggleMute}
            className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label={isMuted ? 'ミュート解除' : 'ミュート'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';

export default AudioPlayer;
