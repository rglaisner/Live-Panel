/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useRef } from 'react';
import { useFocusTrap } from '../src/hooks/useFocusTrap';
import { logger, LogEntry, QAEntry, ProfilingEntry, WebSource } from '../utils/logger';
import { CodeBracketIcon, GlobeIcon } from './Icons';

const DebugLogModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLElement>(null);

  useFocusTrap(modalRef, isOpen, mainContentRef);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [qaHistory, setQaHistory] = useState<QAEntry[]>([]);
  const [profilingData, setProfilingData] = useState<ProfilingEntry[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [sources, setSources] = useState<WebSource[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'qa' | 'prompt' | 'profiling' | 'sources'>('logs');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = logger.subscribe((newLogs, newQaHistory, prompt, newProfilingData, newSources) => {
      setLogs(newLogs);
      setQaHistory(newQaHistory);
      setCurrentPrompt(prompt);
      setProfilingData(newProfilingData);
      setSources(newSources);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen && logContainerRef.current) {
        // Scroll to the bottom when new logs are added
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, qaHistory, isOpen, activeTab]);

  const toggleModal = () => setIsOpen(!isOpen);
  
  const handleClearLogs = () => {
    logger.clear();
  };
  
  const formatTimestamp = (date: Date) => {
    // FIX: The `fractionalSecondDigits` option may not be available in older TypeScript lib versions.
    // Casting to `any` to bypass the strict type check.
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    } as any);
  };

  return (
    <>
      <button
        onClick={toggleModal}
        className="fixed bottom-4 right-4 bg-slate-900 text-slate-300 p-2 sm:p-3 rounded-full shadow-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all z-40 border border-slate-700 hover:border-indigo-500/50 group"
        aria-label="Open Debug Log"
        title="Show Logs"
      >
        <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md group-hover:bg-indigo-500/40 transition-all" />
        <CodeBracketIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
      </button>

      {isOpen && (
        <div 
          ref={modalRef}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={toggleModal}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
          >
            <header className="flex justify-between items-center p-2 sm:p-4 border-b border-slate-700 flex-shrink-0">
              <div className="flex gap-1 sm:gap-4 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveTab('logs')}
                    className={`text-xs sm:text-lg font-semibold px-2 py-1 rounded-md transition-colors whitespace-nowrap ${activeTab === 'logs' ? 'text-indigo-400 bg-slate-700' : 'text-slate-400 hover:text-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    Logs
                  </button>
                  <button 
                    onClick={() => setActiveTab('qa')}
                    className={`text-xs sm:text-lg font-semibold px-2 py-1 rounded-md transition-colors whitespace-nowrap ${activeTab === 'qa' ? 'text-indigo-400 bg-slate-700' : 'text-slate-400 hover:text-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    Q&A
                  </button>
                  <button 
                    onClick={() => setActiveTab('prompt')}
                    className={`text-xs sm:text-lg font-semibold px-2 py-1 rounded-md transition-colors whitespace-nowrap ${activeTab === 'prompt' ? 'text-indigo-400 bg-slate-700' : 'text-slate-400 hover:text-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    Prompt
                  </button>
                  <button 
                    onClick={() => setActiveTab('profiling')}
                    className={`text-xs sm:text-lg font-semibold px-2 py-1 rounded-md transition-colors whitespace-nowrap ${activeTab === 'profiling' ? 'text-indigo-400 bg-slate-700' : 'text-slate-400 hover:text-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    Profiling
                  </button>
                  <button 
                    onClick={() => setActiveTab('sources')}
                    className={`text-xs sm:text-lg font-semibold px-2 py-1 rounded-md transition-colors whitespace-nowrap ${activeTab === 'sources' ? 'text-indigo-400 bg-slate-700' : 'text-slate-400 hover:text-slate-200'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  >
                    Sources
                  </button>
              </div>
              <div className="flex gap-1 sm:gap-2 ml-2">
                <button
                    onClick={handleClearLogs}
                    className="px-2 py-1 text-[10px] sm:text-sm bg-slate-600 hover:bg-slate-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
                >
                    Clear
                </button>
                <button
                  onClick={toggleModal}
                  className="px-2 py-1 text-[10px] sm:text-sm bg-red-600 hover:bg-red-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500"
                >
                  Close
                </button>
              </div>
            </header>
            <main 
              ref={mainContentRef} 
              tabIndex={0}
              className="p-4 flex-grow overflow-y-auto font-mono text-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 rounded-b-lg"
            >
              {activeTab === 'logs' ? (
                  logs.length > 0 ? (
                    logs.map((log, index) => (
                      <div key={index} className="flex gap-4 border-b border-slate-700/50 py-1 last:border-b-0">
                        <span className="text-slate-500 flex-shrink-0">{formatTimestamp(log.timestamp)}</span>
                        <span className={`break-words ${log.level === 'error' ? 'text-red-400' : 'text-slate-300'}`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500">No log entries yet.</p>
                  )
              ) : activeTab === 'qa' ? (
                  qaHistory.length > 0 ? (
                    <div className="space-y-6">
                        {qaHistory.map((entry, index) => (
                            <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                <div className="text-slate-500 text-xs mb-2">{formatTimestamp(entry.timestamp)}</div>
                                <div className="mb-3">
                                    <strong className="text-indigo-400 block mb-1">Question (User):</strong>
                                    <p className="text-slate-300 whitespace-pre-wrap">{entry.question}</p>
                                    {entry.userAudioUrl && <audio controls src={entry.userAudioUrl} className="w-full h-10 mt-2" />}
                                </div>
                                <div>
                                    <strong className="text-green-400 block mb-1">Answer (Agent):</strong>
                                    <p className="text-slate-300 whitespace-pre-wrap">{entry.answer}</p>
                                    {entry.agentAudioUrl && <audio controls src={entry.agentAudioUrl} className="w-full h-10 mt-2" />}
                                </div>
                            </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">No Q&A history yet.</p>
                  )
              ) : activeTab === 'prompt' ? (
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 h-full">
                  <h3 className="text-indigo-400 font-semibold mb-4">Current Generation Prompt</h3>
                  {currentPrompt ? (
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {currentPrompt}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic">No prompt has been submitted yet.</p>
                  )}
                </div>
              ) : activeTab === 'sources' ? (
                <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 h-full">
                  <h3 className="text-indigo-400 font-semibold mb-4 flex items-center gap-2">
                    <GlobeIcon className="w-5 h-5" />
                    Grounding Sources
                  </h3>
                  {sources.length > 0 ? (
                    <div className="space-y-3">
                      {sources.map((source, index) => (
                        <a 
                          key={index}
                          href={source.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-indigo-500/50 transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <div className="text-slate-200 font-medium group-hover:text-indigo-400 transition-colors">{source.title}</div>
                          <div className="text-slate-500 text-xs truncate">{source.uri}</div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">No sources used</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                    {profilingData.length > 0 ? (
                        profilingData.map((entry, index) => (
                            <div key={index} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${entry.type === 'config' ? 'bg-purple-600 text-purple-200' : entry.type === 'input' || entry.type === 'send' ? 'bg-blue-600 text-blue-200' : 'bg-green-600 text-green-200'}`}>
                                        {entry.type.toUpperCase()} - {entry.role}
                                    </span>
                                    <span className="text-slate-500 text-xs font-mono">{entry.connectionId.substring(0, 8)}...</span>
                                    <span className="text-slate-500 text-xs">{formatTimestamp(entry.timestamp)}</span>
                                </div>
                                <pre className="text-slate-300 whitespace-pre-wrap text-xs bg-black/30 p-3 rounded-md">
                                    {JSON.stringify(entry.data, null, 2)}
                                </pre>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500">No profiling data yet.</p>
                    )}
                </div>
              )}
            </main>
          </div>
        </div>
      )}
    </>
  );
};

export default DebugLogModal;