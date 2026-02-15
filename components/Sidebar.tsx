import React from 'react';
import { NavItem, NAV_ITEMS } from '../config/navigation';
import { useAuth } from '../AuthContext';
import { LogOut, Settings, Crown } from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  onLogout,
  onOpenSettings,
}) => {
  const { user } = useAuth();

  const handleNavClick = (item: NavItem) => {
    if (item.comingSoon) return;
    onNavigate(item.path);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'syndicate':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'clone':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <aside className="w-64 h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <button
          onClick={() => onNavigate('/studio')}
          className="font-bold tracking-widest uppercase text-xs text-primary hover:opacity-80 transition-opacity"
        >
          GhostNote
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path;
            const isDisabled = item.comingSoon;

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item)}
                  disabled={isDisabled}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${isActive 
                      ? 'bg-primary/10 text-primary' 
                      : isDisabled
                        ? 'text-textMuted/50 cursor-not-allowed'
                        : 'text-textMain hover:bg-primary/5 hover:text-primary'
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isDisabled ? 'opacity-50' : ''}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.comingSoon && (
                    <span className="text-xs text-textMuted bg-border px-1.5 py-0.5 rounded">
                      Soon
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          
          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-textMain truncate">
              {user?.name || 'User'}
            </p>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${getPlanBadgeColor(user?.plan || 'echo')}`}>
              {user?.plan === 'syndicate' ? <Crown className="w-3 h-3 inline mr-1" /> : null}
              {user?.plan?.charAt(0).toUpperCase() || 'E'}{user?.plan?.slice(1) || 'cho'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-textMuted hover:text-textMain hover:bg-border/50 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          )}
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
