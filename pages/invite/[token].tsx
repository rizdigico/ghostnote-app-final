import React, { useEffect, useState } from 'react';
import { useAuth } from '../../AuthContext';
import Button from '../../components/Button';

interface InvitePageProps {
  token: string;
}

const InvitePage: React.FC<InvitePageProps> = ({ token }) => {
  const { user, isLoading } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      window.history.pushState({}, '', '/studio');
      window.location.reload();
      return;
    }

    // If user is not logged in, save token to localStorage and redirect to login
    if (!isLoading && !user) {
      localStorage.setItem('pendingInviteToken', token);
      window.history.pushState({}, '', '/');
      window.location.reload();
      return;
    }

    // If user is logged in, join the team
    if (!isLoading && user) {
      joinTeam();
    }
  }, [user, isLoading, token]);

  const joinTeam = async () => {
    if (!token || !user) return;

    setIsJoining(true);
    setError(null);

    try {
      // Get Firebase ID token
      const idToken = await (window as any).firebase.auth().currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }

      const response = await fetch('/api/team/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to join team');
      }

      // Success - clear token and redirect to studio
      localStorage.removeItem('pendingInviteToken');
      
      // Store the new team ID in localStorage so we can load it after redirect
      localStorage.setItem('activeTeamId', data.teamId);
      
      // Redirect to studio
      window.location.href = '/studio';
    } catch (err: any) {
      setError(err.message || 'Failed to join team');
      setIsJoining(false);
    }
  };

  const handleLogin = () => {
    localStorage.setItem('pendingInviteToken', token || '');
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  const handleSignup = () => {
    localStorage.setItem('pendingInviteToken', token || '');
    window.history.pushState({}, '', '/');
    window.location.reload();
  };

  if (isLoading || isJoining) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isJoining ? 'Joining team...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Join Team</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => {
            window.history.pushState({}, '', '/studio');
            window.location.reload();
          }} variant="primary">
            Go to Studio
          </Button>
        </div>
      </div>
    );
  }

  // If user is not logged in, show login/signup options
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="text-blue-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Join Team</h2>
          <p className="text-gray-600 mb-6">
            You've been invited to join a team on GhostNote. Please log in or create an account to join.
          </p>
          <div className="space-y-3">
            <Button onClick={handleLogin} variant="primary" className="w-full">
              Log In
            </Button>
            <Button onClick={handleSignup} variant="secondary" className="w-full">
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default InvitePage;