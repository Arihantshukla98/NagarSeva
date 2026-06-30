/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, SlidersHorizontal, MapPin, ThumbsUp, AlertCircle, RefreshCw, X } from 'lucide-react';
import { CategoryBadge, SeverityBadge, StatusBadge } from '../components/BadgeComponents';
import { Issue } from '../types';

// Map controller to handle external pan/zoom triggers
function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
}

// Custom Leaflet DivIcon color generator
const createMarkerIcon = (severity: string, isSelected: boolean) => {
  let color = '#3b82f6'; // default blue
  if (severity === 'critical') color = '#ef4444'; // red
  if (severity === 'high') color = '#f59e0b'; // orange
  if (severity === 'medium') color = '#eab308'; // yellow
  if (severity === 'low') color = '#10b981'; // green

  const pulseClass = isSelected ? 'animate-ping' : '';
  const scaleStyle = isSelected ? 'scale-125 z-50' : 'hover:scale-110';

  return L.divIcon({
    html: `<div class="relative flex items-center justify-center ${scaleStyle}" style="transition: all 0.2s ease;">
      ${isSelected ? `<div class="absolute w-10 h-10 bg-[${color}]/25 rounded-full ${pulseClass}" style="border: 2px solid ${color};"></div>` : ''}
      <svg class="w-8 h-8 filter drop-shadow-md" style="color: ${color};" viewBox="0 0 24 24" fill="currentColor" stroke="black" stroke-width="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>`,
    className: 'custom-dashboard-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');

  // Map Controls
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]); // Bangalore Centroid
  const [mapZoom, setMapZoom] = useState(13);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // Fetch all issues on mount
  const fetchIssues = () => {
    setLoading(true);
    fetch('/api/issues?limit=100')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.issues) {
          setIssues(data.issues);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching dashboard issues:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // Filter computations on clientside
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      search.trim() === '' ||
      issue.title.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase()) ||
      issue.location.address.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = category === 'all' || issue.category === category;
    const matchesSeverity = severity === 'all' || issue.severity === severity;
    const matchesStatus = status === 'all' || issue.status === status;

    return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
  });

  const handleCardClick = (issue: Issue) => {
    setMapCenter([issue.location.lat, issue.location.lng]);
    setMapZoom(16);
    setSelectedIssueId(issue.id);
  };

  const handleMarkerClick = (issue: Issue) => {
    setSelectedIssueId(issue.id);
  };

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setSeverity('all');
    setStatus('all');
  };

  const categoriesList = [
    { id: 'all', label: 'All Categories' },
    { id: 'pothole', label: '🕳 Potholes' },
    { id: 'water', label: '💧 Water' },
    { id: 'streetlight', label: '💡 Streetlights' },
    { id: 'garbage', label: '🗑 Garbage' },
    { id: 'drainage', label: '🌊 Drainage' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col md:flex-row h-[92vh] overflow-hidden"
    >
      {/* LEFT SIDE: MAP VISUALIZATION */}
      <div className="w-full md:w-3/5 h-[40vh] md:h-full relative border-r border-[#334155]/60">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController center={mapCenter} zoom={mapZoom} />

          {/* Render markers */}
          {filteredIssues.map((issue) => (
            <Marker
              key={issue.id}
              position={[issue.location.lat, issue.location.lng]}
              icon={createMarkerIcon(issue.severity, selectedIssueId === issue.id)}
              eventHandlers={{
                click: () => handleMarkerClick(issue)
              }}
            >
              <Popup>
                <div className="w-64 flex flex-col font-sans text-slate-100 select-none">
                  {issue.imageUrl && (
                    <img
                      src={issue.imageUrl}
                      alt={issue.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-24 object-cover rounded-lg mb-2.5"
                      onError={(e: any) => {
                        e.target.src = 'https://images.unsplash.com/photo-1594818856205-5022f49479a3?q=80&w=800';
                      }}
                    />
                  )}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <CategoryBadge category={issue.category} />
                    <SeverityBadge severity={issue.severity} />
                  </div>
                  <h4 className="font-bold text-sm text-slate-50 line-clamp-1 mb-1">{issue.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{issue.description}</p>
                  
                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-700 text-xs">
                    <div className="flex items-center gap-1 text-[#0ea5e9] font-semibold">
                      <ThumbsUp size={12} />
                      <span>{issue.votes} Votes</span>
                    </div>
                    <button
                      onClick={() => navigate(`/issue/${issue.id}`)}
                      className="text-[#0ea5e9] hover:underline font-bold text-[11px]"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating status counter */}
        <div className="absolute bottom-4 left-4 z-40 bg-[#1e293b]/50 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl font-mono text-[10px] text-slate-300 hidden sm:flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
            <span>CRITICAL: {issues.filter(i => i.severity === 'critical' && i.status !== 'resolved').length}</span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
            <span>HIGH: {issues.filter(i => i.severity === 'high' && i.status !== 'resolved').length}</span>
          </div>
          <div className="w-px h-3 bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
            <span>RESOLVED: {issues.filter(i => i.status === 'resolved').length}</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: SEARCH AND FILTER WORKFLOW */}
      <div className="w-full md:w-2/5 h-[50vh] md:h-full bg-[#1e293b]/35 backdrop-blur-lg border-l border-white/10 flex flex-col overflow-hidden">
        {/* Top Header Filters bar */}
        <div className="p-5 border-b border-white/10 flex flex-col gap-4 bg-white/5 shrink-0">
          {/* Search Row */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search issues, addresses, keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs text-slate-200 bg-[#0f172a] border border-[#334155] rounded-lg"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filters Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Severity filter */}
            <div className="flex flex-col">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Severity</span>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="text-xs py-2 px-3 bg-[#0f172a] border border-[#334155] text-slate-300 rounded-lg outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col">
              <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1">Workflow Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="text-xs py-2 px-3 bg-[#0f172a] border border-[#334155] text-slate-300 rounded-lg outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="reported">Reported</option>
                <option value="verified">Verified</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Category sliders list */}
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none shrink-0 border-t border-[#334155]/30 pt-3">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-full shrink-0 font-medium border transition-colors ${
                  category === cat.id
                    ? 'bg-[#0ea5e9] text-[#0f172a] border-[#0ea5e9] font-bold'
                    : 'bg-[#0f172a]/60 text-slate-400 border-[#334155]/60 hover:border-slate-500'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Issue Cards vertical feed */}
        <div className="flex-grow overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-2">
            <span>SHOWING {filteredIssues.length} RECORDS</span>
            {(search || category !== 'all' || severity !== 'all' || status !== 'all') && (
              <button onClick={resetFilters} className="text-[#0ea5e9] hover:underline flex items-center gap-1 font-bold">
                Clear Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl h-28 animate-pulse" />
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
              <AlertCircle className="text-slate-500 mx-auto mb-2" size={28} />
              <p className="text-sm font-semibold text-slate-400">No matching issues found</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the search filters or filing a new report.</p>
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => handleCardClick(issue)}
                className={`p-4 border rounded-xl cursor-pointer flex gap-4 transition-all ${
                  selectedIssueId === issue.id
                    ? 'bg-[#0ea5e9]/10 border-[#0ea5e9] shadow-[0_0_15px_rgba(14,165,233,0.15)] backdrop-blur-md'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm'
                }`}
              >
                {/* Miniature Thumbnail */}
                {issue.imageUrl && (
                  <div className="w-20 h-20 bg-[#0f172a] rounded-lg overflow-hidden shrink-0">
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
                )}

                <div className="flex flex-col flex-grow text-left">
                  <div className="flex items-center gap-1.5 mb-1">
                    <SeverityBadge severity={issue.severity} />
                    <StatusBadge status={issue.status as any} />
                  </div>

                  <h4 className="font-display font-bold text-sm text-slate-100 line-clamp-1 leading-tight group-hover:text-[#0ea5e9] transition-colors">
                    {issue.title}
                  </h4>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1.5">
                    <MapPin size={12} className="text-[#0ea5e9] shrink-0" />
                    <span className="line-clamp-1">{issue.location.address}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2.5 pt-2 border-t border-[#334155]/40">
                    <span className="text-[#0ea5e9] font-bold flex items-center gap-1">
                      <ThumbsUp size={11} /> {issue.votes} Votes
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/issue/${issue.id}`);
                      }}
                      className="text-slate-400 hover:text-slate-100 font-bold"
                    >
                      Full Details →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
