import React from 'react';
import { Check, X, Zap, Crown, Ghost, Lock } from 'lucide-react';
import { UserPlan } from '../types';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: UserPlan) => void;
  currentPlan: UserPlan;
  onViewLegal?: (type: 'terms' | 'privacy') => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose, onSelectPlan, currentPlan, onViewLegal }) => {
  if (!isOpen) return null;

  const handlePlanSelection = (planId: UserPlan) => {
    if (planId === 'clone') {
      window.location.href = 'https://buy.stripe.com/aFa28sbSo9iQ3tv9jK5Vu01?client_reference_id=clone';
    } else if (planId === 'syndicate') {
      window.location.href = 'https://buy.stripe.com/dRm8wQ5u0dz63tv3Zq5Vu00?client_reference_id=syndicate';
    } else {
      onSelectPlan(planId);
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
      price: '$29',
      period: '/ month',
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
      price: '$99',
      period: '/ month',
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
                       {plan.id === 'echo' ? 'SELECT PLAN' : 'UPGRADE NOW'}
                    </>
                  )}
                </button>
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