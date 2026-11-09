import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, makePropertyRecord, makeSession, makeTransaction } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

type User = ReturnType<typeof userEvent.setup>

async function pick(user: User, field: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: field }))
  await user.click(await screen.findByRole('option', { name: option }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

// Filling a long form through the UI takes a few seconds when the whole suite runs at once.
describe('New transaction', { timeout: 20_000 }, () => {
  it('records a monthly expense from the property page and goes back to it', async () => {
    const user = userEvent.setup()
    const centro = makePropertyRecord()
    const api = fakeApi({ session: makeSession(), properties: [centro] })
    const { router } = renderRoute(`/app/financas/novo?propertyId=${centro.id}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Novo lançamento' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Imóvel' })).toHaveTextContent('Apartamento Centro')

    await user.click(screen.getByRole('button', { name: 'Cadastrar lançamento' }))
    expect(await screen.findByText('Escolha a categoria.')).toBeInTheDocument()
    expect(screen.getByText('Informe o valor.')).toBeInTheDocument()
    expect(screen.getByText('Informe a data.')).toBeInTheDocument()

    await pick(user, 'Categoria', 'Parcela de financiamento')
    await user.type(screen.getByLabelText('Valor'), '3.850,00')
    await user.type(screen.getByLabelText('Data'), '13062021')
    await user.click(screen.getByRole('switch', { name: /Repete todo mês/ }))
    expect(screen.getByLabelText('Primeira ocorrência')).toHaveValue('13/06/2021')
    await user.type(screen.getByLabelText('Repete até'), '13052021')
    await user.click(screen.getByRole('button', { name: 'Cadastrar lançamento' }))
    expect(await screen.findByText('O fim não pode ser antes da primeira ocorrência.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Repete até'))
    await user.type(screen.getByLabelText('Repete até'), '13052051')
    await user.click(screen.getByRole('button', { name: 'Cadastrar lançamento' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/app/imoveis/${centro.id}`))
    expect(api.calls.find((call) => call.method === 'POST')?.body).toEqual({
      propertyId: centro.id,
      categoryId: 6,
      amountCents: 385_000,
      occurredOn: '2021-06-13',
      description: null,
      isRecurring: true,
      recurrenceEndsOn: '2051-05-13',
    })
    expect(await within(await screen.findByRole('region', { name: 'Lançamentos' })).findByText('Parcela de financiamento')).toBeInTheDocument()
  })

  it('offers the categories of the chosen type and drops one of the other type', async () => {
    const user = userEvent.setup()
    const centro = makePropertyRecord()
    const api = fakeApi({ session: makeSession(), properties: [centro] })
    const { router } = renderRoute('/app/financas/novo')

    await screen.findByRole('heading', { level: 1, name: 'Novo lançamento' })
    await pick(user, 'Imóvel', 'Apartamento Centro')
    await pick(user, 'Categoria', 'Reforma')
    await user.click(screen.getByRole('radio', { name: 'Receita' }))
    expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveTextContent('Escolha a categoria')

    await user.click(screen.getByRole('combobox', { name: 'Categoria' }))
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual(['Indenização', 'Venda de imóvel'])
    await user.click(screen.getByRole('option', { name: 'Indenização' }))
    await user.type(screen.getByLabelText('Valor'), '5.000')
    await user.type(screen.getByLabelText('Data'), '25092026')
    await user.type(screen.getByLabelText('Descrição'), 'Danos causados por hóspede')
    await user.click(screen.getByRole('button', { name: 'Cadastrar lançamento' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/app/financas'))
    expect(api.calls.find((call) => call.method === 'POST')?.body).toMatchObject({
      categoryId: 4,
      amountCents: 500_000,
      description: 'Danos causados por hóspede',
      isRecurring: false,
      recurrenceEndsOn: null,
    })
  })
})

describe('Editing a transaction', { timeout: 20_000 }, () => {
  it('starts from what is stored, and turning the recurrence off drops its end', async () => {
    const user = userEvent.setup()
    const transaction = makeTransaction({ isRecurring: true, recurrenceEndsOn: '2027-01-23' })
    const api = fakeApi({ session: makeSession(), transactions: [transaction] })
    renderRoute(`/app/financas/${transaction.id}/editar`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar reforma' })).toBeInTheDocument()
    expect(screen.getByText('Apartamento Centro', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Imóvel' })).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Despesa' })).toBeChecked()
    expect(screen.getByLabelText('Valor')).toHaveValue('12.000,00')
    expect(screen.getByLabelText('Repete até')).toHaveValue('23/01/2027')

    await user.click(screen.getByRole('switch', { name: /Repete todo mês/ }))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(api.calls.some((call) => call.method === 'PATCH')).toBe(true))
    expect(api.calls.find((call) => call.method === 'PATCH')?.body).toEqual({
      categoryId: 7,
      amountCents: 1_200_000,
      occurredOn: '2026-10-23',
      description: 'Pintura geral',
      isRecurring: false,
      recurrenceEndsOn: null,
    })
  })

  it('deletes the transaction after confirming and goes back to the list', async () => {
    const user = userEvent.setup()
    const transaction = makeTransaction()
    const other = makeTransaction({ categoryId: 8, categoryName: 'Obra' })
    const api = fakeApi({ session: makeSession(), transactions: [transaction, other] })
    const { router } = renderRoute(`/app/financas/${transaction.id}/editar`)

    await user.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Excluir este lançamento?' })
    expect(dialog).toHaveTextContent('todas as ocorrências saem junto')
    await user.click(within(dialog).getByRole('button', { name: 'Excluir lançamento' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/app/financas'))
    expect(await screen.findByText(/^1 lançamento,/)).toBeInTheDocument()
    expect(api.state.transactions).toEqual([other])
  })

  it('offers no delete while an admin is seeing the app as someone else', async () => {
    const transaction = makeTransaction()
    fakeApi({ session: makeSession({ impersonatedById: 'admin-1' }), transactions: [transaction] })
    renderRoute(`/app/financas/${transaction.id}/editar`)

    await screen.findByRole('heading', { level: 1, name: 'Editar reforma' })
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument()
  })

  it('says so when the transaction is not in this portfolio', async () => {
    fakeApi({ session: makeSession() })
    renderRoute('/app/financas/00000000-0000-4000-c000-999999999999/editar')

    expect(await screen.findByRole('heading', { level: 1, name: 'Lançamento não encontrado' })).toBeInTheDocument()
  })
})
