import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import Login from './components/Login'; // Fixed: Removed /Auth
import LegalPage from './components/LegalPage';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import ErrorBoundary from './components/ErrorBoundary';
import { UserPlan } from './types';
import { AuthProvider, useAuth } from './AuthContext'; // Fixed: Removed /contexts

type ViewState = 'landing' | 'app' | 'login' | 'terms' | 'privacy' | 'payment_success';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [previousView, setPreviousView] = useState<ViewState>('landing');
  const [initialPlan, setInitialPlan] = useState<UserPlan>('echo');
  const { user, isLoading, updatePlan } = useAuth();

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/payment-success') {
       setCurrentView('payment_success');
       return;
    }
    const params = new URLSearchParams(window.location.search);
    
    // Handle showLogin param for redirecting to login
    if (params.get('showLogin') === 'true') {
      setCurrentView('login');
      // Clear the query param
      const plan = params.get('plan');
      if (plan) {
        localStorage.setItem('pendingPlan', plan);
        window.history.replaceState({}, '', '/?showLogin=true');
      } else {
        window.history.replaceState({}, '', '/');
      }
    }
    
    // Handle plan param for opening pricing modal
    const planParam = params.get('plan');
    if (planParam && ['echo', 'clone', 'syndicate'].includes(planParam)) {
      // Will be handled by the component
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
    window.history.replaceState({}, '', '/');
    setCurrentView('app');
  };

  if (currentView === 'payment_success') {
      return <PaymentSuccessPage onComplete={handlePaymentComplete} onOpenLoginModal={() => setCurrentView('login')} />;
  }

  if (currentView === 'terms') {
    return <LegalPage type="terms" onBack={handleBackFromLegal} />;
  }

  if (currentView === 'privacy') {
    return <LegalPage type="privacy" onBack={handleBackFromLegal} />;
  }

  if (currentView === 'login' || (currentView === 'app' && !user)) {
      return (
          <div className="antialiased text-textMain bg-background min-h-screen flex flex-col">
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
        <Dashboard onGoHome={handleGoHome} onViewLegal={navigateToLegal} />
      </>
    );
  }

  return (
      <>
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
