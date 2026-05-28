/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';

interface AvatarProps {
  gradient?: string;
}

const Avatar: React.FC<AvatarProps> = ({ gradient = "from-indigo-500 to-purple-600" }) => {
  return (
    <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${gradient} shadow-lg flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Eyes */}
        <circle cx="38" cy="42" r="5" fill="#000000" />
        <circle cx="62" cy="42" r="5" fill="#000000" />
        
        {/* Smile */}
        <path 
          d="M35 60 Q50 72 65 60" 
          stroke="#000000" 
          strokeWidth="4" 
          fill="none" 
          strokeLinecap="round" 
        />
      </svg>
    </div>
  );
};

export default Avatar;