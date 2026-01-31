'use client';
import { useState } from 'react';
import { useAuth } from '@/AuthContext';
import { Check, X } from 'lucide-react';

export default function PricingTable() {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<'clone' | 'syndicate' | null>(null);

  // Stripe Price IDs
  const PRICES = {
    clone: {
      monthly: 'price_1StVDBJeTnM8efjPOdGRpJ93',
      yearly: 'price_1SvWSXJeTnM8efjPdXGobQAy'
    },
    syndicate: {
      monthly: 'price_1StVDAJeTnM8efjPRUpn1xOV',
      yearly: 'price_1SvWUwJeTnM8efjPrSBZXYQV'
    }
  };

  const handleCheckout = async (plan: 'clone' | 'syndicate') => {
    if (!user) {
      // Save the plan to localStorage and redirect to login
      localStorage.setItem('pendingPlan', plan);
      localStorage.setItem('pendingBilling', billingCycle);
      window.location.href = '/?showLogin=true&plan=' + plan;
      return;
    }

    setLoadingPlan(plan);

    try {
      const priceId = PRICES[plan][billingCycle];

      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: priceId,
          userId: user.id,
          userEmail: user.email,
          plan: plan
        }),
      });

      const data = await res.json();
      console.log('Checkout API response:', data);

      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Fallback redirect
        window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`;
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error creating checkout session');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-10 px-4">
      
      {/* Toggle Switch */}
      <div className="flex justify-center items-center gap-4 mb-12">
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
          Yearly <span className="text-accent text-xs ml-1">(SAVE 20%)</span>
        </span>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* CLONE PLAN */}
        <div className="border border-border bg-surface/20 p-6 rounded-xl flex flex-col">
          <h3 className="text-xl text-textMain font-bold">The Clone</h3>
          <div className="my-4">
            <span className="text-4xl font-bold text-textMain">
              {billingCycle === 'monthly' ? '$29' : '$244'}
            </span>
            <span className="text-textMuted">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
          
          <div className="flex-1 space-y-3 mb-6">
            <div className="flex items-start gap-2 text-sm text-textMain/90">
              <Check size={16} className="text-accent mt-0.5 shrink-0" />
              <span>Unlimited Credits</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-textMain/90">
              <Check size={16} className="text-accent mt-0.5 shrink-0" />
              <span>Brand DNA File Upload</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-textMain/90">
              <Check size={16} className="text-accent mt-0.5 shrink-0" />
              <span>Tone Intensity Slider</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-textMain/90">
              <Check size={16} className="text-accent mt-0.5 shrink-0" />
              <span>Priority Generation</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-textMuted/40">
              <X size={16} className="mt-0.5 shrink-0" />
              <span>Bulk CSV Processing</span>
            </div>
          </div>

          <button 
            onClick={() => handleCheckout('clone')}
            disabled={loadingPlan === 'clone'}
            className="w-full py-3 bg-accent text-black font-bold rounded-md hover:bg-white transition disabled:opacity-50"
          >
            {loadingPlan === 'clone' ? 'Loading...' : 'START 14-DAY FREE TRIAL'}
          </button>
          
          {billingCycle === 'monthly' && (
            <p className="text-xs text-gray-500 mt-2 text-center">$0.00 due today. Cancel anytime.</p>
          )}
        </div>

        {/* SYNDICATE PLAN */}
        <div className="border border-purple-500/50 bg-purple-900/10 p-6 rounded-xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            BEST VALUE
          </div>
          <h3 className="text-xl text-purple-400 font-bold">The Syndicate</h3>
          <div className="my-4">
            <span className="text-4xl font-bold text-white">
              {billingCycle === 'monthly' ? '$99' : '$832'}
            </span>
            <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
          </div>
          
          <div className="flex-1 space-y-3 mb-6">
            <div className="flex items-start gap-2 text-sm text-textMain/90">
              <Check size={16} className="text-purple-500 mt-0.5 shrink-0" />
              <span>Everything in Clone</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-textMain/90">
              <Check size={16} className="text-purple-500 mt-0.5 shrink-0" />
              <span>Bulk CSV Processing</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-textMain/90">
              <Check size={16} className="text-purple-500 mt-0.5 shrink-0" />
              <span>API Access</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-textMain/90">
              <Check size={16} className="text-purple-500 mt-0.5 shrink-0" />
              <span>Priority Support</span>
            </div>
          </div>

          <button 
            onClick={() => handleCheckout('syndicate')}
            disabled={loadingPlan === 'syndicate'}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-500 transition disabled:opacity-50"
          >
            {loadingPlan === 'syndicate' ? 'Loading...' : 'UPGRADE NOW'}
          </button>
          
          <p className="text-xs text-gray-500 mt-2 text-center">$99.00 billed monthly</p>
        </div>

      </div>

      {/* Legal Note */}
      <div className="mt-8 text-center">
        <p className="text-[10px] text-textMuted/60">
          Secure payments processed by Stripe. Promo codes can be applied at checkout.
        </p>
      </div>
    </div>
  );
}
