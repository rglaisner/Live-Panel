/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { motion } from 'motion/react';

const QAAnimation: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <div className="relative w-48 h-24 flex items-center justify-center">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Q */}
          <motion.path
            d="M 40 50 a 30 30 0 1 1 0 0.1 M 65 75 L 85 95"
            fill="transparent"
            strokeWidth="8"
            stroke="currentColor"
            className="text-indigo-400"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: 1, 
              ease: "easeInOut",
              delay: 0
            }}
          />
          
          {/* & */}
          <motion.path
            d="M 115 70 C 115 85 95 85 95 70 C 95 55 115 55 115 40 C 115 25 100 25 100 40 C 100 55 130 75 130 85"
            fill="transparent"
            strokeWidth="6"
            stroke="currentColor"
            className="text-sky-400"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: 1, 
              ease: "easeInOut",
              delay: 0.5
            }}
          />

          {/* A */}
          <motion.path
            d="M 145 90 L 170 30 L 195 90 M 155 70 L 185 70"
            fill="transparent"
            strokeWidth="8"
            stroke="currentColor"
            className="text-indigo-400"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: 1, 
              ease: "easeInOut",
              delay: 1.0
            }}
          />
        </svg>
        
        {/* Subtle glow effect */}
        <motion.div
          className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.2 }}
        className="text-xl font-semibold tracking-widest text-indigo-300 uppercase"
      >
        Session Starting
      </motion.div>
    </div>
  );
};

export default QAAnimation;
