// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppLayout } from './AppLayout'
import { renderWithRouter } from '@/test/render'

describe('AppLayout', () => {
  it('offers a skip link as the very first tab stop', async () => {
    // WCAG 2.4.1: without it, reaching page content means tabbing past the
    // six sidebar links and three header controls on every page.
    const user = userEvent.setup()
    renderWithRouter(<AppLayout />)

    await user.tab()
    expect(document.activeElement?.textContent).toBe('Skip to main content')
  })

  it('moves focus to the main landmark when the skip link is used', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AppLayout />)

    await user.tab()
    await user.keyboard('{Enter}')

    const main = screen.getByRole('main')
    expect(document.activeElement).toBe(main)
  })

  it('keeps the main landmark out of the normal tab order', async () => {
    // It is focusable only as a skip target; tabbing should never land on the
    // container itself.
    renderWithRouter(<AppLayout />)
    expect(screen.getByRole('main').getAttribute('tabindex')).toBe('-1')
  })

  it('exposes banner, navigation and main landmarks', () => {
    // The header must not be nested inside main, or it stops being a banner.
    renderWithRouter(<AppLayout />)
    expect(screen.getByRole('banner')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy()
    const main = screen.getByRole('main')
    expect(main.contains(screen.getByRole('banner'))).toBe(false)
  })
})
