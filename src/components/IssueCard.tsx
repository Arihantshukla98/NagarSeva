/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThumbsUp, MapPin, Calendar, Layers } from 'lucide-react';
import { CategoryBadge, SeverityBadge, StatusBadge } from './BadgeComponents';
import { Issue } from '../types';

interface IssueCardProps {
  issue: Issue;
  onClick: () => void;
}

export default function IssueCard({ issue, onClick }: IssueCardProps) {
  // Safe date parsing
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch (e) {
      return 'Recent';
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const ms = Date.now() - new Date(isoString).getTime();
      const hrs = Math.floor(ms / (1000 * 60 * 60));
      if (hrs < 1) return 'Just now';
      if (hrs === 1) return '1 hour ago';
      if (hrs < 24) return `${hrs} hours ago`;
      const days = Math.floor(hrs / 24);
      if (days === 1) return '1 day ago';
      return `${days} days ago`;
    } catch (e) {
      return '';
    }
  };

  // Check if image is local or URL
  const getFullImgUrl = (url: string) => {
    if (url.startsWith('/uploads')) {
      return url; // Served statically from backend
    }
    return url; // Absolute Unsplash url
  };

  return (
    <div
      onClick={onClick}
      className="card-surface flex flex-col h-full cursor-pointer overflow-hidden group select-none"
    >
      {/* Image container */}
      <div className="relative h-48 w-full overflow-hidden bg-[#0f172a]">
        <img
          src={getFullImgUrl(issue.imageUrl)}
          alt={issue.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={(e: any) => {
            // fallback if link fails
            e.target.src = 'https://images.unsplash.com/photo-1594818856205-5022f49479a3?q=80&w=800';
          }}
        />
        
        {/* Absolute status indicators */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <CategoryBadge category={issue.category} />
        </div>
        <div className="absolute top-3 right-3 z-10">
          <StatusBadge status={issue.status} />
        </div>
        
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#1e293b]/60 to-transparent z-0" />
      </div>

      {/* Content wrapper */}
      <div className="flex flex-col flex-grow p-5">
        {/* Severity Badge row */}
        <div className="mb-2.5">
          <SeverityBadge severity={issue.severity} />
        </div>

        {/* Title */}
        <h3 className="font-display font-bold text-base text-slate-50 line-clamp-2 leading-snug group-hover:text-[#0ea5e9] transition-colors duration-200 mb-2">
          {issue.title}
        </h3>

        {/* Description Snippet */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {issue.description}
        </p>

        {/* Location Address */}
        <div className="flex items-start gap-1.5 text-xs text-slate-400 mb-4 mt-auto">
          <MapPin size={14} className="text-[#0ea5e9] shrink-0 mt-0.5" />
          <span className="line-clamp-1">{issue.location.address}</span>
        </div>

        {/* Metadata Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#334155]/60 text-xs font-medium text-slate-400">
          <div className="flex items-center gap-1.5 text-[#0ea5e9] bg-[#0ea5e9]/10 px-2 py-1 rounded-md font-bold">
            <ThumbsUp size={12} className="fill-transparent" />
            <span>{issue.votes} Votes</span>
          </div>
          
          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
            <Calendar size={11} />
            <span>{getRelativeTime(issue.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
