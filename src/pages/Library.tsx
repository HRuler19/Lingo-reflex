import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Info, Library as LibraryIcon, Pencil, Search, Trash2 } from 'lucide-react'
import { db, type Phrase, type Word } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { EditItemDialog } from '@/components/library/EditItemDialog'
import { PageHeader } from '@/components/PageHeader'
import { Mascot } from '@/components/Mascot'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface DeleteTarget {
  kind: 'word' | 'phrase'
  id: string
  label: string
}

export function Library() {
  const { selectedPairId } = useLanguagePairStore()
  const [search, setSearch] = useState('')
  const [editingWord, setEditingWord] = useState<Word | null>(null)
  const [editingPhrase, setEditingPhrase] = useState<Phrase | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

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
      <PageHeader
        icon={LibraryIcon}
        title="Library"
        description="Every word and phrase you've saved, searchable in one place."
      />

      {!selectedPairId ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
          <Mascot pose="leanWalk" className="h-20 w-auto shrink-0" />
          <span className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" />
            Select a language pair in the header to view its library.
          </span>
        </div>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search words and phrases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs defaultValue="words">
            <TabsList>
              <TabsTrigger value="words">Words ({filteredWords?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="phrases">Phrases ({filteredPhrases?.length ?? 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="words" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredWords?.length ? (
                filteredWords.map((w) => (
                  <div
                    key={w.id}
                    className="group flex items-center justify-between rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-ring/30 hover:bg-accent/40"
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="font-medium">{w.term}</span>
                      <div className="flex flex-wrap gap-1">
                        {w.translations.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit word"
                        onClick={() => setEditingWord(w)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete word"
                        onClick={() => setDeleteTarget({ kind: 'word', id: w.id, label: w.term })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  <Mascot pose="stride" className="h-28 w-auto opacity-90" />
                  {search && words?.length ? 'No words match your search.' : 'No words yet.'}
                </div>
              )}
            </TabsContent>

            <TabsContent value="phrases" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPhrases?.length ? (
                filteredPhrases.map((p) => (
                  <div
                    key={p.id}
                    className="group flex items-center justify-between rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-ring/30 hover:bg-accent/40"
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="font-medium">{p.phrase}</span>
                      <div className="flex flex-wrap gap-1">
                        {p.translations.map((t) => (
                          <Badge key={t} variant="secondary">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit phrase"
                        onClick={() => setEditingPhrase(p)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete phrase"
                        onClick={() => setDeleteTarget({ kind: 'phrase', id: p.id, label: p.phrase })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  <Mascot pose="stride" className="h-28 w-auto opacity-90" />
                  {search && phrases?.length ? 'No phrases match your search.' : 'No phrases yet.'}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {editingWord && (
        <EditItemDialog
          key={editingWord.id}
          open={!!editingWord}
          onOpenChange={(open) => !open && setEditingWord(null)}
          textLabel="Word"
          initialText={editingWord.term}
          initialTranslations={editingWord.translations}
          onSave={(term, translations) => db.words.update(editingWord.id, { term, translations })}
        />
      )}

      {editingPhrase && (
        <EditItemDialog
          key={editingPhrase.id}
          open={!!editingPhrase}
          onOpenChange={(open) => !open && setEditingPhrase(null)}
          textLabel="Phrase"
          initialText={editingPhrase.phrase}
          initialTranslations={editingPhrase.translations}
          onSave={(phrase, translations) =>
            db.phrases.update(editingPhrase.id, { phrase, translations })
          }
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Delete "${deleteTarget.label}"?` : ''}
        description={`This permanently removes this ${deleteTarget?.kind ?? 'item'} from your library. This can't be undone.`}
        onConfirm={() => {
          if (!deleteTarget) return
          if (deleteTarget.kind === 'word') db.words.delete(deleteTarget.id)
          else db.phrases.delete(deleteTarget.id)
        }}
      />
    </div>
  )
}
