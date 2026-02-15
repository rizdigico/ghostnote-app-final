import React, { useEffect, useState } from 'react';
import Dashboard from '../../components/Dashboard';
import { useAuth } from '../../AuthContext';

interface StudioPageProps {
  onGoHome: () => void;
  onViewLegal: (type: 'terms' | 'privacy') => void;
}

const StudioPage: React.FC<StudioPageProps> = ({ onGoHome, onViewLegal }) => {
  const { user } = useAuth();
  const [initialContent, setInitialContent] = useState<string>('');

  // Check for pending content from Repurpose flow
  useEffect(() => {
    const pendingContent = localStorage.getItem('pendingStudioContent');
    if (pendingContent) {
      setInitialContent(pendingContent);
      // Clear after reading
      localStorage.removeItem('pendingStudioContent');
    }
  }, []);

  // If user is not logged in, the App shell will handle redirect
  if (!user) {
    return null;
  }

  return (
    <Dashboard 
      onGoHome={onGoHome} 
      onViewLegal={onViewLegal}
    />
  );
};

export default StudioPage;
