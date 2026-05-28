/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { useFocusTrap } from '../src/hooks/useFocusTrap';

interface UpdateScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (prompt: string) => void;
  isUpdating: boolean;
}

const UpdateScriptModal: React.FC<UpdateScriptModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  isUpdating,
}) => {
  const [updatePrompt, setUpdatePrompt] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusTrap(modalRef, isOpen);

  if (!isOpen) return null;
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (updatePrompt.trim()) {
      onUpdate(updatePrompt);
    }
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-indigo-400">Update Script</h2>
          <button
            onClick={onClose}
            disabled={isUpdating}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <main className="p-6 space-y-4">
            <label htmlFor="update-prompt" className="block text-sm font-medium text-slate-300">
              How would you like to change the script?
            </label>
            <textarea
              id="update-prompt"
              value={updatePrompt}
              onChange={(e) => setUpdatePrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-300 placeholder-slate-500"
              placeholder="e.g., Make the conversation more casual and add a joke."
              disabled={isUpdating}
            />
            <p className="text-xs text-slate-500">
              The AI will rewrite the entire script based on your instructions.
            </p>
          </main>
          <footer className="p-4 bg-slate-800/50 border-t border-slate-700 flex justify-end">
            <button
              type="submit"
              disabled={isUpdating || !updatePrompt.trim()}
              className="bg-indigo-600 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-2 hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
            >
              {isUpdating ? 'Updating...' : 'Update Script'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default UpdateScriptModal;
