import React, { useState, useRef, useEffect } from 'react';
import { User, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface UserMenuProps {
  onOpenBilling: () => void;
  onOpenAccount: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onOpenBilling, onOpenAccount }) => {
  const { user, logout } = useAuth();
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

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 hover:bg-surface py-1 px-2 rounded-full transition-colors border border-transparent hover:border-border"
      >
        <div className="text-right hidden md:block">
           <p className="text-xs font-bold text-textMain">{user.name}</p>
           <p className="text-[10px] text-textMuted uppercase tracking-wider">{user.plan} Plan</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-black border border-border flex items-center justify-center text-textMain font-bold shadow-sm">
           {user.name.charAt(0).toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-50 animate-fade-in-up">
           <div className="p-4 border-b border-border">
              <p className="text-sm font-bold text-textMain truncate">{user.email}</p>
           </div>
           
           <div className="p-2">
              <button 
                onClick={() => {
                    onOpenAccount();
                    setIsOpen(false);
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-textMuted hover:text-textMain hover:bg-background rounded-md transition-colors"
              >
                 <User size={16} /> My Account
              </button>
              <button 
                onClick={() => {
                    onOpenBilling();
                    setIsOpen(false);
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-textMuted hover:text-textMain hover:bg-background rounded-md transition-colors"
              >
                 <CreditCard size={16} /> Billing & Plans
              </button>
           </div>

           <div className="border-t border-border p-2">
              <button 
                onClick={() => logout()}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-900/10 rounded-md transition-colors"
              >
                 <LogOut size={16} /> Log Out
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;