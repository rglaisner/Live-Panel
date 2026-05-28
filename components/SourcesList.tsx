/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';
import type { GroundingChunk } from '../types';
import { ExternalLinkIcon } from './Icons';

interface SourcesListProps {
  sources: GroundingChunk[];
}

const SourcesList: React.FC<SourcesListProps> = ({ sources }) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 mb-4 px-2">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Search Grounding Sources</h3>
      <ul className="space-y-2">
        {sources.map((source, index) => {
          if (!source.web?.uri) return null;
          return (
            <li key={index}>
              <a
                href={source.web.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 text-indigo-400 hover:text-indigo-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md"
              >
                <div className="flex-shrink-0 w-5 h-5 bg-slate-800 border border-slate-700 rounded flex items-center justify-center text-indigo-400 font-mono text-[10px] font-bold">
                  {index + 1}
                </div>
                <div className="flex-grow overflow-hidden">
                  <p className="text-sm font-medium truncate group-hover:underline">
                    {source.web.title || 'Untitled Source'}
                  </p>
                </div>
                <ExternalLinkIcon className="w-4 h-4 flex-shrink-0 opacity-50 group-hover:opacity-100" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SourcesList;
