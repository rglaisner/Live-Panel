/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface PulsingHaloProps {
  children: React.ReactNode;
  isActive: boolean;
  color?: string;
  volume?: number; // 0 to 1
}

const PulsingHalo: React.FC<PulsingHaloProps> = ({ children, isActive, color = 'bg-sky-400', volume = 0 }) => {
  const scale = 1 + volume * 1.5; // Scale from 1 to 2.5 based on volume

  return (
    <div className="relative flex items-center justify-center">
      {/* Volume-based pulsing */}
      {volume > 0.01 && (
         <div 
            className={`absolute inset-0 rounded-full ${color} opacity-50 transition-transform duration-75 ease-out`}
            style={{ transform: `scale(${scale})` }}
         ></div>
      )}
      
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default PulsingHalo;