/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import { KeyIcon } from './Icons';
import { useFocusTrap } from '../src/hooks/useFocusTrap';

interface ApiKeyDialogProps {
  onContinue: () => void;
}

const ApiKeyDialog: React.FC<ApiKeyDialogProps> = ({ onContinue }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Trap focus and set initial focus to the content area
  useFocusTrap(modalRef, true, contentRef);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black/80 grid place-items-center z-[999] p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={contentRef}
        tabIndex={0}
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-xl max-w-lg w-full px-4 py-3 sm:p-6 text-center flex flex-col items-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <div className="bg-indigo-600/20 p-2 rounded-full mb-2 sm:mb-4">
          <KeyIcon className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Paid API Key Required</h2>
        <p className="text-gray-300 mb-2 text-sm">
          This application requires a paid-only API key. To use this feature, please select an API key associated with a paid Google Cloud project that has billing enabled.
        </p>
        <p className="text-gray-400 mb-4 text-xs sm:text-sm">
          For more information, see the{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:underline font-medium"
          >
            how to enable billing
          </a>.
        </p>
        <button
          onClick={onContinue}
          className="w-full px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
        >
          Continue to Select a Paid API Key
        </button>
      </div>
    </div>
  );
};

export default ApiKeyDialog;
