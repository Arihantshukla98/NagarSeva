import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, AlertCircle, RefreshCw, LogIn, UserPlus, Chrome } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, signUp, signInWithGoogle, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
 
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) {
          throw new Error('Please enter your name');
        }
        await signUp(email, password, name);
      }
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      let errMsg = err.message || 'An error occurred during authentication';
      if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Email/Password sign-in is disabled in your Firebase Console. Please enable "Email/Password" under Authentication -> Sign-in method, or use "Sign in with Google" below.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errMsg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'This email is already in use.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Please enter a valid email address.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      let errMsg = err.message || 'An error occurred during Google authentication';
      if (err.code === 'auth/operation-not-allowed') {
        errMsg = 'Google sign-in is disabled in your Firebase Console. Please enable "Google" under Authentication -> Sign-in method.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0f172a]/75 backdrop-blur-md"
        />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl overflow-hidden z-10"
        >
          {/* Accent top line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#0ea5e9] to-[#6366f1]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="font-display font-bold text-2xl text-slate-50 mb-1">
              {mode === 'login' ? 'Welcome Back' : 'Join NagarSeva'}
            </h3>
            <p className="text-slate-400 text-xs">
              {mode === 'login' ? 'Sign in to access your civic dashboard' : 'Create an account to report issues and earn points'}
            </p>
          </div>

          {/* Switch tabs */}
          <div className="flex border-b border-white/10 mb-6">
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center transition-all border-b-2 ${
                mode === 'login'
                  ? 'border-[#0ea5e9] text-[#0ea5e9]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider text-center transition-all border-b-2 ${
                mode === 'signup'
                  ? 'border-[#0ea5e9] text-[#0ea5e9]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-200 text-xs"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={16} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="has-left-icon w-full text-xs bg-white/5 border border-white/10 rounded-xl !py-3 !pr-4 text-slate-200 placeholder-slate-500 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={16} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="has-left-icon w-full text-xs bg-white/5 border border-white/10 rounded-xl !py-3 !pr-4 text-slate-200 placeholder-slate-500 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="has-left-icon w-full text-xs bg-white/5 border border-white/10 rounded-xl !py-3 !pr-4 text-slate-200 placeholder-slate-500 outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 bg-[#0ea5e9] hover:bg-[#0ea5e9]/90 disabled:bg-[#0ea5e9]/50 text-[#0f172a] font-bold text-xs uppercase tracking-wider rounded-xl shadow-[0_4px_12px_rgba(14,165,233,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={14} />
              ) : mode === 'login' ? (
                <>
                  <LogIn size={14} />
                  <span>Log In</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>Create Account</span>
                </>
              )}
            </button>
            {mode === 'signup' && (
              <p className="text-[10px] text-slate-500 text-center mt-3">
                By creating an account, you agree to our{' '}
                <a 
                  href="/terms" 
                  onClick={(e) => {
                    e.preventDefault();
                    onClose();
                    window.location.href = '/terms';
                  }}
                  className="text-[#0ea5e9] hover:underline"
                >
                  Terms of Service & Civic Charter
                </a>.
              </p>
            )}
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-x-0 h-px bg-white/10" />
            <span className="relative px-3 bg-[#0f172a] text-[10px] font-mono text-slate-500 uppercase tracking-widest">or continue with</span>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 disabled:bg-white/5 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-150 flex items-center justify-center gap-2 hover:border-[#0ea5e9]/50 active:scale-[0.99] cursor-pointer"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={14} />
            ) : (
              <>
                <Chrome size={14} className="text-[#0ea5e9]" />
                <span>Sign In with Google</span>
              </>
            )}
          </button>
 
          {/* Quick Demo Access Bypass */}
          <div className="mt-6 p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col gap-3">
            <div className="text-center text-[10px] font-mono text-[#0ea5e9] uppercase tracking-wider font-semibold">
              ⚡ Quick Demo & Bypass Mode
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              If email/password sign-in is disabled in your Firebase console or you want to instantly test the platform, choose a profile:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginAsDemo('citizen');
                    onClose();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="py-2 px-3 bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/20 hover:border-[#0ea5e9]/40 rounded-lg text-xs font-semibold text-[#0ea5e9] transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95"
              >
                <span>Demo Citizen</span>
                <span className="text-[9px] font-normal text-slate-400">Reporter View</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginAsDemo('authority');
                    onClose();
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="py-2 px-3 bg-[#10b981]/10 hover:bg-[#10b981]/20 border border-[#10b981]/20 hover:border-[#10b981]/40 rounded-lg text-xs font-semibold text-[#10b981] transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95"
              >
                <span>Demo Authority</span>
                <span className="text-[9px] font-normal text-slate-400">Officer View</span>
              </button>
            </div>
          </div>

          {/* Prompt to switch */}
          <div className="text-center mt-6 pt-4 border-t border-white/5 text-xs text-slate-400">
            {mode === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className="text-[#0ea5e9] hover:underline font-semibold"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-[#0ea5e9] hover:underline font-semibold"
                >
                  Log in
                </button>
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
