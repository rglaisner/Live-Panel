/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { useFocusTrap } from '../src/hooks/useFocusTrap';
import { HelpIcon, SparklesIcon, MicrophoneIcon, HandRaisedIcon } from './Icons';

const HelpModal: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const mainContentRef = useRef<HTMLElement>(null);

    useFocusTrap(modalRef, isOpen, mainContentRef);

    const toggleModal = () => setIsOpen(!isOpen);

    const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-300 bg-slate-700 border border-slate-600 rounded-md">
            {children}
        </kbd>
    );

    return (
        <>
            <button
                onClick={toggleModal}
                className="fixed bottom-4 left-4 bg-slate-900 text-slate-300 p-2 sm:p-3 rounded-full shadow-xl hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all z-40 border border-slate-700 hover:border-indigo-500/50 group"
                aria-label="Open Help"
                title="Help"
            >
                <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-md group-hover:bg-indigo-500/40 transition-all" />
                <HelpIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" />
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
                        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                            <h2 className="text-lg font-semibold text-indigo-400">Welcome to Live Panel!</h2>
                            <button
                                onClick={toggleModal}
                                className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
                            >
                                Got it!
                            </button>
                        </header>

                        <main 
                            ref={mainContentRef}
                            tabIndex={0}
                            className="p-6 flex-grow overflow-y-auto space-y-8 prose prose-invert max-w-none text-left prose-h3:text-indigo-400 prose-h4:text-sky-400 prose-strong:text-slate-200 prose-ul:list-disc prose-ul:pl-6 prose-li:my-1 prose-a:text-indigo-400 hover:prose-a:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 rounded-b-lg"
                        >
                            <p>This app connects you with a live AI agent that acts as an AI host and a group of AI guests, performing a freshly generated panel discussion script just for you. Here's how to curate and record your own custom panel.</p>
                            
                            <hr className="border-slate-700" />

                            <div>
                                <h3>1. Define Your Panel</h3>
                                <ul className="list-disc pl-6 space-y-4 text-slate-300">
                                    <li>
                                        <strong>Set the Topic or Transcript:</strong> Use the <strong>Create Panel</strong> tab to type a subject (e.g., "The future of space travel") or paste an existing transcript you want performed.
                                    </li>
                                    <li>
                                        <strong>Define Your Panelists:</strong> Switch to the <strong>Define Panelists</strong> tab to customize the show's cast.
                                    </li>
                                    <li>
                                        <strong>Host & Guest Settings:</strong> Expand <strong>Host Settings</strong> or <strong>Guest Settings</strong> to define personas, roles, and voices. Be descriptive—the AI uses these details to modulate its performance.
                                    </li>
                                    <li>
                                        <strong>Delivery Speed:</strong> At the bottom of the panelists tab, you can toggle between <strong>Normal</strong> and <strong>Fast</strong> delivery speeds.
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3>2. Convene & Listen</h3>
                                <ul className="list-disc pl-6 space-y-4 text-slate-300">
                                    <li>
                                        <strong>Generate & Start:</strong> Click <Kbd>Generate</Kbd>. The AI will write a unique script and then connect to live agents who perform the roles.
                                    </li>
                                     <li>
                                        <strong>Immersive Performance:</strong> The agent uses distinct voices for each role. The transcript highlights the active line in real-time.
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3>3. Interactive Q&A</h3>
                                <ul className="list-disc pl-6 space-y-4 text-slate-300">
                                    <li>
                                        <strong>Raise Your Hand:</strong> Click <Kbd><HandRaisedIcon className="w-4 h-4" /> Raise Hand</Kbd> to jump in. The Host will pause the script and invite you to speak.
                                    </li>
                                     <li>
                                        <strong>Ask the Panelists:</strong> Speak your question. The agent will answer in the persona of your selected guest. You can have a full back-and-forth conversation.
                                     </li>
                                     <li>
                                        <strong>Resume:</strong> The discussion automatically resumes from where it left off once the Q&A finishes.
                                     </li>
                                </ul>
                            </div>

                            <div>
                                <h3>4. Download Your Recording</h3>
                                <ul className="list-disc pl-6 space-y-4 text-slate-300">
                                    <li>
                                        <strong>Save the Show:</strong> Click the download icon at the top right of the transcript panel to save the entire panel discussion as a <code>.wav</code> file (named <code>panel_recording.wav</code>). 
                                    </li>
                                    <li>
                                        <strong>Note:</strong> The download includes the full script performance but excludes the interactive Q&A segments.
                                    </li>
                                </ul>
                            </div>
                            
                            <hr className="border-slate-700" />

                            <div>
                                <h3>Tips for a Great Session</h3>
                                <ul>
                                    <li><strong>Microphone Control:</strong> Use the <Kbd><MicrophoneIcon className="w-4 h-4" /></Kbd> button to mute/unmute. Raising your hand automatically unmutes you.</li>
                                    <li><strong>Clear Speech:</strong> Speak clearly after the Host prompts you.</li>
                                    <li><strong>Interactive Topics:</strong> After a turn, check the bottom of the transcript for follow-on topic suggestions to keep the conversation going.</li>
                                </ul>
                            </div>
                        </main>
                    </div>
                </div>
            )}
        </>
    );
};

export default HelpModal;