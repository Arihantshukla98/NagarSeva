/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Calendar, ThumbsUp, Sparkles, Send, ShieldAlert, ArrowLeft, Image, Heart, AlertCircle, RefreshCw, Check, Trash2 } from 'lucide-react';
import { CategoryBadge, SeverityBadge, StatusBadge } from '../components/BadgeComponents';
import { Issue, Comment } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';

const createCustomMarker = (color: string) => {
  return L.divIcon({
    html: `<div style="color: ${color}; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
      <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" stroke="black" stroke-width="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>`,
    className: 'custom-detail-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
};

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, syncProfile } = useAuth();
  const [issue, setIssue] = useState<(Issue & { comments: Comment[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  // Upvote state tracking
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  // Owner action states
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showResolveConfirm, setShowResolveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New Comment input
  const [commentName, setCommentName] = useState(profile?.name || '');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // AI Banner generator state
  const [topic, setTopic] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generatingBanner, setGeneratingBanner] = useState(false);
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerPrompt, setBannerPrompt] = useState('');

  const fetchIssueDetail = () => {
    fetch(`/api/issues/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => {
        setIssue(data);
        setVoteCount(data.votes);
        
        // Auto-seed campaign topic based on title
        setTopic(`Awareness: Help fix "${data.title.substring(0, 40)}..." in Bangalore!`);

        // Check local storage for votes
        const votedIssues = JSON.parse(localStorage.getItem('nagar_seva_voted_issues') || '[]');
        if (votedIssues.includes(data.id)) {
          setVoted(true);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching issue details:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchIssueDetail();
  }, [id]);

  useEffect(() => {
    if (profile) {
      setCommentName(profile.name);
    }
  }, [profile]);

  // Handle upvoting
  const handleUpvote = async () => {
    if (voted || !issue) return;

    // Check citizen identity
    let localUser = localStorage.getItem('nagar_seva_user');
    let userId = 'anon-guest';
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser);
        userId = parsed.id;
        // bump points local representation
        parsed.points += 5;
        parsed.issuesVerified += 1;
        localStorage.setItem('nagar_seva_user', JSON.stringify(parsed));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {
        // ignore
      }
    }

    try {
      const res = await fetch(`/api/issues/${issue.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        setVoteCount((prev) => prev + 1);
        setVoted(true);
        
        // Save to voted array
        const votedIssues = JSON.parse(localStorage.getItem('nagar_seva_voted_issues') || '[]');
        votedIssues.push(issue.id);
        localStorage.setItem('nagar_seva_voted_issues', JSON.stringify(votedIssues));

        // Sync points and badges manually with Firestore
        try {
          await syncProfile();
        } catch (syncErr) {
          console.error('Error syncing points after vote:', syncErr);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'Vote failed');
      }
    } catch (err) {
      console.error('Vote API error:', err);
      // fallback simulation
      setVoteCount((prev) => prev + 1);
      setVoted(true);
    }
  };

  // Resolve issue reported by the current citizen
  const handleResolveIssue = async () => {
    if (!issue) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          notes: 'Marked as resolved by the filing citizen.',
          resolvedBy: profile?.name || 'Citizen Reporter'
        })
      });
      if (res.ok) {
        setShowResolveConfirm(false);
        fetchIssueDetail();
        try {
          await syncProfile();
        } catch (e) {
          console.error(e);
        }
      } else {
        alert('Could not update status.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResolving(false);
    }
  };

  // Delete issue reported by the current citizen
  const handleDeleteIssue = async () => {
    if (!issue) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}?userId=${profile?.id || 'anonymous'}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setShowDeleteConfirm(false);
        navigate('/dashboard');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to delete complaint.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!issue || !commentName.trim() || !commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: commentName, text: commentText })
      });
      if (res.ok) {
        // Refresh detail
        setCommentText('');
        fetchIssueDetail();
      } else {
        alert('Could not submit comment.');
      }
    } catch (err) {
      console.error('Comment API error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Generate public banner via Gemini
  const handleGenerateBanner = async () => {
    if (!topic.trim()) return;
    setGeneratingBanner(true);
    setBannerUrl('');

    try {
      const res = await fetch('/api/ai/generate-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          category: issue?.category,
          location: issue?.location?.address || issue?.address || 'Bengaluru',
          description: issue?.description || '',
          aspectRatio
        })
      });
      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setBannerUrl(data.imageUrl);
        setBannerPrompt(data.prompt);
      } else {
        alert(data.error || 'Banner generation failed.');
      }
    } catch (error) {
      console.error('Banner generation failed:', error);
      alert('Error connecting to the image generation pipeline.');
    } finally {
      setGeneratingBanner(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24">
        <LoadingSpinner message="Opening issue folder file..." subMessage="Querying database indices and loading asset thumbnails..." />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <ShieldAlert className="text-red-500 mx-auto mb-4" size={48} />
        <h2 className="font-display font-bold text-xl text-slate-100">Issue folder not found</h2>
        <p className="text-slate-400 mt-2">The record may have been cleared or does not exist.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-6 bg-[#0ea5e9] text-[#0f172a] px-5 py-2.5 rounded-lg font-bold">
          Back to Dashboard Map
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 md:px-8 py-10"
    >
      {/* Return Navigation */}
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0ea5e9] uppercase tracking-wider mb-6 hover:underline"
      >
        <ArrowLeft size={16} />
        <span>Return to Live Map</span>
      </button>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: CORE DESCRIPTION AND AI INFO (2/3 width) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
            {/* Header tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <CategoryBadge category={issue.category} />
              <SeverityBadge severity={issue.severity} />
              <StatusBadge status={issue.status as any} />
            </div>

            {/* Title */}
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-50 tracking-tight leading-snug mb-4">
              {issue.title}
            </h1>

            {/* Date reported */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mb-6 border-b border-[#334155]/60 pb-5">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>Filed: {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-1 text-[#0ea5e9]">
                <MapPin size={14} />
                <span>Zone: {issue.location.address.split(',')[1] || 'Bengaluru Municipal'}</span>
              </div>
            </div>

            {/* Primary Large Image */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#0f172a] mb-6 border border-[#334155]">
              <img
                src={issue.imageUrl}
                alt={issue.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1594818856205-5022f49479a3?q=80&w=800';
                }}
              />
            </div>

            {/* Narrative description */}
            <h3 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-widest mb-2">Narrative Details</h3>
            <p className="text-sm text-slate-300 leading-relaxed font-sans mb-6">
              {issue.description}
            </p>

            {/* Official Resolution Block */}
            {issue.status === 'resolved' && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-2 text-emerald-400 font-display font-bold text-base mb-3 border-b border-emerald-500/10 pb-2">
                  <Check size={18} className="bg-emerald-500/10 p-0.5 rounded-full" />
                  <span>Official Resolution Report</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                  {/* Notes / Text report */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Inspector Progress Comments</span>
                    <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 leading-relaxed">
                      {issue.resolutionNotes || 'Task has been cleared and verified.'}
                    </p>

                    {issue.resolvedVerificationResult && issue.resolvedVerificationResult !== 'unchecked' && (
                      <div className="mt-2.5 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs leading-relaxed">
                        <div className="flex items-center justify-between font-bold text-emerald-300 uppercase text-[9px] mb-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Sparkles size={11} className="text-[#0ea5e9]" />
                            NagarSeva AI Verified
                          </span>
                          <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[8px]">
                            Success Match
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">{issue.resolvedVerificationNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Completion photo */}
                  {issue.resolvedImageUrl && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Resolved Site Photo</span>
                      <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-48 flex justify-center bg-slate-950">
                        <img 
                          src={issue.resolvedImageUrl} 
                          alt="Resolved site completion work" 
                          className="object-cover h-48 w-full hover:scale-105 transition-all duration-300"
                        />
                        <div className="absolute top-2 right-2 bg-emerald-500/90 text-slate-950 text-[9px] font-mono font-bold px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5">
                          <Check size={9} />
                          COMPLETED
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upvote and validation actions */}
            <div className="flex flex-col gap-4 pt-5 border-t border-[#334155]/60">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleUpvote}
                  disabled={voted}
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold transition-all shadow-md ${
                    voted
                      ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25 cursor-default'
                      : 'bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-[#0f172a] hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  <ThumbsUp size={16} className={voted ? 'fill-current' : ''} />
                  <span>{voted ? 'Upvoted / Verified' : 'Upvote & Verify Issue'}</span>
                </button>
                <div className="text-xs font-mono text-slate-400">
                  Validated by <span className="text-slate-100 font-bold">{voteCount}</span> active citizens
                </div>
              </div>

              {/* Citizen Owner Actions */}
              {(profile?.id === issue.reportedBy || (profile?.email && profile.email.toLowerCase() === issue.reportedBy?.toLowerCase())) && (
                <div className="mt-4 p-5 bg-[#1e293b]/40 border border-[#334155]/60 rounded-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-[#0ea5e9] uppercase tracking-wider font-mono">Your Filed Complaint</h4>
                      <p className="text-xs text-slate-400 mt-1">As the citizen who reported this, you can update its status or remove the listing.</p>
                    </div>
                    
                    {!showResolveConfirm && !showDeleteConfirm && (
                      <div className="flex items-center gap-2.5">
                        {issue.status !== 'resolved' && (
                          <button
                            onClick={() => setShowResolveConfirm(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#10b981] hover:bg-[#10b981]/90 text-[#0f172a] font-bold text-xs rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          >
                            <Check size={14} />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold text-xs rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <Trash2 size={14} />
                          <span>Delete Complaint</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline Resolve Confirmation */}
                  {showResolveConfirm && (
                    <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col gap-3">
                      <div className="flex items-start gap-2 text-xs text-emerald-200">
                        <Check size={16} className="shrink-0 mt-0.5" />
                        <span>Are you sure this issue is resolved? Marking it as resolved will award you resolution bonus points!</span>
                      </div>
                      <div className="flex items-center gap-2 self-end">
                        <button
                          onClick={() => setShowResolveConfirm(false)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleResolveIssue}
                          disabled={resolving}
                          className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                        >
                          {resolving ? 'Resolving...' : 'Yes, Mark Resolved'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Delete Confirmation */}
                  {showDeleteConfirm && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-3">
                      <div className="flex items-start gap-2 text-xs text-red-200">
                        <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                        <span>Are you sure you want to permanently delete this complaint? This action is irreversible.</span>
                      </div>
                      <div className="flex items-center gap-2 self-end">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteIssue}
                          disabled={deleting}
                          className="px-4 py-1.5 bg-red-500 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                        >
                          {deleting ? 'Deleting...' : 'Yes, Permanently Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* AI ANALYSIS COMPONENT CARDS */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            {/* Glowing neon bg bubble */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-[#0ea5e9]/5 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="text-[#0ea5e9]" />
              <h2 className="font-display font-bold text-xl text-slate-100">NagarSeva AI Diagnostics</h2>
            </div>

            {/* Diagnosis summary content */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 backdrop-blur-sm">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">AI Synopsis Summary</span>
              <p className="text-xs text-slate-300 leading-relaxed mt-1.5">{issue.aiSummary || 'Triage summary available upon filing.'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Hazard Level</span>
                <p className="text-sm font-bold text-[#ef4444] mt-1">{issue.severity.toUpperCase()}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Est. Budget Repair</span>
                <p className="text-sm font-bold text-[#10b981] mt-1">{issue.estimatedCost || '₹5,000–₹12,000'}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Dispatch Urgency</span>
                <p className="text-sm font-bold text-slate-100 mt-1">{issue.urgencyScore || 6}/10</p>
              </div>
            </div>

            <div className="bg-[#0ea5e9]/10 border border-[#0ea5e9]/25 rounded-xl p-4 backdrop-blur-sm">
              <h4 className="text-xs font-bold text-[#0ea5e9] uppercase tracking-wider font-display mb-1.5">Suggested Technical Redress</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{issue.suggestedAction || 'Deploy specialized zone team.'}</p>
            </div>

            {issue.potentialImpact && (
              <div className="mt-4 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-4 backdrop-blur-sm">
                <h4 className="text-xs font-bold text-[#ef4444] uppercase tracking-wider font-display mb-1.5">Potential Public Hazard If Ignored</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{issue.potentialImpact}</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: MAPS, CHATS, AND BANNER GENERATOR (1/3 width) */}
        <div className="flex flex-col gap-6">
          {/* Static mini map */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
              <MapPin size={12} className="text-[#0ea5e9]" />
              <span>Location Context Map</span>
            </h3>
            <div className="h-44 w-full rounded-xl overflow-hidden border border-[#334155] mb-2.5">
              <MapContainer
                center={[issue.location.lat, issue.location.lng]}
                zoom={15}
                zoomControl={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; OSM'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[issue.location.lat, issue.location.lng]} icon={createCustomMarker('#ef4444')} />
              </MapContainer>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed text-left font-mono">
              {issue.location.address}
            </p>
          </div>

          {/* AI AWARENESS POSTER BANNER GENERATOR */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 rounded-bl-full pointer-events-none" />

            <h3 className="text-sm font-display font-bold text-slate-100 mb-2 flex items-center gap-1.5">
              <Image className="text-[#10b981]" size={18} />
              <span>Citizen Banner Generator</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 font-sans leading-relaxed">
              Create and share a customized community awareness campaign poster for this issue using the Gemini Image Generator model.
            </p>

            <div className="flex flex-col gap-3 mb-4">
              {/* Aspect Ratio choice */}
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Canvas Aspect Ratio</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="text-xs bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-slate-300"
                >
                  <option value="16:9">Horizontal (16:9)</option>
                  <option value="1:1">Square Poster (1:1)</option>
                  <option value="9:16">Mobile Story (9:16)</option>
                  <option value="4:3">Classic Screen (4:3)</option>
                </select>
              </div>

              {/* Topic text */}
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Campaign Slogan / Heading</span>
                <textarea
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Save Indiranagar's Water Lines!"
                  className="text-xs bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-slate-300 resize-none font-sans"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateBanner}
              disabled={generatingBanner || !topic.trim()}
              className="w-full bg-[#10b981] hover:bg-[#10b981]/90 text-[#0f172a] font-bold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#10b981]/15 disabled:opacity-50"
            >
              {generatingBanner ? (
                <>
                  <RefreshCw className="animate-spin" size={14} />
                  <span>Gemini is generating image...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate Awareness Poster</span>
                </>
              )}
            </button>

            {/* Generated Banner preview */}
            {bannerUrl && (
              <div className="mt-5 border border-[#334155] rounded-xl overflow-hidden bg-[#0f172a] p-2 flex flex-col">
                <img src={bannerUrl} alt="Generated Campaign" className="w-full h-auto rounded-lg object-contain max-h-60" />
                <span className="text-[10px] text-slate-500 mt-2 text-center italic font-sans leading-snug">
                  Right-click to download and share!
                </span>
              </div>
            )}
          </div>

          {/* INTERACTIVE COMMENTS FEED */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col flex-grow">
            <h3 className="text-sm font-display font-bold text-slate-100 mb-4">
              Community Discussion ({issue.comments?.length || 0})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex flex-col gap-3 mb-6">
              <input
                type="text"
                placeholder="Your Name (e.g., Rohit S.)"
                required
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                className="text-xs bg-[#0f172a] border border-[#334155] rounded-lg p-2.5"
              />
              <div className="relative">
                <textarea
                  rows={2}
                  placeholder="Share a status update, ask for speedier repair, or verify..."
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="text-xs bg-[#0f172a] border border-[#334155] rounded-lg p-2.5 w-full pr-10 resize-none font-sans"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="absolute right-2.5 bottom-3.5 text-[#0ea5e9] hover:text-[#0ea5e9]/80 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {issue.comments?.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                issue.comments?.map((comment) => (
                  <div key={comment.id} className="bg-white/5 border border-white/10 rounded-xl p-3.5 text-left backdrop-blur-sm">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-sans">
                      <span className="font-bold text-slate-200">{comment.userName}</span>
                      <span className="font-mono text-slate-500 text-[9px]">
                        {new Date(comment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">{comment.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
