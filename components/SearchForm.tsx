/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { SparklesIcon, DocumentTextIcon, ChevronDownIcon, PlusIcon, TrashIcon } from './Icons';
import { TurnLength, Guest } from '../types';
import { PREBUILT_VOICES } from '../src/constants';

interface SearchFormProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  transcript: string;
  setTranscript: (transcript: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onConvert: (transcript: string, title: string) => void;
  isLoading: boolean;
  pace: 'normal' | 'fast';
  setPace: (pace: 'normal' | 'fast') => void;
  modelType: 'flash' | 'pro';
  setModelType: (type: 'flash' | 'pro') => void;
  turnLength: TurnLength;
  setTurnLength: (turnLength: TurnLength) => void;
  hostPersona: string;
  setHostPersona: (v: string) => void;
  hostVoice: string;
  setHostVoice: (v: string) => void;
  guests: Guest[];
  setGuests: (v: Guest[]) => void;
  hasScript: boolean;
  isInterruptible: boolean;
  setIsInterruptible: (v: boolean) => void;
  isLiveMode: boolean;
  setIsLiveMode: (v: boolean) => void;
}

type TopMode = 'panel' | 'panelists';
type InputMode = 'generate' | 'paste';

const EXAMPLES = [
  "Why do we dream?",
  "CRISPR",
  "Steps towards AGI",
  "Quantum Multiverses"
];

const VoiceSelect: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedVoice = PREBUILT_VOICES.find(v => v.name === value) || PREBUILT_VOICES[0];

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-100 flex justify-between items-center hover:border-indigo-500/50 transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span>{selectedVoice.label}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-h-48 overflow-y-auto no-scrollbar py-1 animate-in fade-in zoom-in-95 duration-200">
          {PREBUILT_VOICES.map((voice) => (
            <button
              key={voice.name}
              type="button"
              onClick={() => {
                onChange(voice.name);
                setIsOpen(false);
              }}
              className={"w-full text-left px-4 py-2 text-sm hover:bg-indigo-600/20 focus:bg-indigo-600/30 focus:outline-none transition-colors " + (value === voice.name ? 'text-indigo-400 bg-indigo-600/10 font-semibold' : 'text-slate-300')}
            >
              {voice.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SearchForm: React.FC<SearchFormProps> = ({ 
  prompt, 
  setPrompt, 
  transcript,
  setTranscript,
  onSubmit, 
  onConvert, 
  isLoading,
  pace,
  setPace,
  modelType,
  setModelType,
  turnLength,
  setTurnLength,
  hostPersona,
  setHostPersona,
  hostVoice,
  setHostVoice,
  guests,
  setGuests,
  hasScript,
  isInterruptible,
  setIsInterruptible,
  isLiveMode,
  setIsLiveMode
}) => {
  const [topMode, setTopMode] = useState<TopMode>('panel');
  const [mode, setMode] = useState<InputMode>('generate');
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [isHostExpanded, setIsHostExpanded] = useState(false);
  const [expandedGuestIds, setExpandedGuestIds] = useState<Set<string>>(new Set());
  const guestListRef = useRef<HTMLDivElement>(null);

  const toggleGuestExpansion = (id: string) => {
    setExpandedGuestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (topMode === 'panelists' && guestListRef.current) {
      guestListRef.current.scrollTo({
        top: guestListRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [guests.length, topMode]);

  const addGuest = () => {
    const newGuest: Guest = {
      id: Math.random().toString(36).substring(7),
      persona: 'a panelist on the topic',
      voice: PREBUILT_VOICES[Math.floor(Math.random() * PREBUILT_VOICES.length)].name,
      role: 'Expert',
    };
    setGuests([...guests, newGuest]);
  };

  const removeGuest = (id: string) => {
    if (guests.length <= 1) return;
    setGuests(guests.filter(g => g.id !== id));
  };

  const updateGuest = (id: string, field: keyof Guest, value: string) => {
    setGuests(guests.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handlePasteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (transcript.trim()) {
      onConvert(transcript, prompt);
    }
  };

  const handleClearTranscript = () => {
    setTranscript('');
  };

  const handleExampleSelect = (example: string) => {
    setPrompt(example);
    setIsExamplesOpen(false);
  };

  return (
    <div className="w-full bg-slate-800 transition-all duration-300">
      {/* Top Level Tabs */}
      <div className="flex items-center gap-2 p-3 bg-slate-900/30 border-b border-slate-700/50">
        <button
          onClick={() => setTopMode('panel')}
          className={`px-6 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${topMode === 'panel' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {hasScript ? 'Modify Panel' : 'Create Panel'}
        </button>
        <button
          onClick={() => setTopMode('panelists')}
          className={`px-6 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${topMode === 'panelists' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Define Panelists
        </button>
      </div>

      {topMode === 'panel' ? (
        <>
          <div className="flex gap-8 px-6 pt-5 border-b border-slate-700/50">
            <button
              onClick={() => setMode('generate')}
              disabled={isLoading}
              className={`pb-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] flex items-center gap-2 transition-all disabled:opacity-50 relative focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm ${mode === 'generate' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              Generate Topic
              {mode === 'generate' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
            </button>
            <button
              onClick={() => setMode('paste')}
              disabled={isLoading}
              className={`pb-4 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em] flex items-center gap-2 transition-all disabled:opacity-50 relative focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm ${mode === 'paste' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <DocumentTextIcon className="w-3.5 h-3.5" />
              Paste Transcript
              {mode === 'paste' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />}
            </button>
          </div>

          {mode === 'generate' ? (
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Turn Length:</span>
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setTurnLength('short')}
                      disabled={isLoading}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${turnLength === 'short' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Short
                    </button>
                    <button
                      type="button"
                      onClick={() => setTurnLength('long')}
                      disabled={isLoading}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${turnLength === 'long' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Long
                    </button>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Model:</span>
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setModelType('flash')}
                      disabled={isLoading}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${modelType === 'flash' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Flash
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelType('pro')}
                      disabled={isLoading}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${modelType === 'pro' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Pro
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={onSubmit}>
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter a panel topic"
                    disabled={isLoading}
                    rows={3}
                    className="w-full pl-4 pr-44 py-4 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-300 placeholder-slate-500 disabled:opacity-50 resize-y"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !prompt.trim()}
                    className="absolute right-3 bottom-3 bg-indigo-600 text-white sm:font-semibold font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-full flex items-center gap-2 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300 text-sm sm:text-base"
                  >
                    {isLoading ? 'Writing...' : 'Generate'}
                    {!isLoading && <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </form>
              <div className="flex items-center justify-between">
                <div className="relative">
                  <button
                    onClick={() => setIsExamplesOpen(!isExamplesOpen)}
                    disabled={isLoading}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm"
                  >
                    Examples
                    <ChevronDownIcon className={`w-3 h-3 transition-transform ${isExamplesOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div className="flex sm:hidden bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModelType('flash')}
                    disabled={isLoading}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${modelType === 'flash' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => setModelType('pro')}
                    disabled={isLoading}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${modelType === 'pro' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Pro
                  </button>
                </div>
              </div>
              
              {isExamplesOpen && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      onClick={() => handleExampleSelect(example)}
                      disabled={isLoading}
                      className="w-full text-left px-4 py-2 text-xs text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handlePasteSubmit} className="p-4 space-y-6">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Model:</span>
                <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModelType('flash')}
                    disabled={isLoading}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${modelType === 'flash' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Flash
                  </button>
                  <button
                    type="button"
                    onClick={() => setModelType('pro')}
                    disabled={isLoading}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${modelType === 'pro' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Pro
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Panel Title (Optional)
                  </label>
                </div>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a title for this panel"
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-300 placeholder-slate-500 disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Transcript / Notes
                  </label>
                  {!isLoading && (
                    <button
                      type="button"
                      onClick={handleClearTranscript}
                      disabled={!transcript.trim()}
                      className="text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-sm"
                    >
                      <TrashIcon className="w-3 h-3" />
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your raw transcript or notes here..."
                    disabled={isLoading}
                    rows={8}
                    className="w-full pl-4 pr-44 py-4 bg-slate-900 border-2 border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-300 placeholder-slate-500 disabled:opacity-50 resize-y"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !transcript.trim()}
                    className="absolute right-3 bottom-3 bg-indigo-600 text-white sm:font-semibold font-medium px-4 py-2 sm:px-6 sm:py-3 rounded-full flex items-center gap-2 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-300 text-sm sm:text-base"
                  >
                    {isLoading ? 'Converting...' : 'Convert'}
                    {!isLoading && <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 text-center px-4">By using this app, you confirm that you have the necessary rights to any content that you upload.</p>
                <div className="flex sm:hidden justify-end mt-4">
                  <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setModelType('flash')}
                      disabled={isLoading}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${modelType === 'flash' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Flash
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelType('pro')}
                      disabled={isLoading}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${modelType === 'pro' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Pro
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </>
      ) : (
        <div 
          ref={guestListRef}
          className="p-4 sm:p-6 space-y-8 max-h-[60vh] overflow-y-auto"
        >
          <p className="text-[9px] sm:text-[10px] text-slate-500 italic leading-relaxed">
            These descriptions are used by the AI to modulate its voice and generate the script. Be as descriptive as possible about professional background, gender, accent, tone, and personality.
          </p>

          {/* Host Section */}
          <section className={`space-y-4 relative ${isHostExpanded ? 'z-20' : 'z-0'}`}>
            <button 
              onClick={() => setIsHostExpanded(!isHostExpanded)}
              className="w-full flex justify-between items-center text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-700 pb-2 group hover:text-indigo-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-sm"
            >
              <div className="flex items-center gap-2">
                <span>Host Settings</span>
              </div>
              <div className={`p-1.5 rounded-full bg-slate-800 border border-slate-700 group-hover:border-indigo-500/50 group-hover:bg-slate-700 transition-all duration-300 ${isHostExpanded ? 'rotate-180 bg-indigo-600/20 border-indigo-500/50' : ''}`}>
                <ChevronDownIcon className={`w-5 h-5 ${isHostExpanded ? 'text-indigo-400' : 'text-slate-400'}`} />
              </div>
            </button>
            
            {isHostExpanded && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Host Voice
                    </label>
                    <VoiceSelect
                      value={hostVoice}
                      onChange={setHostVoice}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Host Persona Description
                  </label>
                  <textarea
                    value={hostPersona}
                    onChange={(e) => setHostPersona(e.target.value)}
                    className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none text-sm"
                    placeholder="Describe the host's voice, accent, and personality..."
                  />
                </div>
              </div>
            )}
          </section>

          {/* Guests Section */}
          <section className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-widest">Guest Settings</h3>
              <button
                onClick={addGuest}
                className="flex items-center gap-1 text-[10px] sm:text-xs bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 px-3 py-1 rounded-lg transition-all font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <PlusIcon className="w-4 h-4" />
                Add Guest
              </button>
            </div>

            <div className="space-y-6">
              {guests.map((guest, index) => {
                const isExpanded = expandedGuestIds.has(guest.id);
                return (
                  <div key={guest.id} className={`relative p-4 sm:p-6 bg-slate-900/40 border border-white/5 rounded-2xl transition-all hover:border-indigo-500/20 shadow-xl backdrop-blur-md group ${isExpanded ? 'space-y-5 z-10' : 'space-y-0 z-0'}`}>
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleGuestExpansion(guest.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleGuestExpansion(guest.id);
                        }
                      }}
                      className="w-full flex justify-between items-center cursor-pointer group/header focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${[
                           "bg-emerald-400", "bg-amber-400", "bg-rose-400", "bg-cyan-400", "bg-violet-400"
                        ][index % 5]}`} />
                        <span className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase tracking-wider sm:tracking-widest flex items-center gap-2 sm:gap-3">
                          Guest {index + 1}
                          {!isExpanded && (
                            <span className="text-slate-500 font-bold truncate max-w-[120px] sm:max-w-none">
                              — {guest.role}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {guests.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeGuest(guest.id);
                            }}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1.5 hover:bg-red-400/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            title="Remove Guest"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                        <div className={`p-1.5 rounded-full bg-slate-800 border border-slate-700 group-hover/header:border-indigo-500/50 group-hover/header:bg-slate-700 transition-all duration-300 ${isExpanded ? 'rotate-180 bg-indigo-600/20 border-indigo-500/50' : ''}`}>
                          <ChevronDownIcon className={`w-5 h-5 ${isExpanded ? 'text-indigo-400' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              Role
                            </label>
                            <input
                              type="text"
                              value={guest.role}
                              onChange={(e) => updateGuest(guest.id, 'role', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2 text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                              placeholder="e.g., Technical Panelist"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              Voice
                            </label>
                            <VoiceSelect
                              value={guest.voice}
                              onChange={(v) => updateGuest(guest.id, 'voice', v)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Persona Description
                          </label>
                          <textarea
                            value={guest.persona}
                            onChange={(e) => updateGuest(guest.id, 'persona', e.target.value)}
                            className="w-full h-20 bg-slate-800 border border-slate-700 rounded-xl p-3 text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                            placeholder={`Describe Guest ${index + 1}'s professional background and personality...`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-widest">Delivery Speed</h3>
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700">
                <button
                  onClick={() => setPace('normal')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${pace === 'normal' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setPace('fast')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${pace === 'fast' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  Fast
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <div className="flex flex-col">
                <h3 className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-widest">Agent Interruptibility</h3>
                <p className="text-[9px] text-slate-500 mt-0.5">Allow users to cut off the AI while it's speaking</p>
              </div>
              <button
                type="button"
                onClick={() => setIsInterruptible(!isInterruptible)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isInterruptible ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                <span className="sr-only">Toggle agent interruptibility</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isInterruptible ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <div className="flex flex-col">
                <h3 className="text-[10px] sm:text-xs font-bold text-indigo-400 uppercase tracking-widest">Live Interactive Mode</h3>
                <p className="text-[9px] text-slate-500 mt-0.5">Let the Host review candidate submissions turn-by-turn</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isLiveMode ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                <span className="sr-only">Toggle live interactive mode</span>
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isLiveMode ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default SearchForm;