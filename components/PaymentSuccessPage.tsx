import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlan } from '../types';

interface PaymentSuccessPageProps {
  onComplete: (plan: string) => void;
}

const PaymentSuccessPage: React.FC<PaymentSuccessPageProps> = ({ onComplete }) => {
  const { updatePlan } = useAuth();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate progress bar
    setTimeout(() => setProgress(100), 100);

    const handleUpgrade = async () => {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');
      
      if (plan === 'clone' || plan === 'syndicate') {
        // AUTOMATICALLY trigger update
        try {
            await updatePlan(plan as UserPlan);
        } catch (error) {
            console.error("Plan update failed:", error);
        }
        
        // Wait for animation and processing
        setTimeout(() => {
          onComplete(plan);
        }, 2000);
      } else {
        // Fallback if no plan param found (e.g. direct access)
        setTimeout(() => {
            onComplete('Premium');
        }, 2000);
      }
    };

    handleUpgrade();
  }, [updatePlan, onComplete]);

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
        Upgrading your account to unlock full power...
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