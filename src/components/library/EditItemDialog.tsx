import { useState } from 'react'
import { X } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface EditItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  textLabel: string
  initialText: string
  initialTranslations: string[]
  onSave: (text: string, translations: string[]) => void
}

/** Shared edit form for a Word's term or a Phrase's sentence, plus its translation list. */
export function EditItemDialog({
  open,
  onOpenChange,
  textLabel,
  initialText,
  initialTranslations,
  onSave,
}: EditItemDialogProps) {
  // Initial-only: the caller mounts a fresh EditItemDialog per item (see the
  // `key` on its call sites), so there's no case where `initialText` etc.
  // change under an already-mounted instance that would need re-syncing.
  const [text, setText] = useState(initialText)
  const [translations, setTranslations] = useState(initialTranslations)
  const [newTranslation, setNewTranslation] = useState('')

  function addTranslation() {
    const value = newTranslation.trim()
    if (!value || translations.includes(value)) return
    setTranslations([...translations, value])
    setNewTranslation('')
  }

  function removeTranslation(value: string) {
    setTranslations(translations.filter((t) => t !== value))
  }

  function handleSave() {
    if (!text.trim() || translations.length === 0) return
    onSave(text.trim(), translations)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {textLabel}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-item-text">{textLabel}</Label>
            <Input id="edit-item-text" value={text} onChange={(e) => setText(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Translations</Label>
            <div className="flex flex-wrap gap-1.5">
              {translations.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1 pr-1">
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTranslation(t)}
                    aria-label={`Remove translation ${t}`}
                    className="rounded-sm hover:bg-foreground/10"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTranslation}
                onChange={(e) => setNewTranslation(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTranslation()
                  }
                }}
                placeholder="Add a translation…"
              />
              <Button type="button" variant="outline" onClick={addTranslation}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!text.trim() || translations.length === 0}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
