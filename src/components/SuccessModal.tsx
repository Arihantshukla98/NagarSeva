/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { CheckCircle, ArrowRight, PlusCircle, Share2, Clipboard } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  category: string;
  severity: string;
  aiSummary: string;
  estimatedCost: string;
  onTrack: () => void;
  onReportAnother: () => void;
}

export default function SuccessModal({
  isOpen,
  onClose,
  issueId,
  category,
  severity,
  aiSummary,
  estimatedCost,
  onTrack,
  onReportAnother,
}: SuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Blast confetti!
      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        // Confetti shoots from left and right edges
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyId = () => {
    navigator.clipboard.writeText(issueId);
    alert('Copied Issue ID to Clipboard!');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#1e293b] border border-[#334155] rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(14,165,233,0.15)] overflow-hidden">
        {/* Decorative ambient gradients */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981]/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#0ea5e9]/10 rounded-full blur-2xl" />

        <div className="flex flex-col items-center text-center">
          {/* Animated checkmark icon */}
          <div className="w-16 h-16 bg-[#10b981]/15 text-[#10b981] rounded-full flex items-center justify-center mb-6 border border-[#10b981]/25">
            <CheckCircle size={36} className="animate-pulse" />
          </div>

          <h2 className="font-display font-bold text-2xl text-slate-50 mb-2 tracking-tight">
            Civic Report Lodged Successfully!
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Your report has been received, processed by NagarSeva AI, and routed to the corresponding municipal zone officer.
          </p>

          {/* Issue ID Copy Card */}
          <div className="w-full bg-[#0f172a] rounded-xl border border-[#334155] p-3 flex items-center justify-between gap-4 mb-6">
            <div className="text-left">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Lodged Record ID</div>
              <div className="font-mono text-xs font-semibold text-slate-200">{issueId}</div>
            </div>
            <button
              onClick={copyId}
              className="p-2 hover:bg-[#334155] text-slate-400 hover:text-slate-100 rounded-lg transition-colors"
              title="Copy ID"
            >
              <Clipboard size={16} />
            </button>
          </div>

          {/* AI Extraction Summary Box */}
          <div className="w-full text-left bg-[#0ea5e9]/5 border border-[#0ea5e9]/20 rounded-xl p-4 mb-8">
            <div className="text-xs font-bold font-display text-[#0ea5e9] tracking-wider mb-2 uppercase flex items-center gap-1.5">
              <span>🤖 AI AUTOMATED ROUTING</span>
            </div>
            <div className="text-xs font-semibold text-slate-200 mb-1.5 leading-relaxed">
              {aiSummary}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-[#334155]/50">
              <div>Severity: <span className="text-[#0ea5e9] font-bold">{severity.toUpperCase()}</span></div>
              <div>Budget Est: <span className="text-[#10b981] font-bold">{estimatedCost}</span></div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <button
              onClick={onTrack}
              className="flex items-center justify-center gap-2 w-full bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-[#0f172a] font-bold py-3 px-4 rounded-xl transition-all"
            >
              <span>Track Issue</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onReportAnother}
              className="flex items-center justify-center gap-2 w-full bg-[#334155] hover:bg-[#334155]/80 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-all border border-slate-600/40"
            >
              <PlusCircle size={16} />
              <span>Report Another</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
