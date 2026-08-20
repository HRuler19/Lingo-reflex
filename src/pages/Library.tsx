import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2 } from 'lucide-react'
import { db } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function Library() {
  const { selectedPairId } = useLanguagePairStore()
  const [search, setSearch] = useState('')

  const words = useLiveQuery(
    () => (selectedPairId ? db.words.where('pairId').equals(selectedPairId).toArray() : []),
    [selectedPairId],
  )
  const phrases = useLiveQuery(
    () => (selectedPairId ? db.phrases.where('pairId').equals(selectedPairId).toArray() : []),
    [selectedPairId],
  )

  const filteredWords = words?.filter((w) =>
    w.term.toLowerCase().includes(search.toLowerCase()),
  )
  const filteredPhrases = phrases?.filter((p) =>
    p.phrase.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">📚 Library</h1>

      {!selectedPairId ? (
        <p className="text-sm text-muted-foreground">
          Select a language pair in the header to view its library.
        </p>
      ) : (
        <>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          <Tabs defaultValue="words">
            <TabsList>
              <TabsTrigger value="words">Words ({filteredWords?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="phrases">Phrases ({filteredPhrases?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="words" className="flex flex-col gap-2">
              {filteredWords?.length ? (
                filteredWords.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{w.term}</span>
                      <div className="flex flex-wrap gap-1">
                        {w.translations.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete word"
                      onClick={() => db.words.delete(w.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">No words yet.</p>
              )}
            </TabsContent>

            <TabsContent value="phrases" className="flex flex-col gap-2">
              {filteredPhrases?.length ? (
                filteredPhrases.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{p.phrase}</span>
                      <div className="flex flex-wrap gap-1">
                        {p.translations.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete phrase"
                      onClick={() => db.phrases.delete(p.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="p-4 text-center text-sm text-muted-foreground">No phrases yet.</p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
