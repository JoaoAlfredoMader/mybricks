import { Combobox } from '@base-ui/react/combobox'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ControlProps } from '@/components/form/field'
import { formatDocument } from '@/lib/format'
import { type Occupant, occupantsQueryOptions } from '../api/queries'

const SEARCH_DELAY_MS = 250

interface OccupantComboboxProps {
  control: ControlProps
  value: Occupant | null
  onChange: (occupant: Occupant | null) => void
}

/** Find a tenant or guest already on file by name, CPF/CNPJ or e-mail. */
export function OccupantCombobox({ control, value, onChange }: OccupantComboboxProps) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const term = query.trim()
    // The input shows the chosen occupant's name; that is not a new search.
    if (value && term === value.name) return
    const timer = setTimeout(() => setSearch(term), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [query, value])

  const occupants = useQuery(occupantsQueryOptions(search))
  const items = occupants.data?.items ?? []

  return (
    <Combobox.Root<Occupant>
      items={items}
      value={value}
      onValueChange={(occupant) => onChange(occupant)}
      inputValue={query}
      onInputValueChange={setQuery}
      filter={null}
      itemToStringLabel={(occupant) => occupant.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Combobox.Input
          {...control}
          placeholder="Nome, CPF/CNPJ ou e-mail"
          className="h-10 w-full rounded-full border border-input bg-card pr-4 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
        />
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} align="start" className="isolate z-50">
          <Combobox.Popup className="max-h-72 w-(--anchor-width) overflow-y-auto rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-lg shadow-slate-900/8 ring-1 ring-foreground/8">
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">
              {items.length === 0 ? (occupants.isFetching ? 'Buscando…' : 'Ninguém encontrado com isso') : null}
            </Combobox.Empty>
            <Combobox.List>
              {(occupant: Occupant) => (
                <Combobox.Item
                  key={occupant.id}
                  value={occupant}
                  className="flex cursor-default items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-selected:font-medium"
                >
                  <span className="truncate">{occupant.name}</span>
                  {(occupant.document || occupant.email) && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {occupant.document ? formatDocument(occupant.document) : occupant.email}
                    </span>
                  )}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
