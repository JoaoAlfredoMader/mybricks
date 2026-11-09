import { type SQL, and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { atomic } from "../../db/atomic.js";
import type { Database } from "../../db/database.js";
import { properties, propertyDocuments, storedFiles } from "../../db/schema.js";

export interface DocumentRecord {
  id: string;
  propertyId: string;
  category: string | null;
  createdAt: Date;
  file: { storageKey: string; fileName: string; mimeType: string; sizeBytes: bigint };
}

/** Documents belong to a property: members only reach those of properties they created. */
export interface DocumentScope {
  organizationId: string;
  propertyCreatedById?: string;
}

export interface NewDocumentFile {
  uploadedById: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DocumentsRepository {
  propertyVisible(scope: DocumentScope, propertyId: string): Promise<boolean>;
  list(scope: DocumentScope, propertyId: string, filter: { category?: string }): Promise<DocumentRecord[]>;
  findById(scope: DocumentScope, propertyId: string, id: string): Promise<DocumentRecord | null>;
  /** Records the file and attaches it to the property, in one transaction. */
  create(scope: DocumentScope, propertyId: string, file: NewDocumentFile, category: string | null): Promise<DocumentRecord>;
  updateCategory(scope: DocumentScope, propertyId: string, id: string, category: string | null): Promise<DocumentRecord | null>;
  /** Removes the document and its file record. Returns the storage key so the caller can delete the object. */
  delete(scope: DocumentScope, propertyId: string, id: string): Promise<{ storageKey: string } | null>;
}

/** Repository layer: the only place that talks to the database. */
export function createDocumentsRepository(db: Database): DocumentsRepository {
  const propertyScope = (scope: DocumentScope): SQL =>
    and(
      eq(properties.organizationId, scope.organizationId),
      scope.propertyCreatedById ? eq(properties.createdById, scope.propertyCreatedById) : undefined,
    ) as SQL;

  /** A document is visible when its property is. */
  const whereFor = (scope: DocumentScope, propertyId: string): SQL =>
    and(
      eq(propertyDocuments.propertyId, propertyId),
      inArray(propertyDocuments.propertyId, db.select({ id: properties.id }).from(properties).where(propertyScope(scope))),
    ) as SQL;

  async function load(where: SQL): Promise<DocumentRecord[]> {
    const rows = await db
      .select({
        id: propertyDocuments.id,
        propertyId: propertyDocuments.propertyId,
        category: propertyDocuments.category,
        createdAt: propertyDocuments.createdAt,
        storageKey: storedFiles.storageKey,
        fileName: storedFiles.fileName,
        mimeType: storedFiles.mimeType,
        sizeBytes: storedFiles.sizeBytes,
      })
      .from(propertyDocuments)
      .innerJoin(storedFiles, eq(storedFiles.id, propertyDocuments.fileId))
      .where(where)
      .orderBy(desc(propertyDocuments.createdAt), asc(propertyDocuments.id));
    return rows.map(({ storageKey, fileName, mimeType, sizeBytes, ...document }) => ({
      ...document,
      file: { storageKey, fileName, mimeType, sizeBytes },
    }));
  }

  return {
    async propertyVisible(scope, propertyId) {
      const [row] = await db.select({ id: properties.id }).from(properties).where(and(propertyScope(scope), eq(properties.id, propertyId)));
      return row !== undefined;
    },

    list(scope, propertyId, { category }) {
      return load(
        and(
          whereFor(scope, propertyId),
          // Case-insensitive equality; SQLite folds the case of ASCII letters only.
          category ? sql`${propertyDocuments.category} = ${category} collate nocase` : undefined,
        ) as SQL,
      );
    },

    async findById(scope, propertyId, id) {
      return (await load(and(whereFor(scope, propertyId), eq(propertyDocuments.id, id)) as SQL))[0] ?? null;
    },

    async create(scope, propertyId, file, category) {
      const fileId = crypto.randomUUID();
      const documentId = crypto.randomUUID();
      // The stored file and the document go in ONE batch: all of them or none.
      await atomic(db, [
        db.insert(storedFiles).values({ ...file, id: fileId, organizationId: scope.organizationId, sizeBytes: BigInt(file.sizeBytes) }),
        db.insert(propertyDocuments).values({ id: documentId, organizationId: scope.organizationId, propertyId, fileId, category }),
      ]);
      const [created] = await load(eq(propertyDocuments.id, documentId));
      if (!created) throw new Error("The document that was just created could not be read back");
      return created;
    },

    async updateCategory(scope, propertyId, id, category) {
      const updated = await db
        .update(propertyDocuments)
        .set({ category })
        .where(and(whereFor(scope, propertyId), eq(propertyDocuments.id, id)))
        .returning({ id: propertyDocuments.id });
      if (updated.length === 0) return null;
      return (await load(and(whereFor(scope, propertyId), eq(propertyDocuments.id, id)) as SQL))[0] ?? null;
    },

    async delete(scope, propertyId, id) {
      const [document] = await db
        .select({ fileId: propertyDocuments.fileId, storageKey: storedFiles.storageKey })
        .from(propertyDocuments)
        .innerJoin(storedFiles, eq(storedFiles.id, propertyDocuments.fileId))
        .where(and(whereFor(scope, propertyId), eq(propertyDocuments.id, id)));
      if (!document) return null;
      // The document goes before its file (the foreign key would refuse the opposite order); both or neither.
      await atomic(db, [db.delete(propertyDocuments).where(eq(propertyDocuments.id, id)), db.delete(storedFiles).where(eq(storedFiles.id, document.fileId))]);
      return { storageKey: document.storageKey };
    },
  };
}
