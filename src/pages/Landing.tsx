/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, ShieldCheck, Zap, UserCheck, Flame, ArrowRight, Layers, Sparkles, Box, LayoutGrid } from 'lucide-react';
import Galaxy from '../components/Galaxy';
import IssueCard from '../components/IssueCard';
import InfiniteMenu from '../components/InfiniteMenu';
import { Issue } from '../types';

// Simple count up hook
function useCountUp(target: number, duration: number = 2000, trigger: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const end = target;
    if (start === end) return;

    const totalMiliseconds = duration;
    const incrementTime = Math.abs(Math.floor(totalMiliseconds / end));

    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) {
        clearInterval(timer);
      }
    }, incrementTime || 1);

    return () => clearInterval(timer);
  }, [target, duration, trigger]);

  return count;
}

export default function Landing() {
  const navigate = useNavigate();
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'3d' | 'grid'>('3d');
  const [stats, setStats] = useState({
    total: 1247,
    resolved: 892,
    criticalOpen: 14,
    avgResolutionDays: 14,
  });

  // Fetch recent issues
  useEffect(() => {
    fetch('/api/issues?limit=6')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.issues) {
          setRecentIssues(data.issues);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching recent issues:', err);
        setLoading(false);
      });

    fetch('/api/issues/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setStats({
            total: data.total || 1247,
            resolved: data.resolved || 892,
            criticalOpen: data.criticalOpen || 14,
            avgResolutionDays: data.avgResolutionDays || 14,
          });
        }
      })
      .catch((e) => console.error('Error fetching stats:', e));
  }, []);

  // Animated counters
  const totalCount = useCountUp(stats.total, 1200);
  const resolvedCount = useCountUp(stats.resolved, 1200);
  const avgDaysCount = useCountUp(stats.avgResolutionDays, 1200);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#0f172a]"
    >
      {/* 1. Hero Section */}
      <section className="relative min-h-[92vh] flex flex-col justify-center overflow-hidden bg-[#0f172a] px-4 md:px-8 border-b border-[#334155]/45">
        {/* Galaxy star field container */}
        <div className="absolute inset-0 z-0">
          <Galaxy
            mouseRepulsion={true}
            mouseInteraction={true}
            density={1.5}
            glowIntensity={0.65}
            saturation={0.9}
            hueShift={220}
            twinkleIntensity={0.5}
            rotationSpeed={0.06}
            speed={0.8}
            transparent={true}
          />
        </div>

        {/* Ambient top and bottom gradient fades */}
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-[#0f172a]/20 via-[#0f172a]/70 to-[#0f172a] pointer-events-none" />

        <div className="relative z-20 max-w-5xl mx-auto text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0ea5e9]/10 border border-[#0ea5e9]/25 text-xs text-[#0ea5e9] font-semibold uppercase tracking-wider mb-8 shadow-[0_0_15px_rgba(14,165,233,0.1)]"
          >
            <Sparkles size={14} className="fill-[#0ea5e9]/20" />
            <span>AI-Powered Civic Platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="font-display font-bold text-4xl sm:text-6xl md:text-7xl text-slate-50 tracking-tight leading-[1.1] mb-6 max-w-4xl"
          >
            Empower Your City with <span className="text-[#0ea5e9] drop-shadow-[0_0_30px_rgba(14,165,233,0.15)]">NagarSeva</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-base sm:text-xl text-slate-400 max-w-2xl font-sans mb-10 leading-relaxed"
          >
            Report public infrastructure issues. Our Gemini AI automatically routes, categorizes, and tracks tickets to fast-track municipal resolution.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-16"
          >
            <button
              onClick={() => navigate('/report')}
              className="w-full sm:w-auto bg-[#0ea5e9] hover:bg-[#0ea5e9]/95 text-[#0f172a] font-bold text-base px-8 py-4 rounded-xl shadow-[0_8px_20px_rgba(14,165,233,0.35)] hover:scale-[1.03] transition-all duration-200"
            >
              Report an Issue →
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full sm:w-auto bg-[#1e293b] hover:bg-[#334155] text-slate-200 font-semibold text-base px-8 py-4 rounded-xl border border-[#334155] hover:border-slate-500/55 transition-all duration-200"
            >
              View Live Map
            </button>
          </motion.div>

          {/* Real-time stats bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl border border-white/10 bg-white/5 backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-2xl"
          >
            <div className="flex flex-col text-center border-r border-[#334155]/50 md:last:border-none">
              <span className="text-3xl font-display font-bold text-slate-50">{totalCount}</span>
              <span className="text-xs text-slate-400 mt-1 uppercase font-semibold">Issues Filed</span>
            </div>
            <div className="flex flex-col text-center md:border-r border-[#334155]/50 last:border-none">
              <span className="text-3xl font-display font-bold text-[#10b981]">{resolvedCount}</span>
              <span className="text-xs text-slate-400 mt-1 uppercase font-semibold">Resolved</span>
            </div>
            <div className="flex flex-col text-center border-r border-[#334155]/50 last:border-none">
              <span className="text-3xl font-display font-bold text-[#ef4444]">{stats.criticalOpen}</span>
              <span className="text-xs text-slate-400 mt-1 uppercase font-semibold">Active Critical</span>
            </div>
            <div className="flex flex-col text-center last:border-none">
              <span className="text-3xl font-display font-bold text-[#f59e0b]">{avgDaysCount} Days</span>
              <span className="text-xs text-slate-400 mt-1 uppercase font-semibold">Avg Repair Time</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. How It Works Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          <span className="text-xs font-bold text-[#0ea5e9] uppercase tracking-wider">Simple Steps</span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-slate-50 mt-1">How NagarSeva Transforms Cities</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 md:p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#0ea5e9]/5 rounded-bl-full pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-[#0ea5e9]/10 text-[#0ea5e9] flex items-center justify-center mb-6 font-bold text-xl font-mono">
              01
            </div>
            <h3 className="font-display font-bold text-xl text-slate-100 mb-3">Snap & Upload</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Take a photo of any civic issue (pothole, leakage, trash) on our platform. NagarSeva automatically grabs your exact GPS coordinates.
            </p>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#6366f1]/5 rounded-bl-full pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-[#6366f1]/10 text-[#6366f1] flex items-center justify-center mb-6 font-bold text-xl font-mono">
              02
            </div>
            <h3 className="font-display font-bold text-xl text-slate-100 mb-3">Gemini AI Analysis</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              The AI automatically categorizes the issue, determines its hazard level, drafts actionable repairs, and flags duplicates within 150 meters.
            </p>
          </div>

          <div className="p-6 md:p-8 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 relative overflow-hidden group shadow-lg">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 rounded-bl-full pointer-events-none" />
            <div className="w-12 h-12 rounded-xl bg-[#10b981]/10 text-[#10b981] flex items-center justify-center mb-6 font-bold text-xl font-mono">
              03
            </div>
            <h3 className="font-display font-bold text-xl text-slate-100 mb-3">Civic Dispatch</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tickets route immediately to municipal zones. Residents upvote problems, and authorities log status updates live for everyone to see.
            </p>
          </div>
        </div>
      </section>      {/* 3. Live Feed Section */}
      <section className="py-16 bg-[#1e293b]/40 border-y border-[#334155]/60">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold text-[#10b981] uppercase tracking-wider">Real-time Activity</span>
              <h2 className="font-display font-bold text-3xl text-slate-50 mt-1">Live Civic Feed</h2>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              {/* Layout Switcher Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-[#334155]/60 rounded-xl">
                <button
                  onClick={() => setViewMode('3d')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === '3d'
                      ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/25'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <Box size={14} />
                  <span>3D Sphere Orbit</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/25'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <LayoutGrid size={14} />
                  <span>Grid List</span>
                </button>
              </div>

              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0ea5e9] hover:underline cursor-pointer"
              >
                <span>Explore Dashboard Map</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="bg-[#1e293b] rounded-2xl h-80 animate-pulse border border-[#334155]/60" />
              ))}
            </div>
          ) : viewMode === '3d' ? (
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-[#111827] to-[#0f172a] border border-[#334155]/40 shadow-2xl p-4 md:p-6 flex flex-col items-center justify-center min-h-[500px]">
              {/* Outer visual frame decoration */}
              <div className="absolute top-4 left-4 z-20 pointer-events-none hidden md:block">
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900/80 border border-white/5 text-[10px] font-mono text-slate-400 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                  <span>INTERACTIVE HOLOGRAPHIC SPHERE</span>
                </div>
              </div>

              <div className="absolute bottom-4 right-4 z-20 pointer-events-none hidden md:block">
                <p className="text-[10px] font-mono text-slate-500">
                  ⚡ DRAG TO ROTATE • SCROLL TO ZOOM
                </p>
              </div>

              {/* WebGL Component Container */}
              <div className="w-full h-[520px] relative">
                <InfiniteMenu 
                  items={recentIssues.map((issue) => {
                    const originalUrl = issue.imageUrl || 'https://images.unsplash.com/photo-1594818856205-5022f49479a3?q=80&w=800';
                    const isExternal = originalUrl.startsWith('http://') || originalUrl.startsWith('https://');
                    const proxiedUrl = isExternal ? `/api/proxy-image?url=${encodeURIComponent(originalUrl)}` : originalUrl;
                    return {
                      image: proxiedUrl,
                      link: `/issue/${issue.id}`,
                      title: issue.title,
                      description: `${issue.category.toUpperCase()} • ${issue.location.address}`
                    };
                  })}
                  scale={1.0}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentIssues.slice(0, 6).map((issue, idx) => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                >
                  <IssueCard issue={issue} onClick={() => navigate(`/issue/${issue.id}`)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Join as Authority Section */}
      <section className="py-20 max-w-7xl mx-auto px-4 md:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 md:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#0ea5e9]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl text-left">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#0ea5e9] font-bold uppercase tracking-wider mb-3">
              <ShieldCheck size={14} />
              <span>Municipal Authority Hub</span>
            </span>
            <h2 className="font-display font-bold text-3xl text-slate-50 mb-4 tracking-tight leading-snug">
              Are you a municipal officer or local commissioner?
            </h2>
            <p className="text-sm text-slate-400 font-sans leading-relaxed">
              Log into the NagarSeva Officer Room using your district credentials. Manage active tickets, review Gemini AI-driven regional cluster analysis, generate charts, and dispatch repair crews instantly.
            </p>
          </div>

          <button
            onClick={() => navigate('/authority')}
            className="shrink-0 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-[#0f172a] font-bold text-base px-8 py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Enter Officer Room →
          </button>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="border-t border-[#334155]/60 bg-[#0f172a] py-12 px-4 md:px-8 text-center text-slate-500 text-xs font-sans">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-2">
            <div className="bg-[#0ea5e9] p-1.5 rounded text-[#0f172a]">
              <AlertTriangle className="fill-[#0f172a]" size={14} />
            </div>
            <span className="font-display font-bold text-lg text-slate-100">
              Nagar<span className="text-[#0ea5e9]">Seva</span>
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-[#0ea5e9]">Terms of Service</Link>
            <Link to="/dashboard" className="hover:text-[#0ea5e9]">Regional Maps</Link>
            <Link to="/leaderboard" className="hover:text-[#0ea5e9]">Citizens Hall</Link>
            <Link to="/authority" className="hover:text-[#0ea5e9]">Municipal Auth</Link>
          </div>
        </div>
        <p className="text-slate-600">
          NagarSeva — Powered by Gemini 3.5 & Google Cloud Vertex. Developed with passion for better public infrastructure.
        </p>
      </footer>
    </motion.div>
  );
}
