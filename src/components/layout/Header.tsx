import { useLiveQuery } from 'dexie-react-hooks'
import { Moon, Sun } from 'lucide-react'
import { db } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { useThemeStore } from '@/store/theme-store'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function Header() {
  const pairs = useLiveQuery(() => db.languagePairs.toArray(), [])
  const { selectedPairId, selectPair } = useLanguagePairStore()
  const { theme, toggleTheme } = useThemeStore()

  return (
    // min-h-14 (not h-14) + a safe-area-aware padding-top: on a notched/
    // Dynamic Island iPhone in the native shell, this bar would otherwise
    // render underneath the status bar instead of below it. `env()` is 0px
    // in a plain browser, so this is a no-op there.
    <header className="flex min-h-14 shrink-0 items-center gap-2 border-b px-4 pt-[env(safe-area-inset-top)]">
      <SidebarTrigger aria-label="Toggle sidebar" />

      {/* Base UI's Select defaults to (and treats as controlled) value={null}
          for "nothing selected" — no need for a '' sentinel workaround. */}
      <Select value={selectedPairId} onValueChange={selectPair}>
        <SelectTrigger className="w-48" size="sm" aria-label="Language pair">
          <SelectValue placeholder="Select language pair">
            {(value: string | null) => {
              const pair = pairs?.find((p) => p.id === value)
              return pair ? `${pair.sourceLanguage} → ${pair.targetLanguage}` : 'Select language pair'
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {pairs?.length ? (
            pairs.map((pair) => (
              <SelectItem key={pair.id} value={pair.id}>
                {pair.sourceLanguage} → {pair.targetLanguage}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No language pairs yet
            </div>
          )}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle dark mode"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
    </header>
  )
}
