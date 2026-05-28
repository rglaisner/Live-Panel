import React from 'react';
import { 
  Sparkles, 
  User, 
  HelpCircle, 
  Play, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Tv, 
  BookOpen, 
  Cpu, 
  Smile, 
  ToggleLeft, 
  ToggleRight,
  Compass,
  FileText
} from 'lucide-react';
import { Guest } from '../types';
import { PanelistSubmission, HostReviewDecision } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

interface LiveModePanelProps {
  stage: 'idle' | 'searching' | 'submitting' | 'reviewing' | 'waiting' | 'playing' | 'completed';
  searchContext: string;
  submissions: PanelistSubmission[];
  hostDecision: HostReviewDecision | null;
  isAutoAdvance: boolean;
  onToggleAutoAdvance: () => void;
  onApplyDecision: () => void;
  onForceSteerHost: () => void;
  guests: Guest[];
  hostPersona: string;
  turnCount: number;
}

export const LiveModePanel: React.FC<LiveModePanelProps> = ({
  stage,
  searchContext,
  submissions,
  hostDecision,
  isAutoAdvance,
  onToggleAutoAdvance,
  onApplyDecision,
  onForceSteerHost,
  guests,
  hostPersona,
  turnCount
}) => {
  return (
    <div className="bg-slate-900 border border-slate-700/85 rounded-xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(30,27,75,0.4)]">
      {/* Top Console Bar */}
      <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
            Live Director Engine
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
            Turn #{turnCount}
          </span>
        </div>
        
        {/* Rules Checklist indicator */}
        <div className="hidden sm:flex items-center gap-4 text-[9px] text-slate-500 font-mono uppercase">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Opposition Stances</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Speaker Balance</span>
          </div>
          {searchContext && (
            <div className="flex items-center gap-1.5" title="Rules: Searches allowed only at start">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Search consultant synced</span>
            </div>
          )}
        </div>

        {/* Steering / Toggle settings */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleAutoAdvance}
            className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase bg-slate-800/80 px-3 py-1.5 border border-slate-700 rounded-lg hover:text-white transition-all focus:outline-none"
            title="Toggle autoplay vs step-by-step review"
          >
            {isAutoAdvance ? (
              <>
                <ToggleRight className="w-4 h-4 text-indigo-400" />
                <span className="text-indigo-400">Auto-pilot</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">Step Review</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Stage Status Box */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              {stage === 'searching' && <Search className="w-5 h-5 animate-spin text-cyan-400" />}
              {stage === 'submitting' && <Cpu className="w-5 h-5 animate-pulse text-violet-400" />}
              {stage === 'reviewing' && <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />}
              {stage === 'waiting' && <Tv className="w-5 h-5 text-indigo-400" />}
              {stage === 'playing' && <Play className="w-5 h-5 text-emerald-400 animate-pulse" />}
              {stage === 'idle' && <Compass className="w-5 h-5 text-slate-400" />}
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-slate-200">
                {stage === 'searching' && 'Director is Gathering Initial Web Intelligence'}
                {stage === 'submitting' && 'All Panelists are Drafting Next Stances'}
                {stage === 'reviewing' && 'Show Host is Assessing Opposing Stances'}
                {stage === 'waiting' && 'Host Decision Pending Your Action'}
                {stage === 'playing' && 'Active Discussion Stream'}
                {stage === 'idle' && 'Director Dormant'}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {stage === 'searching' && 'Consulting fresh web data for the initial setup. This acts as the shared briefing.'}
                {stage === 'submitting' && 'Panelists are formulating distinct, potentially opposite views based on initial search facts.'}
                {stage === 'reviewing' && 'The Host is evaluating panel arguments for relevance, tension, and engagement.'}
                {stage === 'waiting' && 'Host reviewed submissions and chose the best continuation. Confirm below to proceed.'}
                {stage === 'playing' && 'Presenting the elected conversation point.'}
                {stage === 'idle' && 'Submit a topic in Live Mode to begin.'}
              </p>
            </div>
          </div>
          
          {stage === 'waiting' && hostDecision && (
            <button
              onClick={onApplyDecision}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-indigo-500/15 focus:outline-none transition-all hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Play Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Shared Starting Grounding Brief (Search Context) */}
        {searchContext && (
          <div className="border border-slate-800 rounded-xl bg-slate-950/25 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Turn 1 News & Fact Briefing (Web Search Grounding)</span>
            </div>
            <div className="p-4 text-xs text-slate-300 leading-relaxed font-sans max-h-24 overflow-y-auto">
              {searchContext}
            </div>
          </div>
        )}

        {/* Panelist Submissions Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {submissions.map((sub, idx) => {
              const gradients = [
                "from-emerald-950/30 to-teal-950/10 hover:border-emerald-500/50",
                "from-amber-950/30 to-orange-950/10 hover:border-amber-500/50",
                "from-rose-950/30 to-pink-950/10 hover:border-rose-500/50",
                "from-cyan-950/30 to-sky-950/10 hover:border-cyan-500/50",
                "from-violet-950/30 to-fuchsia-950/10 hover:border-violet-500/50"
              ];
              const borderColors = [
                "border-emerald-900/40",
                "border-amber-900/40",
                "border-rose-900/40",
                "border-cyan-900/40",
                "border-violet-900/40"
              ];
              
              const isSelected = hostDecision?.selectedSpeakerKey === `guest${idx + 1}`;

              return (
                <motion.div
                  key={sub.guestId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 bg-gradient-to-br ${gradients[idx % gradients.length]} ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-400/80 shadow-[0_0_20px_rgba(99,102,241,0.25)]' : borderColors[idx % borderColors.length]}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-200">{sub.guestName}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 border border-slate-700/60 rounded font-mono text-slate-400 uppercase tracking-widest">
                        Guest {idx + 1}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider font-mono">
                        Opposite Stance/Angle
                      </div>
                      <p className="text-[11px] font-sans font-medium text-slate-300 italic">
                        "{sub.perspective}"
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                        Proposed Speech Draft
                      </div>
                      <p className="text-xs font-sans text-slate-200 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5 font-mono max-h-24 overflow-y-auto">
                        {sub.text || "Formulating thoughts..."}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 flex items-center justify-center gap-1.5 py-1 px-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 text-[10px] font-bold uppercase tracking-wider font-mono">
                      <span>✓ Elected Speaker by Host</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Host Decision & Reviews Section */}
        {hostDecision && (
          <div className="border border-indigo-500/30 rounded-xl bg-indigo-950/10 overflow-hidden shadow-lg shadow-indigo-950/20">
            {/* Header */}
            <div className="px-4 py-3 bg-indigo-950/40 border-b border-indigo-900/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Smile className="w-4 h-4 text-indigo-400 animate-bounce" />
                <span className="text-[11px] font-mono font-bold tracking-widest text-indigo-300 uppercase">
                  Host Evaluation & Editorial Reasoning
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[10px] text-slate-400 font-mono">Elected track:</span>
                <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded font-mono text-xs font-bold uppercase">
                  {hostDecision.selectedSpeakerKey.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Assessment Reasoning Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest font-mono">
                  Host's Critical Review
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium bg-slate-950/40 p-4 border border-indigo-500/10 rounded-xl leading-relaxed">
                  {hostDecision.reasoning}
                </p>
              </div>

              {/* Host dialogue when host takes steering turn */}
              {hostDecision.selectedSpeakerKey.toLowerCase() === 'host' && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                    <span>Host Steering Intervention Active</span>
                  </div>
                  <p className="text-xs font-mono text-slate-100 bg-amber-500/5 p-3.5 border border-amber-500/20 rounded-xl leading-relaxed italic">
                    "None of the submissions were engaging enough. Stepping in as host: {hostDecision.text}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
