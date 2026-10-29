import React, { useState, useEffect } from 'react';
import { 
  signInWithRedirect,
  getRedirectResult,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { Mail, Lock, LogIn, UserPlus, User, ArrowLeft, Sparkles, Flame, Shield, Play, CheckCircle } from 'lucide-react';
import { sound } from '../game/sound';

interface Props {
  onLoginSuccess: () => void;
  onContinueAsGuest: () => void;
  topDemons: string[];
}

type View = 'welcome' | 'login' | 'signup' | 'verification-pending';

export const LoginPage: React.FC<Props> = ({ onLoginSuccess, onContinueAsGuest, topDemons }) => {
  const [view, setView] = useState<View>('welcome');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demonIndex, setDemonIndex] = useState(0);
  const [tickerState, setTickerState] = useState<'in' | 'out'>('in');
  const [lastEmail, setLastEmail] = useState('');

  const demonList = topDemons.length > 0 ? topDemons : [
    'Tidal Wave',
    'Avernus',
    'Silent Clubstep',
    'Acheron',
    'Kyouki',
    'Abyss of Darkness',
    'Slaughterhouse',
    'Sakupen Circles',
    'Firework',
    'Tartarus'
  ];

  // Check for redirect login return on mount (for mobile/tablet redirect login)
  useEffect(() => {
    let isMounted = true;
    
    try {
      getRedirectResult(auth)
        .then((result) => {
          if (!isMounted) return;
          if (result && result.user) {
            // Google users are usually verified immediately by Google
            sound.playRareChime();
            onLoginSuccess();
          }
        })
        .catch((err: any) => {
          if (!isMounted) return;
          console.warn('Redirect sign-in notice:', err);
        });
    } catch (e) {
      console.warn('getRedirectResult skipped:', e);
    }
    return () => {
      isMounted = false;
    };
  }, [onLoginSuccess]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out and slide down
      setTickerState('out');

      // After slide down finishes, change demon and slide in from top
      setTimeout(() => {
        setDemonIndex((prev) => (prev + 1) % demonList.length);
        setTickerState('in');
      }, 350);
    }, 2800);
    return () => clearInterval(interval);
  }, [demonList.length]);

  const activeDemon = demonList[demonIndex] || 'Tidal Wave';

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      // Prefer signInWithPopup for internal AI Studio environment
      const provider = googleProvider || new GoogleAuthProvider();
      try {
        const result = await signInWithPopup(auth, provider);
        if (result.user) {
          sound.playRareChime();
          onLoginSuccess();
        }
      } catch (popupErr: any) {
        console.warn('Popup blocked or failed, trying redirect:', popupErr);
        await signInWithRedirect(auth, provider);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await sendEmailVerification(auth.currentUser);
      alert('Verification email resent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const rawId = identifier.trim();
    if (!rawId) {
      setError('Please enter a username or email address');
      setLoading(false);
      return;
    }

    // Convert username to valid email if no @ provided
    let authEmail = rawId;
    if (!authEmail.includes('@')) {
      const sanitized = authEmail.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      if (sanitized.length < 3) {
        setError('Username must be at least 3 characters');
        setLoading(false);
        return;
      }
      authEmail = `${sanitized}@aredl.game`;
    }

    setLastEmail(authEmail);

    try {
      if (view === 'signup') {
        const chosenUser = (username.trim() || rawId).slice(0, 32);
        if (chosenUser.length < 3) throw new Error('Username must be at least 3 characters');
        
        const userCred = await createUserWithEmailAndPassword(auth, authEmail, password);
        await updateProfile(userCred.user, { displayName: chosenUser });
        
        // Send verification email
        try {
          await sendEmailVerification(userCred.user);
          setView('verification-pending');
        } catch (vErr) {
          console.warn('Email verification send failed:', vErr);
          // If it fails to send but user was created, we still proceed but warn
          setError('Account created, but verification email failed to send. You can try signing in.');
          setView('login');
        }
      } else {
        const userCred = await signInWithEmailAndPassword(auth, authEmail, password);
        if (!userCred.user.emailVerified && !authEmail.endsWith('@aredl.game')) {
          setView('verification-pending');
          return;
        }
        sound.playRareChime();
        onLoginSuccess();
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password provider is not enabled.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Account not found or password incorrect.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('That username/email is already taken.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (view === 'welcome') {
    return (
      <div className="min-h-screen bg-[#07080d] flex flex-col items-center justify-center relative overflow-hidden px-4 selection:bg-rose-500 selection:text-white">
        {/* Dynamic Multi-Color Ambient Backlight */}
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-rose-500/20 via-orange-500/15 to-transparent blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[15%] w-[550px] h-[550px] rounded-full bg-gradient-to-tl from-cyan-500/20 via-violet-600/15 to-transparent blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none" />

        {/* Subtle Geometric Background Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '28px 28px'
          }}
        />

        <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center">
          {/* Logo Showcase with Crisp Glow */}
          <div className="relative mb-6 animate-in zoom-in-95 duration-700">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-cyan-500/20 rounded-full blur-2xl opacity-75" />
            <img
              src="assets/aistudio/IMG_7950_e702d8b3.png"
              alt="AREDR Logo"
              className="relative h-16 sm:h-20 w-auto object-contain drop-shadow-[0_8px_30px_rgba(245,158,11,0.35)]"
            />
          </div>

          {/* Subtitle Pill */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md mb-5 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-display text-xs font-semibold tracking-wider uppercase text-zinc-300">
              All Rated Extreme Demon RNG
            </span>
          </div>

          {/* Live Demonic Rotation Pill with smooth Top-to-Bottom transition */}
          <div className="mb-10 flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-zinc-900/70 border border-white/10 backdrop-blur-md shadow-lg">
            <Flame className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
            <span className="text-xs text-zinc-400 font-medium whitespace-nowrap">Has demons like</span>
            <div className="relative inline-flex items-center overflow-hidden h-6 min-w-[130px]">
              <span
                key={`${demonIndex}-${tickerState}`}
                className={`font-display font-black text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300 inline-block ${
                  tickerState === "in" ? "demon-fade-in-down" : "demon-fade-out-down"
                }`}
              >
                "{activeDemon}"
              </span>
            </div>
          </div>

          {/* Action Buttons: Clean, Proportioned, High Polish */}
          <div className="grid w-full gap-3">
            {/* Primary Action: Sign Up (Chromatic Gradient) */}
            <button
              onClick={() => { setView('signup'); setError(null); }}
              className="group relative w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:via-orange-400 hover:to-rose-500 text-white font-display font-bold text-sm uppercase tracking-wider transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_25px_rgba(249,115,22,0.35)] flex items-center justify-center gap-2.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account</span>
            </button>

            {/* Secondary Action: Login (Clean High-Contrast White) */}
            <button
              onClick={() => { setView('login'); setError(null); }}
              className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-display font-bold text-sm uppercase tracking-wider transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.98] shadow-lg flex items-center justify-center gap-2.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            {/* Tertiary Action: Guest Play (Frosted Glass Pill) */}
            <button
              onClick={onContinueAsGuest}
              className="w-full py-3 px-6 rounded-2xl bg-zinc-900/50 hover:bg-zinc-800/70 text-zinc-400 hover:text-zinc-200 border border-white/10 backdrop-blur-md font-sans text-xs font-semibold tracking-wider transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-zinc-500" />
              <span>Continue as Guest</span>
            </button>
          </div>

          {/* Footer Metadata */}
          <div className="mt-12 flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
            <span>Powered by AREDL</span>
            <span>•</span>
            <span className="text-zinc-400">All 1644 Extreme Demons</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] flex items-center justify-center p-4 relative overflow-hidden selection:bg-rose-500 selection:text-white">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-rose-500/15 via-violet-600/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-gradient-to-tl from-cyan-500/15 to-transparent rounded-full blur-[130px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <button 
          onClick={() => setView('welcome')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-semibold uppercase tracking-wider mb-5 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        <div className="bg-zinc-950/85 border border-white/10 rounded-3xl p-7 sm:p-8 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="assets/aistudio/IMG_7950_e702d8b3.png"
              alt="AREDR"
              className="h-10 w-auto object-contain mb-3 drop-shadow"
            />
            <h1 className="font-display text-2xl font-black tracking-tight text-white uppercase">
              {view === 'signup' ? 'Create Profile' : 'Welcome Back'}
            </h1>
            <p className="text-zinc-400 text-xs font-normal mt-1">
              {view === 'signup' ? 'Join the ranked leaderboard with your pulls' : 'Sign in to access cloud saves & stats'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-medium animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-3 mb-5">
            {view === 'signup' && (
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Player Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
                  required={view === 'signup'}
                />
              </div>
            )}
            <div className="relative group">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors w-4 h-4" />
              <input
                type="text"
                placeholder={view === 'signup' ? "Email or Username" : "Username or Email"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
                required
                autoComplete="username"
              />
            </div>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors w-4 h-4" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
                required
              />
            </div>

            <button
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:via-orange-400 hover:to-rose-500 text-white font-display font-bold text-xs uppercase tracking-wider shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : view === 'signup' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Google OAuth & Guest Options */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono font-semibold text-zinc-500">
              <span className="bg-[#090a0f] px-3">or</span>
            </div>
          </div>

          <div className="grid gap-2.5">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-sans font-bold text-xs transition-all transform active:scale-[0.98] flex items-center justify-center gap-2.5 shadow"
            >
              <img src="https://www.gstatic.com/firebase/anonymous/google.svg" alt="Google" className="w-4 h-4" />
              <span>Continue with Google</span>
            </button>

            <button
              onClick={onContinueAsGuest}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/10 font-sans text-xs font-semibold transition-all transform active:scale-[0.98]"
            >
              Continue as Guest
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setView(view === 'login' ? 'signup' : 'login');
                setError(null);
              }}
              className="text-xs text-zinc-400 hover:text-white font-medium transition underline underline-offset-4 decoration-zinc-700 hover:decoration-rose-400"
            >
              {view === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (view === 'verification-pending') {
    return (
      <div className="min-h-screen bg-[#07080d] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          <div className="bg-zinc-950/85 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
            
            <h1 className="font-display text-2xl font-black text-white uppercase mb-2">Verify Your Email</h1>
            <p className="text-zinc-400 text-sm mb-8">
              We've sent a verification link to <span className="text-emerald-400 font-bold">{lastEmail}</span>. 
              Please click the link in your email to activate your account.
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setView('login')}
                className="w-full py-3 rounded-xl bg-white text-zinc-950 font-display font-bold text-xs uppercase tracking-wider transition-all transform active:scale-[0.98]"
              >
                Go to Sign In
              </button>
              
              <button
                onClick={handleResendVerification}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white font-display font-bold text-xs uppercase tracking-wider transition-all"
              >
                {loading ? 'Sending...' : 'Resend Email'}
              </button>
            </div>

            <p className="mt-8 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">
              Wait a few minutes if you don't see it
            </p>
          </div>
        </div>
      </div>
    );
  }
};
