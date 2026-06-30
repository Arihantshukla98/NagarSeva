/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, Award, Sparkles, Plus, MapPin, ArrowRight, Star, Shield } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch users list from backend API
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data) => {
        setUsers(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching leaderboard users:', err);
        setLoading(false);
      });
  }, []);

  // Regional Subdivision engagement stats
  const ENGAGEMENT_DATA = [
    { neighborhood: 'Indiranagar', points: 4280, color: '#0ea5e9' },
    { neighborhood: 'Koramangala', points: 3850, color: '#6366f1' },
    { neighborhood: 'HSR Layout', points: 3120, color: '#10b981' },
    { neighborhood: 'MG Road Area', points: 2640, color: '#f59e0b' },
    { neighborhood: 'Shivaji Nagar', points: 1980, color: '#ef4444' },
  ];

  const getBadgeLabel = (badge: string) => {
    switch (badge) {
      case 'nagar_seva_legend':
        return { label: '🏆 City Legend', style: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' };
      case 'hero_reporter':
        return { label: '📣 Hero Reporter', style: 'bg-sky-500/10 text-sky-400 border-sky-500/20' };
      case 'community_eye':
        return { label: '👁 Community Eye', style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
      case 'pioneer_citizen':
        return { label: '🌱 Pioneer Citizen', style: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
      default:
        return { label: '🎖 Contributor', style: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-24">
        <LoadingSpinner message="Opening Citizens Hall of Fame..." subMessage="Calculating engagement quotients, verifying points ledgers, loading badges..." />
      </div>
    );
  }

  // Split top 3 and runner-ups
  const podiums = users.slice(0, 3);
  const runners = users.slice(3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-7xl mx-auto px-4 md:px-8 py-10"
    >
      {/* Header section */}
      <div className="text-center mb-12 select-none">
        <span className="text-xs font-bold font-mono text-[#0ea5e9] uppercase tracking-wider">CIVIC HALL OF FAME</span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-slate-50 mt-1">NagarSeva Citizens Leaderboard</h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto mt-3 font-sans leading-relaxed">
          Active residents accumulate points by reporting verifiable municipal faults (+50 pts), upvoting/validating neighborhood issues (+5 pts), and earning official resolutions (+100 pts).
        </p>
      </div>

      {/* PODIUM DISPLAY: TOP 3 RANKERS */}
      {podiums.length >= 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end max-w-4xl mx-auto mb-16 px-4">
          
          {/* Rank 2 - Silver (Shown Left) */}
          <div className="order-2 sm:order-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center relative flex flex-col items-center h-[240px] justify-center shadow-lg">
            <div className="absolute top-0 inset-x-0 h-1 bg-slate-400" />
            <div className="w-14 h-14 rounded-full bg-slate-700 border-2 border-slate-400 flex items-center justify-center font-bold text-lg text-slate-300 relative mb-4">
              {podiums[1].name.substring(0, 2).toUpperCase()}
              <div className="absolute -top-3 -right-2 bg-slate-400 text-[#0f172a] rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs border border-[#1e293b]">2</div>
            </div>
            <h3 className="font-display font-bold text-base text-slate-200 line-clamp-1">{podiums[1].name}</h3>
            <span className="text-xs text-slate-400 font-mono mt-1">{podiums[1].points} Points</span>
            <div className="mt-3 inline-flex items-center gap-1 bg-slate-400/10 border border-slate-400/25 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              🥈 Silver Rank
            </div>
          </div>

          {/* Rank 1 - Gold (Shown Middle, Elevated) */}
          <div className="order-1 sm:order-2 bg-white/10 backdrop-blur-md border-2 border-[#0ea5e9] rounded-2xl p-8 text-center relative flex flex-col items-center h-[280px] justify-center shadow-2xl shadow-[#0ea5e9]/10">
            <div className="absolute -top-4 bg-[#0ea5e9] text-[#0f172a] font-black text-xs px-4 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
              <Trophy size={12} className="fill-[#0f172a]" />
              <span>CHAMPION</span>
            </div>
            <div className="w-20 h-20 rounded-full bg-yellow-500 border-4 border-[#0ea5e9] flex items-center justify-center font-bold text-2xl text-[#0f172a] relative mb-4 shadow-xl shadow-[#0ea5e9]/10">
              {podiums[0].name.substring(0, 2).toUpperCase()}
              <div className="absolute -top-3 -right-2 bg-[#0ea5e9] text-[#0f172a] rounded-full w-7 h-7 flex items-center justify-center font-bold text-sm border-2 border-[#1e293b]">1</div>
            </div>
            <h3 className="font-display font-bold text-lg text-slate-100 line-clamp-1">{podiums[0].name}</h3>
            <span className="text-sm text-slate-400 font-mono font-bold mt-1 text-[#0ea5e9]">{podiums[0].points} Points</span>
            <div className="mt-4 inline-flex items-center gap-1 bg-[#0ea5e9]/10 border border-[#0ea5e9]/25 text-[#0ea5e9] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              🏆 Gold Rank
            </div>
          </div>

          {/* Rank 3 - Bronze (Shown Right) */}
          <div className="order-3 sm:order-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center relative flex flex-col items-center h-[220px] justify-center shadow-lg">
            <div className="absolute top-0 inset-x-0 h-1 bg-[#b45309]" />
            <div className="w-14 h-14 rounded-full bg-amber-900 border-2 border-[#b45309] flex items-center justify-center font-bold text-lg text-[#f59e0b] relative mb-4">
              {podiums[2].name.substring(0, 2).toUpperCase()}
              <div className="absolute -top-3 -right-2 bg-[#b45309] text-slate-100 rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs border border-[#1e293b]">3</div>
            </div>
            <h3 className="font-display font-bold text-base text-slate-200 line-clamp-1">{podiums[2].name}</h3>
            <span className="text-xs text-slate-400 font-mono mt-1">{podiums[2].points} Points</span>
            <div className="mt-3 inline-flex items-center gap-1 bg-[#b45309]/10 border border-[#b45309]/25 text-[#f59e0b] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              🥉 Bronze Rank
            </div>
          </div>

        </div>
      )}

      {/* Main Grid: runners list & Neighborhood analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left items-start">
        {/* RUNNERS UP TABLE (2/3 width) */}
        <div className="lg:col-span-2 bg-[#1e293b]/30 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-slate-50">Citizens Honor Board</h3>
            <span className="text-[10px] font-mono text-slate-400 uppercase">Ranks 4 - 20</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-[10px] uppercase font-mono text-slate-500 bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Citizen</th>
                  <th className="px-4 py-4">Earned Badges</th>
                  <th className="px-4 py-4 text-center">Reports</th>
                  <th className="px-6 py-4 text-right">Civic Score</th>
                </tr>
              </thead>
              <tbody>
                {runners.map((user, idx) => (
                  <tr key={user.id} className="border-b border-[#334155]/40 hover:bg-[#0f172a]/20">
                    <td className="px-6 py-4 font-mono font-bold text-slate-400">
                      #{idx + 4}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#6366f1]/25 border border-[#6366f1]/35 flex items-center justify-center font-bold text-xs text-slate-200 uppercase">
                          {user.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200">{user.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Verified {user.issuesVerified} times</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.badges.slice(0, 2).map((b: string) => {
                          const conf = getBadgeLabel(b);
                          return (
                            <span key={b} className={`text-[9px] font-semibold px-2 py-0.5 border rounded-full uppercase ${conf.style}`}>
                              {conf.label}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-xs text-slate-400">
                      {user.issuesReported}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-[#0ea5e9]">
                      {user.points} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* REGIONAL NEIGHBORHOOD ENGAGEMENT SCORES (1/3 width) */}
        <div className="flex flex-col gap-6">
          {/* Recharts Bar card */}
          <div className="bg-[#1e293b]/30 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl select-none">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <MapPin size={12} className="text-[#0ea5e9]" />
              <span>Zone Engagement Quotas</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6 font-sans leading-relaxed">
              Subdivision points represent sum-totals of citizen participation reports filed per neighborhood ward.
            </p>

            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ENGAGEMENT_DATA} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke-opacity="0.1" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" />
                  <YAxis dataKey="neighborhood" type="category" stroke="#94a3b8" width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                  <Bar dataKey="points" radius={[0, 4, 4, 0]}>
                    {ENGAGEMENT_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Call to Participate */}
          <div className="bg-gradient-to-br from-[#0ea5e9]/10 to-[#6366f1]/10 border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#0ea5e9]/5 rounded-bl-full pointer-events-none" />
            <h4 className="font-display font-bold text-base text-slate-100 mb-2 flex items-center gap-1.5">
              <Star className="text-yellow-400 fill-yellow-400/20" size={18} />
              <span>Climb the Ranks!</span>
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed font-sans mb-5">
              Are you seeing public waste overflow, street cracks, or pipe leaks in your local street block? Report them today and kickstart your rank!
            </p>
            <button
              onClick={() => navigate('/report')}
              className="w-full bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-[#0f172a] font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1"
            >
              <span>File a Civic Report</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
