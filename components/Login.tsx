import React, { useState } from 'react';
import { ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface LoginProps {
  onSuccess: () => void;
  onViewLegal: (type: 'terms' | 'privacy') => void;
}

const Login: React.FC<LoginProps> = ({ onSuccess, onViewLegal }) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [isEmailMode, setIsEmailMode] = useState(false);

  const handleGoogleLogin = async () => {
    // Mock Google Login
    await login('demo@ghostnote.ai');
    onSuccess();
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await login(email);
    onSuccess();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-fade-in-up">
      <div className="w-full max-w-md bg-surface border border-border rounded-xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50" />

        <div className="mb-8">
          <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <div className="w-4 h-4 bg-black rounded-full" />
          </div>
          <h2 className="text-2xl font-bold text-textMain tracking-tight">Welcome Back</h2>
          <p className="text-textMuted text-sm mt-2">Log in to access your Brand DNA.</p>
        </div>

        {!isEmailMode ? (
          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white text-black font-bold py-3 px-4 rounded-md flex items-center justify-center gap-3 hover:bg-gray-200 transition-colors"
            >
              {isLoading ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              onClick={() => setIsEmailMode(true)}
              className="w-full bg-surface border border-border text-textMain font-bold py-3 px-4 rounded-md flex items-center justify-center gap-3 hover:border-textMuted transition-colors"
            >
              <Mail size={18} />
              Continue with Email
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4 animate-fade-in-up">
            <div className="text-left">
              <label className="text-xs font-bold text-textMuted uppercase tracking-wider mb-1 block">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-background border border-border rounded-md p-3 text-textMain placeholder-textMuted/30 focus:border-accent focus:outline-none"
              />
            </div>
             {/* Note: Mock login doesn't require password, simplifying for demo */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent text-black font-bold py-3 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-white transition-colors"
            >
              {isLoading ? "Logging in..." : "Access Dashboard"}
              {!isLoading && <ArrowRight size={16} />}
            </button>
            
            <button 
              type="button" 
              onClick={() => setIsEmailMode(false)}
              className="text-xs text-textMuted hover:text-white underline"
            >
              Go back
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-border text-xs text-textMuted flex justify-center gap-4">
          <button onClick={() => onViewLegal('terms')} className="underline hover:text-white">Terms</button>
          <span>&bull;</span>
          <button onClick={() => onViewLegal('privacy')} className="underline hover:text-white">Privacy Policy</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
