import React, { useState } from 'react';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Mail, Lock, User, LogIn, Sparkles, Globe } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const AuthModal: React.FC<Props> = ({ onClose }) => {
  const [mode, setActiveMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (username) {
          await updateProfile(userCredential.user, { displayName: username });
        }
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 p-0.5 shadow-[0_0_20px_rgba(239,68,68,0.4)] mb-4">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-amber-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">Join the Global Extreme Demon Rankings</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn className="w-4 h-4" />}
            {mode === 'login' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Or continue with</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-sm transition shadow-lg flex items-center justify-center gap-2"
        >
          <img src="https://www.gstatic.com/firebase/anonymous/google.svg" className="w-4 h-4" alt="Google" />
          Google Account
        </button>

        <div className="mt-8 text-center">
          <button
            onClick={() => setActiveMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            {mode === 'login' ? "Don't have an account? Create one" : "Already have an account? Sign in"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-[10px] text-zinc-600 hover:text-zinc-500 uppercase font-black tracking-widest transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
