import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NumberFieldProps {
  value: string
  onValueChange: (value: string) => void
  /** Lowest accepted value. Stepping down stops here, as does the minus button. */
  min?: number
  step?: number
  id?: string
  label: string
  disabled?: boolean
  invalid?: boolean
  className?: string
}

/**
 * A whole-number field with its own stepper.
 *
 * Deliberately not `<input type="number">`: that hands the stepper to the
 * browser, which draws its own spinner buttons in its own style and sizes
 * them differently on every platform. This keeps the control inside the
 * design system while reproducing what the native field gave for free —
 * arrow-key stepping, digits only, and spinbutton semantics for assistive
 * technology.
 */
export function NumberField({
  value,
  onValueChange,
  min = 0,
  step = 1,
  id,
  label,
  disabled,
  invalid,
  className,
}: NumberFieldProps) {
  const parsed = Number.parseInt(value, 10)
  const current = Number.isInteger(parsed) ? parsed : null

  function stepBy(delta: number) {
    // An empty or unparseable field steps to the minimum rather than to
    // NaN, so the buttons always do something predictable.
    const next = current === null ? min : current + delta
    onValueChange(String(Math.max(min, next)))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    // Stop the caret jumping to either end of the field, which is what these
    // keys would otherwise do in a text input.
    event.preventDefault()
    stepBy(event.key === 'ArrowUp' ? step : -step)
  }

  return (
    <div
      className={cn(
        'flex h-10 items-center gap-0.5 rounded-xl border-2 border-input bg-card px-1 transition-colors',
        'hover:border-ring/40 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25',
        invalid && 'border-destructive ring-3 ring-destructive/20',
        disabled && 'pointer-events-none opacity-50',
        'dark:bg-input/30',
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Decrease ${label}`}
        disabled={disabled || current === null || current <= min}
        onClick={() => stepBy(-step)}
      >
        <Minus />
      </Button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        role="spinbutton"
        aria-label={label}
        aria-valuemin={min}
        aria-valuenow={current ?? undefined}
        aria-invalid={invalid}
        disabled={disabled}
        value={value}
        // Digits only: a text field would otherwise accept "1e5" or "-", both
        // of which parse to something the caller never asked for.
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, ''))}
        onKeyDown={handleKeyDown}
        className="w-full min-w-0 bg-transparent text-center text-base font-medium tabular-nums outline-none disabled:cursor-not-allowed md:text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Increase ${label}`}
        disabled={disabled}
        onClick={() => stepBy(step)}
      >
        <Plus />
      </Button>
    </div>
  )
}
