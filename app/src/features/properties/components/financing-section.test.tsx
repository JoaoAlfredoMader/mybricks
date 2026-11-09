import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, json, makeFinancingSchedule, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

// Intl separates the currency sign with a no-break space.
const plain = (value: string | null | undefined) => value?.replace(/ /g, ' ')

const FINANCING = {
  lender: 'Caixa',
  financedAmountCents: 1_200_000,
  termMonths: 24,
  annualInterestRate: 12,
  amortizationSystem: 'sac' as const,
  firstInstallmentOn: '2026-01-10',
}

function financedProperty() {
  return makePropertyRecord({ financing: FINANCING })
}

function section() {
  return screen.getByRole('region', { name: 'Financiamento' })
}

/** The rows of the installment table, cell texts joined by " | ". */
function rows() {
  return within(within(section()).getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => plain(cell.textContent)).join(' | '))
}

describe('Financing schedule', { timeout: 20_000 }, () => {
  it('shows the terms, where the financing stands and this year\'s installments', async () => {
    const property = financedProperty()
    fakeApi({
      session: makeSession(),
      properties: [property],
      handlers: {
        [`GET /api/properties/${property.id}/financing-schedule`]: () => json(makeFinancingSchedule({ paid: 10 })),
      },
    })
    renderRoute(`/app/imoveis/${property.id}`)

    expect(await within(await screen.findByRole('region', { name: 'Financiamento' })).findByRole('table')).toBeInTheDocument()
    const [terms, summary] = section().querySelectorAll('dl')
    expect(plain(terms!.textContent)).toBe(
      'CredorCaixaValor financiadoR$ 12.000Prazo24 mesesJuros12% a.a.AmortizaçãoSACPrimeira parcela10 de janeiro de 2026',
    )
    expect(plain(summary!.textContent)).toBe(
      [
        'Saldo devedorR$ 7.000,00Em 10 de outubro de 2026',
        'Próxima parcelaR$ 570,00Nº 11, vence em 10/11/2026',
        'Pago até agoraR$ 5.975,0010 parcelas',
        'Juros do contratoR$ 1.500,00Somando todas as parcelas',
      ].join(''),
    )
    expect(within(section()).getByRole('progressbar', { name: 'Parcelas pagas' })).toHaveAttribute('aria-valuetext', '10 de 24')

    expect(within(section()).getByRole('table', { name: 'Parcelas com vencimento em 2026' })).toBeInTheDocument()
    expect(rows()).toHaveLength(12)
    expect(rows()[0]).toBe('1 | 10/01/2026 | R$ 620,00 | R$ 120,00 | R$ 500,00 | R$ 11.500,00 | Paga')
    expect(rows()[10]).toBe('11 | 10/11/2026 | R$ 570,00 | R$ 70,00 | R$ 500,00 | R$ 6.500,00 | Próxima')
    expect(rows()[11]).toBe('12 | 10/12/2026 | R$ 565,00 | R$ 65,00 | R$ 500,00 | R$ 6.000,00 | A vencer')
  })

  it('moves between years with the arrows and the menu', async () => {
    const user = userEvent.setup()
    const property = financedProperty()
    fakeApi({
      session: makeSession(),
      properties: [property],
      handlers: {
        [`GET /api/properties/${property.id}/financing-schedule`]: () => json(makeFinancingSchedule({ paid: 3 })),
      },
    })
    renderRoute(`/app/imoveis/${property.id}`)

    await screen.findByRole('table', { name: 'Parcelas com vencimento em 2026' })
    expect(screen.getByRole('button', { name: 'Ano anterior' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Próximo ano' }))
    expect(screen.getByRole('table', { name: 'Parcelas com vencimento em 2027' })).toBeInTheDocument()
    expect(rows()[0]).toMatch(/^13 \| 10\/01\/2027 .* A vencer$/)
    expect(rows().at(-1)).toMatch(/^24 \| 10\/12\/2027 .* R\$ 0,00 \| A vencer$/)
    expect(screen.getByRole('button', { name: 'Próximo ano' })).toBeDisabled()

    await user.click(screen.getByRole('combobox', { name: 'Ano das parcelas' }))
    await user.click(await screen.findByRole('option', { name: '2026' }))
    expect(await screen.findByRole('table', { name: 'Parcelas com vencimento em 2026' })).toBeInTheDocument()
  })

  it('says when the financing is paid off and opens on its last year', async () => {
    const property = financedProperty()
    fakeApi({
      session: makeSession(),
      properties: [property],
      handlers: {
        [`GET /api/properties/${property.id}/financing-schedule`]: () => json(makeFinancingSchedule({ paid: 24 })),
      },
    })
    renderRoute(`/app/imoveis/${property.id}`)

    expect(await screen.findByRole('table', { name: 'Parcelas com vencimento em 2027' })).toBeInTheDocument()
    expect(within(section()).getByText('Quitado')).toBeInTheDocument()
    expect(within(section()).getByText('Todas as parcelas já venceram')).toBeInTheDocument()
    expect(rows().every((row) => row.endsWith('Paga'))).toBe(true)
  })

  it('keeps the terms on screen and offers a retry when the schedule fails', async () => {
    const user = userEvent.setup()
    const property = financedProperty()
    let fail = true
    fakeApi({
      session: makeSession(),
      properties: [property],
      handlers: {
        [`GET /api/properties/${property.id}/financing-schedule`]: () =>
          fail ? json({ error: { code: 'INTERNAL', message: 'boom' } }, 500) : json(makeFinancingSchedule({ paid: 1 })),
      },
    })
    renderRoute(`/app/imoveis/${property.id}`)

    const alert = await within(await screen.findByRole('region', { name: 'Financiamento' })).findByRole('alert', {}, { timeout: 8000 })
    expect(alert).toHaveTextContent('Não foi possível carregar as parcelas.')
    expect(within(section()).getByText('Caixa')).toBeInTheDocument()

    fail = false
    await user.click(within(alert).getByRole('button', { name: 'Tentar de novo' }))
    expect(await within(section()).findByRole('table')).toBeInTheDocument()
  })

  it('does not ask for a schedule when there is no financing', async () => {
    const property = makePropertyRecord({ financing: null })
    const api = fakeApi({ session: makeSession(), properties: [property] })
    renderRoute(`/app/imoveis/${property.id}`)

    await screen.findByRole('heading', { level: 1, name: 'Apartamento Centro' })
    expect(screen.queryByRole('region', { name: 'Financiamento' })).not.toBeInTheDocument()
    expect(api.calls.some((call) => call.path.endsWith('/financing-schedule'))).toBe(false)
  })
})
