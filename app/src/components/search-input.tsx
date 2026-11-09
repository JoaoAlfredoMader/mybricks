import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'

const SEARCH_DELAY_MS = 300

interface SearchInputProps {
  label: string
  /** What the URL holds now: the box follows it (back button, "Limpar filtros"). */
  value: string | undefined
  /** Called a moment after typing stops, with the trimmed text or `undefined` when empty. */
  onSearch: (value: string | undefined) => void
}

/** A search box that answers as you type; the URL (and the request) follows a moment later. */
export function SearchInput({ label, value, onSearch }: SearchInputProps) {
  const [text, setText] = useState(value ?? '')
  // Follow the URL without trimming what is being typed.
  const [urlValue, setUrlValue] = useState(value)
  if (urlValue !== value) {
    setUrlValue(value)
    if ((text.trim() || undefined) !== value) setText(value ?? '')
  }
  useEffect(() => {
    const next = text.trim() || undefined
    if (next === value) return
    const timer = setTimeout(() => onSearch(next), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text, value, onSearch])

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={label}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="h-10 pl-10"
      />
    </div>
  )
}
