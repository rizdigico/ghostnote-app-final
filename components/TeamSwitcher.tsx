import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Users, Check } from 'lucide-react';
import { useAuth } from '../AuthContext';

interface TeamSwitcherProps {
  onOpenTeamSettings?: () => void;
}

const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ onOpenTeamSettings }) => {
  const { user, team, teamMembers } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user || !team) return null;

  // For now, we only show the current team since multi-team support would require additional logic
  // This can be extended when users have access to multiple teams
  const teams = [team];

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-surface py-1 px-2 rounded-md transition-colors text-textMain"
      >
        <div className="w-6 h-6 rounded bg-accent/20 flex items-center justify-center">
          <Users size={14} className="text-accent" />
        </div>
        <span className="text-xs font-medium max-w-[120px] truncate">{team.name}</span>
        <ChevronDown size={14} className={`text-textMuted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in-up">
          <div className="p-3 border-b border-border">
            <p className="text-[10px] text-textMuted uppercase tracking-wider">Your Teams</p>
          </div>
          
          <div className="p-2">
            {teams.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  // For now, just close - multi-team switching would go here
                  setIsOpen(false);
                }}
                className="w-full text-left flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors bg-accent/10 border border-accent/30"
              >
                <span className="truncate text-textMain">{t.name}</span>
                <Check size={14} className="text-accent flex-shrink-0" />
              </button>
            ))}
          </div>

          <div className="border-t border-border p-2">
            <button 
              onClick={() => {
                setIsOpen(false);
                onOpenTeamSettings?.();
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-textMuted hover:text-textMain hover:bg-background rounded-md transition-colors"
            >
              <Users size={12} />
              Manage Team & Members
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSwitcher;
