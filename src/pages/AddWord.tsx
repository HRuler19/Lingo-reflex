import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Info, PlusCircle } from 'lucide-react'
import { db, newId, type Word } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { PageHeader } from '@/components/PageHeader'
import { RecentlyAddedPanel } from '@/components/RecentlyAddedPanel'
import { Mascot } from '@/components/Mascot'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const RECENT_COUNT = 8

export function AddWord() {
  const { selectedPairId } = useLanguagePairStore()
  const [term, setTerm] = useState('')
  const [translation, setTranslation] = useState('')

  const existing: Word | undefined = useLiveQuery(async () => {
    if (!selectedPairId || !term.trim()) return undefined
    return db.words.where('[pairId+term]').equals([selectedPairId, term.trim()]).first()
  }, [selectedPairId, term])

  const recentWords = useLiveQuery(async () => {
    if (!selectedPairId) return []
    return db.words
      .where('pairId')
      .equals(selectedPairId)
      .reverse()
      .sortBy('createdAt')
      .then((rows) => rows.slice(0, RECENT_COUNT))
  }, [selectedPairId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPairId || !term.trim() || !translation.trim()) return

    if (existing) {
      await db.words.update(existing.id, {
        translations: Array.from(new Set([...existing.translations, translation.trim()])),
      })
    } else {
      await db.words.add({
        id: newId('w'),
        pairId: selectedPairId,
        term: term.trim(),
        translations: [translation.trim()],
        createdAt: Date.now(),
        stats: { correct: 0, wrong: 0 },
      })
    }
    setTerm('')
    setTranslation('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={PlusCircle} title="Add Word" description="Build your vocabulary, one word at a time." />

      {!selectedPairId && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Mascot pose="pointUpEager" className="h-20 w-auto shrink-0" />
          <span className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" />
            Select a language pair in the header before adding words.
          </span>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
        <Card>
          <CardContent>
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="term">Word</Label>
                <Input
                  id="term"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="e.g. Relentless"
                  disabled={!selectedPairId}
                />
              </div>

              {existing && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div className="flex flex-col gap-1.5">
                    <span>This word already exists. New translation will be appended.</span>
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
                  placeholder="e.g. Yadawsyz"
                  disabled={!selectedPairId}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!selectedPairId || !term.trim() || !translation.trim()}
              >
                Save Word
              </Button>
            </form>
          </CardContent>
        </Card>

        <RecentlyAddedPanel
          title="Recently Added Words"
          items={recentWords?.map((w) => ({ id: w.id, text: w.term, translations: w.translations }))}
          emptyLabel="Words you add will show up here."
          emptyPose="pointSideConfident"
        />
      </div>
    </div>
  )
}
