import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Mascot } from '@/components/Mascot'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Label shown in the fallback, e.g. "Dashboard" — helps identify which part of the app broke. */
  scope?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render/lifecycle errors in its subtree so one broken page can't
 * white-screen the whole app. There is no hook equivalent for this in React
 * yet, hence the class component.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.scope ? `: ${this.props.scope}` : ''}]`, error, info)
  }

  private reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
        <Mascot pose="faceplant" className="h-24 w-auto" />
        <h2 className="text-lg font-semibold">
          {this.props.scope ? `${this.props.scope} hit a problem` : 'Something went wrong'}
        </h2>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={this.reset}>Try again</Button>
      </div>
    )
  }
}
