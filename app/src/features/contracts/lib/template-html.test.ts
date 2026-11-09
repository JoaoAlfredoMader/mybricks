import { describe, expect, it } from 'vitest'
import { cleanTemplateHtml, fillExamples, findUnknownTokens, suggestToken, textOf } from './template-html'

describe('cleanTemplateHtml', () => {
  it('keeps the markup the PDF understands and drops the rest', () => {
    expect(cleanTemplateHtml('<h2>Cláusula 1ª</h2><p>Texto <strong>forte</strong> <em>e</em> <u>sublinhado</u></p><ul><li>um</li></ul>')).toBe(
      '<h2>Cláusula 1ª</h2><p>Texto <strong>forte</strong> <em>e</em> <u>sublinhado</u></p><ul><li>um</li></ul>',
    )
    expect(cleanTemplateHtml('<p style="color:red" onclick="x()">oi <a href="http://x">link</a> <img src=x></p>')).toBe('<p>oi link </p>')
  })

  it('drops scripts and styles with their content, and turns a div into a paragraph', () => {
    expect(cleanTemplateHtml('<script>alert(1)</script><style>p{}</style><div>linha</div>')).toBe('<p>linha</p>')
  })

  it('leaves the text of an unknown tag', () => {
    expect(cleanTemplateHtml('<section><span>dentro</span></section>')).toBe('dentro')
  })

  it('does not run anything it parses', () => {
    const marker = '__ran__'
    cleanTemplateHtml(`<img src="x" onerror="window.${marker}=true">`)
    expect((window as unknown as Record<string, unknown>)[marker]).toBeUndefined()
  })
})

describe('textOf', () => {
  it('reads the text without the tags, and an empty template has none', () => {
    expect(textOf('<h1>CONTRATO</h1><p>Locador <b>{{locador}}</b></p>')).toBe('CONTRATOLocador {{locador}}')
    expect(textOf('<p><br></p>')).toBe('')
  })
})

describe('tokens', () => {
  const known = ['locador', 'locatario', 'data_inicio']

  it('lists the tokens that are not in the catalog, once each', () => {
    expect(findUnknownTokens(known, '<p>{{locador}} e {{locadro}}</p>', '{{ locadro }} {{valor}}')).toEqual(['locadro', 'valor'])
    expect(findUnknownTokens(known, '{{locador}} {{ data_inicio }}')).toEqual([])
  })

  it('suggests the token a typo was probably meant for', () => {
    expect(suggestToken('locadro', known)).toBe('locador')
    expect(suggestToken('data_inicio_', known)).toBe('data_inicio')
    expect(suggestToken('qualquer_coisa', known)).toBeNull()
  })

  it('fills the known tokens with examples, escaped, and leaves an unknown one as typed', () => {
    expect(fillExamples('<p>{{ locador }} / {{locadro}}</p>', { locador: 'Ana <b>&</b> Cia' })).toBe(
      '<p>Ana &lt;b&gt;&amp;&lt;/b&gt; Cia / {{locadro}}</p>',
    )
  })
})
