import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Info, PlusCircle } from 'lucide-react'
import { db, newId, type Word } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function AddWord() {
  const { selectedPairId } = useLanguagePairStore()
  const [term, setTerm] = useState('')
  const [translation, setTranslation] = useState('')

  const existing: Word | undefined = useLiveQuery(async () => {
    if (!selectedPairId || !term.trim()) return undefined
    return db.words.where('[pairId+term]').equals([selectedPairId, term.trim()]).first()
  }, [selectedPairId, term])

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
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader icon={PlusCircle} title="Add Word" description="Build your vocabulary, one word at a time." />

      {!selectedPairId && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          Select a language pair in the header before adding words.
        </div>
      )}

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
    </div>
  )
}
