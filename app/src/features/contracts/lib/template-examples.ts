import { formatDate } from '@/lib/format'

/** Values for the preview: a made-up contract, so the tokens read like a real one. The PDF uses the real contract's. */
export function templateExamples(today: Date = new Date()): Record<string, string> {
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    locador: 'Maria Oliveira',
    documento_locador: '529.982.247-25',
    locatario: 'Ana Carolina Souza',
    documento_locatario: '390.533.447-05',
    imovel: 'Apartamento Centro',
    endereco: 'Avenida Paulista, 1500, apto 82, Bela Vista, São Paulo, SP',
    valor_mensal: 'R$ 3.800,00',
    dia_vencimento: '5',
    indice_reajuste: 'IGP-M',
    data_inicio: '8 de janeiro de 2026',
    data_fim: '7 de janeiro de 2028',
    data_emissao: formatDate(`${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`),
  }
}
