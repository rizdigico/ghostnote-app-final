import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import LegalPage from './components/LegalPage';
import PaymentSuccessPage from './components/PaymentSuccessPage';
import ErrorBoundary from './components/ErrorBoundary';
import AppShell from './components/AppShell';
import StudioPage from './pages/studio';
import RepurposePage from './pages/repurpose';
import SocialPage from './pages/social';
import LibraryPage from './pages/library';
import TeamPage from './pages/team';
import { UserPlan } from './types';
import { AuthProvider, useAuth } from './AuthContext';

type ViewState = 'landing' | 'app' | 'login' | 'terms' | 'privacy' | 'payment_success';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [previousView, setPreviousView] = useState<ViewState>('landing');
  const [initialPlan, setInitialPlan] = useState<UserPlan>('echo');
  const [currentPath, setCurrentPath] = useState('/studio');
  const { user, isLoading, updatePlan, logout } = useAuth();

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/payment-success') {
       setCurrentView('payment_success');
       return;
    }
    
    // Handle authenticated routes
    if (path === '/studio' || path === '/repurpose' || path === '/social' || path === '/library' || path === '/team') {
      setCurrentPath(path);
      if (user) {
        setCurrentView('app');
      }
    } else if (path !== '/' && path !== '/login') {
      // Default to studio for unknown paths when logged in
      if (user) {
        setCurrentPath('/studio');
        setCurrentView('app');
      }
    }
    
    const params = new URLSearchParams(window.location.search);
    
    // Handle showLogin param for redirecting to login
    if (params.get('showLogin') === 'true') {
      setCurrentView('login');
      const plan = params.get('plan');
      const billing = params.get('billing');
      if (plan) {
        localStorage.setItem('pendingPlan', plan);
        if (billing) {
          localStorage.setItem('pendingBilling', billing);
        }
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
  }, [updatePlan, user]);

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
    // Navigate to studio by default
    setCurrentPath('/studio');
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
    setCurrentPath('/studio');
    setCurrentView('app');
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
  };

  const handleLogout = async () => {
    await logout();
    setCurrentView('landing');
    window.history.pushState({}, '', '/');
  };

  // Render the appropriate page based on current path
  const renderPage = () => {
    switch (currentPath) {
      case '/studio':
        return <StudioPage onGoHome={handleGoHome} onViewLegal={navigateToLegal} />;
      case '/repurpose':
        return <RepurposePage onNavigate={handleNavigate} />;
      case '/social':
        return <SocialPage />;
      case '/library':
        return <LibraryPage />;
      case '/team':
        return <TeamPage />;
      default:
        return <StudioPage onGoHome={handleGoHome} onViewLegal={navigateToLegal} />;
    }
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
                  setCurrentPath('/studio');
                  setCurrentView('app');
                }}
                onViewLegal={navigateToLegal}
              />
          </div>
      );
  }

  if (currentView === 'app' && user) {
    return (
      <AppShell
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      >
        {renderPage()}
      </AppShell>
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
