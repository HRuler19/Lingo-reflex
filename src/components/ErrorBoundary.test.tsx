// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  afterEach(cleanup)

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeTruthy()
  })

  it('catches a render error and shows the fallback instead of crashing', () => {
    // React logs the caught error to the console by default; keep the test output clean.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary scope="Test Page">
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Test Page hit a problem')).toBeTruthy()
    expect(screen.getByText('boom')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()

    consoleError.mockRestore()
  })
})
