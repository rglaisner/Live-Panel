/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';

import { MicrophoneSlashIcon, MicrophoneIcon, SettingsIcon, ArrowDownTrayIcon } from './Icons';
import PulsingHalo from './PulsingHalo';
import QAAnimation from './QAAnimation';
import { Guest } from '../types';
import Avatar from './Avatar';
import { motion, AnimatePresence } from 'motion/react';

interface ResponseDisplayProps {
  scriptLines: string[];
  currentLineIndex: number;
  currentInputTranscription: string;
  conversationHistory: { user: string; agent: string }[];
  agentStatus: string;
  outputVolume: number;
  inputVolume: number;
  inlineQaHistory: Map<number, { user: string; agent: string }[]>;
  guests: Guest[];
  selectedQaGuestIndex: number;
  isAgentSpeaking: boolean;
  isPaused: boolean;
  onModifyPanel?: () => void;
  hasAudio?: boolean;
  onDownloadAudio?: () => void;
  isDownloading?: boolean;
  isInterruptible?: boolean;
  onInterrupt?: () => void;
}

const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ 
    scriptLines, 
    currentLineIndex,
    currentInputTranscription,
    conversationHistory,
    agentStatus,
    outputVolume,
    inputVolume,
    inlineQaHistory,
    guests,
    selectedQaGuestIndex,
    isAgentSpeaking,
    isPaused,
    onModifyPanel,
    hasAudio,
    onDownloadAudio,
    isDownloading,
    isInterruptible,
    onInterrupt
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (currentLineIndex > 0 && activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentLineIndex]);

  if (agentStatus === 'prompting' || agentStatus === 'listening' || agentStatus === 'answering') {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 flex flex-col items-center justify-center min-h-[300px] shadow-[0_0_100px_50px_rgba(8,9,71,0.9)]">
        <div className="text-center">
          {agentStatus === 'prompting' && (
            <QAAnimation />
          )}
          {(agentStatus === 'listening' || agentStatus === 'answering') && (
            <>
              <div className="text-lg font-medium text-gray-300 mb-4">
                {agentStatus === 'listening' ? "Your turn. Ask your question." : (selectedQaGuestIndex !== -1 ? `Guest ${selectedQaGuestIndex + 1} is answering...` : "Preparing answer...")}
              </div>
              <div className="relative w-24 h-24 mx-auto my-6">
                <PulsingHalo isActive={agentStatus === 'listening'} color="bg-sky-400" volume={inputVolume}>
                  <MicrophoneIcon className="w-24 h-24 text-sky-400" />
                </PulsingHalo>
                <div 
                  className="absolute inset-0 rounded-full border-2 border-sky-400 transition-transform duration-100"
                  style={{ 
                    transform: `scale(${1 + (outputVolume) * 0.4})`,
                    boxShadow: `0 0 ${(outputVolume) * 20}px ${(outputVolume) * 10}px rgba(56, 189, 248, ${(outputVolume) * 0.5})`
                  }}
                />
              </div>
              {agentStatus === 'answering' && isInterruptible && onInterrupt && (
                <button
                  onClick={onInterrupt}
                  className="px-4 py-1.5 mt-2 text-xs font-bold uppercase tracking-wider text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-full hover:bg-pink-500/20 hover:border-pink-500/40 transition-all flex items-center gap-1.5 shadow-lg mx-auto focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
                  Cut Off Agent
                </button>
              )}
            </>
          )}
          <p className="text-sm text-gray-400 mt-4 font-mono break-words whitespace-pre-wrap max-w-xl mx-auto">{currentInputTranscription}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden flex flex-col shadow-[0_0_100px_50px_rgba(8,9,71,0.9)]">
      {/* Delivery Speed Toggle Header */}
      <div className="py-2 px-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/30">
        <div className="flex items-center gap-3">
          {onModifyPanel && (
            <button
              onClick={onModifyPanel}
              className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-800/50 border border-slate-700 rounded-full transition-all shadow-lg hover:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Modify Panel"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
          )}
        </div>
        {onDownloadAudio && (
            <button
                onClick={onDownloadAudio}
                disabled={!hasAudio || isDownloading}
                className="p-1.5 text-slate-400 hover:text-sky-400 bg-slate-800/50 border border-slate-700 rounded-full transition-all shadow-lg hover:border-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-500"
                title="Download Audio"
            >
                {isDownloading ? (
                    <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <ArrowDownTrayIcon className="w-6 h-6" />
                )}
            </button>
        )}
      </div>

      <div 
        ref={scrollContainerRef}
        className="p-4 space-y-4 max-h-[60vh] overflow-y-auto"
      >
        <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
          {scriptLines.map((line, index) => {
            const parts = line.match(/^([\*]*(Host|Guest\s*(\d+)):?[\*]*)\s*(.*)/i);
            const isCurrentLine = index === currentLineIndex;
            const speaker = parts ? parts[1] : '';
            const dialogue = parts ? parts[4] : line;
            const speakerType = parts ? parts[2].toLowerCase() : '';
            const guestNum = parts && parts[3] ? parseInt(parts[3]) : 0;

            let avatarGradient = "from-indigo-500 to-purple-600"; // Default Host
            if (speakerType.includes('guest')) {
              const gradients = [
                "from-emerald-400 to-teal-600",   // Guest 1
                "from-amber-400 to-orange-600",   // Guest 2
                "from-rose-400 to-pink-600",      // Guest 3
                "from-cyan-400 to-sky-600",       // Guest 4
                "from-violet-400 to-fuchsia-600", // Guest 5
              ];
              avatarGradient = gradients[(guestNum - 1) % gradients.length];
            }

            return (
              <React.Fragment key={index}>
                <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[100px_1fr] gap-2 sm:gap-4 items-center">
                  <div className="flex flex-col items-center pt-2">
                    <AnimatePresence>
                      {isCurrentLine && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.3, x: -20 }}
                          animate={{ opacity: 1, scale: 0.7, x: 0 }}
                          exit={{ opacity: 0, scale: 0.3, x: -20 }}
                          className="z-20 flex flex-col items-center"
                        >
                          <PulsingHalo isActive={isAgentSpeaking && !isPaused} color="bg-indigo-400" volume={outputVolume}>
                            <Avatar gradient={isPaused ? "from-slate-400 to-slate-600" : avatarGradient} />
                          </PulsingHalo>
                          <div className="mt-3 px-2 py-0.5 bg-slate-900/60 border border-white/5 rounded-full shadow-lg backdrop-blur-sm">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center leading-tight whitespace-nowrap">
                              {speakerType.includes('guest') ? (guests[guestNum - 1]?.role || `Guest ${guestNum}`) : "Host"}
                            </div>
                          </div>
                          {isInterruptible && isAgentSpeaking && !isPaused && onInterrupt && (
                            <button
                              onClick={onInterrupt}
                              className="mt-2 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded-full hover:bg-pink-500/20 hover:border-pink-500/40 transition-all flex items-center gap-1 shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer"
                              title="Cut off speaker"
                            >
                              <div className="w-1 h-1 rounded-full bg-pink-400 animate-ping" />
                              Cut Off
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div 
                    ref={isCurrentLine ? activeLineRef : null}
                    className={`relative transition-all duration-500 ${isCurrentLine ? 'bg-indigo-500/10 p-4 sm:p-5 rounded-xl border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)] backdrop-blur-sm' : 'opacity-40 grayscale-[0.5]'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isCurrentLine ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                      <strong className="font-black text-indigo-400 uppercase tracking-widest text-[10px] sm:text-[11px]">{speaker}</strong>
                    </div>
                    <span className="text-sm sm:text-lg leading-relaxed font-medium text-slate-100">{dialogue}</span>
                  </div>
                </div>
                {inlineQaHistory.has(index) && (
                  <div className="grid grid-cols-[64px_1fr] sm:grid-cols-[100px_1fr] gap-2 sm:gap-4">
                    <div />
                    <div className="my-2 p-3 sm:p-4 border-l-2 border-sky-500 bg-slate-800/70 rounded-r-lg">
                      <h3 className="text-base sm:text-lg font-bold text-sky-400 mb-2 sm:mb-3">Q&A Session</h3>
                      <div className="space-y-2 sm:space-y-3">
                        {inlineQaHistory.get(index)?.map((turn, turnIndex) => (
                          <div key={turnIndex} className="text-sm sm:text-base">
                            <p className="break-words whitespace-pre-wrap"><strong className="font-semibold text-slate-400 mr-2">You:</strong>{turn.user}</p>
                            <p className="break-words whitespace-pre-wrap"><strong className="font-semibold text-sky-400 mr-2">Agent:</strong>{turn.agent}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResponseDisplay;