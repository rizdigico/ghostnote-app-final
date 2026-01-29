import React, { useEffect, useState } from 'react';
import { Check, LogIn, ArrowRight, CreditCard, Shield, Zap } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { UserPlan } from '../types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [planName, setPlanName] = useState<string>('');

  // Get plan from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const success = params.get('success');
    
    if (plan && ['clone', 'syndicate'].includes(plan)) {
      setPlanName(plan.charAt(0).toUpperCase() + plan.slice(1));
      localStorage.setItem('pendingPlan', plan);
      console.log(`✅ Saved pending plan to localStorage: ${plan}`);
    }
    
    if (success === 'true') {
      setPaymentVerified(true);
    }
  }, []);

  // Animate progress bar
  useEffect(() => {
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleUpgrade = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const plan = params.get('plan');

        // Wait for auth to load
        if (isLoading) {
          return;
        }

        // Validate plan
        if (!plan || !['clone', 'syndicate'].includes(plan)) {
          setError('Invalid plan. Redirecting to dashboard...');
          setIsProcessing(false);
          setTimeout(() => onComplete('error'), 2000);
          return;
        }

        // If user not authenticated, show login prompt
        if (!user) {
          setNeedsLogin(true);
          setIsProcessing(false);
          sessionStorage.setItem('returnUrl', window.location.href);
          return;
        }

        // User is logged in - check if webhook has already updated the plan
        const userDocRef = doc(db, 'users', user.id);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          if (userData.plan === plan) {
            // Plan already activated by webhook!
            localStorage.removeItem('pendingPlan');
            setTimeout(() => {
              setIsProcessing(false);
              onComplete(plan);
            }, 2000);
            return;
          }
        }

        // Webhook hasn't updated yet, or plan mismatch - update now
        await updateDoc(userDocRef, {
          plan: plan as UserPlan
        });

        // Clear pending plan
        localStorage.removeItem('pendingPlan');
        console.log('✅ Plan activated successfully');

        // Success animation then redirect
        setError(null);
        setTimeout(() => {
          setIsProcessing(false);
          onComplete(plan);
        }, 3000);
      } catch (error: any) {
        console.error("Plan activation failed:", error);
        setError(`Activation failed: ${error.message || 'Unknown error'}`);
        setIsProcessing(false);
      }
    };

    if (!isLoading) {
      handleUpgrade();
    }
  }, [user, isLoading, onComplete]);

  // Show loading spinner while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full"></div>
          <div className="w-24 h-24 bg-surface border border-blue-500/50 rounded-full flex items-center justify-center relative z-10 animate-spin">
            <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full"></div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Verifying Payment...</h1>
        <p className="text-textMuted">Please wait while we confirm your purchase.</p>
      </div>
    );
  }

  // Show login prompt if user is not authenticated
  if (needsLogin) {
    const handleLoginClick = () => {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');
      
      if (plan && ['clone', 'syndicate'].includes(plan)) {
        localStorage.setItem('pendingPlan', plan);
        console.log(`💾 Saved plan "${plan}" to localStorage for post-login`);
      }
      
      if (onOpenLoginModal) {
        console.log('🔐 Opening login modal');
        onOpenLoginModal();
      } else {
        console.log('🔗 Redirecting to login page');
        window.location.href = '/?showLogin=true';
      }
    };

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
        {/* Success Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 rounded-full"></div>
          <div className="w-24 h-24 bg-surface border border-green-500/50 rounded-full flex items-center justify-center relative z-10">
            <Check size={40} className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" strokeWidth={3} />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Payment Successful!</h1>
        <p className="text-textMuted text-lg mb-3 max-w-md">
          Your {planName || 'Premium'} plan has been purchased.
        </p>
        <p className="text-textMuted mb-8 max-w-md">
          Please log in to activate your new plan and access all features.
        </p>
        
        {/* Plan Features Preview */}
        <div className="bg-surface/50 border border-border rounded-lg p-4 mb-8 max-w-sm w-full">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-accent" />
            <span className="text-sm font-medium text-white">{planName} Plan Includes:</span>
          </div>
          <ul className="text-sm text-textMuted text-left space-y-1 ml-6">
            {planName.toLowerCase() === 'syndicate' ? (
              <>
                <li>• Unlimited Credits</li>
                <li>• Brand DNA File Upload</li>
                <li>• Tone Intensity Slider</li>
                <li>• Bulk CSV Processing</li>
                <li>• API Access</li>
              </>
            ) : (
              <>
                <li>• Unlimited Credits</li>
                <li>• Brand DNA File Upload</li>
                <li>• Tone Intensity Slider</li>
                <li>• Priority Generation</li>
              </>
            )}
          </ul>
        </div>
        
        <button
          onClick={handleLoginClick}
          className="px-8 py-3 bg-accent text-black font-bold rounded-lg hover:bg-white transition-all shadow-lg flex items-center gap-2"
        >
          <LogIn size={18} />
          LOG IN TO ACTIVATE
          <ArrowRight size={18} />
        </button>
        
        <p className="text-xs text-textMuted/60 mt-6">
          <Shield size={12} className="inline mr-1" />
          Secure payment powered by Stripe
        </p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center animate-fade-in-up">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-500 blur-2xl opacity-20 rounded-full"></div>
          <div className="w-24 h-24 bg-surface border border-red-500/50 rounded-full flex items-center justify-center relative z-10">
            <span className="text-4xl font-bold text-red-500">!</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Activation Issue</h1>
        <p className="text-textMuted max-w-md">{error}</p>
      </div>
    );
  }

  // Show success/activating state
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
        {paymentVerified ? 'Activating your plan...' : 'Setting up your account...'}
      </p>
      
      {/* Plan Info Card */}
      <div className="bg-surface/50 border border-green-500/30 rounded-lg p-6 mb-8 max-w-sm w-full">
        <div className="flex items-center justify-center gap-3 mb-3">
          <CreditCard size={20} className="text-green-500" />
          <span className="text-lg font-bold text-white">{planName} Plan</span>
        </div>
        <p className="text-sm text-textMuted">All features are now unlocked!</p>
      </div>
      
      {/* Progress Bar */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        <div className="w-full h-1 bg-surface border border-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 transition-all duration-[2000ms] ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs font-mono text-green-400/80 uppercase tracking-widest mt-2 animate-pulse">
          {isProcessing ? 'Syncing with database...' : 'Almost there...'}
        </span>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
