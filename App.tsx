import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import Login from './components/Login'; // Fixed: Removed /Auth
import LegalPage from './components/LegalPage';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import ErrorBoundary from './components/ErrorBoundary';
import { UserPlan } from './types';
import { AuthProvider, useAuth } from './AuthContext'; // Fixed: Removed /contexts
import { Check, X } from 'lucide-react';

type ViewState = 'landing' | 'app' | 'login' | 'terms' | 'privacy' | 'payment_success';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [previousView, setPreviousView] = useState<ViewState>('landing');
  const [initialPlan, setInitialPlan] = useState<UserPlan>('echo');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [successPlanName, setSuccessPlanName] = useState<string>('');
  const { user, isLoading, updatePlan } = useAuth();

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/payment-success') {
       setCurrentView('payment_success');
       return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === 'true') {
      updatePlan('clone');
      setSuccessPlanName('Clone');
      setShowPaymentSuccess(true);
      window.history.replaceState({}, '', '/');
      setTimeout(() => setShowPaymentSuccess(false), 5000);
    }
  }, [updatePlan]);

  const handleEnterApp = async (plan: UserPlan = 'echo') => {
    // CRITICAL: Guard against clicking before auth is loaded
    if (isLoading) {
      console.warn('⚠️ Auth still loading, ignoring click');
      return;
    }
    
    setInitialPlan(plan);
    if (user && plan !== user.plan && plan !== 'echo') {
        await updatePlan(plan);
    }
    setCurrentView(user ? 'app' : 'login');
  };

  const handleGoHome = () => {
    setCurrentView('landing');
  };

  const navigateToLegal = (type: 'terms' | 'privacy') => {
    setPreviousView(currentView);
    setCurrentView(type);
  };

  const handleBackFromLegal = () => {
    setCurrentView(previousView);
  };
  
  const handlePaymentComplete = (planName: string) => {
    setSuccessPlanName(planName ? (planName.charAt(0).toUpperCase() + planName.slice(1)) : 'Premium');
    window.history.replaceState({}, '', '/');
    setCurrentView('app');
    setShowPaymentSuccess(true);
    setTimeout(() => setShowPaymentSuccess(false), 5000);
  };

  if (currentView === 'payment_success') {
      return <PaymentSuccessPage onComplete={handlePaymentComplete} />;
  }

  if (currentView === 'terms') {
    return <LegalPage type="terms" onBack={handleBackFromLegal} />;
  }

  if (currentView === 'privacy') {
    return <LegalPage type="privacy" onBack={handleBackFromLegal} />;
  }

  const renderAlerts = () => (
    <>
      {showPaymentSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-fade-in-down">
            <div className="bg-green-500/10 border border-green-500/50 backdrop-blur-md text-green-200 px-4 py-3 rounded-lg shadow-2xl flex items-start gap-3">
                <Check size={20} className="text-green-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-bold text-green-100">Payment Successful!</p>
                    <p className="text-sm font-medium opacity-90 leading-tight mt-0.5">
                        Welcome to {successPlanName} Plan! Features Unlocked.
                    </p>
                </div>
                <button onClick={() => setShowPaymentSuccess(false)} className="text-green-400 hover:text-white transition-colors p-1">
                    <X size={16} />
                </button>
            </div>
        </div>
      )}
    </>
  );

  if (currentView === 'login' || (currentView === 'app' && !user)) {
      return (
          <div className="antialiased text-textMain bg-background min-h-screen flex flex-col">
              {renderAlerts()}
              <header className="border-b border-border h-16 flex items-center justify-between px-6 bg-background">
                  <button onClick={handleGoHome} className="font-bold tracking-widest uppercase text-xs">GhostNote</button>
              </header>
              <Login 
                onSuccess={() => {
                  setCurrentView('app');
                }}
                onViewLegal={navigateToLegal}
              />
          </div>
      );
  }

  if (currentView === 'app' && user) {
    return (
      <>
        {renderAlerts()}
        <Dashboard onGoHome={handleGoHome} onViewLegal={navigateToLegal} />
      </>
    );
  }

  return (
      <>
        {renderAlerts()}
        <LandingPage onEnterApp={handleEnterApp} onViewLegal={navigateToLegal} isLoading={isLoading} />
      </>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
          <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
