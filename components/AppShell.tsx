import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import { useAuth } from '../AuthContext';
import type { User } from '../types';

interface AppShellProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

const AppShell: React.FC<AppShellProps> = ({
  children,
  currentPath,
  onNavigate,
  onLogout,
  onOpenSettings,
}) => {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentPath]);

  const handleToggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Mobile Header */}
      <div className="md:hidden">
        <MobileHeader
          isMenuOpen={isMobileMenuOpen}
          onToggleMenu={handleToggleMenu}
        />
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && isMobile && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-64 z-50 md:hidden animate-in slide-in-from-left">
            <Sidebar
              currentPath={currentPath}
              onNavigate={onNavigate}
              onLogout={onLogout}
              onOpenSettings={onOpenSettings}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <main 
        className={`
          min-h-screen transition-all duration-300
          ${isMobile ? 'pt-16' : 'md:ml-64'}
        `}
      >
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppShell;
