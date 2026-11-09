import { Link } from '@tanstack/react-router'
import type { Ref } from 'react'

const REPOSITORIES = {
  backEnd: 'https://github.com/JoaoAlfredoMader/my-bricks-back-end',
  frontEnd: 'https://github.com/JoaoAlfredoMader/my-bricks-front-end',
}

// Placeholder copy: the author will replace it with the real story.
const CHAPTERS = [
  {
    title: 'Como começou',
    body: 'O MyBricks nasceu como um protótipo feito com uma ferramenta de IA. Funcionava, mas o código não era meu. Decidi recriá-lo do zero, na minha própria stack, para entender e decidir cada parte.',
  },
  {
    title: 'O que ele resolve',
    body: 'Quem administra alguns imóveis costuma espalhar tudo entre planilhas, pastas e conversas. O MyBricks reúne imóveis, clientes, contratos de locação, reservas de temporada e despesas, e calcula o que importa: rendimento, cap rate, NOI e TIR.',
  },
  {
    title: 'Como foi construído',
    body: 'A API é própria, documentada em OpenAPI e testada contra respostas reais. O front-end usa um cliente gerado direto desse contrato, então a tela e o servidor falam a mesma língua. As decisões estão registradas nos repositórios.',
  },
] as const

interface StoryProps {
  ref?: Ref<HTMLElement>
}

export function Story({ ref }: StoryProps) {
  return (
    <section ref={ref} id="historia" aria-labelledby="story-title" className="scroll-mt-4 px-6 py-24 sm:px-12 sm:py-32">
      <div className="mx-auto max-w-5xl">
        <h2 id="story-title" className="max-w-[18ch] text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl">
          Uma carteira de imóveis, do contrato ao rendimento.
        </h2>

        <div className="mt-20 flex flex-col gap-16 sm:mt-28">
          {CHAPTERS.map((chapter) => (
            <article key={chapter.title} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-12">
              <h3 className="text-2xl font-semibold tracking-tight">{chapter.title}</h3>
              <p className="max-w-[62ch] text-lg leading-relaxed text-pretty text-(--muted)">{chapter.body}</p>
            </article>
          ))}

          <article className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-12">
            <h3 className="text-2xl font-semibold tracking-tight">Experimente sem cadastro</h3>
            <div className="flex flex-col gap-8">
              <p className="max-w-[62ch] text-lg leading-relaxed text-pretty text-(--muted)">
                Entre como convidado e explore uma carteira de demonstração com 9 imóveis, contratos e reservas. Ela fica
                disponível por 24 horas e, se você criar uma conta, tudo o que fez é mantido.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex h-12 items-center rounded-full bg-(--ink) px-6 font-semibold text-(--paper)"
                >
                  Entrar como convidado
                </Link>
                <Link
                  to="/login"
                  className="inline-flex h-12 items-center rounded-full border border-current/25 px-6 font-semibold"
                >
                  Entrar com e-mail
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-current/10 px-6 py-10 sm:px-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 text-(--muted) sm:flex-row sm:items-center sm:justify-between">
        <p>MyBricks é um projeto de portfólio.</p>
        <nav aria-label="Código-fonte" className="flex gap-6">
          <a href={REPOSITORIES.backEnd} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
            Código da API
          </a>
          <a href={REPOSITORIES.frontEnd} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
            Código do site
          </a>
        </nav>
      </div>
    </footer>
  )
}
