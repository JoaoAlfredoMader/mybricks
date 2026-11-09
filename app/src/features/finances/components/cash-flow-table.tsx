import { formatMoney } from '@/lib/format'
import type { CashFlow } from '../api/queries'
import { monthAbbreviated } from '../lib/chart'

const NUMERIC = 'px-3 py-2.5 text-right tabular-nums whitespace-nowrap'

/** Every figure of the chart, month by month: the same data in the form that needs no pointer or colour. */
export function CashFlowTable({ data }: { data: CashFlow }) {
  const sum = (pick: (month: CashFlow['months'][number]) => number) => data.months.reduce((total, month) => total + pick(month), 0)

  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[56rem] text-sm">
        <caption className="sr-only">
          Receitas, despesas e resultado por mês, de {monthAbbreviated(data.from)} a {monthAbbreviated(data.to)}
        </caption>
        <thead>
          <tr className="border-b text-xs whitespace-nowrap text-muted-foreground">
            <th scope="col" className="py-2.5 pr-3 pl-5 text-left font-medium sm:pl-6">Mês</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Aluguel</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Reservas</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Outras receitas</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Receitas</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Despesas fixas</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Outras despesas</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Despesas</th>
            <th scope="col" className="py-2.5 pr-5 pl-3 text-right font-medium sm:pr-6">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {data.months.map((month) => (
            <tr key={month.month} className="border-b">
              <th scope="row" className="py-2.5 pr-3 pl-5 text-left font-medium whitespace-nowrap sm:pl-6">
                {monthAbbreviated(month.month)}
              </th>
              <td className={NUMERIC}>{formatMoney(month.revenue.rentCents)}</td>
              <td className={NUMERIC}>{formatMoney(month.revenue.reservationsCents)}</td>
              <td className={NUMERIC}>{formatMoney(month.revenue.transactionsCents)}</td>
              <td className={`${NUMERIC} font-medium`}>{formatMoney(month.revenue.totalCents)}</td>
              <td className={NUMERIC}>{formatMoney(month.expenses.fixedCents)}</td>
              <td className={NUMERIC}>{formatMoney(month.expenses.transactionsCents)}</td>
              <td className={`${NUMERIC} font-medium`}>{formatMoney(month.expenses.totalCents)}</td>
              <td className={`${NUMERIC} pr-5 font-medium sm:pr-6`}>{formatMoney(month.netCents)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" className="py-2.5 pr-3 pl-5 text-left sm:pl-6">Total</th>
            <td className={NUMERIC}>{formatMoney(sum((m) => m.revenue.rentCents))}</td>
            <td className={NUMERIC}>{formatMoney(sum((m) => m.revenue.reservationsCents))}</td>
            <td className={NUMERIC}>{formatMoney(sum((m) => m.revenue.transactionsCents))}</td>
            <td className={NUMERIC}>{formatMoney(data.totals.revenueCents)}</td>
            <td className={NUMERIC}>{formatMoney(sum((m) => m.expenses.fixedCents))}</td>
            <td className={NUMERIC}>{formatMoney(sum((m) => m.expenses.transactionsCents))}</td>
            <td className={NUMERIC}>{formatMoney(data.totals.expensesCents)}</td>
            <td className={`${NUMERIC} pr-5 sm:pr-6`}>{formatMoney(data.totals.netCents)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
