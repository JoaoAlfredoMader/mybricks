import { Link } from '@tanstack/react-router'
import { StatusBadge } from '@/features/properties/components/status-badge'
import { IRR_UNAVAILABLE, USAGE_LABEL } from '@/features/properties/lib/labels'
import { formatRate, formatWholeMoney } from '@/lib/format'
import type { PropertyKpis } from '../api/portfolio-kpis'

/** Highest value first; properties without a value go last. */
function byValue(a: PropertyKpis, b: PropertyKpis) {
  return (b.estimatedValueCents ?? -1) - (a.estimatedValueCents ?? -1)
}

const NUMERIC = 'px-4 py-3 text-right tabular-nums whitespace-nowrap'

export function PropertiesTable({ properties }: { properties: PropertyKpis[] }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[56rem] text-sm">
        <caption className="sr-only">Indicadores por imóvel, do maior valor estimado para o menor</caption>
        <thead>
          <tr className="border-b text-xs whitespace-nowrap text-muted-foreground">
            <th scope="col" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">Imóvel</th>
            <th scope="col" className="px-4 py-3 text-left font-medium">Situação</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Valor estimado</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Receita/ano</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">NOI/ano</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Yield bruto</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Cap rate</th>
            <th scope="col" className="py-3 pr-5 pl-4 text-right font-medium sm:pr-6">TIR</th>
          </tr>
        </thead>
        <tbody>
          {[...properties].sort(byValue).map((property) => {
            const irrReason = property.irr.unavailableReason
            return (
              <tr key={property.propertyId} className="border-b last:border-b-0 hover:bg-muted/50">
                <th scope="row" className="py-3 pr-4 pl-5 text-left font-medium sm:pl-6">
                  <Link
                    to="/app/imoveis/$propertyId"
                    params={{ propertyId: property.propertyId }}
                    className="rounded-sm hover:underline hover:underline-offset-4"
                  >
                    {property.name}
                  </Link>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {USAGE_LABEL[property.usageType]}
                    {property.ownershipPercentage < 100 && ` · ${property.ownershipPercentage}% seu`}
                    {!property.includedInPortfolio && ' · fora do rendimento'}
                  </span>
                </th>
                <td className="px-4 py-3">
                  <StatusBadge status={property.status} />
                </td>
                <td className={NUMERIC}>
                  {property.estimatedValueCents === null ? '—' : formatWholeMoney(property.estimatedValueCents)}
                </td>
                <td className={NUMERIC}>{formatWholeMoney(property.annualRevenueCents)}</td>
                <td className={NUMERIC}>{formatWholeMoney(property.noiCents)}</td>
                <td className={NUMERIC}>{formatRate(property.grossYield)}</td>
                <td className={NUMERIC}>{formatRate(property.capRate)}</td>
                <td className="py-3 pr-5 pl-4 text-right tabular-nums whitespace-nowrap sm:pr-6">
                  {irrReason ? (
                    <span title={IRR_UNAVAILABLE[irrReason]}>
                      —<span className="sr-only">{IRR_UNAVAILABLE[irrReason]}</span>
                    </span>
                  ) : (
                    formatRate(property.irr.annualRate)
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
