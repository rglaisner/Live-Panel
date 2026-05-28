/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { 
  getGroundedResponse, 
  convertTranscriptToScript, 
  ModelType, 
  getLiveSearchContext, 
  generateHostIntro, 
  generatePanelistSubmission, 
  evaluatePanelSubmissions, 
  PanelistSubmission, 
  HostReviewDecision 
} from './services/geminiService';
import type { GroundingChunk, Guest, TurnLength } from './types';
import { decode, decodeAudioData, createBlob, playBeep, audioBufferToWav } from './utils/audio';
import { logger } from './utils/logger';
import SearchForm from './components/SearchForm';
import ResponseDisplay from './components/ResponseDisplay';
import { LiveModePanel } from './components/LiveModePanel';
import SourcesList from './components/SourcesList';
import DebugLogModal from './components/DebugLogModal';
import HelpModal from './components/HelpModal';
import PulsingHalo from './components/PulsingHalo';
import Avatar from './components/Avatar';
import { motion, AnimatePresence } from 'motion/react';
import { SparklesIcon, MicrophoneIcon, MicrophoneSlashIcon, HandRaisedIcon, HandRaisedOutlineIcon, HandRaisedDownIcon, CheckIcon, UsersIcon, PlayIcon, PauseIcon, ResetIcon, SkipBackIcon, SkipForwardIcon, PlusIcon, ChevronDownIcon } from './components/Icons';
import ApiKeyDialog from './components/ApiKeyDialog';

type AgentStatus = 'idle' | 'generating' | 'reading' | 'listening' | 'answering' | 'finished' | 'prompting';
type Pace = 'normal' | 'fast';

const STATUS_MESSAGES = [
  "Processing",
  "Crafting",
  "Researching",
  "Imagining Roles",
  "Drafting",
  "Refining",
  "Producing",
  "Writing"
];

const App: React.FC = () => {
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [pace, setPace] = useState<Pace>('normal');
  const [modelType, setModelType] = useState<ModelType>('flash');
  const [scriptLines, setScriptLines] = useState<string[]>([]);
  const [sources, setSources] = useState<GroundingChunk[] | null>(null);
  const [followOnTopics, setFollowOnTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const agentStatusRef = useRef<AgentStatus>('idle');
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  // Refs for robust state access inside callbacks
  const scriptLinesRef = useRef<string[]>([]);
  const currentLineIndexRef = useRef<number>(-1);
  const transcriptionBufferRef = useRef<string>('');

  const [currentInputTranscription, setCurrentInputTranscription] = useState('');
  const currentInputTranscriptionRef = useRef('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState('');
  const currentOutputTranscriptionRef = useRef('');
  const [conversationHistory, setConversationHistory] = useState<{ user: string; agent: string }[]>([]);
  const conversationHistoryRef = useRef<{ user: string; agent: string }[]>([]);
  const [inlineQaHistory, setInlineQaHistory] = useState<Map<number, { user: string; agent: string }[]>>(new Map());
  const qaStartIndexRef = useRef<number>(-1);

  const [isMuted, setIsMuted] = useState(true);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isHandRaisePending, setIsHandRaisePending] = useState(false);
  const isHandRaisePendingRef = useRef<boolean>(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isInterruptible, setIsInterruptible] = useState<boolean>(true);
  const isInterruptibleRef = useRef<boolean>(true);
  useEffect(() => {
    isInterruptibleRef.current = isInterruptible;
  }, [isInterruptible]);

  const isAgentSpeakingRef = useRef<boolean>(false);
  useEffect(() => {
    isAgentSpeakingRef.current = isAgentSpeaking;
    if (!isAgentSpeaking) {
      setOutputVolume(0);
    }
  }, [isAgentSpeaking]);

  const handleInterruptRef = useRef<() => void>(() => {});
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const isQAFinishingRef = useRef<boolean>(false);

  // --- Live Mode States ---
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const isLiveModeRef = useRef<boolean>(false);
  useEffect(() => {
    isLiveModeRef.current = isLiveMode;
  }, [isLiveMode]);

  const [liveStage, setLiveStage] = useState<'idle' | 'searching' | 'submitting' | 'reviewing' | 'waiting' | 'playing' | 'completed'>('idle');
  const liveStageRef = useRef(liveStage);
  useEffect(() => {
    liveStageRef.current = liveStage;
  }, [liveStage]);
  const [liveSearchContext, setLiveSearchContext] = useState<string>('');
  const [liveSubmissions, setLiveSubmissions] = useState<PanelistSubmission[]>([]);
  const [hostDecision, setHostDecision] = useState<HostReviewDecision | null>(null);
  const [isLiveAutoAdvance, setIsLiveAutoAdvance] = useState<boolean>(true);
  const isLiveAutoAdvanceRef = useRef<boolean>(true);
  useEffect(() => {
    isLiveAutoAdvanceRef.current = isLiveAutoAdvance;
  }, [isLiveAutoAdvance]);

  const [lastSelectedSpeaker, setLastSelectedSpeaker] = useState<string>('host');
  const lastSelectedSpeakerRef = useRef<string>('host');
  useEffect(() => {
    lastSelectedSpeakerRef.current = lastSelectedSpeaker;
  }, [lastSelectedSpeaker]);

  const [liveTurnCount, setLiveTurnCount] = useState<number>(0);
  const triggerLiveSubmissionsRef = useRef<() => Promise<void>>(null);

  const [hostPersona, setHostPersona] = useState('male, empathetic, fast talking midwestern journalist');
  const [hostVoice, setHostVoice] = useState('Fenrir');
  const [guests, setGuests] = useState<Guest[]>([
    { id: '1', persona: 'female, professorial, fast talking midwestern technical expert', voice: 'Kore', role: 'Technical Expert' },
    { id: '2', persona: 'male, genial, fast talking British philosopher', voice: 'Charon', role: 'Philosopher' }
  ]);
  const [turnLength, setTurnLength] = useState<TurnLength>('short');
  const [selectedQaGuestIndex, setSelectedQaGuestIndex] = useState<number>(-1);
  const selectedQaGuestIndexRef = useRef<number>(-1);
  useEffect(() => {
    selectedQaGuestIndexRef.current = selectedQaGuestIndex;
  }, [selectedQaGuestIndex]);

  // Volume state for visualization
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);

  // Multiple session management
  const sessionsRef = useRef<Map<string, Promise<any>>>(new Map());
  const activeSpeakerRef = useRef<string>('');
  const pendingBuffersRef = useRef<Map<string, AudioBuffer[]>>(new Map());
  const sessionCurrentLineRef = useRef<Map<string, number>>(new Map());
  const isQAInitialTurnRef = useRef<boolean>(false);
  const userQAAudioChunksRef = useRef<Blob[]>([]);
  const agentQAAudioChunksRef = useRef<Blob[]>([]);
  const pendingTurnCompleteRef = useRef<Map<string, boolean>>(new Map());
  const isIntentionalStopRef = useRef<boolean>(false);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextAudioStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const pendingNextLineRef = useRef<number | null>(null);
  const messageQueueRef = useRef<Promise<void>>(Promise.resolve());
  
  // Audio storage for download
  const turnAudioChunksRef = useRef<Map<number, Uint8Array[]>>(new Map());
  const qaAudioChunksRef = useRef<Map<number, { user: Blob[]; agent: Blob[] }[]>>(new Map());
  const [hasAudio, setHasAudio] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const inputAnalyserRef = useRef<AnalyserNode | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (sources) {
      const webSources = sources.map(s => s.web);
      logger.setSources(webSources);
    } else {
      logger.setSources([]);
    }
  }, [sources]);

  useEffect(() => {
    const checkApiKey = async () => {
      // Type guard for window.aistudio
      if (window.aistudio) {
        try {
          if (!(await window.aistudio.hasSelectedApiKey())) {
            setShowApiKeyDialog(true);
          }
        } catch (error) {
          console.warn(
            'aistudio.hasSelectedApiKey check failed, assuming no key selected.',
            error,
          );
          setShowApiKeyDialog(true);
        }
      }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        setShowApiKeyDialog(false);
      } catch (error) {
        console.error('Failed to open API key selection:', error);
        setError('Could not open the API key selection dialog. Please ensure you are in a supported environment.');
      }
    }
  };

  const updateAgentStatus = (status: AgentStatus) => {
    setAgentStatus(status);
    agentStatusRef.current = status;
  };

  const enableQAMicrophone = useCallback((stream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputAudioContextRef.current || !sessionPromise) return;

    const source = inputAudioContextRef.current.createMediaStreamSource(stream);
    const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
    scriptProcessorRef.current = processor;

    processor.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const pcmBlob = createBlob(inputData);
        userQAAudioChunksRef.current.push(pcmBlob); // Record user audio
        sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
    };

    source.connect(inputAnalyserRef.current!);
    inputAnalyserRef.current!.connect(processor);
    processor.connect(inputAudioContextRef.current!.destination);
  }, []);

  const updateVolumes = useCallback(() => {
    if (inputAnalyserRef.current) {
      const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
      inputAnalyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normVol = avg / 255;
      setInputVolume(normVol); // Normalize to 0-1

      // Auto cut off if user speaking is detected via mic while agent is speaking
      if (isInterruptibleRef.current && isAgentSpeakingRef.current && normVol > 0.05) {
         handleInterruptRef.current();
      }
    } else {
      setInputVolume(0);
    }

    if (outputAnalyserRef.current) {
      const dataArray = new Uint8Array(outputAnalyserRef.current.frequencyBinCount);
      outputAnalyserRef.current.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setOutputVolume(avg / 255); // Normalize to 0-1
    } else {
      setOutputVolume(0);
    }

    animationFrameRef.current = requestAnimationFrame(updateVolumes);
  }, []);

  const cleanupAudioContexts = useCallback(async () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
       for (const source of audioSourcesRef.current.values()) {
          source.stop();
        }
        audioSourcesRef.current.clear();
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    setInputVolume(0);
    setOutputVolume(0);
  }, []);

  const stopCurrentSession = useCallback(async () => {
    logger.log('Stopping current sessions...');
    isIntentionalStopRef.current = true;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close all active sessions
    const sessionPromises = Array.from(sessionsRef.current.values());
    for (const promise of sessionPromises) {
      try {
        const session = await promise as any;
        session.close();
      } catch (e) {
        // Ignore errors for already closed sessions
      }
    }
    sessionsRef.current.clear();
    pendingBuffersRef.current.clear();
    pendingTurnCompleteRef.current.clear();
    activeSpeakerRef.current = '';

    await cleanupAudioContexts();
    setIsAgentSpeaking(false);
    pendingNextLineRef.current = null;
    // Reset the flag after a short delay to allow onclose to finish
    setTimeout(() => {
      isIntentionalStopRef.current = false;
    }, 100);
  }, [cleanupAudioContexts]);

  const handleInterrupt = useCallback(async () => {
    logger.log('Interrupting speaking agent...');
    
    // Stop all audio sources immediately
    for (const source of audioSourcesRef.current.values()) {
        try {
            source.stop();
        } catch (e) {
            // Already ended or stopped
        }
    }
    audioSourcesRef.current.clear();
    setIsAgentSpeaking(false);
    
    if (agentStatusRef.current === 'reading') {
        // Pauses/stops the current script reading session
        await stopCurrentSession();
        setIsPaused(true);
        updateAgentStatus('idle');
        logger.log(`Show paused at line ${currentLineIndexRef.current}. Click Resume to continue.`);
    } else if (agentStatusRef.current === 'answering') {
        // In Q&A, stop the agent from finishing their answer and clear the audio
        pendingBuffersRef.current.clear();
        agentQAAudioChunksRef.current = [];
        
        const qaSessions = sessionsRef.current.get('qa');
        if (qaSessions) {
            try {
                const session = await qaSessions;
                session.sendRealtimeInput({ text: "Please stop speaking." });
            } catch (e) {
                // Connection might be closed or errored
            }
        }
        
        updateAgentStatus('listening');
        logger.log("Q&A agent cut off. Listening for your next question...");
    }
  }, [stopCurrentSession]);

  useEffect(() => {
    handleInterruptRef.current = handleInterrupt;
  }, [handleInterrupt]);

  const setupAudio = useCallback(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextAudioStartTimeRef.current = 0;
      
      // Setup Analysers
      inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
      inputAnalyserRef.current.fftSize = 256;
      outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
      outputAnalyserRef.current.fftSize = 256;
      
      // Start volume monitoring loop
      updateVolumes();

      return stream;
  }, [updateVolumes]);

  // Helper to normalize text for matching
  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
  };

  const startScriptSession = useCallback(async (script: string, startIndex: number = 0) => {
    if (window.aistudio) {
      try {
        if (!(await window.aistudio.hasSelectedApiKey())) {
          setShowApiKeyDialog(true);
          return;
        }
      } catch (error) {
        console.warn('aistudio.hasSelectedApiKey check failed, showing dialog.', error);
        setShowApiKeyDialog(true);
        return;
      }
    }
    logger.log(`Starting Show from Line ${startIndex}...`);
    updateAgentStatus('reading');
    setIsMuted(true); 
    
    currentLineIndexRef.current = startIndex;
    setCurrentLineIndex(startIndex);
    transcriptionBufferRef.current = '';
    pendingNextLineRef.current = null;
    messageQueueRef.current = Promise.resolve();
    
    // Only clear audio if we are starting from the beginning
    if (startIndex === 0) {
        turnAudioChunksRef.current.clear();
        qaAudioChunksRef.current.clear();
        setHasAudio(false);
    } else {
        // Clear audio for the line we are resuming/starting from
        // to prevent duplication if it was already generated (e.g. pipelined or played before)
        turnAudioChunksRef.current.delete(startIndex);
    }
    
    pendingBuffersRef.current.set('host', []);
    pendingTurnCompleteRef.current.set('host', false);
    guests.forEach((_, i) => {
      const key = `guest${i + 1}`;
      pendingBuffersRef.current.set(key, []);
      pendingTurnCompleteRef.current.set(key, false);
    });

    const driveLine = (index: number) => {
      const lines = scriptLinesRef.current;
      if (index >= lines.length) return;
      
      const nextLine = lines[index];
      const speakerMatch = nextLine.match(/^[\*]*(Host|Guest\s*\d+):?[\*]*\s*/i);
      const speakerKey = speakerMatch ? speakerMatch[1].toLowerCase().replace(/\s+/g, '') : (index % 2 === 0 ? 'host' : 'guest1');
      const lineContent = nextLine.replace(/^[\*]*(Host|Guest\s*\d+):?[\*]*\s*/i, '').trim();
      
      const sessionPromise = sessionsRef.current.get(speakerKey);
      if (sessionPromise) {
          logger.log(`Preparing next turn (Line ${index}) for ${speakerKey}...`);
          sessionCurrentLineRef.current.set(speakerKey, index);
          // Clear previous audio for this turn
          turnAudioChunksRef.current.delete(index);
          sessionPromise.then(session => 
              session.sendRealtimeInput({ text: `Read this line: "${lineContent}"` })
          );
      }
    };

    const performAdvance = (nextIndex: number) => {
        if (nextIndex >= scriptLinesRef.current.length) {
            if (isLiveModeRef.current) {
                logger.log('End of current live script lines reached. Initiating panelist submissions for next turn...');
                triggerLiveSubmissionsRef.current?.();
            } else {
                logger.log('Show finished.');
                updateAgentStatus('finished');
            }
            return;
        }

        logger.log(`Switching to Line ${nextIndex}...`);
        currentLineIndexRef.current = nextIndex;
        setCurrentLineIndex(nextIndex);

        const nextLine = scriptLinesRef.current[nextIndex];
        const speakerMatch = nextLine.match(/^[\*]*(Host|Guest\s*\d+):?[\*]*\s*/i);
        const nextSpeaker = speakerMatch ? speakerMatch[1].toLowerCase().replace(/\s+/g, '') : (nextIndex % 2 === 0 ? 'host' : 'guest1');
        activeSpeakerRef.current = nextSpeaker;

        // Flush buffers
        const buffers = pendingBuffersRef.current.get(nextSpeaker) || [];
        if (buffers.length > 0) {
            logger.log(`Playing ${buffers.length} pre-downloaded audio chunks for ${nextSpeaker}.`);
            for (const buf of buffers) {
                scheduleBuffer(buf);
            }
            pendingBuffersRef.current.set(nextSpeaker, []);
        }

        // Pipeline next
        driveLine(nextIndex + 1);

        // Check if this speaker already finished their turn while pipelined
        if (pendingTurnCompleteRef.current.get(nextSpeaker)) {
            logger.log(`${nextSpeaker} already finished generating audio. Moving to next.`);
            pendingTurnCompleteRef.current.set(nextSpeaker, false);
            handleTurnComplete(nextSpeaker);
        }
    };

    const handleTurnComplete = (role: string) => {
        const nextIndex = currentLineIndexRef.current + 1;
        logger.log(`${role} finished sending data for Line ${currentLineIndexRef.current}.`);
        
        if (agentStatusRef.current === 'reading') {
            if (audioSourcesRef.current.size === 0) {
                // Audio already finished or never started
                if (isHandRaisePendingRef.current) {
                    logger.log("Turn finished. Starting Q&A session.");
                    isHandRaisePendingRef.current = false;
                    setIsHandRaisePending(false);
                    setIsHandRaised(true);
                    
                    // Advance index so we resume from the next line
                    const completedTurnIndex = currentLineIndexRef.current;
                    const nextIdx = currentLineIndexRef.current + 1;
                    currentLineIndexRef.current = nextIdx;
                    setCurrentLineIndex(nextIdx);

                    if (selectedQaGuestIndexRef.current !== -1) {
                        startQASession(scriptLinesRef.current.join('\n'), completedTurnIndex);
                    } else {
                        updateAgentStatus('idle');
                    }
                } else {
                    performAdvance(nextIndex);
                }
            } else {
                // Audio still playing, queue the next action
                if (isHandRaisePendingRef.current) {
                    logger.log(`${role} finished generating, but audio is still playing. Q&A will start when audio ends.`);
                } else {
                    logger.log(`Audio is still playing. Waiting to start Line ${nextIndex}.`);
                    pendingNextLineRef.current = nextIndex;
                }
            }
        }
    };

    const scheduleBuffer = (audioBuffer: AudioBuffer) => {
        if (!outputAudioContextRef.current) return;
        setIsAgentSpeaking(true);
        const ctx = outputAudioContextRef.current;
        nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, ctx.currentTime);
        
        const sourceNode = ctx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(outputAnalyserRef.current!);
        outputAnalyserRef.current!.connect(ctx.destination);

        sourceNode.addEventListener('ended', () => {
            audioSourcesRef.current.delete(sourceNode);
            if (audioSourcesRef.current.size === 0) {
                setIsAgentSpeaking(false);
                
                // Prioritize pending Q&A
                if (isHandRaisePendingRef.current) {
                    logger.log("Audio finished. Hand raise pending.");
                    isHandRaisePendingRef.current = false;
                    setIsHandRaisePending(false);
                    setIsHandRaised(true);
                    
                    // Advance index so we resume from the next line
                    const completedTurnIndex = currentLineIndexRef.current;
                    const nextIdx = currentLineIndexRef.current + 1;
                    currentLineIndexRef.current = nextIdx;
                    setCurrentLineIndex(nextIdx);

                    if (selectedQaGuestIndexRef.current !== -1) {
                        startQASession(scriptLinesRef.current.join('\n'), completedTurnIndex);
                    } else {
                        updateAgentStatus('idle');
                    }
                    return;
                }

                // If we have a pending line, drive it now
                if (pendingNextLineRef.current !== null) {
                    const nextIdx = pendingNextLineRef.current;
                    pendingNextLineRef.current = null;
                    if (agentStatusRef.current === 'reading') {
                        performAdvance(nextIdx);
                    }
                }
            }
        });
        sourceNode.start(nextAudioStartTimeRef.current);
        nextAudioStartTimeRef.current += audioBuffer.duration;
        audioSourcesRef.current.add(sourceNode);
    };

    try {
      await stopCurrentSession();
      await setupAudio(); // We still need output context

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const isResuming = startIndex > 0;

      const createCallbacks = (role: string, connId: string) => ({
          onopen: () => {
            logger.log(`${role} session connected (ID: ${connId}).`);
            // Only the first speaker session triggers the initial prompt
            if (role === initialSpeaker.toLowerCase()) {
                const sessionPromise = sessionsRef.current.get(role);
                const firstInput = { text: isResuming ? `RESUME SHOW. Read this line: "${initialLineContent}"` : `START SHOW. Read this line: "${initialLineContent}"` };
                logger.logProfiling('input', role, firstInput, connId);
                sessionPromise?.then(session => 
                    session.sendRealtimeInput(firstInput)
                );
                // Pipeline the next line immediately
                driveLine(startIndex + 1);
            }
          },
          onmessage: (message: LiveServerMessage) => {
             if (message.serverContent?.interrupted) {
                 logger.log(`Live session (${role}) received native interruption signal from server.`);
                 if (isInterruptibleRef.current) {
                     handleInterruptRef.current();
                 }
             }
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio) {
                const lineIdx = sessionCurrentLineRef.current.get(role) ?? startIndex;
                logger.log(`Audio chunk received for ${connId} (Line ${lineIdx}): ${base64Audio.length} bytes`);
                
                // Store audio chunk
                const chunks = turnAudioChunksRef.current.get(lineIdx) || [];
                chunks.push(decode(base64Audio));
                turnAudioChunksRef.current.set(lineIdx, chunks);
                setHasAudio(true);
             }

             messageQueueRef.current = messageQueueRef.current.then(async () => {
                 if (message.serverContent?.outputTranscription) {
                    const text = message.serverContent.outputTranscription.text;
                    setCurrentOutputTranscription(prev => prev + text);
                 }

                 if(message.serverContent?.turnComplete) {
                    if (role === activeSpeakerRef.current) {
                        handleTurnComplete(role);
                    } else {
                        pendingTurnCompleteRef.current.set(role, true);
                        logger.log(`Buffered completion signal for ${role}.`);
                    }
                    setCurrentOutputTranscription('');
                 }

                 if (base64Audio && outputAudioContextRef.current) {
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                    
                    if (role === activeSpeakerRef.current) {
                        scheduleBuffer(audioBuffer);
                    } else {
                        const buffers = pendingBuffersRef.current.get(role) || [];
                        buffers.push(audioBuffer);
                        pendingBuffersRef.current.set(role, buffers);
                        logger.log(`Saved pre-warm audio chunk for ${role}.`);
                    }
                 }
             });
          },
          onerror: (e: any) => {
            const msg = e?.message || (e?.error?.message) || (typeof e === 'string' ? e : (e instanceof Event ? 'Connection failed' : JSON.stringify(e)));
            logger.log(`${role} session error: ${msg}`, 'error');
          },
          onclose: () => {
            if (!isIntentionalStopRef.current && agentStatusRef.current === 'reading') {
                logger.log(`${role} session disconnected unexpectedly.`, 'error');
            }
          }
      });

      const scriptParts = script.split('\n');
      const initialLineRaw = scriptParts[startIndex];
      const initialSpeakerMatch = initialLineRaw.match(/^[\*]*(Host|Guest\s*\d+):?[\*]*\s*/i);
      const initialSpeaker = initialSpeakerMatch ? initialSpeakerMatch[1].replace(/\s+/g, '') : (startIndex % 2 === 0 ? 'Host' : 'Guest1');
      const initialLineContent = initialLineRaw.replace(/^[\*]*(Host|Guest\s*\d+):?[\*]*\s*/i, '').trim();

      activeSpeakerRef.current = initialSpeaker.toLowerCase();
      sessionCurrentLineRef.current.set(initialSpeaker.toLowerCase(), startIndex);
      const hostConnId = `host-${Math.random().toString(36).substring(7)}`;

      // Connect Host Session
      const paceInstruction = pace === 'fast' 
        ? "Speak as fast as humanly possible while remaining intelligible. Use a clipped, high-energy, rapid-fire delivery. Eliminate all pauses between words and sentences. Think 'auctioneer' or 'fast-talking disclaimer' speed." 
        : "Speak at a slightly brisk, efficient pace (roughly 1.1x normal speed). Avoid long pauses and keep the energy steady but moving.";

      const hostConfig = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: `You are the Host of a talk show. Persona: ${hostPersona}. Read ONLY the lines I send you. Do NOT read "Host:" prefixes. Do NOT refer to other speakers directly. ${paceInstruction}`,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: hostVoice } },
          },
        },
        callbacks: createCallbacks('host', hostConnId)
      };
      logger.logProfiling('config', 'host', hostConfig.config, hostConnId);
      const hostSessionPromise = ai.live.connect(hostConfig);
      sessionsRef.current.set('host', hostSessionPromise);

      // Connect Guest Sessions
      guests.forEach((guest, index) => {
        const guestKey = `guest${index + 1}`;
        const guestConnId = `${guestKey}-${Math.random().toString(36).substring(7)}`;
        const guestConfig = {
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            systemInstruction: `You are Guest ${index + 1} of a talk show. Persona: ${guest.persona}. Read ONLY the lines I send you. Do NOT read "Guest ${index + 1}:" prefixes. Do NOT refer to other speakers directly. ${paceInstruction}`,
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: guest.voice } },
            },
          },
          callbacks: createCallbacks(guestKey, guestConnId)
        };
        logger.logProfiling('config', guestKey, guestConfig.config, guestConnId);
        const guestSessionPromise = ai.live.connect(guestConfig);
        sessionsRef.current.set(guestKey, guestSessionPromise);
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      let userFriendlyMessage = `Failed to start script session: ${errorMessage}`;
      let shouldOpenDialog = false;

      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('Requested entity was not found.')) {
          userFriendlyMessage =
            'Model not found. This can be caused by an invalid API key or permission issues. Please check your API key.';
          shouldOpenDialog = true;
        } else if (
          errorMessage.includes('API_KEY_INVALID') ||
          errorMessage.includes('API key not valid')
        ) {
          userFriendlyMessage =
            'Your API key is invalid or lacks permissions. Please select a valid, billing-enabled API key.';
          shouldOpenDialog = true;
        }
      }
      
      setError(userFriendlyMessage);
      logger.log(`Failed to start script session: ${userFriendlyMessage}`, 'error');
      updateAgentStatus('idle');

      if (shouldOpenDialog) {
        setShowApiKeyDialog(true);
      }
    }
  }, [stopCurrentSession, setupAudio, updateVolumes, hostPersona, guests, pace]);

  const handleDoneQASession = useCallback(() => {
    logger.log('User finished Q&A. Resuming script.');
    setIsHandRaised(false);
    setIsHandRaisePending(false); // Ensure pending state is cleared
    isHandRaisePendingRef.current = false;
    
    // currentLineIndexRef points to the line currently being read or the next one to be read.
    // We resume from this index to ensure no lines are skipped.
    const resumeIndex = Math.max(0, currentLineIndexRef.current);
    const fullScript = scriptLinesRef.current.join('\n');
    
    // Store the conversation history inline
    const history = conversationHistoryRef.current;
    if (history.length > 0) {
      setInlineQaHistory(prev => {
        const newHistory = new Map(prev);
        newHistory.set(qaStartIndexRef.current, history);
        return newHistory;
      });
      // Also log to the main Q&A history tab
      history.forEach(turn => {
        logger.logQA(turn.user, turn.agent);
      });
    }
    setConversationHistory([]);
    conversationHistoryRef.current = [];
    setIsPaused(false); // Ensure script is not paused when resuming from Q&A

    logger.log(`Resuming script from index ${resumeIndex} (Line: "${scriptLinesRef.current[resumeIndex]?.substring(0, 20)}...")`);
    startScriptSession(fullScript, resumeIndex);
  }, [startScriptSession, inlineQaHistory]);

  const applyLiveDecision = useCallback((decision: HostReviewDecision) => {
     let speakerLabel = "Host";
     if (decision.selectedSpeakerKey.toLowerCase().includes('guest')) {
        const numMatch = decision.selectedSpeakerKey.match(/\d+/);
        const idx = numMatch ? parseInt(numMatch[0]) - 1 : 0;
        speakerLabel = guests[idx]?.role || `Guest ${idx + 1}`;
        setLastSelectedSpeaker(decision.selectedSpeakerKey.toLowerCase());
     } else {
        setLastSelectedSpeaker('host');
     }
     
     const newLine = `${speakerLabel}: ${decision.text}`;
     const updatedLines = [...scriptLinesRef.current, newLine];
     
     setScriptLines(updatedLines);
     scriptLinesRef.current = updatedLines;
     setLiveTurnCount(prev => prev + 1);
     setLiveStage('playing');
     updateAgentStatus('reading');
     
     const nextIndex = updatedLines.length - 1;
     
     logger.log(`Elected spoke turn: "${newLine}". Preparing playback...`);
     
     currentLineIndexRef.current = nextIndex;
     setCurrentLineIndex(nextIndex);
     
     const speakerMatch = newLine.match(/^[\*]*(Host|Guest\s*\d+):?[\*]*\s*/i);
     const nextSpeaker = speakerMatch ? speakerMatch[1].toLowerCase().replace(/\s+/g, '') : 'host';
     activeSpeakerRef.current = nextSpeaker;
     
     turnAudioChunksRef.current.delete(nextIndex);
     
     const lineContent = decision.text;
     const sessionPromise = sessionsRef.current.get(nextSpeaker);
     if (sessionPromise) {
         logger.log(`Streaming elected turn to ${nextSpeaker} session...`);
         sessionCurrentLineRef.current.set(nextSpeaker, nextIndex);
         sessionPromise.then(session => 
             session.sendRealtimeInput({ text: `Read this line: "${lineContent}"` })
         );
     } else {
         logger.log(`Warning: Session not found for speaker ${nextSpeaker}`, 'error');
     }
  }, [guests]);

  const triggerLiveSubmissions = useCallback(async () => {
    if (liveStageRef.current === 'submitting' || liveStageRef.current === 'reviewing') return;
    
    setLiveStage('submitting');
    updateAgentStatus('generating');
    logger.log('Dynamic Panel: Requesting next turn submissions from all panelists...');
    
    try {
      const history = scriptLinesRef.current.map(line => {
        const parts = line.match(/^[\*]*(Host|Guest\s*\d+):?[\*]*\s*/i);
        const speaker = parts ? parts[1] : 'Speaker';
        const text = line.replace(/^[\*]*(Host|Guest\s*\d+):?[\*]*\s*/i, '').trim();
        return { speaker, text };
      });
      
      const submissions = await Promise.all(
        guests.map((guest, idx) => 
          generatePanelistSubmission(
            prompt,
            guest,
            idx + 1,
            liveSearchContext,
            history,
            turnLength,
            modelType
          )
        )
      );
      
      setLiveSubmissions(submissions);
      setLiveStage('reviewing');
      logger.log(`Received submissions from all ${guests.length} panelists. Host is reviewing...`);
      
      const lastSpeaker = lastSelectedSpeakerRef.current;
      const decision = await evaluatePanelSubmissions(
        prompt,
        hostPersona,
        history,
        submissions,
        lastSpeaker,
        turnLength,
        modelType
      );
      
      setHostDecision(decision);
      logger.log(`Host decision received: Elected speaker role is "${decision.selectedSpeakerKey}".`);
      
      if (isLiveAutoAdvanceRef.current) {
         applyLiveDecision(decision);
      } else {
         setLiveStage('waiting');
         updateAgentStatus('idle');
      }
    } catch (err) {
      logger.log(`Live Mode turn generation failed: ${err}`, 'error');
      setLiveStage('waiting');
      updateAgentStatus('idle');
    }
  }, [prompt, guests, liveSearchContext, turnLength, modelType, hostPersona, applyLiveDecision]);

  useEffect(() => {
    triggerLiveSubmissionsRef.current = triggerLiveSubmissions;
  }, [triggerLiveSubmissions]);

  const startQASession = useCallback(async (fullScript: string, storageIndex?: number) => {
    if (window.aistudio) {
      try {
        if (!(await window.aistudio.hasSelectedApiKey())) {
          setShowApiKeyDialog(true);
          return;
        }
      } catch (error) {
        console.warn('aistudio.hasSelectedApiKey check failed, showing dialog.', error);
        setShowApiKeyDialog(true);
        return;
      }
    }
    updateAgentStatus('prompting'); // New status
    isQAInitialTurnRef.current = true;
    logger.log('Starting Q&A session...');
    setIsMuted(false); // Unmute user
    isQAFinishingRef.current = false;
    
    // Set the start index for Q&A session storage
    // Use provided storageIndex or fallback to current (though current is usually next line)
    const indexToUse = storageIndex ?? currentLineIndexRef.current;
    qaStartIndexRef.current = indexToUse;
    
    // Initialize storage for this Q&A session
    qaAudioChunksRef.current.set(indexToUse, []);

    try {
      await stopCurrentSession();
      const stream = await setupAudio();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const qaConnId = `qa-${Math.random().toString(36).substring(7)}`;
      
      const finishQASessionTool: FunctionDeclaration = {
        name: "finishQASession",
        parameters: {
          type: Type.OBJECT,
          properties: {},
          required: [],
        },
        description: "Call this function ONLY after you have said a transition sentence to return to the show.",
      };

      const lastTurn = scriptLinesRef.current[currentLineIndexRef.current] || "";
      const selectedIndex = selectedQaGuestIndexRef.current;
      const selectedGuest = guests[selectedIndex] || guests[0];
      const guestNum = selectedIndex + 1;

      const paceInstruction = pace === 'fast' 
        ? "Speak as fast as humanly possible while remaining intelligible. Use a clipped, high-energy, rapid-fire delivery. Eliminate all pauses between words and sentences. Think 'auctioneer' or 'fast-talking disclaimer' speed." 
        : "Speak at a slightly brisk, efficient pace (roughly 1.1x normal speed). Avoid long pauses and keep the energy steady but moving.";

      const systemInstruction = `You are Guest ${guestNum} from the talk show.
- **Context:** The show has been paused because a listener (the user) has a question for you.
- **Role:** **Guest ${guestNum} - ${selectedGuest.role} (${selectedGuest.persona})**. You are the expert.
- **Deep Persona Integration:** You MUST speak exclusively from your assigned persona. 
    - If you are a **Technical Expert**, focus on mechanics, data, and "how" things work.
    - If you are a **Philosopher**, focus on meaning, ethics, "why" things matter, and existential implications.
    - Use vocabulary and metaphors that match your background.
- **Style & Tone Matching:** You MUST strictly match the language, accent, colloquial style, and overall vibe used in the transcript below. 
- **CRITICAL:** Speakers must NEVER refer to each other directly. Do not say "Guest 1, what do you think?" or "Host, that's a great point." The targets for questions and responses must always be implicit.
- **CRITICAL:** If the podcast is in colloquial Hindi, you MUST respond in colloquial Hindi. If it's a playful debate, stay playful. If it's a serious interview, stay serious.
- **Contextual Awareness:** The last thing said in the show was: "${lastTurn}". Use this to anchor your tone and language choice.
- **Pace:** ${paceInstruction}
- **MANDATORY: Use Google Search:** You MUST use the Google Search tool to find accurate, up-to-date information when answering user questions. If a user asks about recent events, data, or specific facts, search for them to provide the best possible answer.
- **Task:**
  1. **Greeting:** Immediately greet the user with variety (matching the style/language). Do NOT always say the same thing. Examples: "I'm all ears, what's on your mind?", "Curious about something? Ask away!", "I see you've got a question. How can I help?", "Ready when you are! What would you like to know?"
  2. **Answering:** Provide detailed, insightful, and informative answers. If information is available, go deep into the explanation while maintaining your persona. Avoid perfunctory or overly brief responses unless the question is very simple.
  3. **Follow-up:** After every answer, ask for more questions using varied phrasing. Examples: "Anything else you're curious about?", "What else can I clarify for you?", "Got another one for me?", "I'm here for as long as you need—any other questions?", "Does that make sense, or should we dive into something else?"
  4. **Returning to Show:** You must be highly sensitive to signals that the user is finished. If the user says "thank you", "that's all", "I'm done", "no more questions", or anything similar, you MUST:
     a. Say a brief, warm transition sentence like "Great, let's get back to the show then!" (matching the style/language).
     b. IMMEDIATELY call the \`finishQASession\` tool. Do NOT wait for another user input.
- **Transcript of the show so far:**
${fullScript}
`;
      
      const initialPrompt = `Greet the user now in the language of the last turn: "${lastTurn}"`;
      
      const qaConfig = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedGuest.voice } },
          },
          tools: [{ functionDeclarations: [finishQASessionTool] }, { googleSearch: {} }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: { /* Callbacks defined here */ }
      };
      logger.logProfiling('config', 'qa', qaConfig.config, qaConnId);

      const qaSessionPromise = ai.live.connect({
        ...qaConfig,
        callbacks: {
          onopen: () => {
            logger.log(`Q&A session opened (ID: ${qaConnId}).`);
            const firstInput = { text: initialPrompt };
            logger.logProfiling('input', 'qa', firstInput, qaConnId);
            qaSessionPromise.then(session => session.sendRealtimeInput(firstInput));
            // Microphone is NOT enabled here anymore. It will be enabled after the host speaks.
          },
          onmessage: (message: LiveServerMessage) => {
             if (message.serverContent?.interrupted) {
                 logger.log(`Q&A Live session received native interruption signal from server.`);
                 if (isInterruptibleRef.current) {
                     handleInterruptRef.current();
                 }
             }
             const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
             if (base64Audio) {
                if (isQAInitialTurnRef.current && agentStatusRef.current === 'prompting') {
                    updateAgentStatus('answering');
                }
                logger.log(`Audio chunk received for connection ${qaConnId}: ${base64Audio.length} bytes`);
                
                // Store agent audio chunk temporarily
                agentQAAudioChunksRef.current.push(new Blob([decode(base64Audio)], { type: 'audio/pcm' })); // Store as Blob for playback/logging
             }

             messageQueueRef.current = messageQueueRef.current.then(async () => {
                 if (message.serverContent?.inputTranscription) {
                    const text = message.serverContent.inputTranscription.text;
                    currentInputTranscriptionRef.current += text;
                    setCurrentInputTranscription(currentInputTranscriptionRef.current);
                 }
                 if (message.serverContent?.outputTranscription) {
                    const text = message.serverContent.outputTranscription.text;
                    currentOutputTranscriptionRef.current += text;
                    setCurrentOutputTranscription(currentOutputTranscriptionRef.current);
                 }

                 // Handle tool calls
                 if (message.toolCall) {
                    const call = message.toolCall.functionCalls.find(f => f.name === 'finishQASession');
                    if (call) {
                        logger.log('Agent called finishQASession. Waiting for audio to finish before returning.');
                        isQAFinishingRef.current = true;
                    }
                 }

                  if(message.serverContent?.turnComplete) {
                    // User finished speaking
                    const inputTrimmed = currentInputTranscriptionRef.current.trim();
                    if (inputTrimmed) {
                        logger.log(`User Q&A Input: "${inputTrimmed}"`);
                        const newTurn = { user: inputTrimmed, agent: '' };
                        conversationHistoryRef.current.push(newTurn);
                        setConversationHistory([...conversationHistoryRef.current]);
                        updateAgentStatus('answering');
                    }

                        // Agent finished speaking
                        const outputTrimmed = currentOutputTranscriptionRef.current.trim();
                        if (outputTrimmed) {
                            logger.log(`Agent Q&A Output: "${outputTrimmed}"`);
                            
                            // Log Q&A pair if we were answering
                            if (agentStatusRef.current === 'answering') {
                                 const history = conversationHistoryRef.current;
                                 const lastTurn = history[history.length - 1];
                                 
                                 if (lastTurn) {
                                     const lastUserTurn = lastTurn.user;
                                     
                                     const userAudioBlob = new Blob(userQAAudioChunksRef.current, { type: 'audio/webm' });
                                     const agentAudioBlob = new Blob(agentQAAudioChunksRef.current, { type: 'audio/webm' });
                                     const userAudioUrl = URL.createObjectURL(userAudioBlob);
                                     const agentAudioUrl = URL.createObjectURL(agentAudioBlob);

                                     logger.logQA(lastUserTurn, outputTrimmed, userAudioUrl, agentAudioUrl);
                                     
                                     // Store complete turn audio for download
                                     const qaIndex = qaStartIndexRef.current;
                                     const turns = qaAudioChunksRef.current.get(qaIndex) || [];
                                     
                                     turns.push({
                                         user: [...userQAAudioChunksRef.current],
                                         agent: [...agentQAAudioChunksRef.current]
                                     });
                                     qaAudioChunksRef.current.set(qaIndex, turns);
                                     setHasAudio(true);
                                 }
                                 
                                 // Clear chunks for next turn
                                 userQAAudioChunksRef.current = [];
                                 agentQAAudioChunksRef.current = [];

                                 if (lastTurn && !lastTurn.agent) {
                                     lastTurn.agent = outputTrimmed;
                                     setConversationHistory([...history]);
                                 }
                            }

                            updateAgentStatus('listening'); // Go back to listening for follow-ups
                        }

                    setCurrentInputTranscription('');
                    currentInputTranscriptionRef.current = '';
                    setCurrentOutputTranscription('');
                    currentOutputTranscriptionRef.current = '';
                  }

                 if (base64Audio && outputAudioContextRef.current) {
                    // agentQAAudioChunksRef is handled above in the base64Audio check
                    setIsAgentSpeaking(true);
                    const ctx = outputAudioContextRef.current;
                    nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, ctx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                    const sourceNode = ctx.createBufferSource();
                    sourceNode.buffer = audioBuffer;
                    
                    sourceNode.connect(outputAnalyserRef.current!);
                    outputAnalyserRef.current!.connect(ctx.destination);

                    sourceNode.addEventListener('ended', () => {
                        audioSourcesRef.current.delete(sourceNode);
                        if (audioSourcesRef.current.size === 0) {
                            setIsAgentSpeaking(false);

                            if (isQAInitialTurnRef.current) {
                                isQAInitialTurnRef.current = false;
                                logger.log("Q&A host finished prompt. Enabling microphone.");
                                enableQAMicrophone(stream, qaSessionPromise);
                                updateAgentStatus('listening');
                                return;
                            }

                            if (isQAFinishingRef.current) {
                                logger.log('Transition audio finished. Resuming show.');
                                handleDoneQASession();
                            }
                        }
                    });
                    sourceNode.start(nextAudioStartTimeRef.current);
                    nextAudioStartTimeRef.current += audioBuffer.duration;
                    audioSourcesRef.current.add(sourceNode);
                 }
             });
          },
          onerror: (e: any) => {
            const msg = e?.message || (e?.error?.message) || (typeof e === 'string' ? e : (e instanceof Event ? 'Connection failed' : JSON.stringify(e)));
            logger.log(`Q&A session error: ${msg}`, 'error');
          },
          onclose: () => {
            logger.log('Q&A session closed.');
          },
        },
      });
      sessionsRef.current.set('qa', qaSessionPromise);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      let userFriendlyMessage = `Failed to start Q&A session: ${errorMessage}`;
      let shouldOpenDialog = false;

      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('Requested entity was not found.')) {
          userFriendlyMessage =
            'Model not found. This can be caused by an invalid API key or permission issues. Please check your API key.';
          shouldOpenDialog = true;
        } else if (
          errorMessage.includes('API_KEY_INVALID') ||
          errorMessage.includes('API key not valid')
        ) {
          userFriendlyMessage =
            'Your API key is invalid or lacks permissions. Please select a valid, billing-enabled API key.';
          shouldOpenDialog = true;
        }
      }
      
      setError(userFriendlyMessage);
      logger.log(`Failed to start Q&A session: ${userFriendlyMessage}`, 'error');
      updateAgentStatus('idle');

      if (shouldOpenDialog) {
        setShowApiKeyDialog(true);
      }
    }
  }, [stopCurrentSession, setupAudio, updateVolumes, guests, handleDoneQASession]);

  const generateFromTopic = useCallback(async (topic: string) => {
    if (window.aistudio) {
      try {
        if (!(await window.aistudio.hasSelectedApiKey())) {
          setShowApiKeyDialog(true);
          return;
        }
      } catch (error) {
        console.warn('aistudio.hasSelectedApiKey check failed, showing dialog.', error);
        setShowApiKeyDialog(true);
        return;
      }
    }
    if (!topic.trim() || isLoading) return;

    logger.log(`Script generation started for prompt: "${topic}"`);
    await stopCurrentSession();
    setIsLoading(true);
    updateAgentStatus('generating');
    setError(null);
    setScriptLines([]);
    setSources(null);
    setFollowOnTopics([]);
    setConversationHistory([]);
    conversationHistoryRef.current = [];
    setInlineQaHistory(new Map());
    setIsHandRaised(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);

    try {
      logger.setPrompt(topic);
      setIsConsoleExpanded(false); // Minimize console on start

      if (isLiveModeRef.current) {
        setLiveStage('searching');
        updateAgentStatus('generating');
        logger.log(`Initial search grounding starting for Live Mode topic: "${topic}"...`);
        const contextResult = await getLiveSearchContext(topic, modelType);
        setLiveSearchContext(contextResult.text);
        setSources(contextResult.sources);
        
        logger.log("Generating Host Intro...");
        setLiveStage('reviewing');
        const hostIntroText = await generateHostIntro(topic, hostPersona, turnLength, modelType);
        const introLine = `Host: ${hostIntroText}`;
        
        const lines = [introLine];
        setScriptLines(lines);
        scriptLinesRef.current = lines; // Sync ref
        setLiveTurnCount(1);
        setLastSelectedSpeaker('host');
        setLiveSubmissions([]);
        setHostDecision(null);
        
        setLiveStage('playing');
        logger.log("Connecting WebSockets for Live Mode and playing Host Intro...");
        await startScriptSession(introLine, 0);
        setIsLoading(false);
        return;
      }

      const result = await getGroundedResponse(topic, hostPersona, guests, turnLength, modelType);
      
      let finalScriptText = result.text;
      // If the model generated a title section or used a different title in the intro, 
      // we don't have a 'suggestedTitle' here like in convertTranscriptToScript,
      // but we can at least ensure the header uses 'topic'.
      
      const lines = finalScriptText.split('\n').filter(line => line.trim().length > 0);
      setScriptLines(lines);
      scriptLinesRef.current = lines; // Sync ref
      setSources(result.sources);
      setFollowOnTopics(result.followOnTopics || []);
      logger.log(`Script generation successful. Received ${lines.length} lines and ${result.followOnTopics?.length || 0} follow-on topics.`);
      
      // Start reading from the beginning
      startScriptSession(lines.join('\n'), 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      let userFriendlyMessage = `Script generation failed: ${errorMessage}`;
      let shouldOpenDialog = false;

      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('Requested entity was not found.')) {
          userFriendlyMessage =
            'Model not found. This can be caused by an invalid API key or permission issues. Please check your API key.';
          shouldOpenDialog = true;
        } else if (
          errorMessage.includes('API_KEY_INVALID') ||
          errorMessage.includes('API key not valid')
        ) {
          userFriendlyMessage =
            'Your API key is invalid or lacks permissions. Please select a valid, billing-enabled API key.';
          shouldOpenDialog = true;
        }
      }

      setError(userFriendlyMessage);
      logger.log(`Script generation failed: ${userFriendlyMessage}`, 'error');
      updateAgentStatus('idle');

      if (shouldOpenDialog) {
        setShowApiKeyDialog(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, stopCurrentSession, startScriptSession, hostPersona, guests, turnLength]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    generateFromTopic(prompt);
  }, [prompt, generateFromTopic]);
  
  const handleConvert = useCallback(async (transcript: string, userTitle: string) => {
    if (window.aistudio) {
      try {
        if (!(await window.aistudio.hasSelectedApiKey())) {
          setShowApiKeyDialog(true);
          return;
        }
      } catch (error) {
        console.warn('aistudio.hasSelectedApiKey check failed, showing dialog.', error);
        setShowApiKeyDialog(true);
        return;
      }
    }
    if (isLoading) return;
    setIsLoading(true);
    updateAgentStatus('generating');
    setError(null);
    setScriptLines([]);
    setSources(null);
    setConversationHistory([]);
    conversationHistoryRef.current = [];
    setInlineQaHistory(new Map());
    setIsHandRaised(false);
    setIsPaused(false);
    setCurrentLineIndex(-1);

    try {
      logger.setPrompt(`PASTED TRANSCRIPT: ${transcript.substring(0, 100)}...`);
      setIsConsoleExpanded(false); // Minimize console on start
      const { script, title: suggestedTitle } = await convertTranscriptToScript(transcript, hostPersona, guests, userTitle, modelType);
      
      // Use the user's title if they provided one, otherwise use the model's suggestion
      const finalTitle = userTitle.trim() ? userTitle : suggestedTitle;
      setPrompt(finalTitle);
      
      let finalScript = script;
      // Post-process: If user provided a title, ensure the Host uses it in the intro
      if (userTitle.trim() && suggestedTitle && userTitle.trim() !== suggestedTitle) {
        // Replace the model's title with the user's title in the script text
        // This is a simple string replacement for the first occurrence which is usually the intro
        finalScript = script.replace(suggestedTitle, userTitle.trim());
      }
      
      const lines = finalScript.split('\n').filter(line => line.trim().length > 0);
      setScriptLines(lines);
      scriptLinesRef.current = lines;
      setSources([]); // No sources for pasted transcripts
      logger.log(`Transcript conversion successful. Received ${lines.length} lines.`);
      startScriptSession(lines.join('\n'), 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      let userFriendlyMessage = `Transcript conversion failed: ${errorMessage}`;
      let shouldOpenDialog = false;

      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('Requested entity was not found.')) {
          userFriendlyMessage =
            'Model not found. This can be caused by an invalid API key or permission issues. Please check your API key.';
          shouldOpenDialog = true;
        } else if (
          errorMessage.includes('API_KEY_INVALID') ||
          errorMessage.includes('API key not valid')
        ) {
          userFriendlyMessage =
            'Your API key is invalid or lacks permissions. Please select a valid, billing-enabled API key.';
          shouldOpenDialog = true;
        }
      }
      
      setError(userFriendlyMessage);
      logger.log(`Transcript conversion failed: ${userFriendlyMessage}`, 'error');
      updateAgentStatus('idle');

      if (shouldOpenDialog) {
        setShowApiKeyDialog(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, stopCurrentSession, startScriptSession]);
  
  useEffect(() => {
    if (isHandRaised && selectedQaGuestIndex !== -1 && agentStatus === 'idle' && !isHandRaisePendingRef.current) {
        const fullScript = scriptLinesRef.current.join('\n');
        startQASession(fullScript);
    }
  }, [isHandRaised, selectedQaGuestIndex, agentStatus]);

  const handleLowerHand = () => {
    if (!isHandRaised && !isHandRaisePendingRef.current) return;
    logger.log('User lowered hand.');
    
    const shouldResume = (isHandRaised && agentStatus === 'idle') || 
                         ['prompting', 'listening', 'answering'].includes(agentStatus);

    setIsHandRaised(false);
    setIsHandRaisePending(false);
    isHandRaisePendingRef.current = false;
    
    if (shouldResume) {
        if (['prompting', 'listening', 'answering'].includes(agentStatus)) {
            stopCurrentSession();
        }
        const resumeIndex = Math.max(0, currentLineIndexRef.current);
        const fullScript = scriptLinesRef.current.join('\n');
        startScriptSession(fullScript, resumeIndex);
    }
  };

  const handleRaiseHand = () => {
    if (isHandRaised || isHandRaisePendingRef.current) {
      handleLowerHand();
      return;
    }
    setIsPaused(false); // Clear pause state if hand is raised
    setSelectedQaGuestIndex(-1); // Require selection
    
    if (agentStatus === 'reading') {
        if (isInterruptibleRef.current) {
            logger.log('User raised hand. Interrupting show and starting Q&A immediately.');
            qaStartIndexRef.current = currentLineIndexRef.current;
            playBeep();
            handleInterrupt();
            setIsHandRaised(true);
        } else {
            logger.log('User raised hand. Q&A will start after this turn finishes.');
            qaStartIndexRef.current = currentLineIndexRef.current;
            playBeep();
            setIsHandRaisePending(true);
            isHandRaisePendingRef.current = true;
        }
    } else {
        // If not reading (e.g. idle or finished), wait for selection
        const index = currentLineIndexRef.current;
        logger.log(`User raised hand. Waiting for guest selection.`);
        qaStartIndexRef.current = index;
        playBeep();
        setIsHandRaised(true);
    }
  };

  const handleTogglePause = async () => {
    if (isHandRaised) return; // Prevent pausing during active Q&A
    if (isPaused) {
      const resumeIndex = Math.max(0, currentLineIndexRef.current);
      logger.log(`Resuming script from line ${resumeIndex}...`);
      setIsPaused(false);
      startScriptSession(scriptLines.join('\n'), resumeIndex);
    } else {
      logger.log(`Pausing script at line ${currentLineIndexRef.current}...`);
      setIsPaused(true);
      updateAgentStatus('idle');
      await stopCurrentSession();
    }
  };

  const handleReset = async () => {
    if (scriptLines.length === 0) return;
    logger.log('Resetting script to beginning...');
    setIsPaused(false);
    startScriptSession(scriptLines.join('\n'), 0);
  };

  const handleSkipForward = async () => {
    if (scriptLines.length === 0) return;
    const nextIndex = currentLineIndexRef.current + 1;
    if (nextIndex < scriptLines.length) {
      logger.log(`Skipping forward to line ${nextIndex}...`);
      setIsPaused(false);
      startScriptSession(scriptLines.join('\n'), nextIndex);
    }
  };

  const handleSkipBack = async () => {
    if (scriptLines.length === 0) return;
    const prevIndex = Math.max(0, currentLineIndexRef.current - 1);
    logger.log(`Skipping back to line ${prevIndex}...`);
    setIsPaused(false);
    startScriptSession(scriptLines.join('\n'), prevIndex);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCurrentSession();
    };
  }, [stopCurrentSession]);
  
  const isUserSpeaking = currentInputTranscription.trim().length > 0;

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setGenerationProgress(0);
      setGenerationStatus(STATUS_MESSAGES[0]);
      const startTime = Date.now();
      const duration = modelType === 'pro' ? 30000 : 20000;
      
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        setGenerationProgress(progress);
        
        // Update status message every 5 seconds
        const statusIndex = Math.min(Math.floor(elapsed / 5000), STATUS_MESSAGES.length - 1);
        setGenerationStatus(STATUS_MESSAGES[statusIndex]);
        
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 50);
    } else {
      setGenerationProgress(0);
      setGenerationStatus('');
    }
    return () => clearInterval(interval);
  }, [isLoading, modelType]);

  useEffect(() => {
    if (scriptLines.length > 0 && !isLoading && !isConsoleExpanded) {
      const timer = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scriptLines.length, isLoading, isConsoleExpanded]);

  const handleDownloadAudio = async () => {
    logger.log("Starting audio download...");
    setIsDownloading(true);
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffers: AudioBuffer[] = [];
        
        // Iterate through script lines to maintain order
        for (let i = 0; i < scriptLines.length; i++) {
            // 1. Add script turn audio
            const turnChunks = turnAudioChunksRef.current.get(i);
            if (turnChunks && turnChunks.length > 0) {
                logger.log(`Processing audio for turn ${i}...`);
                for (const chunk of turnChunks) {
                    const buffer = await decodeAudioData(chunk, ctx, 24000, 1);
                    buffers.push(buffer);
                }
            }
        }
        
        if (buffers.length === 0) {
            logger.log("No audio buffers found to download.");
            setIsDownloading(false);
            return;
        }
        
        logger.log(`Concatenating ${buffers.length} audio buffers...`);
        // Calculate total duration
        const totalDuration = buffers.reduce((acc, buf) => acc + buf.duration, 0);
        const totalLength = Math.ceil(totalDuration * 24000);
        
        // Render to single buffer
        const offlineCtx = new OfflineAudioContext(1, totalLength, 24000);
        let offset = 0;
        
        for (const buffer of buffers) {
            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(offlineCtx.destination);
            source.start(offset);
            offset += buffer.duration;
        }
        
        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        
        logger.log("Triggering file download...");
        // Trigger download
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'panel_recording.wav';
        a.click();
        URL.revokeObjectURL(url);
        
    } catch (e) {
        console.error("Failed to download audio:", e);
        setError("Failed to generate audio file.");
        logger.log(`Download failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
        setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-2 sm:p-4">

      <main className={`w-full max-w-3xl mx-auto flex flex-col transition-all duration-500 ${scriptLines.length > 0 && !isConsoleExpanded ? 'gap-2' : 'gap-8'}`}>
        <header className={`w-full relative z-50 transition-all duration-500 ${scriptLines.length > 0 && !isConsoleExpanded ? 'pt-2 pb-1' : 'pt-4 pb-2'}`}>
          <div className="flex justify-end items-center w-full mb-2 px-2">
            <div className="flex gap-2">
              <HelpModal />
              <DebugLogModal />
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <AnimatePresence mode="wait">
              {scriptLines.length > 0 && !isConsoleExpanded ? (
                <motion.div
                  key="topic-display"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-1 flex flex-col items-center gap-4"
                >
                  <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 tracking-tight leading-tight">
                    {prompt}
                  </h1>
                </motion.div>
              ) : (
                <motion.div
                  key="hero-display"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-1 flex items-center justify-center gap-3">
                    <SparklesIcon className="w-8 h-8 text-indigo-400" />
                    Live Panel
                  </h1>
                  <p className="text-slate-400 mb-2 hidden sm:block">
                    Design your own panel with AI panelists and ask live questions
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {(scriptLines.length === 0 || isLoading || isConsoleExpanded) ? (
            <motion.section
              key="search-form-expanded"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="z-30 relative w-full"
            >
              <div className="bg-slate-800 border-2 border-indigo-500/30 rounded-xl overflow-hidden shadow-2xl">
                {scriptLines.length > 0 && !isLoading && (
                  <div className="flex justify-end px-4 py-2 bg-slate-900/50 border-b border-slate-700">
                    <button 
                      onClick={() => setIsConsoleExpanded(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title="Minimize"
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <SearchForm
                  prompt={prompt}
                  setPrompt={setPrompt}
                  transcript={transcript}
                  setTranscript={setTranscript}
                  onSubmit={handleSubmit}
                  onConvert={(t) => handleConvert(t, prompt)}
                  isLoading={isLoading}
                  pace={pace}
                  setPace={setPace}
                  modelType={modelType}
                  setModelType={setModelType}
                  turnLength={turnLength}
                  setTurnLength={setTurnLength}
                  hostPersona={hostPersona}
                  setHostPersona={setHostPersona}
                  hostVoice={hostVoice}
                  setHostVoice={setHostVoice}
                  guests={guests}
                  setGuests={setGuests}
                  hasScript={scriptLines.length > 0}
                  isInterruptible={isInterruptible}
                  setIsInterruptible={setIsInterruptible}
                  isLiveMode={isLiveMode}
                  setIsLiveMode={setIsLiveMode}
                />
                {isLoading && (
                  <div className="px-4 pb-4 space-y-2">
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <motion.div 
                        className="bg-indigo-500 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${generationProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <div className="flex justify-start items-center gap-2 px-1">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.6, 1, 0.6]
                        }}
                        transition={{ 
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <SparklesIcon className="w-4 h-4 text-indigo-400" />
                      </motion.div>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={generationStatus}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 5 }}
                          className="text-xs font-bold text-indigo-400"
                        >
                          {generationStatus}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <div className="flex flex-col gap-3">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {!isLoading && scriptLines.length === 0 && !error && (
             <div className="text-center py-10 px-4 border-2 border-dashed border-slate-700 rounded-lg">
                <p className="text-slate-500">Your live talk session will appear here.</p>
             </div>
          )}

          {isLiveMode && scriptLines.length > 0 && (
            <LiveModePanel
              stage={liveStage}
              searchContext={liveSearchContext}
              submissions={liveSubmissions}
              hostDecision={hostDecision}
              isAutoAdvance={isLiveAutoAdvance}
              onToggleAutoAdvance={() => setIsLiveAutoAdvance(!isLiveAutoAdvance)}
              onApplyDecision={() => hostDecision && applyLiveDecision(hostDecision)}
              onForceSteerHost={() => {}}
              guests={guests}
              hostPersona={hostPersona}
              turnCount={liveTurnCount}
            />
          )}

          {scriptLines.length > 0 && (
            <ResponseDisplay
                scriptLines={scriptLines}
                currentLineIndex={currentLineIndex}
                currentInputTranscription={currentInputTranscription}
                conversationHistory={conversationHistory}
                agentStatus={agentStatus}
                outputVolume={outputVolume}
                inputVolume={inputVolume}
                inlineQaHistory={inlineQaHistory}
                guests={guests}
                selectedQaGuestIndex={selectedQaGuestIndex}
                isAgentSpeaking={isAgentSpeaking}
                isPaused={isPaused}
                onModifyPanel={!isHandRaised && !isHandRaisePending ? () => setIsConsoleExpanded(true) : undefined}
                hasAudio={hasAudio}
                onDownloadAudio={handleDownloadAudio}
                isDownloading={isDownloading}
                isInterruptible={isInterruptible}
                onInterrupt={handleInterrupt}
            />
          )}

          {followOnTopics.length > 0 && !isHandRaised && !isHandRaisePending && (
            <div className="mb-6 px-2">
              <div className="flex flex-col gap-2 max-w-2xl mx-auto">
                {followOnTopics.map((topic, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(topic);
                      generateFromTopic(topic);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 hover:text-white px-6 py-4 rounded-2xl text-sm sm:text-base transition-all flex items-center gap-3 group text-left shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <PlusIcon className="w-4 h-4 text-indigo-400 group-hover:rotate-90 transition-transform flex-shrink-0" />
                    <span className="flex-1">{topic}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sources && sources.length > 0 && !isHandRaised && !isHandRaisePending && <SourcesList sources={sources} />}
        </div>
      </main>
            {/* Q&A Indicators */}
       {(isHandRaisePending || isHandRaised) && (
          <div className="fixed bottom-40 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4 w-full max-w-xs">
               <div className={`${selectedQaGuestIndex === -1 ? 'bg-yellow-600' : 'bg-indigo-600'} text-white font-semibold px-6 py-3 rounded-full flex items-center gap-2 shadow-lg animate-pulse w-full justify-center`}>
                  <HandRaisedIcon className="w-5 h-5" />
                  {selectedQaGuestIndex === -1 ? 'Select a Guest to Ask' : (isHandRaisePending ? 'Hand Raised (Waiting...)' : 'Q&A Session Active')}
               </div>
               
               {selectedQaGuestIndex === -1 && (
                 <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700 p-3 rounded-2xl shadow-[0_0_80px_30px_rgba(8,9,71,0.8)] w-full flex flex-col gap-2">
                   <label className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Direct question to:</label>
                   <div className="grid grid-cols-1 gap-1">
                     {guests.map((guest, idx) => (
                       <button
                         key={guest.id}
                         onClick={() => setSelectedQaGuestIndex(idx)}
                         className={`text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-3 ${selectedQaGuestIndex === idx ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-700'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                       >
                         <div className="scale-[0.3] origin-center -m-6">
                            <Avatar gradient={[
                               "from-emerald-400 to-teal-600",
                               "from-amber-400 to-orange-600",
                               "from-rose-400 to-pink-600",
                               "from-cyan-400 to-sky-600",
                               "from-violet-400 to-fuchsia-600"
                             ][idx % 5]} />
                         </div>
                         <span className="flex-1">Guest {idx + 1}</span>
                         {selectedQaGuestIndex === idx && <CheckIcon className="w-4 h-4" />}
                       </button>
                     ))}
                   </div>
                 </div>
               )}
          </div>
       )}

       {/* Control Panel */}
       {scriptLines.length > 0 && (
         <div className="fixed bottom-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 p-1 sm:p-2 rounded-full shadow-[0_0_100px_50px_rgba(8,9,71,1)] flex items-center gap-1 sm:gap-2 z-40 scale-90 sm:scale-100">
           <button
             onClick={handleReset}
             disabled={isHandRaised}
             className="p-2 sm:p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
             title="Reset to beginning"
           >
             <ResetIcon className="w-5 h-5 sm:w-6 sm:h-6" />
           </button>
           
           <button
             onClick={handleSkipBack}
             disabled={isHandRaised}
             className="p-2 sm:p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
             title="Previous turn"
           >
             <SkipBackIcon className="w-5 h-5 sm:w-6 sm:h-6" />
           </button>

           <button
             onClick={handleTogglePause}
             disabled={isHandRaised}
             className={`p-3 sm:p-4 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500`}
             title={isPaused ? "Resume" : "Pause"}
           >
             {isPaused ? <PlayIcon className="w-6 h-6 sm:w-8 sm:h-8" /> : <PauseIcon className="w-6 h-6 sm:w-8 sm:h-8" />}
           </button>

           <button
             onClick={handleSkipForward}
             disabled={isHandRaised}
             className="p-2 sm:p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
             title="Next turn"
           >
             <SkipForwardIcon className="w-5 h-5 sm:w-6 sm:h-6" />
           </button>

           <div className="w-px h-6 sm:h-8 bg-slate-700 mx-0.5 sm:mx-1" />

           {!isHandRaised && !isHandRaisePending ? (
             <button
               onClick={isHandRaisePending ? handleLowerHand : handleRaiseHand}
               disabled={agentStatus !== 'reading'}
               className={`p-2 sm:p-3 rounded-full transition-all disabled:opacity-50 ${isHandRaisePending ? 'text-yellow-400 bg-slate-800 animate-pulse' : 'text-indigo-400 hover:text-indigo-300 hover:bg-slate-800'} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
               title="Raise hand for Q&A"
             >
               <HandRaisedOutlineIcon className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>
           ) : (isHandRaised || isHandRaisePending) ? (
             <button
               onClick={handleLowerHand}
               className="p-2 sm:p-3 text-yellow-400 bg-slate-800 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-yellow-400"
               title="Lower hand"
             >
               <HandRaisedDownIcon className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>
            ) : (
             <button
               onClick={handleDoneQASession}
               className="p-2 sm:p-3 text-green-400 hover:text-green-300 hover:bg-slate-800 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-green-400"
               title="Resume show"
             >
               <CheckIcon className="w-5 h-5 sm:w-6 sm:h-6" />
             </button>
           )}
         </div>
       )}

      <footer className="w-full max-w-3xl mx-auto text-center py-6 mt-auto pb-24">
        <p className="text-sm text-slate-500">Powered by Google Gemini</p>
        <p className="text-xs text-slate-600 mt-2">Gemini can make mistakes, so double-check it.</p>
      </footer>

      <AnimatePresence>
        {showApiKeyDialog && <ApiKeyDialog onContinue={handleSelectKey} />}
      </AnimatePresence>
    </div>
  );
};

export default App;
