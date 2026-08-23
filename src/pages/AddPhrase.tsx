import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Info, MessageSquarePlus } from 'lucide-react'
import { db, newId, type Phrase } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { runDbAction } from '@/store/toast-store'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { PageHeader } from '@/components/PageHeader'
import { RecentlyAddedPanel } from '@/components/RecentlyAddedPanel'
import { Mascot } from '@/components/Mascot'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const RECENT_COUNT = 8

export function AddPhrase() {
  const { selectedPairId } = useLanguagePairStore()
  const [phrase, setPhrase] = useState('')
  const [translation, setTranslation] = useState('')

  // Debounced: this is an indexed lookup per keystroke otherwise, and the
  // answer is only shown once the user pauses anyway.
  const debouncedPhrase = useDebouncedValue(phrase)
  const existing: Phrase | undefined = useLiveQuery(async () => {
    if (!selectedPairId || !debouncedPhrase.trim()) return undefined
    return db.phrases
      .where('[pairId+phrase]')
      .equals([selectedPairId, debouncedPhrase.trim()])
      .first()
  }, [selectedPairId, debouncedPhrase])

  const recentPhrases = useLiveQuery(async () => {
    if (!selectedPairId) return []
    return db.phrases
      .where('pairId')
      .equals(selectedPairId)
      .reverse()
      .sortBy('createdAt')
      .then((rows) => rows.slice(0, RECENT_COUNT))
  }, [selectedPairId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPairId || !phrase.trim() || !translation.trim()) return

    const trimmedPhrase = phrase.trim()
    const trimmedTranslation = translation.trim()

    const saved = await runDbAction(
      async () => {
        // Re-read rather than trusting the `existing` shown above: that query
        // is debounced, so submitting straight after typing can race ahead of
        // it and would otherwise insert a duplicate row.
        const current = await db.phrases
          .where('[pairId+phrase]')
          .equals([selectedPairId, trimmedPhrase])
          .first()

        if (current) {
          await db.phrases.update(current.id, {
            translations: Array.from(new Set([...current.translations, trimmedTranslation])),
          })
        } else {
          await db.phrases.add({
            id: newId('p'),
            pairId: selectedPairId,
            phrase: trimmedPhrase,
            translations: [trimmedTranslation],
            createdAt: Date.now(),
            stats: { correct: 0, wrong: 0 },
          })
        }
      },
      { errorMessage: `Could not save "${trimmedPhrase}".` },
    )

    // Only clear the form once the write actually committed, so a failure
    // doesn't silently discard what the user typed.
    if (!saved) return
    setPhrase('')
    setTranslation('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={MessageSquarePlus}
        title="Add Phrase"
        description="Save full phrases and sentences you want to internalize."
      />

      {!selectedPairId && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Mascot pose="jumpCheer" className="h-20 w-auto shrink-0" />
          <span className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" />
            Select a language pair in the header before adding phrases.
          </span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <Card>
          <CardContent>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phrase">Phrase / Sentence</Label>
                <Input
                  id="phrase"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  placeholder="e.g. As far as I know"
                  disabled={!selectedPairId}
                />
              </div>

              {existing && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div className="flex flex-col gap-1.5">
                    <span>This phrase already exists. New translation will be appended.</span>
                    <div className="flex flex-wrap gap-1">
                      {existing.translations.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="translation">Translation</Label>
                <Input
                  id="translation"
                  value={translation}
                  onChange={(e) => setTranslation(e.target.value)}
                  placeholder="e.g. Meň bilşime görä"
                  disabled={!selectedPairId}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!selectedPairId || !phrase.trim() || !translation.trim()}
              >
                Save Phrase
              </Button>
            </form>
          </CardContent>
        </Card>

        <RecentlyAddedPanel
          title="Recently Added Phrases"
          items={recentPhrases?.map((p) => ({ id: p.id, text: p.phrase, translations: p.translations }))}
          emptyLabel="Phrases you add will show up here."
          emptyPose="reachAttention"
        />
      </div>
    </div>
  )
}
