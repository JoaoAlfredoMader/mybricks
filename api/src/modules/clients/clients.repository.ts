import { type SQL, and, asc, count, eq, or } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { PersonType } from "../../db/enums.js";
import { isUniqueViolation } from "../../db/errors.js";
import { containsInsensitive, containsSensitive } from "../../db/helpers.js";
import { clients, properties } from "../../db/schema.js";
import { AppError } from "../../shared/errors/app-error.js";

export interface ClientRecord {
  id: string;
  createdById: string;
  name: string;
  personType: PersonType;
  document: string | null;
  email: string | null;
  whatsapp: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Every query is bound to one organization; members are further limited to what they created. */
export interface ClientScope {
  organizationId: string;
  createdById?: string;
}

export interface ClientListQuery {
  search?: string;
  personType?: PersonType;
  skip: number;
  take: number;
}

export interface ClientData {
  name: string;
  personType: PersonType;
  document: string | null;
  email: string | null;
  whatsapp: string | null;
}

export interface ClientsRepository {
  list(scope: ClientScope, query: ClientListQuery): Promise<{ items: ClientRecord[]; total: number }>;
  findById(scope: ClientScope, id: string): Promise<ClientRecord | null>;
  create(scope: ClientScope & { createdById: string }, data: ClientData): Promise<ClientRecord>;
  update(scope: ClientScope, id: string, data: Partial<ClientData>): Promise<ClientRecord | null>;
  countProperties(scope: ClientScope, id: string): Promise<number>;
  delete(scope: ClientScope, id: string): Promise<boolean>;
}

const columns = {
  id: clients.id,
  createdById: clients.createdById,
  name: clients.name,
  personType: clients.personType,
  document: clients.document,
  email: clients.email,
  whatsapp: clients.whatsapp,
  createdAt: clients.createdAt,
  updatedAt: clients.updatedAt,
};

function whereFor(scope: ClientScope): SQL {
  return and(
    eq(clients.organizationId, scope.organizationId),
    scope.createdById ? eq(clients.createdById, scope.createdById) : undefined,
  )!;
}

/** `(organization_id, document)` is unique: a second client with the same CPF/CNPJ is a conflict. */
function translateWriteError(error: unknown): never {
  if (isUniqueViolation(error, "document")) {
    throw AppError.conflict("A client with this document already exists", { field: "document" });
  }
  throw error;
}

/** Repository layer: the only place that talks to the database. */
export function createClientsRepository(db: Database): ClientsRepository {
  return {
    async list(scope, { search, personType, skip, take }) {
      const where = and(
        whereFor(scope),
        personType ? eq(clients.personType, personType) : undefined,
        search
          ? or(
              containsInsensitive(clients.name, search),
              containsSensitive(clients.document, search.toUpperCase()),
              containsInsensitive(clients.email, search),
            )
          : undefined,
      );
      const [items, [totalRow]] = await Promise.all([
        db.select(columns).from(clients).where(where).orderBy(asc(clients.name)).limit(take).offset(skip),
        db.select({ value: count() }).from(clients).where(where),
      ]);
      return { items, total: totalRow?.value ?? 0 };
    },

    async findById(scope, id) {
      const [row] = await db.select(columns).from(clients).where(and(whereFor(scope), eq(clients.id, id))).limit(1);
      return row ?? null;
    },

    async create(scope, data) {
      try {
        const [row] = await db
          .insert(clients)
          .values({ ...data, organizationId: scope.organizationId, createdById: scope.createdById })
          .returning(columns);
        return row!;
      } catch (error) {
        return translateWriteError(error);
      }
    },

    async update(scope, id, data) {
      try {
        // The scope is in the filter, so a record outside it is simply not touched.
        const [row] = await db
          .update(clients)
          .set(Object.keys(data).length > 0 ? data : { updatedAt: new Date() })
          .where(and(whereFor(scope), eq(clients.id, id)))
          .returning(columns);
        return row ?? null;
      } catch (error) {
        return translateWriteError(error);
      }
    },

    async countProperties(scope, id) {
      const [row] = await db
        .select({ value: count() })
        .from(properties)
        .where(and(eq(properties.organizationId, scope.organizationId), eq(properties.clientId, id)));
      return row?.value ?? 0;
    },

    async delete(scope, id) {
      const removed = await db.delete(clients).where(and(whereFor(scope), eq(clients.id, id))).returning({ id: clients.id });
      return removed.length > 0;
    },
  };
}
