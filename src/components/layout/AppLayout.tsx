import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Mascot } from '@/components/Mascot'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'

function RouteFallback() {
  return (
    <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
      <Mascot pose="hipLookUp" className="h-20 w-auto" />
      Loading…
    </div>
  )
}

export function AppLayout() {
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        {/*
          This is the page's <main> landmark — SidebarInset is a plain layout
          column, so the app header above stays a `banner` instead of being
          demoted by sitting inside main. min-h-0 overrides
          flexbox's default min-height:auto on a flex item — without it, a
          flex-1 child won't shrink below its content's natural height, so
          it grows instead of scrolling, and the whole page/document scrolls
          instead, dragging the header and sidebar along with it.

          No pt-6 here (only px-6 pb-6): PageHeader is sticky, and a sticky
          element's "top" offset pins its *margin* edge to the scrollport,
          not its border edge — with an ancestor top padding in the way, a
          negative top margin on PageHeader ends up pushing its visible box
          *down* by that same padding instead of canceling it, which is
          exactly the gap that used to show scrolled-past content peeking
          through between the app header and the page header. Giving this
          container no top padding at all sidesteps the issue; PageHeader
          supplies its own pt-6 so the unstuck (top-of-page) spacing looks
          the same. Non-PageHeader views (GameScreen, ResultView, the
          error/not-found pages, this Suspense fallback) carry their own
          top spacing since they can't lean on this padding either.

          pb stays a plain arbitrary value (not px-6, to avoid also padding
          top) plus the safe-area term for the home indicator on a native
          shell — px is deliberately still the static px-6 Tailwind class,
          not a safe-area-aware one: PageHeader's -mx-6 bleed cancels
          exactly that, and pairing a static negative margin with a dynamic
          safe-area padding here would throw that arithmetic off in
          landscape on a notched device. Not handling that narrower case
          for now rather than complicating the sticky-header math for it.
        */}
        <main className="relative min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          {/*
            A faint, fixed ambient wash behind every page — so a page whose
            content is deliberately narrow (the Practice Arena game screen
            keeps "clean focus mode" per the spec, not full-bleed) still
            reads as designed on a very wide monitor instead of as a form
            floating in blank space. -z-10 relies on this div being the
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
