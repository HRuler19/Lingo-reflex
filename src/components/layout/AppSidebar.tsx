import { Link, useLocation } from 'react-router-dom'
import { Mascot } from '@/components/Mascot'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { NAV_ITEMS } from './nav-items'

export function AppSidebar() {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon" role="navigation" aria-label="Main">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Mascot pose="armsCrossed" priority className="h-8 w-auto shrink-0" />
          <span className="text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            LexiPulse
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      render={<Link to={item.path} />}
                      isActive={isActive}
                      tooltip={item.title}
                      onClick={() => isMobile && setOpenMobile(false)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
