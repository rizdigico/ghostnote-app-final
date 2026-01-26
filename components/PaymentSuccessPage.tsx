import React, { useEffect, useState } from 'react';
import { Check, LogIn } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { UserPlan } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

interface PaymentSuccessPageProps {
  onComplete: (plan: string) => void;
  onOpenLoginModal?: () => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ onComplete, onOpenLoginModal }) => {
  const { user, isLoading } = useAuth();
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  // CRITICAL: Save plan to localStorage immediately on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    
    if (plan && ['clone', 'syndicate'].includes(plan)) {
      localStorage.setItem('pendingPlan', plan);
      console.log(`✅ Saved pending plan to localStorage: ${plan}`);
    }
  }, []); // Empty dependency array - run ONCE on mount

  useEffect(() => {
    // Animate progress bar
    setTimeout(() => setProgress(100), 100);

    const handleUpgrade = async () => {
      try {
        // Extract plan from URL query parameter
        const params = new URLSearchParams(window.location.search);
        const plan = params.get('plan');

        // Wait for user to be loaded
        if (isLoading) {
          return; // Will retry when isLoading changes
        }

        // Validate plan from query parameter
        if (!plan || !['clone', 'syndicate'].includes(plan)) {
          setError('Invalid plan. Redirecting to dashboard...');
          setIsProcessing(false);
          setTimeout(() => onComplete('error'), 2000);
          return;
        }

        // If user is not authenticated, show login button and save URL
        if (!user) {
          setNeedsLogin(true);
          setIsProcessing(false);
          // Store the current URL with plan parameter in sessionStorage for after login
          sessionStorage.setItem('returnUrl', window.location.href);
          return;
        }

        // User IS logged in and plan is valid - update Firestore
        const userDocRef = doc(db, 'users', user.id);
        await updateDoc(userDocRef, {
          plan: plan as UserPlan
        });

        // CRITICAL: Remove pending plan from localStorage after successful update
        localStorage.removeItem('pendingPlan');
        console.log('✅ Cleared pendingPlan from localStorage');

        // Success: wait 3 seconds and redirect
        setError(null);
        setTimeout(() => {
          setIsProcessing(false);
          onComplete(plan);
        }, 3000);
      } catch (error: any) {
        console.error("Plan update failed:", error);
        setError(`Update failed: ${error.message || 'Unknown error'}`);
        setIsProcessing(false);
      }
    };

    // Only process if auth is loaded
    if (!isLoading) {
      handleUpgrade();
    }
  }, [user, isLoading, onComplete]);

  // Show spinner while auth is loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
          <div className="w-24 h-24 bg-surface border border-blue-500/50 rounded-full flex items-center justify-center relative z-10 animate-spin">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full"></div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Authenticating...</h1>
        <p className="text-textMuted">Please wait while we verify your account.</p>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (needsLogin) {
    const handleLoginClick = () => {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');
      
      // Save plan to localStorage if it exists
      if (plan && ['clone', 'syndicate'].includes(plan)) {
        localStorage.setItem('pendingPlan', plan);
        console.log(`💾 Saved plan "${plan}" to localStorage for post-login`);
      }
      
      // Navigate to home/login page
      if (onOpenLoginModal) {
        console.log('🔐 Opening login modal');
        onOpenLoginModal();
      } else {
        // Fallback: Redirect to home where login modal should be
        console.log('🔗 Redirecting to home page');
        window.location.href = '/';
      }
    };

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
          <div className="w-24 h-24 bg-surface border border-blue-500/50 rounded-full flex items-center justify-center relative z-10">
            <LogIn size={40} className="text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" strokeWidth={2} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Activate Your Upgrade</h1>
        <p className="text-textMuted text-lg mb-8 max-w-md">
          Please log in to activate your plan upgrade.
        </p>
        
        <button
          onClick={handleLoginClick}
          className="px-8 py-3 bg-accent text-black font-bold rounded-lg hover:bg-white transition-all shadow-lg flex items-center gap-2"
        >
          <LogIn size={18} />
          LOG IN TO ACTIVATE
        </button>
      </div>
    );
  }

  // Show error if something went wrong
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 rounded-full"></div>
          <div className="w-24 h-24 bg-surface border border-red-500/50 rounded-full flex items-center justify-center relative z-10">
            <span className="text-4xl font-bold text-red-500">!</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Error</h1>
        <p className="text-textMuted max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 rounded-full"></div>
        <div className="w-24 h-24 bg-surface border border-green-500/50 rounded-full flex items-center justify-center relative z-10 animate-bounce">
          <Check size={40} className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" strokeWidth={3} />
        </div>
      </div>
      
      <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Payment Confirmed!</h1>
      <p className="text-textMuted text-lg mb-8 max-w-md">
        Upgrading your account...
      </p>
      
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <div className="w-full h-1 bg-surface border border-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-[2000ms] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-mono text-green-400/80 uppercase tracking-widest mt-2 animate-pulse">
          Syncing Database...
        </span>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;