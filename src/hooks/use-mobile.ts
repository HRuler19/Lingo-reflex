import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Derived directly in the initializer rather than via an effect — this
  // still needs a lazy initializer (not a bare expression) so it isn't
  // recomputed every render, but it renders correctly on mount instead of
  // one tick behind, and doesn't trigger the extra render an equivalent
  // `setState` call inside `useEffect` would.
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < MOBILE_BREAKPOINT)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
