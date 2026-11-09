import { Upload } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'

interface FilePickerButtonProps {
  label: string
  accept: string[]
  multiple?: boolean
  disabled?: boolean
  onFiles: (files: File[]) => void
}

/** A button that opens the file chooser; the input itself stays out of sight and out of Tab. */
export function FilePickerButton({ label, accept, multiple = false, disabled, onFiles }: FilePickerButtonProps) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <Button type="button" variant="outline" size="lg" className="h-10 px-4" disabled={disabled} onClick={() => input.current?.click()}>
        <Upload aria-hidden="true" />
        {label}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept.join(',')}
        multiple={multiple}
        hidden
        aria-label={label}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          // Clearing lets the same file be chosen again after a failure.
          event.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
    </>
  )
}
