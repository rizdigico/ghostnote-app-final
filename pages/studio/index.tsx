import React from 'react';
import Dashboard from '../../components/Dashboard';
import { useAuth } from '../../AuthContext';

interface StudioPageProps {
  onGoHome: () => void;
  onViewLegal: (type: 'terms' | 'privacy') => void;
  onNavigate?: (path: string) => void;
}

const StudioPage: React.FC<StudioPageProps> = ({ onGoHome, onViewLegal, onNavigate }) => {
  const { user } = useAuth();

  // If user is not logged in, the App shell will handle redirect
  if (!user) {
    return null;
  }

  return (
    <Dashboard 
      onGoHome={onGoHome} 
      onViewLegal={onViewLegal}
      onNavigate={onNavigate}
    />
  );
};

export default StudioPage;
