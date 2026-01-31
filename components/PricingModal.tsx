import React, { useState } from 'react';
import { Check, X, Zap, Crown, Ghost, Lock } from 'lucide-react';
import { UserPlan } from '../types';
import { auth } from '../src/lib/firebase';

// FIX: Price IDs for Stripe checkout
const PLAN_PRICE_IDS: Record<UserPlan, string> = {
  echo: '',                                      // Free Plan (No Stripe ID needed)
  clone: 'price_1StVDBJeTnM8efjPOdGRpJ93',      // Clone Monthly
  syndicate: 'price_1StVDAJeTnM8efjPRUpn1xOV',  // Syndicate Monthly
};

// Yearly Price IDs
const YEARLY_PRICE_IDS: Record<UserPlan, string> = {
  echo: '',
  clone: 'price_1SvWSXJeTnM8efjPdXGobQAy',
  syndicate: 'price_1SvWUwJeTnM8efjPrSBZXYQV',
};

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: UserPlan) => void;
  currentPlan: UserPlan;
  onViewLegal?: (type: 'terms' | 'privacy') => void;
  initialBillingCycle?: 'monthly' | 'yearly';
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSelectPlan, currentPlan, onViewLegal, initialBillingCycle = 'monthly' }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(initialBillingCycle);
  
  if (!isOpen) return null;

  const handlePlanSelection = async (planId: UserPlan) => {
    const user = auth.currentUser;
    const userId = user?.uid;
    if (!userId) {
      // Save the plan to localStorage and redirect to login
      if (planId !== 'echo') {
        localStorage.setItem('pendingPlan', planId);
        localStorage.setItem('pendingBilling', billingCycle);
      }
      // Redirect to home with login modal
      window.location.href = '/?showLogin=true&plan=' + planId;
      return;
    }

    // 1. IF FREE PLAN (ECHO): Just update the database, don't ask for money.
    if (planId === 'echo') {
      onSelectPlan(planId);
      console.log('Switching to free plan...');
      return; 
    }

    // 2. IF PAID PLAN (CLONE/SYNDICATE): Go to Stripe
    const priceId = billingCycle === 'yearly' ? YEARLY_PRICE_IDS[planId] : PLAN_PRICE_IDS[planId];
    if (!priceId) return; // Safety check

    // Call your Checkout API
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, priceId, userEmail: user?.email, plan: planId })
      });
      
      const data = await res.json();
      console.log('Checkout API response:', data);
      
      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Fallback: redirect to Stripe checkout URL using session ID
        window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`;
      } else {
        alert('Error creating checkout session: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error creating checkout session. Please try again.');
    }
  };

  const plans = [
    {
      id: 'echo' as UserPlan,
      name: 'The Echo',
      price: '$0',
      period: 'Forever',
      icon: <Ghost className="w-6 h-6" />,
      features: ['5 Credits / Day', 'Text Input Only', 'Standard Speed'],
      disabled: ['File Upload (Brand DNA)', 'Tone Intensity Slider', 'Bulk CSV Processing'],
      color: 'border-border',
      btnColor: 'bg-surface hover:bg-border'
    },
    {
      id: 'clone' as UserPlan,
      name: 'The Clone',
      price: billingCycle === 'monthly' ? '$29' : '$244',
      period: billingCycle === 'monthly' ? '/ month' : '/ year',
      popular: true,
      icon: <Zap className="w-6 h-6 text-black" />,
      features: ['Unlimited Credits', 'Brand DNA File Upload', 'Tone Intensity Slider', 'Priority Generation'],
      disabled: ['Bulk CSV Processing'],
      color: 'border-accent shadow-[0_0_30px_-10px_rgba(217,249,157,0.3)]',
      btnColor: 'bg-accent text-black hover:bg-white'
    },
    {
      id: 'syndicate' as UserPlan,
      name: 'The Syndicate',
      price: billingCycle === 'monthly' ? '$99' : '$832',
      period: billingCycle === 'monthly' ? '/ month' : '/ year',
      icon: <Crown className="w-6 h-6" />,
      features: ['Unlimited Credits', 'Brand DNA File Upload', 'Tone Intensity Slider', 'Bulk CSV Processing', 'API Access'],
      disabled: [],
      color: 'border-purple-500/50 shadow-[0_0_30px_-10px_rgba(168,85,247,0.2)]',
      btnColor: 'bg-purple-600 text-white hover:bg-purple-500'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-textMuted hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 md:p-12">
          {/* Toggle Switch */}
          <div className="flex justify-center items-center gap-4 mb-8">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white font-bold' : 'text-gray-500'}`}>Monthly</span>
            
            <button 
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="w-14 h-7 bg-gray-700 rounded-full relative transition-colors duration-300 focus:outline-none"
            >
              <div className={`absolute top-1 w-5 h-5 bg-accent rounded-full shadow-md transform transition-transform duration-300 ${
                billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>

            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white font-bold' : 'text-gray-500'}`}>
              Yearly <span className="text-accent text-xs ml-1">(SAVE YEARLY 30%)</span>
            </span>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-textMain mb-3 tracking-tight">Upgrade Your Workflow</h2>
            <p className="text-textMuted">Unlock the full power of GhostNote's mimicry engine.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative flex flex-col p-6 rounded-lg border-2 ${plan.color} ${plan.popular ? 'bg-surface/50' : 'bg-surface/20'} transition-all`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                    Recommended
                  </div>
                )}

                <div className="mb-6 flex items-center justify-between">
                  <div className={`p-3 rounded-lg ${plan.popular ? 'bg-accent' : 'bg-surface border border-border'}`}>
                    {plan.icon}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-textMain">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-6">
                  <span className="text-3xl font-bold text-textMain">{plan.price}</span>
                  <span className="text-sm text-textMuted">{plan.period}</span>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-textMain/90">
                      <Check size={16} className="text-accent mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                  {plan.disabled.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-textMuted/40">
                      <X size={16} className="mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handlePlanSelection(plan.id)}
                  disabled={currentPlan === plan.id}
                  className={`w-full py-3 rounded-md font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                    currentPlan === plan.id 
                      ? 'bg-transparent border border-border text-textMuted cursor-default opacity-50' 
                      : plan.btnColor
                  }`}
                >
                  {currentPlan === plan.id ? 'CURRENT PLAN' : (
                    <>
                       {plan.id !== 'echo' && <Lock size={14} />}
                       {plan.id === 'echo' ? 'SELECT PLAN' : 
                        plan.id === 'clone' ? 'START 14-DAY FREE TRIAL' : 'UPGRADE NOW'}
                    </>
                  )}
                </button>
                
                {/* Payment clarification note - ONLY for Clone plan (has free trial) */}
                {plan.id === 'clone' && currentPlan !== plan.id && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {billingCycle === 'yearly' 
                      ? '$244 billed annually. Save 20%.' 
                      : '$0.00 due today. Cancel anytime.'}
                  </p>
                )}
                {/* Syndicate plan - no trial, show regular pricing */}
                {plan.id === 'syndicate' && currentPlan !== plan.id && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {billingCycle === 'yearly'
                      ? '$832 billed annually. Save 20%.'
                      : '$99.00 billed monthly.'}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Stripe Compliance Legal Links */}
          {onViewLegal && (
             <div className="mt-12 pt-6 border-t border-border text-center">
                <p className="text-[10px] text-textMuted/60">
                   Secure payments processed by Stripe. By subscribing, you agree to our{' '}
                   <button onClick={() => { onClose(); onViewLegal('terms'); }} className="underline hover:text-textMuted transition-colors">Terms</button>
                   {' '}and{' '}
                   <button onClick={() => { onClose(); onViewLegal('privacy'); }} className="underline hover:text-textMuted transition-colors">Privacy Policy</button>.
                </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricingModal;