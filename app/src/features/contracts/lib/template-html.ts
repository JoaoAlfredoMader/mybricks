/**
 * What the contract template editor does with the HTML it handles. The API stays the authority
 * (it sanitizes whatever it receives), but the editor cleans the same way first, so what is on the
 * screen, in the preview and in the request is what the PDF will get.
 */

/** The markup the PDF renderer understands: the same list the API keeps. */
const ALLOWED_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'br', 'strong', 'b', 'em', 'i', 'u'])
/** Dropped with their content, not just unwrapped. */
const DROPPED_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed'])

function copyAllowed(from: Node, to: Node, into: Document) {
  for (const node of Array.from(from.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      to.appendChild(into.createTextNode(node.textContent ?? ''))
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase()
      if (DROPPED_WITH_CONTENT.has(tag)) continue
      // A browser editor wraps lines in <div>; a paragraph is the closest thing.
      const mapped = tag === 'div' ? 'p' : tag
      if (ALLOWED_TAGS.has(mapped)) {
        const element = into.createElement(mapped)
        copyAllowed(node, element, into)
        to.appendChild(element)
      } else {
        // Anything else loses its tag and keeps its text.
        copyAllowed(node, to, into)
      }
    }
  }
}

/** Keeps only the allowed tags, without attributes. Parsed in an inert document, so nothing runs. */
export function cleanTemplateHtml(html: string): string {
  const source = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const target = document.implementation.createHTMLDocument('')
  copyAllowed(source.body, target.body, target)
  return target.body.innerHTML.trim()
}

/** The text of some HTML, as a reader sees it (tags gone, spaces trimmed). */
export function textOf(html: string): string {
  const source = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  return (source.body.textContent ?? '').trim()
}

/** `{{ token }}`, with optional spaces inside the braces: the API's reading. */
const TOKEN = /\{\{\s*([a-z_]+)\s*\}\}/g

/** The tokens used in the texts that are not in the catalog, once each, in order of appearance. */
export function findUnknownTokens(known: readonly string[], ...texts: string[]): string[] {
  const catalog = new Set(known)
  const unknown = new Set<string>()
  for (const text of texts) {
    for (const match of text.matchAll(TOKEN)) {
      if (!catalog.has(match[1]!)) unknown.add(match[1]!)
    }
  }
  return [...unknown]
}

/** Number of single-character edits between two words. */
function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(next[j - 1]! + 1, row[j]! + 1, row[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    row = next
  }
  return row[b.length]!
}

/** The catalog token that `typed` most likely meant, when it is a couple of letters away from one. */
export function suggestToken(typed: string, known: readonly string[]): string | null {
  let best: { token: string; cost: number } | null = null
  for (const token of known) {
    const cost = distance(typed, token)
    if (cost <= 2 && (best === null || cost < best.cost)) best = { token, cost }
  }
  return best?.token ?? null
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/**
 * Fills the known tokens with example values for the preview, escaped, and leaves an unknown token
 * as typed: that is what the PDF does with it, so a typo is visible.
 */
export function fillExamples(html: string, examples: Readonly<Record<string, string>>): string {
  return html.replace(TOKEN, (match, token: string) => (token in examples ? escapeHtml(examples[token]!) : match))
}
