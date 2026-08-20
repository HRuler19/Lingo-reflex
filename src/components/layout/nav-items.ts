import {
  LayoutDashboard,
  PlusCircle,
  MessageSquarePlus,
  Zap,
  Library,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  title: string
  path: string
  icon: LucideIcon
}

/** The 6 sidebar destinations defined in the project spec (Doc.md). */
export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Add Word', path: '/add-word', icon: PlusCircle },
  { title: 'Add Phrase', path: '/add-phrase', icon: MessageSquarePlus },
  { title: 'Practice Arena', path: '/practice', icon: Zap },
  { title: 'Library', path: '/library', icon: Library },
  { title: 'Settings', path: '/settings', icon: Settings },
]
