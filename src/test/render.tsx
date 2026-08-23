import type { ReactElement } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * Renders a page inside a router.
 *
 * Several screens contain a <Link> (the practice results screen links back to
 * the Dashboard, the 404 page links home), and react-router throws when one is
 * rendered with no router above it. Wrapping here keeps that plumbing out of
 * the individual tests.
 */
export function renderWithRouter(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>, ...options })
}
