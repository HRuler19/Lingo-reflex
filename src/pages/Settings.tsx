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
import { db, newId, type LanguagePair } from '@/db/schema'
import { useLanguagePairStore } from '@/store/language-pair-store'
import { runDbAction } from '@/store/toast-store'
import {
  downloadTextFile,
  exportCsv,
  exportJson,
  importCsv,
  importJson,
  type ImportSummary,
} from '@/lib/backup'
import { PageHeader } from '@/components/PageHeader'
import { Mascot } from '@/components/Mascot'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

type StatusMessage = { kind: 'success' | 'error'; text: string }

/**
 * Which parser a chosen file needs, decided by what is actually in it.
 *
 * The file extension is a hint, not a fact — a CSV saved as .txt used to be
 * handed to the JSON parser and reported as a raw syntax error. A backup is
 * always a JSON object, so the first non-space character settles it.
 */
function looksLikeJson(text: string): boolean {
  return text.trimStart().startsWith('{')
}

/** Reports what an import did, including the records it refused. */
function describeImport(filename: string, summary: ImportSummary): string {
  const entries = `${summary.imported} ${summary.imported === 1 ? 'entry' : 'entries'}`
  const skipped = summary.skipped > 0 ? `, ${summary.skipped} skipped as unreadable` : ''
  return `Imported ${filename} — ${entries}${skipped}.`
}

export function Settings() {
  const pairs = useLiveQuery(() => db.languagePairs.toArray(), [])
  const { selectedPairId, selectPair } = useLanguagePairStore()
  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('')
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [pairToDelete, setPairToDelete] = useState<LanguagePair | null>(null)
  // Held rather than imported on selection: an import merges over what is
  // already stored and can overwrite existing entries, which makes it as
  // destructive as the deletes on this page — and those all confirm first.
  const [fileToImport, setFileToImport] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAddPair(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceLang.trim() || !targetLang.trim()) return
    const id = newId('pair')
    const added = await runDbAction(
      () =>
        db.languagePairs.add({
          id,
          sourceLanguage: sourceLang.trim(),
          targetLanguage: targetLang.trim(),
          createdAt: Date.now(),
        }),
      { errorMessage: 'Could not add that language pair.' },
    )
    if (!added) return
    if (!selectedPairId) selectPair(id)
    setSourceLang('')
    setTargetLang('')
  }

  async function handleDeletePair(id: string) {
    const deleted = await runDbAction(
      () =>
        db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
          await db.languagePairs.delete(id)
          await db.words.where('pairId').equals(id).delete()
          await db.phrases.where('pairId').equals(id).delete()
          await db.sessions.where('pairId').equals(id).delete()
        }),
      { errorMessage: 'Could not delete that language pair.' },
    )
    if (!deleted) return
    if (selectedPairId === id) selectPair(null)
  }

  const today = () => new Date().toISOString().slice(0, 10)

  async function handleExport(kind: 'json' | 'csv') {
    try {
      const content = kind === 'json' ? await exportJson() : await exportCsv()
      const filename = `lexipulse-${kind === 'json' ? 'backup' : 'export'}-${today()}.${kind}`
      const mimeType = kind === 'json' ? 'application/json' : 'text/csv'

      // On desktop this opens a native save dialog, which the user can
      // cancel — that isn't an error, so say nothing in that case.
      const saved = await downloadTextFile(content, filename, mimeType)
      if (saved) {
        setStatus({ kind: 'success', text: `Exported ${filename}.` })
      }
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not export your data.',
      })
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Cleared straight away so picking the same file twice still fires a
    // change event — otherwise a cancelled import can't be retried.
    e.target.value = ''
    if (file) setFileToImport(file)
  }

  async function handleConfirmImport(file: File) {
    try {
      const text = await file.text()
      const summary = looksLikeJson(text) ? await importJson(text) : await importCsv(text)
      setStatus({ kind: 'success', text: describeImport(file.name, summary) })
    } catch (err) {
      setStatus({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Could not import this file.',
      })
    }
  }

  async function handleConfirmReset() {
    const cleared = await runDbAction(
      () =>
        db.transaction('rw', db.languagePairs, db.words, db.phrases, db.sessions, async () => {
          await db.languagePairs.clear()
          await db.words.clear()
          await db.phrases.clear()
          await db.sessions.clear()
        }),
      { errorMessage: 'Could not clear your data.' },
    )
    if (!cleared) return
    selectPair(null)
    setStatus(null)
    setResetDialogOpen(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon={SettingsIcon} title="Settings" description="Manage your language pairs and data." />

      <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Mascot pose="hipPointSide" className="h-24 w-auto shrink-0" />
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
                    onClick={() => setPairToDelete(pair)}
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
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <Mascot pose="presentSide" className="h-24 w-auto shrink-0" />
          <CardTitle className="text-sm font-semibold">Data Portability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-start gap-2" onClick={() => handleExport('json')}>
              <Download className="size-4" /> Export JSON
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={() => handleExport('csv')}>
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

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Clear all local data?"
        description="This permanently deletes every language pair, word, phrase, and practice session stored in this browser. This can't be undone — export a backup first if you're not sure."
        confirmLabel="Delete Everything"
        onConfirm={handleConfirmReset}
      />

      <ConfirmDialog
        open={!!fileToImport}
        onOpenChange={(open) => !open && setFileToImport(null)}
        title={fileToImport ? `Import "${fileToImport.name}"?` : ''}
        description="Entries already in your library are merged with what this file contains — matching ones have their translations and stats combined, and a full JSON backup overwrites them outright. Export a backup first if you're not sure."
        confirmLabel="Import"
        onConfirm={() => fileToImport && void handleConfirmImport(fileToImport)}
      />

      <ConfirmDialog
        open={!!pairToDelete}
        onOpenChange={(open) => !open && setPairToDelete(null)}
        title={pairToDelete ? `Delete "${pairToDelete.sourceLanguage} → ${pairToDelete.targetLanguage}"?` : ''}
        description="This permanently deletes this language pair along with all of its words, phrases, and practice sessions. This can't be undone."
        onConfirm={() => pairToDelete && handleDeletePair(pairToDelete.id)}
      />
    </div>
  )
}
