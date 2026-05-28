/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-indigo-400"></div>
    </div>
  );
};

export default LoadingSpinner;
