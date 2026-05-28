/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef } from 'react';
import { useFocusTrap } from '../src/hooks/useFocusTrap';
// FIX: Import BACKGROUND_MUSIC_TRACKS constant.
import { PREBUILT_VOICES, CUSTOM_ENDPOINT_VOICE, BACKGROUND_MUSIC_TRACKS } from '../src/constants';
import { SpeakerIcon, UploadIcon } from './Icons';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostVoicePrompt: string;
  setHostVoicePrompt: (prompt: string) => void;
  guestVoicePrompt: string;
  setGuestVoicePrompt: (prompt: string) => void;
  onResetPrompts: () => void;
  hostVoice: string;
  setHostVoice: (voice: string) => void;
  guestVoice: string;
  setGuestVoice: (voice: string) => void;
  onTestVoice: (speaker: 'Host' | 'Guest') => void;
  isTestingAudio: boolean;
  musicTrackUrl: string;
  setMusicTrackUrl: (url: string) => void;
  musicVolume: number;
  setMusicVolume: (volume: number) => void;
  onPreviewMusic: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadedFileName: string | null;
  onClearUpload: () => void;
  hostCustomEndpoint: string;
  setHostCustomEndpoint: (url: string) => void;
  guestCustomEndpoint: string;
  setGuestCustomEndpoint: (url: string) => void;
}

const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  hostVoicePrompt,
  setHostVoicePrompt,
  guestVoicePrompt,
  setGuestVoicePrompt,
  onResetPrompts,
  hostVoice,
  setHostVoice,
  guestVoice,
  setGuestVoice,
  onTestVoice,
  isTestingAudio,
  musicTrackUrl,
  setMusicTrackUrl,
  musicVolume,
  setMusicVolume,
  onPreviewMusic,
  onFileUpload,
  uploadedFileName,
  onClearUpload,
  hostCustomEndpoint,
  setHostCustomEndpoint,
  guestCustomEndpoint,
  setGuestCustomEndpoint,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;
  

  const selectClasses = "w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-300 disabled:opacity-50";
  const testButtonClasses = "bg-slate-600 text-white font-semibold px-3 py-2 text-sm rounded-md flex items-center justify-center gap-2 hover:bg-slate-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors duration-300";
  const textAreaClasses = "w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-300 placeholder-slate-500";
  const inputClasses = "w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-300 placeholder-slate-500";

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-indigo-400">Audio Settings</h2>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
          >
            Done
          </button>
        </header>

        <main className="p-6 flex-grow overflow-y-auto space-y-6">
          {/* Voice Prompt Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="text-sm font-medium text-slate-300">Voice Prompts</h3>
              <button
                onClick={onResetPrompts}
                className="text-xs text-slate-400 hover:text-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm"
              >
                Reset to Defaults
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="host-voice-prompt" className="block text-xs font-medium text-slate-400">
                  Host Voice Prompt
                </label>
                <textarea
                  id="host-voice-prompt"
                  value={hostVoicePrompt}
                  onChange={(e) => setHostVoicePrompt(e.target.value)}
                  rows={3}
                  className={textAreaClasses}
                  placeholder="e.g., excited and energetic"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="guest-voice-prompt" className="block text-xs font-medium text-slate-400">
                  Guest Voice Prompt
                </label>
                <textarea
                  id="guest-voice-prompt"
                  value={guestVoicePrompt}
                  onChange={(e) => setGuestVoicePrompt(e.target.value)}
                  rows={3}
                  className={textAreaClasses}
                  placeholder="e.g., calm and thoughtful"
                />
              </div>
            </div>
             <p className="text-xs text-slate-500 text-center">
              Describe the tone and style for the AI voices.
            </p>
          </div>

          {/* Voice Selection Section */}
          <div className="space-y-4">
             <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2">Voice Selection</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-2">
                    <label htmlFor="host-voice" className="block text-xs font-medium text-slate-400">Host Voice</label>
                    <div className="flex gap-2">
                        <select 
                            id="host-voice" 
                            value={hostVoice} 
                            onChange={e => setHostVoice(e.target.value)}
                            disabled={isTestingAudio} 
                            className={selectClasses}
                        >
                            {PREBUILT_VOICES.map(voice => <option key={`host-${voice.name}`} value={voice.name}>{voice.label}</option>)}
                        </select>
                         <button onClick={() => onTestVoice('Host')} disabled={isTestingAudio} className={`${testButtonClasses} focus:outline-none focus:ring-2 focus:ring-indigo-500`}>
                            <SpeakerIcon className="w-4 h-4" /> Test
                        </button>
                    </div>
                    {hostVoice === CUSTOM_ENDPOINT_VOICE && (
                         <input
                            type="text"
                            placeholder="Host TTS Endpoint URL"
                            value={hostCustomEndpoint}
                            onChange={(e) => setHostCustomEndpoint(e.target.value)}
                            className={inputClasses}
                        />
                    )}
                </div>
                <div className="space-y-2">
                    <label htmlFor="guest-voice" className="block text-xs font-medium text-slate-400">Guest Voice</label>
                    <div className="flex gap-2">
                         <select 
                            id="guest-voice" 
                            value={guestVoice} 
                            onChange={e => setGuestVoice(e.target.value)}
                            disabled={isTestingAudio} 
                            className={selectClasses}
                        >
                            {PREBUILT_VOICES.map(voice => <option key={`guest-${voice.name}`} value={voice.name}>{voice.label}</option>)}
                        </select>
                        <button onClick={() => onTestVoice('Guest')} disabled={isTestingAudio} className={`${testButtonClasses} focus:outline-none focus:ring-2 focus:ring-indigo-500`}>
                            <SpeakerIcon className="w-4 h-4" /> Test
                        </button>
                    </div>
                    {guestVoice === CUSTOM_ENDPOINT_VOICE && (
                        <input
                            type="text"
                            placeholder="Guest TTS Endpoint URL"
                            value={guestCustomEndpoint}
                            onChange={(e) => setGuestCustomEndpoint(e.target.value)}
                            className={inputClasses}
                        />
                    )}
                </div>
             </div>
          </div>
          
           {/* Background Music Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2">Background Music</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                 <div className="space-y-2">
                    <label htmlFor="music-track" className="block text-xs font-medium text-slate-400">Track</label>
                    {uploadedFileName ? (
                        <div className="flex items-center gap-2 text-sm bg-slate-700 p-2 rounded-md">
                            <span className="truncate flex-grow text-slate-300">{uploadedFileName}</span>
                            <button onClick={onClearUpload} className="text-red-400 hover:text-red-300 font-bold text-lg flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full">&times;</button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <select 
                                id="music-track" 
                                value={musicTrackUrl} 
                                onChange={e => setMusicTrackUrl(e.target.value)}
                                className={selectClasses}
                            >
                                {BACKGROUND_MUSIC_TRACKS.map(track => <option key={track.name} value={track.url}>{track.name}</option>)}
                            </select>
                            <label className={`${testButtonClasses} cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500`}>
                                <UploadIcon className="w-4 h-4" />
                                <input type="file" accept="audio/*" className="hidden" onChange={onFileUpload} />
                            </label>
                        </div>
                    )}
                </div>
                 <div className="space-y-2">
                    <label htmlFor="music-volume" className="block text-xs font-medium text-slate-400">Volume</label>
                    <div className="flex gap-2 items-center">
                        <input
                            id="music-volume"
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={musicVolume}
                            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-full"
                            aria-label="Music volume"
                        />
                         <button onClick={onPreviewMusic} disabled={!musicTrackUrl && !uploadedFileName} className={`${testButtonClasses} focus:outline-none focus:ring-2 focus:ring-indigo-500`}>
                            <SpeakerIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
             </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default AudioSettingsModal;