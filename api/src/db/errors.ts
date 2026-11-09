/**
 * What a failed write looks like, whichever driver ran it. libSQL (Node) and D1 (Worker) word their
 * errors the same way (SQLite's messages), but Drizzle wraps them differently, so the cause chain is
 * walked and the message matched.
 */
export type ConstraintViolation =
  | { kind: "unique"; columns: string[] }
  | { kind: "foreign_key" }
  | { kind: "check"; name: string }
  | { kind: "overlap" };

function messages(error: unknown): string[] {
  const found: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 6; depth++) {
    if (current instanceof Error) found.push(current.message);
    current = (current as { cause?: unknown }).cause;
  }
  return found;
}

/** `null` when the error is not a constraint violation (a real failure: let it propagate). */
export function constraintViolation(error: unknown): ConstraintViolation | null {
  for (const message of messages(error)) {
    if (message.includes("reservation_overlap")) return { kind: "overlap" };
    const unique = message.match(/UNIQUE constraint failed: ([^\n]+?)(?:\s*:|$)/);
    if (unique) {
      // "clients.organization_id, clients.document" -> ["organization_id", "document"]
      return { kind: "unique", columns: unique[1]!.split(",").map((part) => part.trim().split(".").pop()!) };
    }
    if (message.includes("FOREIGN KEY constraint failed")) return { kind: "foreign_key" };
    const check = message.match(/CHECK constraint failed: (\S+)/);
    if (check) return { kind: "check", name: check[1]!.replace(/["`]/g, "") };
  }
  return null;
}

export const isUniqueViolation = (error: unknown, column?: string): boolean => {
  const violation = constraintViolation(error);
  return violation?.kind === "unique" && (!column || violation.columns.includes(column));
};
