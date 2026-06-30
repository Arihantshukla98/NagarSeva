/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sparkles } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  subMessage?: string;
}

export default function LoadingSpinner({
  message = 'AI is analyzing your report...',
  subMessage = 'Retrieving server model weights and matching database duplicates...',
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="relative flex items-center justify-center mb-6">
        {/* Pulsing glow background */}
        <div className="absolute w-20 h-20 bg-[#0ea5e9]/10 rounded-full blur-xl animate-pulse" />
        
        {/* Spining ring */}
        <div className="w-16 h-16 border-4 border-slate-700 border-t-[#0ea5e9] rounded-full animate-spin" />
        
        {/* Center AI Icon */}
        <div className="absolute text-[#0ea5e9] animate-bounce">
          <Sparkles size={24} className="fill-[#0ea5e9]/10" />
        </div>
      </div>
      
      <h3 className="font-display font-bold text-lg text-slate-100 tracking-tight mb-2">
        {message}
      </h3>
      <p className="text-sm text-slate-400 max-w-sm font-sans leading-relaxed">
        {subMessage}
      </p>
    </div>
  );
}
