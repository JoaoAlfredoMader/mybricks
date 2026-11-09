import { type SQL, type SQLWrapper, sql } from "drizzle-orm";

/**
 * Query helpers that hide SQLite/D1 differences from Postgres, so the repositories read the same way.
 */

/** D1 allows 100 bound parameters per statement: long `IN (...)` lists and multi-row inserts go in chunks. */
export const D1_MAX_PARAMETERS = 100;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

/** Escapes `%`, `_` and the escape character itself, so user text is matched literally by LIKE. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Case-insensitive "contains" (Prisma's `contains` + `mode: "insensitive"`). SQLite's LIKE ignores case
 * for ASCII letters, which covers names and e-mails; accented capitals are not folded.
 */
export function containsInsensitive(column: SQLWrapper, term: string): SQL {
  return sql`${column} LIKE ${`%${escapeLike(term)}%`} ESCAPE '\\'`;
}

/** Case-sensitive "contains" (documents are stored upper case and searched upper case). */
export function containsSensitive(column: SQLWrapper, term: string): SQL {
  return sql`instr(${column}, ${term}) > 0`;
}

/** Lower case with the accents stripped: "São Paulo" -> "sao paulo". What `cities.name_search` stores. */
export function searchKey(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}
