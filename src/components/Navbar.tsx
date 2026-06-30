import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Menu,
  X,
  ShieldAlert,
  Award,
  Map,
  Home,
  Plus,
  Bell,
  LogOut,
  LogIn,
  Check,
  Inbox,
  Sparkles,
  BellRing,
  Volume2,
  Award as AwardIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { Notification as NagarNotification } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NagarNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  
  // Custom interactive toasts
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; issueId: string }>>([]);

  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Request HTML5 system notification permission on load
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const addToast = (title: string, message: string, issueId: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, issueId }]);
    
    // Auto remove after 7 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 7000);
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {
      console.warn('Sound playback skipped:', e);
    }
  };

  const triggerSystemNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'https://cdn-icons-png.flaticon.com/512/564/564619.png'
        });
      } catch (err) {
        console.warn('Desktop notification failed:', err);
      }
    }
  };

  // Load real-time notifications from Firestore
  useEffect(() => {
    if (!profile?.id) {
      setNotifications([]);
      return;
    }

    // Query notifications for current user
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', profile.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort in memory to avoid requiring a composite index in Firestore
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(list);

      // Detect status change document added in real-time
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAtTime = new Date(data.createdAt).getTime();
          // Alert only if it is unread and extremely recent (last 30 seconds)
          if (!data.read && (Date.now() - createdAtTime) < 30000) {
            playNotificationSound();
            triggerSystemNotification(data.issueTitle || 'Status Changed', data.message);
            addToast(data.issueTitle || 'Civic Ticket Update', data.message, data.issueId);
          }
        }
      });
    }, (error) => {
      console.error('Error listening to notifications:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      } catch (e) {
        // Suppress throw to prevent UI crash, but register the error
      }
    });

    return () => unsubscribe();
  }, [profile?.id]);

  // Handle clicks outside of dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Home', path: '/', icon: <Home size={18} /> },
    { name: 'Live Map', path: '/dashboard', icon: <Map size={18} /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <Award size={18} /> },
    { name: 'Officer Room', path: '/authority', icon: <ShieldAlert size={18} /> },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = async (notif: NagarNotification) => {
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    } catch (err) {
      console.error('Error updating notification read state:', err);
    }
    setShowNotifications(false);
    navigate(`/issue/${notif.issueId}`);
  };

  const handleMarkAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleLogoutClick = async () => {
    await logout();
    setShowUserDropdown(false);
    navigate('/');
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#1e293b]/50 backdrop-blur-md border-b border-[#334155]/60 px-4 md:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-[#0ea5e9] p-2 rounded-lg text-[#0f172a] shadow-[0_0_15px_rgba(14,165,233,0.4)] group-hover:scale-105 transition-all duration-300">
            <AlertTriangle className="fill-[#0f172a]" size={20} />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-slate-50 group-hover:text-[#0ea5e9] transition-all duration-300">
            Nagar<span className="text-[#0ea5e9]">Seva</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 font-sans font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'text-[#0ea5e9] shadow-[0_2px_0_0_#0ea5e9]'
                    : 'text-slate-400 hover:text-slate-100'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </div>

        {/* Desktop CTA & Auth controls */}
        <div className="hidden md:flex items-center gap-4">
          {profile ? (
            <>
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-slate-300 hover:text-slate-50 cursor-pointer"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center -translate-y-1/3 translate-x-1/3 animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown card */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-[#1e293b] border border-white/10 rounded-2xl shadow-2xl p-4 z-[1100] backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
                      <h4 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase">Notifications</h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-[10px] text-[#0ea5e9] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Check size={12} />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center flex flex-col items-center justify-center text-slate-500 gap-1.5">
                          <Inbox size={24} className="opacity-40" />
                          <p className="text-[11px]">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                              notif.read
                                ? 'bg-white/0 border-transparent hover:bg-white/5'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                notif.type === 'status_change' 
                                  ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' 
                                  : 'bg-[#10b981]/10 text-[#10b981]'
                              }`}>
                                {notif.type === 'status_change' ? 'Status Update' : 'Resolved'}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono">
                                {new Date(notif.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-200 font-semibold leading-snug">
                              {notif.message}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 border border-white/10 rounded-full pl-3 pr-4 py-1.5 bg-white/5 hover:bg-white/10 backdrop-blur-md shadow-lg transition-all cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-full bg-[#6366f1] flex items-center justify-center font-bold text-[10px] text-slate-50">
                    {profile.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{profile.points} pts</span>
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-3 w-48 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl p-1 z-[1100]">
                    <div className="px-4 py-2 border-b border-white/10 mb-1">
                      <p className="text-xs font-bold text-slate-100 truncate">{profile.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{profile.email}</p>
                    </div>
                    <button
                      onClick={handleLogoutClick}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={14} />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="text-xs font-semibold text-slate-300 hover:text-slate-50 px-3 py-2 cursor-pointer transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => {
                  setAuthModalMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 font-semibold text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-all active:scale-95"
              >
                Sign Up
              </button>
            </div>
          )}



          <button
            onClick={() => navigate('/report')}
            className="flex items-center gap-1.5 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 text-[#0f172a] font-semibold text-sm px-4 py-2.5 rounded-lg shadow-[0_4px_12px_rgba(14,165,233,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer"
          >
            <Plus size={16} />
            Report Issue
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-slate-300 hover:text-slate-50 p-1.5 rounded-lg border border-[#334155] cursor-pointer"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#1e293b]/95 backdrop-blur-lg border-b border-[#334155]/60 px-6 py-6 flex flex-col gap-5 shadow-2xl transition-all duration-300">
          <div className="flex flex-col gap-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 font-medium py-2 rounded-md ${
                    isActive ? 'text-[#0ea5e9]' : 'text-slate-300 hover:text-slate-50'
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            ))}
          </div>

          <div className="border-t border-[#334155]/60 pt-4 flex flex-col gap-3">
            {profile ? (
              <>
                <div className="flex items-center justify-between px-3 py-2.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#6366f1] flex items-center justify-center font-bold text-xs text-slate-50">
                      {profile.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{profile.name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{profile.email}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-[#0ea5e9]">{profile.points} pts</div>
                </div>

                {/* Mobile Notification bell list link */}
                {notifications.length > 0 && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-1 flex justify-between items-center">
                      <span>Recent Notifications</span>
                      <button onClick={handleMarkAllAsRead} className="text-[#0ea5e9] hover:underline">Mark read</button>
                    </div>
                    {notifications.slice(0, 3).map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => {
                          handleNotificationClick(notif);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left p-1.5 rounded text-[11px] leading-snug flex flex-col gap-0.5 ${
                          notif.read ? 'text-slate-400' : 'text-slate-100 font-bold bg-white/5'
                        }`}
                      >
                        <span>{notif.message}</span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleLogoutClick}
                  className="flex items-center justify-center gap-2 w-full border border-red-500/20 hover:bg-red-500/10 text-red-400 font-semibold py-2.5 rounded-lg transition-colors cursor-pointer text-xs uppercase tracking-wider"
                >
                  <LogOut size={14} />
                  Log Out
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setAuthModalMode('login');
                    setIsAuthModalOpen(true);
                  }}
                  className="py-3 border border-white/10 hover:bg-white/5 text-slate-200 font-semibold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
                >
                  Log In
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setAuthModalMode('signup');
                    setIsAuthModalOpen(true);
                  }}
                  className="py-3 bg-[#0ea5e9] text-[#0f172a] font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Sign Up
                </button>
              </div>
            )}



            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/report');
              }}
              className="flex items-center justify-center gap-1.5 w-full bg-[#0ea5e9] text-[#0f172a] font-semibold py-3 rounded-lg shadow-lg cursor-pointer"
            >
              <Plus size={16} />
              Report Issue
            </button>
          </div>
        </div>
      )}

      </nav>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Real-time Notification Floating Toasts Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full p-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, transition: { duration: 0.2 } }}
              onClick={() => {
                navigate(`/issue/${toast.issueId}`);
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }}
              className="pointer-events-auto bg-slate-900/95 border border-slate-700/80 backdrop-blur-md rounded-2xl p-4 shadow-2xl flex items-start gap-3 cursor-pointer hover:border-[#0ea5e9]/50 transition-all group overflow-hidden relative"
            >
              <div className="absolute top-0 inset-x-0 h-[3px] bg-[#0ea5e9]" />
              <div className="bg-[#0ea5e9]/10 p-2 rounded-xl text-[#0ea5e9] shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                <BellRing size={16} className="animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[9px] font-mono font-bold text-[#0ea5e9] uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={10} className="animate-pulse" />
                    Status Update
                  </span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                    }}
                    className="text-slate-400 hover:text-slate-100 transition-colors p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
                <h5 className="text-xs font-bold text-slate-100 truncate mb-1">{toast.title}</h5>
                <p className="text-[11px] text-slate-300 leading-normal">{toast.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </>
  );
}
