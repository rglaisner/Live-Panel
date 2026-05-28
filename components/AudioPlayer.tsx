/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { PlayIcon, PauseIcon } from './Icons';

interface AudioPlayerProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  progress: number;
  onSeek: (event: React.ChangeEvent<HTMLInputElement>) => void;
  duration: number;
  currentTime: number;
}

const formatTime = (time: number) => {
  if (isNaN(time) || time === 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  isPlaying,
  onTogglePlay,
  progress,
  onSeek,
  duration,
  currentTime,
}) => {
  return (
    <div className="bg-slate-700/50 rounded-full p-2 flex items-center gap-4 border border-slate-600">
      <button
        onClick={onTogglePlay}
        className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-indigo-500 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
      </button>
      <div className="flex-grow flex items-center gap-3">
        <span className="text-xs font-mono text-slate-400">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={onSeek}
          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-full"
          aria-label="Audio progress"
        />
        <span className="text-xs font-mono text-slate-400">{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default AudioPlayer;