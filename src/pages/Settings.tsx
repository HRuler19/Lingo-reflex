import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, Download, Upload, DatabaseZap } from 'lucide-react'
import { db, newId } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function Settings() {
  const pairs = useLiveQuery(() => db.languagePairs.toArray(), [])
  const { selectedPairId, selectPair } = useLanguagePairStore()
  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAddPair(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceLang.trim() || !targetLang.trim()) return
    const id = await db.languagePairs.add({
      id: newId('pair'),
      sourceLanguage: sourceLang.trim(),
      targetLanguage: targetLang.trim(),
      createdAt: Date.now(),
    })
    if (!selectedPairId) selectPair(id)
    setSourceLang('')
    setTargetLang('')
  }

  async function handleDeletePair(id: string) {
    await db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
      await db.languagePairs.delete(id)
      await db.words.where('pairId').equals(id).delete()
      await db.phrases.where('pairId').equals(id).delete()
      await db.sessions.where('pairId').equals(id).delete()
    })
    if (selectedPairId === id) selectPair(null)
  }

  async function handleExport() {
    const data = {
      languagePairs: await db.languagePairs.toArray(),
      words: await db.words.toArray(),
      phrases: await db.phrases.toArray(),
      sessions: await db.sessions.toArray(),
      exportedAt: Date.now(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lexipulse-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const data = JSON.parse(text)
    await db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
      if (data.languagePairs) await db.languagePairs.bulkPut(data.languagePairs)
      if (data.words) await db.words.bulkPut(data.words)
      if (data.phrases) await db.phrases.bulkPut(data.phrases)
      if (data.sessions) await db.sessions.bulkPut(data.sessions)
    })
    e.target.value = ''
  }

  async function handleReset() {
    if (!confirm('This will permanently delete all local data. Continue?')) return
    await db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
      await db.languagePairs.clear()
      await db.words.clear()
      await db.phrases.clear()
      await db.sessions.clear()
    })
    selectPair(null)
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight">⚙️ Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Language Pairs</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="flex items-end gap-2" onSubmit={handleAddPair}>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="source-lang">Source</Label>
              <Input
                id="source-lang"
                placeholder="English"
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="target-lang">Target</Label>
              <Input
                id="target-lang"
                placeholder="Turkmen"
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!sourceLang.trim() || !targetLang.trim()}>
              Add
            </Button>
          </form>

          <div className="flex flex-col gap-2">
            {pairs?.length ? (
              pairs.map((pair) => (
                <div
                  key={pair.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <span>
                    {pair.sourceLanguage} → {pair.targetLanguage}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete pair"
                    onClick={() => handleDeletePair(pair.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No language pairs yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Data Portability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button variant="outline" className="justify-start gap-2" onClick={handleExport}>
            <Download className="size-4" /> Export Data (JSON)
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" /> Import Data (JSON)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          <Separator className="my-1" />

          <Button variant="destructive" className="justify-start gap-2" onClick={handleReset}>
            <DatabaseZap className="size-4" /> Clear / Reset Database
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
