import { Outlet, useLocation } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Keyed by route so navigating away from a crashed page clears the boundary. */}
          <ErrorBoundary key={pathname} scope="This page">
            <Outlet />
          </ErrorBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
