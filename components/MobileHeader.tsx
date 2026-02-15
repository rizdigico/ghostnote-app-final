import React from 'react';
import { Menu, X } from 'lucide-react';

interface MobileHeaderProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ isMenuOpen, onToggleMenu }) => {
  return (
    <header className="md:hidden h-16 bg-background border-b border-border flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-40">
      {/* Menu Button */}
      <button
        onClick={onToggleMenu}
        className="p-2 -ml-2 text-textMain hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Logo */}
      <button className="font-bold tracking-widest uppercase text-xs text-primary">
        GhostNote
      </button>

      {/* Spacer for balance */}
      <div className="w-10" />
    </header>
  );
};

export default MobileHeader;
