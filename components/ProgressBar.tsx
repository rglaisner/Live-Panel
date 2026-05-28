/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';

interface ProgressBarProps {
  duration: number; // in seconds
  label: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ duration, label }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const startTime = Date.now();
    const totalDurationMs = duration * 1000;

    const animate = () => {
      const elapsedTime = Date.now() - startTime;
      const currentProgress = (elapsedTime / totalDurationMs) * 100;
      
      // Cap the visual progress at 95% until the task is actually complete
      setProgress(Math.min(95, currentProgress)); 

      if (elapsedTime < totalDurationMs * 2) { // Allow animation to run longer just in case
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [duration]);

  return (
    <div className="w-full bg-slate-800/50 p-4 rounded-lg border border-slate-700">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium text-slate-300">{label}</p>
        <p className="text-sm font-mono text-indigo-400">{Math.floor(progress)}%</p>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-indigo-500 h-2.5 rounded-full"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;