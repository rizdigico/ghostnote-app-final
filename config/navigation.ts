import { PenTool, RefreshCw, Rocket, Database, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'studio', label: 'Studio', path: '/studio', icon: PenTool },
  { id: 'repurpose', label: 'Repurpose', path: '/repurpose', icon: RefreshCw },
  { id: 'social', label: 'Social', path: '/social', icon: Rocket, comingSoon: true },
  { id: 'library', label: 'Library', path: '/library', icon: Database },
  { id: 'team', label: 'Team', path: '/team', icon: Users, comingSoon: true },
];

export function getNavItemByPath(path: string): NavItem | undefined {
  return NAV_ITEMS.find(item => item.path === path);
}

export function isComingSoon(path: string): boolean {
  const item = getNavItemByPath(path);
  return item?.comingSoon ?? false;
}
