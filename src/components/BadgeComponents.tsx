/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  let styles = '';
  let label = '';

  switch (severity) {
    case 'critical':
      styles = 'bg-red-500/10 text-red-500 border-red-500/20';
      label = '🔴 CRITICAL';
      break;
    case 'high':
      styles = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      label = '🟠 HIGH';
      break;
    case 'medium':
      styles = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      label = '🟡 MEDIUM';
      break;
    case 'low':
      styles = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      label = '🟢 LOW';
      break;
    default:
      styles = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      label = '⚪ OTHER';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold uppercase rounded-full border ${styles}`}>
      {label}
    </span>
  );
}

interface CategoryBadgeProps {
  category: 'pothole' | 'water' | 'streetlight' | 'garbage' | 'drainage' | 'other' | string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  let styles = '';
  let icon = '';
  let label = '';

  switch (category) {
    case 'pothole':
      styles = 'bg-slate-700/40 text-slate-300 border-slate-600/30';
      icon = '🕳';
      label = 'Pothole';
      break;
    case 'water':
      styles = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      icon = '💧';
      label = 'Water Leak';
      break;
    case 'streetlight':
      styles = 'bg-amber-500/15 text-amber-300 border-amber-500/20';
      icon = '💡';
      label = 'Streetlight';
      break;
    case 'garbage':
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      icon = '🗑';
      label = 'Garbage';
      break;
    case 'drainage':
      styles = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      icon = '🌊';
      label = 'Drainage';
      break;
    default:
      styles = 'bg-slate-500/10 text-slate-300 border-slate-500/20';
      icon = '📋';
      label = 'Other';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${styles}`}>
      <span className="text-sm">{icon}</span>
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'reported' | 'verified' | 'in_progress' | 'resolved';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let styles = '';
  let label = '';

  switch (status) {
    case 'reported':
      styles = 'bg-[#334155] text-slate-300 border-slate-600';
      label = 'Reported';
      break;
    case 'verified':
      styles = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      label = 'Verified';
      break;
    case 'in_progress':
      styles = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      label = 'In Progress';
      break;
    case 'resolved':
      styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      label = 'Resolved';
      break;
    default:
      styles = 'bg-slate-500/10 text-slate-300 border-slate-500/20';
      label = status;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-md border ${styles}`}>
      {label}
    </span>
  );
}
