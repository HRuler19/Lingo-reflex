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
        <main className="relative flex-1 overflow-y-auto p-6">
          {/*
            A faint, fixed ambient wash behind every page — so a page whose
            content is deliberately narrow (the Practice Arena game screen
            keeps "clean focus mode" per the spec, not full-bleed) still
            reads as designed on a very wide monitor instead of as a form
            floating in blank space. -z-10 relies on `main` being the
            positioned ancestor (relative) so it paints behind in-flow
            content per the stacking rules, not on DOM order.
          */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed top-14 right-0 -z-10 size-160 rounded-full bg-primary/6 blur-[110px] dark:bg-primary/10"
          />
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
