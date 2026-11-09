import { cn } from 'cn'
import { Bold, Italic, List, ListOrdered, Underline } from 'lucide-react'
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DOCUMENT_TYPOGRAPHY } from './document-typography'

export interface EditorHandle {
  /** Types `text` where the cursor is, or at the end when the editor has none. */
  insert: (text: string) => void
}

interface RichTextEditorProps {
  label: string
  /** The HTML to start from, already cleaned. Changing it later does nothing: remount with a new `key` to reset. */
  initialHtml: string
  onChange: (html: string) => void
  onFocus?: () => void
  disabled?: boolean
  /** Taller, for the clauses. */
  size?: 'compact' | 'large'
  invalid?: boolean
  describedBy?: string | undefined
  ref?: Ref<EditorHandle>
}

type Tool = { label: string; icon?: typeof Bold; text?: string; command: string; value?: string }

const TOOLS: Tool[] = [
  { label: 'Título', text: 'Título', command: 'formatBlock', value: 'h1' },
  { label: 'Subtítulo', text: 'Subtítulo', command: 'formatBlock', value: 'h2' },
  { label: 'Texto', text: 'Texto', command: 'formatBlock', value: 'p' },
  { label: 'Negrito', icon: Bold, command: 'bold' },
  { label: 'Itálico', icon: Italic, command: 'italic' },
  { label: 'Sublinhado', icon: Underline, command: 'underline' },
  { label: 'Lista', icon: List, command: 'insertUnorderedList' },
  { label: 'Lista numerada', icon: ListOrdered, command: 'insertOrderedList' },
]

/**
 * A small visual editor for the only markup a contract takes: titles, paragraphs, lists, bold,
 * italic and underline. The content lives in the DOM (it is not rewritten on every keystroke, so
 * the cursor stays put) and is handed to `onChange` as HTML; pasting always brings plain text.
 */
export function RichTextEditor({ label, initialHtml, onChange, onFocus, disabled = false, size = 'compact', invalid, describedBy, ref }: RichTextEditorProps) {
  const element = useRef<HTMLDivElement>(null)
  // Only the first value is ever put in the DOM. The caller keeps what is typed and passes it back as
  // `initialHtml`; if that reached the element, React would rewrite the text on every keystroke and
  // the cursor would jump to the start.
  const [start] = useState(initialHtml)

  useEffect(() => {
    // New lines become paragraphs, not <div>s, and bold and the like become tags, not inline styles.
    // Not every browser has these commands; none needs them (the API cleans the HTML either way).
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p')
      document.execCommand('styleWithCSS', false, 'false')
    } catch {
      /* nothing to do */
    }
  }, [])

  function report() {
    if (element.current) onChange(element.current.innerHTML)
  }

  function run(command: string, value?: string) {
    if (!element.current || disabled) return
    element.current.focus()
    document.execCommand(command, false, value)
    report()
  }

  useImperativeHandle(ref, () => ({
    insert(text) {
      const target = element.current
      if (!target || disabled) return
      target.focus()
      const selection = window.getSelection()
      if (selection && (selection.rangeCount === 0 || !target.contains(selection.anchorNode))) {
        const range = document.createRange()
        range.selectNodeContents(target)
        range.collapse(false)
        selection.removeAllRanges()
        selection.addRange(range)
      }
      document.execCommand('insertText', false, text)
      report()
    },
  }))

  return (
    <div className="grid gap-2">
      <div role="toolbar" aria-label={`Formatação de ${label.toLowerCase()}`} className="flex flex-wrap gap-1">
        {TOOLS.map(({ label: name, icon: Icon, text, command, value }) => (
          <Button
            key={name}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={name}
            title={name}
            // Keep the selection in the text: clicking a button would otherwise take the focus away.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(command, value)}
          >
            {Icon ? <Icon aria-hidden="true" /> : text}
          </Button>
        ))}
      </div>
      <div
        ref={element}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        aria-disabled={disabled || undefined}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder="Escreva aqui"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          'rounded-2xl border border-input bg-card px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20',
          size === 'large' ? 'max-h-[34rem] min-h-72 overflow-y-auto' : 'min-h-20',
          disabled && 'cursor-not-allowed opacity-70',
          DOCUMENT_TYPOGRAPHY,
        )}
        onInput={report}
        onFocus={onFocus}
        onPaste={(event) => {
          // Whatever the text came from, only its words are kept.
          event.preventDefault()
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
        }}
        dangerouslySetInnerHTML={{ __html: start }}
      />
    </div>
  )
}
