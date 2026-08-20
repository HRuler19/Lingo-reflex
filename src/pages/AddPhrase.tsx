import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle } from 'lucide-react'
import { db, newId, type Phrase } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AddPhrase() {
  const { selectedPairId } = useLanguagePairStore()
  const [phrase, setPhrase] = useState('')
  const [translation, setTranslation] = useState('')

  const existing: Phrase | undefined = useLiveQuery(async () => {
    if (!selectedPairId || !phrase.trim()) return undefined
    return db.phrases.where('[pairId+phrase]').equals([selectedPairId, phrase.trim()]).first()
  }, [selectedPairId, phrase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPairId || !phrase.trim() || !translation.trim()) return

    if (existing) {
      await db.phrases.update(existing.id, {
        translations: Array.from(new Set([...existing.translations, translation.trim()])),
      })
    } else {
      await db.phrases.add({
        id: newId('p'),
        pairId: selectedPairId,
        phrase: phrase.trim(),
        translations: [translation.trim()],
        createdAt: Date.now(),
        stats: { correct: 0, wrong: 0 },
      })
    }
    setPhrase('')
    setTranslation('')
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">💬 Add Phrase</h1>

      {!selectedPairId && (
        <p className="text-sm text-muted-foreground">
          Select a language pair in the header before adding phrases.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">New Phrase</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
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

            <Button type="submit" disabled={!selectedPairId || !phrase.trim() || !translation.trim()}>
              Save Phrase
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
