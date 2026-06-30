/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ShieldAlert, LogIn, Lock, CheckCircle, Clock, RotateCw, Sparkles, Send, RefreshCw, Layers } from 'lucide-react';
import { SeverityBadge, StatusBadge } from '../components/BadgeComponents';
import { Issue } from '../types';
import { createNotification } from '../lib/notifications';

export default function Authority() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Queue and Stats
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Status Change Modal
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [statusInput, setStatusInput] = useState('reported');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Completion photo & Gemini AI tracking
  const [resolvedFile, setResolvedFile] = useState<File | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    confidence: number;
    analysis: string;
    imageUrl?: string;
  } | null>(null);

  // AI Chat states
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'officer' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Welcome Commissioner. I am your NagarSeva AI Planning Advisor. How can I help you optimize resource dispatches, coordinate sanitation schedules, or assess road repairs today?' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    // Check if previously logged in this session
    const auth = sessionStorage.getItem('nagar_seva_officer_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchOfficerData();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === 'bbmp2026') {
      sessionStorage.setItem('nagar_seva_officer_auth', 'true');
      setIsAuthenticated(true);
      fetchOfficerData();
    } else {
      setLoginError('Invalid municipal key password credentials. Access denied.');
    }
  };

  const fetchOfficerData = async () => {
    setLoading(true);
    try {
      const qRes = await fetch('/api/issues?limit=100');
      const qData = await qRes.json();
      if (qRes.ok) {
        setIssues(qData.issues || []);
      }

      const sRes = await fetch('/api/issues/stats');
      const sData = await sRes.json();
      if (sRes.ok) {
        setStats(sData);
      }
    } catch (e) {
      console.error('Error fetching officer dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  // Status submission
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusInput,
          notes: resolutionNotes,
          resolvedBy: 'BBMP Zone Officer',
          resolvedImageUrl: verificationResult?.imageUrl || '',
          resolvedVerificationResult: verificationResult ? (verificationResult.valid ? 'valid' : 'invalid') : 'unchecked',
          resolvedVerificationNotes: verificationResult?.analysis || ''
        })
      });
      if (res.ok) {
        // Trigger real-time notifications in Firestore
        try {
          // 1. Notify reporter
          if (selectedIssue.reportedBy) {
            await createNotification(
              selectedIssue.reportedBy,
              selectedIssue.id,
              selectedIssue.title,
              `Your reported issue "${selectedIssue.title}" status has been updated to ${statusInput.replace('_', ' ').toUpperCase()}.`,
              'status_change',
              selectedIssue.status,
              statusInput
            );
          }

          // 2. Notify voters if the issue was resolved
          if (statusInput === 'resolved' && selectedIssue.votedUsers) {
            for (const voterId of selectedIssue.votedUsers) {
              if (voterId !== selectedIssue.reportedBy) {
                await createNotification(
                  voterId,
                  selectedIssue.id,
                  selectedIssue.title,
                  `An issue you voted on: "${selectedIssue.title}" has been resolved!`,
                  'voted_resolved',
                  selectedIssue.status,
                  statusInput
                );
              }
            }
          }
        } catch (notifErr) {
          console.error('Failed to create real-time notifications:', notifErr);
        }

        setSelectedIssue(null);
        setResolutionNotes('');
        fetchOfficerData();
      } else {
        alert('Failed to update status.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdating(false);
    }
  };

  // AI advisor chat
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatLog((prev) => [...prev, { sender: 'officer', text: userMessage }]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });
      const data = await res.json();
      setChatLog((prev) => [...prev, { sender: 'ai', text: data.text }]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatLog((prev) => [...prev, { sender: 'ai', text: 'Error executing reasoning models. Check internet link.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Format chart data based on loaded issues
  const getChartData = () => {
    if (!issues.length) return [];
    const categories: Record<string, number> = {
      potholes: 0,
      water: 0,
      streetlights: 0,
      garbage: 0,
      drainage: 0
    };
    issues.forEach((i) => {
      if (i.category === 'pothole') categories.potholes++;
      else if (i.category === 'water') categories.water++;
      else if (i.category === 'streetlight') categories.streetlights++;
      else if (i.category === 'garbage') categories.garbage++;
      else if (i.category === 'drainage') categories.drainage++;
    });

    return [
      { name: 'Potholes', count: categories.potholes, color: '#f59e0b' },
      { name: 'Water Leaks', count: categories.water, color: '#0ea5e9' },
      { name: 'Streetlights', count: categories.streetlights, color: '#eab308' },
      { name: 'Garbage pile', count: categories.garbage, color: '#10b981' },
      { name: 'Drainage blocks', count: categories.drainage, color: '#6366f1' }
    ];
  };

  const getPieData = () => {
    if (!issues.length) return [];
    const statusCounts: Record<string, number> = {
      reported: 0,
      verified: 0,
      in_progress: 0,
      resolved: 0
    };
    issues.forEach((i) => {
      if (statusCounts[i.status] !== undefined) {
        statusCounts[i.status]++;
      }
    });

    return [
      { name: 'Reported', value: statusCounts.reported, color: '#64748b' },
      { name: 'Verified', value: statusCounts.verified, color: '#6366f1' },
      { name: 'In Progress', value: statusCounts.in_progress, color: '#f59e0b' },
      { name: 'Resolved', value: statusCounts.resolved, color: '#10b981' }
    ];
  };

  const COLORS = ['#64748b', '#6366f1', '#f59e0b', '#10b981'];

  // PASSWORD GATE PRE-RENDER
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-center backdrop-blur-md"
        >
          <div className="absolute top-0 inset-x-0 h-1.5 bg-[#0ea5e9]" />
          
          <div className="w-14 h-14 bg-[#0ea5e9]/10 rounded-full flex items-center justify-center text-[#0ea5e9] mx-auto mb-6">
            <Lock size={24} />
          </div>

          <h2 className="font-display font-bold text-2xl text-slate-50 mb-1">BBMP District Officer Gate</h2>
          <p className="text-xs text-slate-400 font-sans mb-8">
            Access to this portal is restricted to municipal inspectors. Provide the portal key.
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col text-left">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Portal Security Key Password
              </label>
              <input
                type="password"
                required
                placeholder="Enter key (bbmp2026 for hackathon evaluation)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setLoginError('');
                }}
                className="w-full text-sm"
              />
            </div>

            {loginError && (
              <p className="text-xs text-red-500 font-semibold bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-[#0ea5e9] hover:bg-[#0ea5e9]/95 text-[#0f172a] font-bold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all mt-3"
            >
              <LogIn size={16} />
              <span>Verify District Portal</span>
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-4 md:px-8 py-8"
    >
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-[#334155]/60 pb-6">
        <div>
          <span className="text-xs font-bold font-mono text-[#0ea5e9] uppercase tracking-wider">MUNICIPAL DESK CONTROL PANEL</span>
          <h1 className="font-display font-bold text-3xl text-slate-50 mt-1">NagarSeva Authority Portal</h1>
        </div>
        <button
          onClick={fetchOfficerData}
          className="flex items-center gap-1.5 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg"
        >
          <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Synchronize Queue</span>
        </button>
      </div>

      {/* KPI Counters */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 select-none">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Unassigned Tasks</span>
              <p className="text-2xl font-bold text-slate-50 mt-1">{issues.filter(i => i.status === 'reported').length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#334155] flex items-center justify-center text-slate-300">
              <Clock size={18} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Critical</span>
              <p className="text-2xl font-bold text-[#ef4444] mt-1">{stats.criticalOpen}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#ef4444]/10 flex items-center justify-center text-[#ef4444]">
              <ShieldAlert size={18} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">In Progress Repairs</span>
              <p className="text-2xl font-bold text-[#f59e0b] mt-1">{issues.filter(i => i.status === 'in_progress').length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#f59e0b]/10 flex items-center justify-center text-[#f59e0b]">
              <RotateCw size={18} />
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Resolved Tickets</span>
              <p className="text-2xl font-bold text-[#10b981] mt-1">{stats.resolved}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
              <CheckCircle size={18} />
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10 select-none">
        {/* Bar Chart breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur-md">
          <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-4">Issue Breakdown by Category</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getChartData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke-opacity="0.1" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart breakdown */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg backdrop-blur-md">
          <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-4">Resolution Status Composition</h3>
          <div className="h-64 w-full flex items-center justify-center text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPieData()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {getPieData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Legend formatter={(value) => <span className="text-slate-300 text-xs">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Grid: Data Queue & AI chatbot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT & CENTER: PRIORITY DATA QUEUE TABLE (2/3 width) */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden text-left">
          <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-slate-50">Priority Dispatch Queue</h3>
            <span className="text-[10px] font-mono text-slate-400 uppercase">Interactive Administration</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-[10px] uppercase font-mono text-slate-500 bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Title / Address</th>
                  <th className="px-4 py-4">Assessed Priority</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Cost Est</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs text-slate-500">
                      No active tickets in queue folder.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr key={issue.id} className="border-b border-[#334155]/40 hover:bg-[#0f172a]/20">
                      <td className="px-6 py-4 max-w-[280px]">
                        <div className="font-bold text-slate-200 line-clamp-1">{issue.title}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1 font-mono mt-0.5">{issue.location.address}</div>
                      </td>
                      <td className="px-4 py-4">
                        <SeverityBadge severity={issue.severity} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={issue.status as any} />
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-400">
                        {issue.estimatedCost || '₹5,000'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedIssue(issue);
                            setStatusInput(issue.status);
                            setResolutionNotes(issue.resolutionNotes || '');
                            setResolvedFile(null);
                            setResolvedPreviewUrl('');
                            setVerificationResult(null);
                          }}
                          className="bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/20 rounded-md px-3 py-1.5 text-xs font-bold transition-all"
                        >
                          Update status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: COMMISSIONER PLANNING CHATBOT (1/3 width) */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl flex flex-col h-[520px] overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <Sparkles size={16} className="text-[#0ea5e9]" />
              <span>NagarSeva AI Advisor</span>
            </h3>
            <span className="text-[9px] font-mono text-slate-500 uppercase">Reasoning Mode</span>
          </div>

          {/* Messages block */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 text-left">
            {chatLog.map((message, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  message.sender === 'officer'
                    ? 'ml-auto bg-[#0ea5e9] text-[#0f172a] font-semibold'
                    : 'bg-white/5 text-slate-300 border border-white/10'
                }`}
              >
                {message.text}
              </div>
            ))}
            {chatLoading && (
              <div className="bg-white/5 text-slate-400 text-xs p-3 rounded-xl border border-white/10 flex items-center gap-2 max-w-[80%]">
                <RefreshCw className="animate-spin text-[#0ea5e9]" size={14} />
                <span>AI thoughts reasoning...</span>
              </div>
            )}
          </div>

          {/* Form input */}
          <form onSubmit={handleSendChatMessage} className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
            <input
              type="text"
              required
              placeholder="Ask for dispatch optimization advice..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="text-xs bg-white/5 border border-white/10 rounded-lg p-2.5 flex-grow pr-8 text-slate-200 outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              className="bg-[#0ea5e9] text-[#0f172a] p-2.5 rounded-lg font-bold disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* STATUS CHANGE UPDATE POPUP MODAL */}
      {selectedIssue && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl overflow-hidden text-left backdrop-blur-md">
            <div className="absolute top-0 inset-x-0 h-1 bg-[#0ea5e9]" />

            <h3 className="font-display font-bold text-lg text-slate-100 mb-2">Update Ticket Status</h3>
            <p className="text-xs text-slate-400 mb-6 font-sans">
              Modify the dispatch state and enter public inspector progress comments.
            </p>

            <form onSubmit={handleUpdateStatus} className="flex flex-col gap-5">
              <div className="flex flex-col">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">Dispatch State</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="text-xs bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-slate-300"
                >
                  <option value="reported">Reported (Initial Triage)</option>
                  <option value="verified">Verified (Inspected)</option>
                  <option value="in_progress">In Progress (Dispatching)</option>
                  <option value="resolved">Resolved (Task Cleared)</option>
                </select>
              </div>

              {statusInput === 'resolved' && (
                <div className="flex flex-col gap-3 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <span className="text-[10px] font-mono font-bold text-slate-300 uppercase flex items-center gap-1">
                    <Sparkles size={11} className="text-[#0ea5e9] animate-pulse" />
                    AI Verification & Completion Photo *
                  </span>

                  {/* Completion Photo Upload Area */}
                  {!resolvedPreviewUrl ? (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-[#0ea5e9]/50 rounded-lg p-5 transition-all cursor-pointer bg-slate-950/40 relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setResolvedFile(file);
                            setResolvedPreviewUrl(URL.createObjectURL(file));
                            setVerificationResult(null);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <svg className="w-7 h-7 text-slate-600 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-400">Click or Drag to Upload Resolution Photo</span>
                      <span className="text-[9px] text-slate-500 mt-0.5">JPEG, PNG or WEBP up to 10MB</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative rounded-lg overflow-hidden border border-slate-800 max-h-36 flex justify-center bg-slate-950">
                        <img src={resolvedPreviewUrl} alt="Completion Preview" className="object-cover h-36 w-full" />
                        <button
                          type="button"
                          onClick={() => {
                            setResolvedFile(null);
                            setResolvedPreviewUrl('');
                            setVerificationResult(null);
                          }}
                          className="absolute top-1.5 right-1.5 bg-red-500/85 hover:bg-red-500 text-white rounded-full p-1 transition-all shadow-md z-20"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Verify button */}
                      {!verificationResult && (
                        <button
                          type="button"
                          disabled={verifying}
                          onClick={async () => {
                            if (!resolvedFile) return;
                            setVerifying(true);
                            try {
                              const formData = new FormData();
                              formData.append('resolvedImage', resolvedFile);
                              const response = await fetch(`/api/issues/${selectedIssue.id}/verify-resolution`, {
                                method: 'POST',
                                body: formData
                              });
                              if (response.ok) {
                                const data = await response.json();
                                setVerificationResult(data);
                              } else {
                                alert('Failed to verify image with Gemini AI.');
                              }
                            } catch (err) {
                              console.error('Error verifying image:', err);
                              alert('Verification failed.');
                            } finally {
                              setVerifying(false);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-slate-950 font-bold py-2.5 px-3 rounded-lg text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {verifying ? (
                            <>
                              <RefreshCw className="animate-spin text-slate-950" size={12} />
                              <span>Gemini AI Inspecting Work...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="text-slate-950 animate-bounce" size={12} />
                              <span>Verify Work with Gemini AI</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Verification results display */}
                      {verificationResult && (
                        <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                          verificationResult.valid 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <div className="flex items-center justify-between font-bold uppercase text-[10px] mb-1.5">
                            <span className="flex items-center gap-1 font-mono">
                              {verificationResult.valid ? '✓ VERIFIED RESOLVED' : '⚠ VERIFICATION WARNING'}
                            </span>
                            <span className="bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-mono">
                              Match: {verificationResult.confidence}%
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 leading-normal">{verificationResult.analysis}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">Official Inspector Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide resolution summary e.g., BBMP sanitation squad cleared 2 tons of commercial food packs. Reinforced fences."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="text-xs bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-slate-300 font-sans resize-none"
                />
              </div>

              {statusInput === 'resolved' && !verificationResult && (
                <p className="text-[10px] text-amber-400 text-center font-medium bg-amber-500/5 border border-amber-500/10 rounded-lg py-1.5 px-2">
                  Please upload a completion photo and trigger Gemini AI verification first.
                </p>
              )}

              {statusInput === 'resolved' && verificationResult && !verificationResult.valid && (
                <p className="text-[10px] text-red-400 text-center font-semibold bg-red-500/5 border border-red-500/15 rounded-lg py-1.5 px-2">
                  ⚠ Image verification failed! The uploaded image does not match or resolve this problem. Status update is blocked.
                </p>
              )}
              
              {statusInput === 'resolved' && verificationResult && verificationResult.valid && (
                <p className="text-[10px] text-emerald-400 text-center font-semibold bg-emerald-500/5 border border-emerald-500/15 rounded-lg py-1.5 px-2 animate-pulse">
                  ✓ Image verified successfully! You may now proceed to resolve this issue.
                </p>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-[#334155]/60">
                <button
                  type="button"
                  onClick={() => setSelectedIssue(null)}
                  className="bg-[#334155] hover:bg-[#334155]/80 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !resolutionNotes.trim() || (statusInput === 'resolved' && (!verificationResult || !verificationResult.valid))}
                  className="bg-[#10b981] hover:bg-[#10b981]/90 text-[#0f172a] font-bold text-xs px-5 py-2.5 rounded-lg flex items-center gap-1 shadow-md shadow-[#10b981]/15 disabled:opacity-50"
                >
                  {updating ? <RefreshCw className="animate-spin" size={12} /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
