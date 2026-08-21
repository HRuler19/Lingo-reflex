import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'

function RouteFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Loading…</div>
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/*
            Suspense lives here, wrapping only the routed content, so a
            not-yet-fetched page chunk shows its loading state in the
            content area — not by blanking out the sidebar/header too, which
            is what happened when this boundary wrapped the whole <Routes>
            in App.tsx (a suspending descendant discards everything under
            its nearest Suspense boundary, not just itself).
          */}
          <Suspense fallback={<RouteFallback />}>
            {/* Keyed by route so navigating away from a crashed page clears the boundary. */}
            <ErrorBoundary key={pathname} scope="This page">
              <Outlet />
            </ErrorBoundary>
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
