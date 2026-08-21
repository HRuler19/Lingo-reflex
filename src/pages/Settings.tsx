import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Download,
  Upload,
  DatabaseZap,
  Languages,
  SettingsIcon,
} from 'lucide-react'
import { db, newId } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { downloadTextFile, exportCsv, exportJson, importCsv, importJson } from '@/lib/backup'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type StatusMessage = { kind: 'success' | 'error'; text: string }

export function Settings() {
  const pairs = useLiveQuery(() => db.languagePairs.toArray(), [])
  const { selectedPairId, selectPair } = useLanguagePairStore()
  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
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

  async function handleExportJson() {
    const json = await exportJson()
    downloadTextFile(json, `lexipulse-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
  }

  async function handleExportCsv() {
    const csv = await exportCsv()
    downloadTextFile(csv, `lexipulse-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv')
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const isCsv = file.name.toLowerCase().endsWith('.csv')

    try {
      const text = await file.text()
      if (isCsv) {
        await importCsv(text)
      } else {
        await importJson(text)
      }
      setStatus({ kind: 'success', text: `Imported ${file.name} successfully.` })
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not import this file.',
      })
    } finally {
      e.target.value = ''
    }
  }

  async function handleConfirmReset() {
    await db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
      await db.languagePairs.clear()
      await db.words.clear()
      await db.phrases.clear()
      await db.sessions.clear()
    })
    selectPair(null)
    setStatus(null)
    setResetDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={SettingsIcon} title="Settings" description="Manage your language pairs and data." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Languages className="size-4 text-muted-foreground" /> Language Pairs
          </CardTitle>
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
                  className="group flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:border-ring/30 hover:bg-accent/40"
                >
                  <span className="font-medium">
                    {pair.sourceLanguage} <span className="text-muted-foreground">→</span>{' '}
                    {pair.targetLanguage}
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
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No language pairs yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Data Portability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start gap-2" onClick={handleExportJson}>
              <Download className="size-4" /> Export JSON
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={handleExportCsv}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          <Button
            variant="outline"
            className="justify-start gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" /> Import Data (JSON or CSV)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,text/csv,.csv"
            className="hidden"
            onChange={handleImportFile}
          />

          {status && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                status.kind === 'success'
                  ? 'border-success/30 bg-success/10'
                  : 'border-destructive/30 bg-destructive/10'
              }`}
            >
              {status.kind === 'success' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <span>{status.text}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            JSON is a full backup (every pair, session, and stat) meant for restoring on this same
            app. CSV holds just words and phrases and is meant for moving vocabulary to or from
            spreadsheets and other tools.
          </p>

          <Separator className="my-1" />

          <Button
            variant="destructive"
            className="justify-start gap-2"
            onClick={() => setResetDialogOpen(true)}
          >
            <DatabaseZap className="size-4" /> Clear / Reset Database
          </Button>
        </CardContent>
      </Card>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> Clear all local data?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This permanently deletes every language pair, word, phrase, and practice session
            stored in this browser. This can't be undone — export a backup first if you're not
            sure.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReset}>
              Delete Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
