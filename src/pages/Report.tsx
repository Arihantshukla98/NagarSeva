/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useMemo, ChangeEvent, DragEvent, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, FileImage, Sparkles, ChevronLeft, ChevronRight, AlertCircle, Info, ThumbsUp, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import SuccessModal from '../components/SuccessModal';
import { useAuth } from '../context/AuthContext';
import { notifyAllUsersAboutNewReport } from '../lib/notifications';

// Draggable Map Event Handler helper
function DraggableMarker({ position, setPosition, setAddress }: { position: [number, number], setPosition: (p: [number, number]) => void, setAddress: (a: string) => void }) {
  const markerRef = useRef<any>(null);
  
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          const newPos: [number, number] = [latLng.lat, latLng.lng];
          setPosition(newPos);
          reverseGeocode(latLng.lat, latLng.lng, setAddress);
        }
      },
    }),
    [setPosition, setAddress]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={createCustomMarker('#0ea5e9')}
    />
  );
}

// Helper to center map automatically on location change
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

// Custom Leaflet DivIcon to avoid broken default marker paths in React
const createCustomMarker = (color: string) => {
  return L.divIcon({
    html: `<div style="color: ${color}; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.5));">
      <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" stroke="black" stroke-width="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>`,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
};

// Reverse geocode via free OSM Nominatim
const reverseGeocode = async (lat: number, lng: number, callback: (addr: string) => void) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept-Language': 'en' }
    });
    const data = await response.json();
    if (data && data.display_name) {
      callback(data.display_name);
    } else {
      callback(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  } catch (err) {
    callback(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
  }
};

const CATEGORIES = [
  { id: 'pothole', icon: '🕳', label: 'Pothole', desc: 'Broken asphalt, deep craters, cracks' },
  { id: 'water', icon: '💧', label: 'Water Leak', desc: 'Pipeline bursts, sewage leakage, flooded lanes' },
  { id: 'streetlight', icon: '💡', label: 'Streetlight', desc: 'Dead bulbs, unsafe dark corridors, broken poles' },
  { id: 'garbage', icon: '🗑', label: 'Garbage', desc: 'Illegal dumping yards, uncollected litter' },
  { id: 'drainage', icon: '🌊', label: 'Drainage', desc: 'Clogged storm blocks, overflowing chambers' },
  { id: 'other', icon: '📋', label: 'Other', desc: 'General road blockages, missing signs' },
];

export default function Report() {
  const navigate = useNavigate();
  const { profile: authProfile, syncProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Form States
  const [coords, setCoords] = useState<[number, number]>([12.9716, 77.5946]); // Bengaluru Center
  const [address, setAddress] = useState('Loading address...');
  const [locLoading, setLocLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('pothole');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // AI Response Results
  const [aiResult, setAiResult] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  useEffect(() => {
    // Reverse geocode on initial mount
    reverseGeocode(coords[0], coords[1], setAddress);

    // Fetch or create a citizen identity inside local storage
    const localUser = localStorage.getItem('nagar_seva_user');
    if (localUser) {
      setProfile(JSON.parse(localUser));
    }
  }, []);

  // Handle fallback IP Geolocation
  const fallbackToIPGeolocation = async () => {
    setLocLoading(true);
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          const ipCoords: [number, number] = [data.latitude, data.longitude];
          setCoords(ipCoords);
          reverseGeocode(ipCoords[0], ipCoords[1], (addr) => {
            setAddress(addr + ' (IP Located)');
            setLocLoading(false);
          });
          return;
        }
      }
    } catch (err) {
      console.error('IP Geolocation fallback failed:', err);
    }
    
    // Ultimate fallback: Bengaluru regional center (highly active Indian tech & civic hub)
    const defaultCoords: [number, number] = [12.9716, 77.5946];
    setCoords(defaultCoords);
    reverseGeocode(defaultCoords[0], defaultCoords[1], (addr) => {
      setAddress('MG Road, Bengaluru, Karnataka, India (Fallback Centered Location)');
      setLocLoading(false);
    });
  };

  // Handle locating the citizen (Triggers actual GPS request after user accepted modal consent)
  const triggerActualGeolocation = () => {
    if (!navigator.geolocation) {
      fallbackToIPGeolocation();
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userCoords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setCoords(userCoords);
        reverseGeocode(userCoords[0], userCoords[1], (addr) => {
          setAddress(addr);
          setLocLoading(false);
        });
      },
      (error) => {
        console.warn('Browser Geolocation failed, trying smart IP fallback...', error);
        // Fallback to IP search instantly so user is never blocked or looped
        fallbackToIPGeolocation();
      },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  };

  // Handle locating the citizen - opens permission modal first
  const handleLocateMe = () => {
    setShowPermissionModal(true);
  };

  // Handle auto-filling Form from Image Analysis
  const handleAutoFillFromImage = async (e: MouseEvent) => {
    e.stopPropagation(); // Avoid opening the click file upload prompt
    if (!imageFile) return;

    setIsAnalyzingImage(true);
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const res = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        if (data.title) setTitle(data.title);
        if (data.description) setDescription(data.description);
        if (data.category) setCategory(data.category);
      } else {
        alert(data.error || 'Failed to analyze the attached image.');
      }
    } catch (err) {
      console.error('Image auto-fill failed:', err);
      alert('Error connecting to the AI image analyzer.');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Image Upload Handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle step 2 validation
  const isStep2Valid = title.trim().length >= 5 && description.trim().length >= 20;

  // STEP 3 - SUBMIT AND ANALYZE WITH AI
  const handleAnalyzeWithAI = async () => {
    setLoading(true);
    setStep(3);

    // Save/Fetch anonymous profile first if not set
    let activeProfile = authProfile || profile;
    if (!activeProfile) {
      const tempEmail = `citizen.${Math.round(Math.random() * 1000)}@nagar_seva.org`;
      try {
        const uRes = await fetch('/api/users/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: tempEmail, name: 'Active Citizen' })
        });
        const savedUser = await uRes.json();
        localStorage.setItem('nagar_seva_user', JSON.stringify(savedUser));
        window.dispatchEvent(new Event('storage'));
        setProfile(savedUser);
        activeProfile = savedUser;
      } catch (e) {
        console.error('Error saving mock user profile:', e);
      }
    }

    // Prepare multipart form data
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('lat', coords[0].toString());
    formData.append('lng', coords[1].toString());
    formData.append('address', address);
    if (imageFile) {
      formData.append('image', imageFile);
    }
    if (activeProfile) {
      formData.append('reportedBy', activeProfile.id);
      formData.append('reportedByName', activeProfile.name);
    }

    try {
      const res = await fetch('/api/issues/report', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAiResult(data);
      } else {
        alert(data.error || 'Server processing error.');
        setStep(2);
      }
    } catch (err) {
      console.error('AI submission failed:', err);
      alert('Failed to connect to the backend server. Running in fallback mode!');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    // Award local points on frontend mock representation
    const activeProfile = authProfile || profile;
    if (activeProfile) {
      const updated = {
        ...activeProfile,
        points: activeProfile.points + 50,
        issuesReported: activeProfile.issuesReported + 1
      };
      localStorage.setItem('nagar_seva_user', JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));

      // Sync manually with Firestore
      try {
        await syncProfile();
      } catch (syncErr) {
        console.error('Error syncing points after report:', syncErr);
      }
    }

    // Pushing real-time notifications to all users on new report
    try {
      const reporterName = activeProfile?.name || 'Anonymous Citizen';
      await notifyAllUsersAboutNewReport(
        aiResult?.issueId || 'issue-' + Date.now(),
        title,
        reporterName
      );
    } catch (notifErr) {
      console.error('Failed to dispatch global new-report notifications:', notifErr);
    }

    setIsSuccessModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto px-4 md:px-6 py-12"
    >
      {/* Progress Header */}
      <div className="mb-10 text-center select-none">
        <h1 className="font-display font-bold text-3xl text-slate-50 mb-4 tracking-tight">Report a Community Issue</h1>
        
        {/* Visual Progress Steps */}
        <div className="flex items-center justify-center gap-2 max-w-md mx-auto relative mt-6">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#334155] -translate-y-1/2 z-0" />
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-[#0ea5e9] -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: `${(step - 1) * 50}%` }}
          />

          {[
            { s: 1, label: 'Coordinates' },
            { s: 2, label: 'Details' },
            { s: 3, label: 'AI Review' }
          ].map((item) => (
            <div key={item.s} className="flex flex-col items-center z-10 w-24">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                  step > item.s
                    ? 'bg-[#10b981] border-[#10b981] text-[#0f172a]'
                    : step === item.s
                    ? 'bg-[#0f172a] border-[#0ea5e9] text-[#0ea5e9] shadow-[0_0_12px_rgba(14,165,233,0.3)]'
                    : 'bg-[#0f172a] border-[#334155] text-slate-500'
                }`}
              >
                {item.s}
              </div>
              <span className={`text-[10px] font-semibold mt-1.5 uppercase tracking-wide ${
                step === item.s ? 'text-[#0ea5e9]' : 'text-slate-500'
              }`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: SELECT LOCATION MAP */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="text-[#0ea5e9]" />
            <h2 className="font-display font-bold text-xl text-slate-100">Step 1: Tag Location Coordinates</h2>
          </div>
          <p className="text-sm text-slate-400 mb-6 font-sans leading-relaxed">
            NagarSeva routes issues depending on their geographical coordinates. Click "Use My Location" or drag the blue map marker pin to your exact spot.
          </p>

          {/* Action Locate Button */}
          <button
            onClick={handleLocateMe}
            disabled={locLoading}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 text-[#0ea5e9] font-semibold px-5 py-3 rounded-xl border border-[#0ea5e9]/25 transition-all mb-6 disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 ${locLoading ? 'animate-pulse' : ''}`} />
            {locLoading ? 'Pinpointing Coordinates...' : 'Pinpoint My GPS Location'}
          </button>

          {/* Draggable Map Canvas */}
          <div className="relative h-[350px] w-full rounded-xl overflow-hidden border border-[#334155] mb-6">
            <MapContainer
              center={coords}
              zoom={14}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <DraggableMarker position={coords} setPosition={setCoords} setAddress={setAddress} />
              <MapRecenter center={coords} />
            </MapContainer>
          </div>

          {/* Geocoding result card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 flex items-start gap-3 backdrop-blur-sm">
            <Info className="text-[#0ea5e9] shrink-0 mt-0.5" size={18} />
            <div>
              <div className="text-[11px] font-mono text-slate-500 uppercase tracking-widest">Identified Address</div>
              <p className="text-xs font-medium text-slate-200 mt-1 leading-relaxed">
                {address}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#334155]/50">
            <button
              onClick={() => setStep(2)}
              className="bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-[#0f172a] font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
            >
              <span>Next Steps</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: FILL DETAILS */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl"
        >
          <div className="flex items-center gap-2 mb-6 border-b border-[#334155]/50 pb-4">
            <ChevronLeft
              onClick={() => setStep(1)}
              className="text-slate-400 hover:text-slate-100 cursor-pointer pr-1"
              size={28}
            />
            <h2 className="font-display font-bold text-xl text-slate-100">Step 2: Define Infrastructure Faults</h2>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-6">
            {/* Title */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5 uppercase tracking-wider text-slate-400">
                <label>Issue Title *</label>
                <span className="font-mono text-[10px] text-slate-500">{title.length}/100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                required
                placeholder="e.g., Overflowing sewage manhole flooding commercial crossway"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1">Provide a clear, brief headline summarizing the problem.</span>
            </div>

            {/* Description */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5 uppercase tracking-wider text-slate-400">
                <label>Fault Description *</label>
                <span className="font-mono text-[10px] text-slate-500">{description.length}/500</span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={500}
                placeholder="Describe the issue in details. e.g., The manhole is overflowing since yesterday morning. It is releasing black sewage water into the local market corridor, creating highly unhygienic odors. Pedestrians can scarcely navigate..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm resize-none"
              />
              <span className="text-[10px] text-slate-500 mt-1">Minimum 20 characters. Explain the hazard, duration, and local severity impact.</span>
            </div>

            {/* Category Selector GRID */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-2.5 uppercase tracking-wider text-slate-400">
                Primary Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`cursor-pointer border rounded-xl p-4 flex flex-col h-full text-left transition-all ${
                      category === cat.id
                        ? 'bg-[#0ea5e9]/10 border-[#0ea5e9] shadow-[0_0_15px_rgba(14,165,233,0.15)] backdrop-blur-md'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl mb-2">{cat.icon}</span>
                    <span className="text-sm font-bold text-slate-100">{cat.label}</span>
                    <span className="text-[10px] text-slate-500 mt-1 leading-snug">{cat.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* File Drag zone */}
            <div className="flex flex-col">
              <label className="text-xs font-semibold mb-2.5 uppercase tracking-wider text-slate-400">
                Attach Reference Image
              </label>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-white/20 hover:border-[#0ea5e9] bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center flex flex-col items-center justify-center transition-all group shadow-sm"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                
                {imagePreview ? (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <div className="relative w-full max-w-[200px] h-32 rounded-lg overflow-hidden border border-[#334155]">
                      <img src={imagePreview} alt="Upload preview" className="w-full h-full object-cover" />
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoFillFromImage}
                      disabled={isAnalyzingImage}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0ea5e9] bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingImage ? 'animate-spin' : 'fill-[#0ea5e9]/10'}`} />
                      {isAnalyzingImage ? 'Analyzing Image...' : '✨ AI Auto-Fill Form from Image'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileImage className="text-slate-500 group-hover:text-[#0ea5e9] mb-3 transition-colors" size={36} />
                    <span className="text-xs font-semibold text-slate-300">Drag image here or click to upload</span>
                    <span className="text-[10px] text-slate-500 mt-1 uppercase font-mono font-medium">JPEG, PNG max 10MB</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-[#334155]/50 mt-8">
            <button
              onClick={() => setStep(1)}
              className="bg-[#334155] hover:bg-[#334155]/80 text-slate-200 font-semibold text-sm px-6 py-3 rounded-xl flex items-center gap-1 transition-all border border-slate-600/30"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
            <button
              onClick={handleAnalyzeWithAI}
              disabled={!isStep2Valid}
              className="bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-[#0f172a] font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            >
              <span>Analyze with AI</span>
              <Sparkles size={16} className="fill-[#0f172a]/10" />
            </button>
          </div>
        </motion.div>
      )}

      {/* STEP 3: AI ANALYSIS AND SUBMISSION GATE */}
      {step === 3 && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl">
          {loading ? (
            <LoadingSpinner
              message="NagarSeva AI is Triage Routing..."
              subMessage="Consulting regional Gemini 3.5 nodes, assessing severe hazard weights, checking structural database for duplicates..."
            />
          ) : aiResult ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <div className="flex items-center gap-2 mb-6 border-b border-[#334155]/50 pb-4">
                <h2 className="font-display font-bold text-xl text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="text-[#0ea5e9] fill-[#0ea5e9]/10" size={20} />
                  <span>NagarSeva AI Dispatch Summary</span>
                </h2>
              </div>

              {/* Duplicate warnings */}
              {aiResult.isDuplicate && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-amber-500 font-display">Duplicate Alert</h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Our spatial engine discovered a highly similar active ticket ({aiResult.duplicateConfidence}% spatial confidence match) located within 150m of your coordinates.
                    </p>
                    <button
                      onClick={() => navigate(`/issue/${aiResult.similarIssueId}`)}
                      className="text-xs font-semibold text-[#0ea5e9] hover:underline mt-2 flex items-center gap-1"
                    >
                      <span>View existing report and add your vote instead</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="flex flex-col gap-4">
                  {/* Category */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4 backdrop-blur-sm">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Classification Category</span>
                    <p className="text-sm font-bold text-slate-200 mt-1 capitalize">{aiResult.category}</p>
                  </div>

                  {/* Severity */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4 backdrop-blur-sm">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Assessed Severity</span>
                    <p className={`text-sm font-bold mt-1 uppercase ${
                      aiResult.severity === 'critical' ? 'text-[#ef4444]' : aiResult.severity === 'high' ? 'text-[#f59e0b]' : 'text-[#0ea5e9]'
                    }`}>{aiResult.severity}</p>
                  </div>

                  {/* Routing Department */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4 backdrop-blur-sm">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Routed Department</span>
                    <p className="text-sm font-bold text-slate-200 mt-1 capitalize">{aiResult.department || 'General Administration'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Summary */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4 h-full backdrop-blur-sm">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">AI Synopsis Summary</span>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{aiResult.aiSummary}</p>
                  </div>
                </div>
              </div>

              {/* Action Plan */}
              <div className="bg-[#0ea5e9]/10 border border-[#0ea5e9]/25 rounded-xl p-5 mb-8 text-left backdrop-blur-sm">
                <h4 className="text-xs font-bold font-display text-[#0ea5e9] uppercase tracking-wider mb-3">Suggested Dispatch Action</h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{aiResult.suggestedAction || 'General maintenance crew requested.'}</p>
                <div className="flex justify-between items-center text-xs font-mono border-t border-[#334155] pt-3 text-slate-400">
                  <span>Estimated Budget: <span className="text-[#10b981] font-bold">{aiResult.estimatedCost}</span></span>
                  <span>Urgency: <span className="text-slate-200 font-bold">{aiResult.urgencyScore}/10</span></span>
                </div>
              </div>

              {/* Footer controls */}
              <div className="flex justify-between pt-6 border-t border-[#334155]/50 mt-4">
                <button
                  onClick={() => setStep(2)}
                  className="bg-[#334155] hover:bg-[#334155]/80 text-slate-200 font-semibold text-sm px-6 py-3 rounded-xl flex items-center gap-1 transition-all border border-slate-600/30"
                >
                  <ChevronLeft size={16} />
                  <span>Modify Details</span>
                </button>
                <button
                  onClick={handleFinalSubmit}
                  className="bg-[#10b981] hover:bg-[#10b981]/90 text-[#0f172a] font-bold text-sm px-8 py-3 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-[#10b981]/25"
                >
                  <span>Confirm & Log Record</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="text-red-500 mx-auto mb-3" size={36} />
              <p className="text-slate-300 font-semibold">Triage pipeline failed. Please try again.</p>
              <button
                onClick={() => setStep(2)}
                className="mt-4 bg-[#334155] hover:bg-[#334155]/80 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      )}

      {/* Success Modal */}
      {aiResult && (
        <SuccessModal
          isOpen={isSuccessModalOpen}
          onClose={() => setIsSuccessModalOpen(false)}
          issueId={aiResult.issueId}
          category={aiResult.category}
          severity={aiResult.severity}
          aiSummary={aiResult.aiSummary}
          estimatedCost={aiResult.estimatedCost}
          onTrack={() => navigate(`/issue/${aiResult.issueId}`)}
          onReportAnother={() => {
            // Reset state
            setIsSuccessModalOpen(false);
            setStep(1);
            setTitle('');
            setDescription('');
            setCategory('pothole');
            setImageFile(null);
            setImagePreview(null);
            setAiResult(null);
          }}
        />
      )}

      {/* Location Permission Prompt Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-[#0f172a]/85 backdrop-blur-md" onClick={() => setShowPermissionModal(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-[#334155]/60 rounded-2xl p-6 md:p-8 shadow-2xl overflow-hidden z-10 text-left">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#0ea5e9] to-[#10b981]" />
            <div className="flex items-center gap-3 text-[#0ea5e9] mb-4">
              <MapPin className="animate-pulse" size={24} />
              <h3 className="font-display font-bold text-lg text-slate-50">Location Permission Request</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              To accurately tag the infrastructure issue on the municipal map, NagarSeva requests temporary access to your device's precise coordinates.
            </p>

            <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 mb-6 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-200">🔍 How we use your location:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>Centers the reporting map automatically</li>
                <li>Identifies the correct civic zone and municipal body</li>
                <li>Ensures cold-patch asphalt teams route correctly</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  triggerActualGeolocation();
                }}
                className="flex-1 py-3 px-4 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-[#0f172a] font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 text-center cursor-pointer font-sans"
              >
                Allow Location Access
              </button>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-xl transition-all border border-slate-700/50 text-center cursor-pointer font-sans"
              >
                Cancel / Drag Pin Instead
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={async () => {
                  setShowPermissionModal(false);
                  await fallbackToIPGeolocation();
                }}
                className="text-[10px] text-[#0ea5e9] hover:underline font-semibold font-mono"
              >
                🌐 Blocked by iframe? Use IP fallback instantly
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
