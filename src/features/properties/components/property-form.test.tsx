import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeApi, json, makePropertyRecord, makeSession } from '@/test/fake-api'
import { renderRoute } from '@/test/render-route'

type User = ReturnType<typeof userEvent.setup>

/** Opens a select, picks an option and waits for the menu to close (it blocks clicks while open). */
async function pick(user: User, field: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: field }))
  await user.click(await screen.findByRole('option', { name: option }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

function sectionTitles() {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
}

// Filling a long form through the UI takes a few seconds when the whole suite runs at once.
describe('Property form', { timeout: 20_000 }, () => {
  it('creates a property from what was typed and opens it', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession(), clients: [{ id: 'client-1', name: 'Marina Prado' }] })
    const { router } = renderRoute('/app/imoveis/novo')

    await user.type(await screen.findByLabelText('Nome'), 'Studio Pinheiros')
    await pick(user, 'Tipo', 'Residencial')
    await pick(user, 'Subtipo', 'Apartamento')
    await pick(user, 'Uso', 'Locação')

    await user.type(screen.getByLabelText('Cidade'), 'São')
    await user.click(await screen.findByRole('option', { name: /São Paulo/ }))
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    await user.type(screen.getByLabelText('Rua'), 'Rua dos Pinheiros')
    await user.type(screen.getByLabelText('Área privativa'), '38,5')
    await user.type(screen.getByLabelText('Valor estimado'), '450.000')
    await user.type(screen.getByLabelText('Aluguel mensal'), '2.500')
    await pick(user, 'Forma de aquisição', 'Compra')
    await user.type(screen.getByLabelText('Data'), '10032022')
    expect(screen.getByLabelText('Data')).toHaveValue('10/03/2022')
    await pick(user, 'Cliente', 'Marina Prado')

    await user.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Studio Pinheiros' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/app\/imoveis\/0{8}-/)
    expect(api.callsTo('/api/properties').find((call) => call.method === 'POST')?.body).toMatchObject({
      name: 'Studio Pinheiros',
      propertyType: 'residential',
      subtypeId: 1,
      usageType: 'rental',
      address: { cityId: 3550308, street: 'Rua dos Pinheiros' },
      privateArea: 38.5,
      estimatedValueCents: 45_000_000,
      manualRental: { monthlyRentCents: 250_000 },
      acquisition: { acquisitionType: 'purchase', acquiredOn: '2022-03-10' },
      financing: null,
      clientId: 'client-1',
    })
  })

  it('shows what is missing without calling the API', async () => {
    const user = userEvent.setup()
    const api = fakeApi({ session: makeSession() })
    renderRoute('/app/imoveis/novo')

    await user.click(await screen.findByRole('button', { name: 'Cadastrar imóvel' }))

    expect(await screen.findByText('Dê um nome com pelo menos 2 letras.')).toBeInTheDocument()
    expect(screen.getByText('Escolha o tipo do imóvel.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveFocus()
    expect(api.calls.some((call) => call.method === 'POST')).toBe(false)
  })

  it('offers only the usages and subtypes of the chosen type', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession() })
    renderRoute('/app/imoveis/novo')

    expect(await screen.findByRole('combobox', { name: 'Uso' })).toHaveAttribute('data-disabled')
    await pick(user, 'Tipo', 'Terreno')
    expect(screen.getByRole('combobox', { name: 'Subtipo' })).toHaveAttribute('data-disabled')

    await user.click(screen.getByRole('combobox', { name: 'Uso' }))
    const options = within(await screen.findByRole('listbox')).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Uso próprio', 'Arrendamento rural'])
  })

  it('opens the rent, financing and insurance fields only when they apply', async () => {
    const user = userEvent.setup()
    fakeApi({ session: makeSession() })
    renderRoute('/app/imoveis/novo')

    await screen.findByRole('combobox', { name: 'Tipo' })
    await pick(user, 'Tipo', 'Residencial')
    await pick(user, 'Uso', 'Uso próprio')
    expect(sectionTitles()).not.toContain('Aluguel')

    await pick(user, 'Uso', 'Locação')
    expect(sectionTitles()).toContain('Aluguel')
    await user.click(screen.getByRole('radio', { name: 'Do contrato ativo' }))
    expect(screen.queryByLabelText('Aluguel mensal')).not.toBeInTheDocument()

    expect(screen.queryByRole('switch', { name: /Foi financiado/ })).not.toBeInTheDocument()
    await pick(user, 'Forma de aquisição', 'Compra')
    await user.click(screen.getByRole('switch', { name: /Foi financiado/ }))
    expect(sectionTitles()).toContain('Financiamento')
    await pick(user, 'Forma de aquisição', 'Herança')
    expect(sectionTitles()).not.toContain('Financiamento')

    expect(screen.queryByLabelText('Seguro')).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: /Tem seguro/ }))
    expect(screen.getByLabelText('Seguro')).toBeInTheDocument()
  })

  it('puts the API rule errors under their fields, in Portuguese', async () => {
    const user = userEvent.setup()
    fakeApi({
      session: makeSession(),
      handlers: {
        'POST /api/properties': () =>
          json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request',
                details: [
                  { path: 'usageType', message: 'This usage is not allowed for the property type' },
                  { path: 'somethingElse', message: 'Unknown rule' },
                ],
              },
            },
            400,
          ),
      },
    })
    renderRoute('/app/imoveis/novo')

    await user.type(await screen.findByLabelText('Nome'), 'Kitnet')
    await pick(user, 'Tipo', 'Residencial')
    await pick(user, 'Uso', 'Locação')
    await user.click(screen.getByRole('button', { name: 'Cadastrar imóvel' }))

    expect(await screen.findByText('Este uso não vale para o tipo escolhido.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('A API recusou este valor. Revise e tente de novo.')
  })

  it('edits a property starting from what is stored, and sends cleared fields as null', async () => {
    const user = userEvent.setup()
    const property = makePropertyRecord({
      financing: {
        lender: 'Caixa',
        financedAmountCents: 36_000_000,
        termMonths: 360,
        annualInterestRate: 9.5,
        amortizationSystem: 'sac',
        firstInstallmentOn: '2021-06-13',
      },
    })
    const api = fakeApi({ session: makeSession(), properties: [property] })
    const { router } = renderRoute(`/app/imoveis/${property.id}/editar`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Editar Apartamento Centro' })).toBeInTheDocument()
    expect(screen.getByLabelText('Valor estimado')).toHaveValue('680.000,00')
    expect(screen.getByLabelText('Cidade')).toHaveValue('São Paulo – SP')
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveTextContent('Residencial')

    await user.clear(screen.getByLabelText('Valor estimado'))
    await user.type(screen.getByLabelText('Valor estimado'), '700.000')
    await user.click(screen.getByRole('switch', { name: /Foi financiado/ }))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/app/imoveis/${property.id}`))
    const patch = api.calls.find((call) => call.method === 'PATCH')?.body
    expect(patch).toMatchObject({ estimatedValueCents: 70_000_000, financing: null, name: 'Apartamento Centro' })
    expect(await screen.findByText('R$ 700 mil', { normalizer: (t) => t.replace(/ /g, ' ') })).toBeInTheDocument()
  })

  describe('sale', () => {
    it('asks for consent before turning the switch on, and cancelling leaves it off', async () => {
      const user = userEvent.setup()
      fakeApi({ session: makeSession() })
      renderRoute('/app/imoveis/novo')

      const toggle = await screen.findByRole('switch', { name: 'À venda' })
      expect(screen.queryByLabelText('Preço de venda')).not.toBeInTheDocument()

      await user.click(toggle)
      const dialog = await screen.findByRole('alertdialog')
      expect(within(dialog).getByText('Este imóvel aparecerá em formato de anúncio nesta plataforma.')).toBeInTheDocument()
      expect(within(dialog).getByText('O bairro e a cidade')).toBeInTheDocument()
      expect(within(dialog).getByText('A rua e o número')).toBeInTheDocument()
      expect(toggle).not.toBeChecked()

      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(toggle).not.toBeChecked()
      expect(screen.queryByLabelText('Preço de venda')).not.toBeInTheDocument()

      await user.click(toggle)
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Anunciar' }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(toggle).toBeChecked()
      expect(screen.getByLabelText('Preço de venda')).toBeInTheDocument()
    })

    it('tells what the listing still lacks, and to add a photo after saving', async () => {
      const user = userEvent.setup()
      fakeApi({ session: makeSession() })
      renderRoute('/app/imoveis/novo')

      await user.click(await screen.findByRole('switch', { name: 'À venda' }))
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Anunciar' }))

      const gaps = await screen.findByTestId('listing-gaps')
      expect(gaps).toHaveTextContent('Adicione ao menos uma foto depois de salvar.')
      expect(gaps).toHaveTextContent('Informe a cidade e o bairro')
      expect(gaps).toHaveTextContent('Informe a área privativa ou a total')

      await user.type(screen.getByLabelText('Área total'), '60')
      expect(gaps).not.toHaveTextContent('Informe a área')
      expect(gaps).toHaveTextContent('Informe a cidade e o bairro')
    })

    it('needs a price, then sends it with the consent', async () => {
      const user = userEvent.setup()
      const property = makePropertyRecord()
      const api = fakeApi({ session: makeSession(), properties: [property] })
      const { router } = renderRoute(`/app/imoveis/${property.id}/editar`)

      await user.click(await screen.findByRole('switch', { name: 'À venda' }))
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Anunciar' }))
      await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

      expect(await screen.findByText('Informe o preço de venda.')).toBeInTheDocument()
      expect(screen.getByLabelText('Preço de venda')).toHaveFocus()
      expect(api.calls.some((call) => call.method === 'PATCH')).toBe(false)

      await user.type(screen.getByLabelText('Preço de venda'), '450.000')
      await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

      await waitFor(() => expect(router.state.location.pathname).toBe(`/app/imoveis/${property.id}`))
      expect(api.calls.find((call) => call.method === 'PATCH')?.body).toMatchObject({
        forSale: { priceCents: 45_000_000, consent: true },
      })
    })

    it('does not ask again for a property that is already for sale', async () => {
      const user = userEvent.setup()
      const property = makePropertyRecord({
        forSale: { priceCents: 45_000_000, consentedAt: '2026-11-01T10:00:00.000Z', status: 'live', missing: [] },
      })
      const api = fakeApi({ session: makeSession(), properties: [property] })
      renderRoute(`/app/imoveis/${property.id}/editar`)

      const toggle = await screen.findByRole('switch', { name: 'À venda' })
      expect(toggle).toBeChecked()
      expect(screen.getByLabelText('Preço de venda')).toHaveValue('450.000,00')

      await user.click(toggle)
      expect(toggle).not.toBeChecked()
      await user.click(toggle)
      expect(toggle).toBeChecked()
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
      await waitFor(() => expect(api.calls.some((call) => call.method === 'PATCH')).toBe(true))
    })
  })

  it('links to the form from the list and from the property', async () => {
    const property = makePropertyRecord()
    fakeApi({ session: makeSession(), properties: [property] })
    renderRoute('/app/imoveis')

    expect(await screen.findByRole('link', { name: 'Novo imóvel' })).toHaveAttribute('href', '/app/imoveis/novo')
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Apartamento Centro' }))
    expect(await screen.findByRole('link', { name: 'Editar' })).toHaveAttribute('href', `/app/imoveis/${property.id}/editar`)
  })
})
