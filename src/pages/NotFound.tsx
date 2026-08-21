import { Link } from 'react-router-dom'
import { Mascot } from '@/components/Mascot'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <Mascot pose="scratchHead" className="h-48 w-auto" />
      <h1 className="text-xl font-extrabold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">
        There's nothing at this address — it may have been moved or never existed.
      </p>
      <Link to="/" className={cn(buttonVariants({ size: 'lg' }), 'mt-2')}>
        Back to Dashboard
      </Link>
    </div>
  )
}
