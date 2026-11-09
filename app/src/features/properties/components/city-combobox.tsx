import { Combobox } from '@base-ui/react/combobox'
import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ControlProps } from '@/components/form/field'
import { citiesQueryOptions } from '../api/queries'
import type { CityOption } from '../lib/property-form'

const SEARCH_DELAY_MS = 250

function cityLabel(city: CityOption) {
  return `${city.name} – ${city.state}`
}

interface CityComboboxProps {
  control: ControlProps
  value: CityOption | null
  onChange: (city: CityOption | null) => void
}

/** Type part of a city's name and pick it from the IBGE list the API serves. */
export function CityCombobox({ control, value, onChange }: CityComboboxProps) {
  const [query, setQuery] = useState(value ? cityLabel(value) : '')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const term = query.trim()
    // The input shows the chosen city's label; that is not a new search.
    if (value && term === cityLabel(value)) return
    const timer = setTimeout(() => setSearch(term), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [query, value])

  const cities = useQuery(citiesQueryOptions(search))
  const items: CityOption[] = (cities.data ?? []).map((city) => ({ id: city.ibgeCode, name: city.name, state: city.state }))

  const empty =
    search.length < 2 ? 'Digite pelo menos 2 letras' : cities.isFetching ? 'Buscando…' : 'Nenhuma cidade com esse nome'

  return (
    <Combobox.Root<CityOption>
      items={items}
      value={value}
      onValueChange={(city) => onChange(city)}
      inputValue={query}
      onInputValueChange={setQuery}
      filter={null}
      itemToStringLabel={cityLabel}
      isItemEqualToValue={(a, b) => a.id === b.id}
    >
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Combobox.Input
          {...control}
          placeholder="Digite o nome da cidade"
          className="h-10 w-full rounded-full border border-input bg-card pr-4 pl-10 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm"
        />
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} align="start" className="isolate z-50">
          <Combobox.Popup className="max-h-72 w-(--anchor-width) overflow-y-auto rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-lg shadow-slate-900/8 ring-1 ring-foreground/8">
            <Combobox.Empty className="px-3 py-2 text-sm text-muted-foreground empty:hidden">
              {items.length === 0 ? empty : null}
            </Combobox.Empty>
            <Combobox.List>
              {(city: CityOption) => (
                <Combobox.Item
                  key={city.id}
                  value={city}
                  className="flex cursor-default items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-selected:font-medium"
                >
                  {city.name}
                  <span className="text-xs text-muted-foreground">{city.state}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
