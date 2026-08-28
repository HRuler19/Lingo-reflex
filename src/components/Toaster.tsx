import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { useToastStore } from '@/store/toast-store'
import { cn } from '@/lib/utils'

/**
 * Transient feedback for actions that happen away from a form — mainly
 * database writes that failed. Mounted once, at the app root.
 *
 * The region is always in the DOM (not conditionally rendered) so screen
 * readers have an established live region to announce into; announcing from a
 * container that only appears at the same moment as its content is
 * unreliable across AT.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <div
      // One region can only carry one politeness level, so it stays polite
      // and each toast sets its own role below — role="alert" for errors,
      // which interrupt, and role="status" for confirmations, which wait
      // their turn.
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border-2 bg-card p-3 text-sm shadow-lg',
            'animate-in slide-in-from-bottom-2 fade-in duration-200',
            toast.kind === 'error' ? 'border-destructive' : 'border-success',
          )}
        >
          {toast.kind === 'error' ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success-text" />
          )}
          <span className="min-w-0 flex-1 break-words">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="cursor-pointer rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
