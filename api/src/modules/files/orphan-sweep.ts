import { and, eq, lt, notExists } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import { contracts, feedbacks, propertyDocuments, propertyPhotos, storedFiles } from "../../db/schema.js";
import type { StorageProvider } from "../../lib/storage/storage.js";

export interface OrphanSweepOptions {
  /** Only files created before this moment are considered, so an upload in flight is never swept. */
  olderThan: Date;
  /** Safety valve per run. */
  batchSize?: number;
}

/**
 * Removes files that nothing points to any more: no photo, no document, no contract PDF and no
 * feedback attachment. They appear when a property is deleted (its photo rows cascade, the file
 * rows do not) or when a deletion could not reach the storage. The object goes first and the row
 * only after it, so a failure leaves the row for the next run instead of losing track of the object.
 * Returns how many files were swept.
 */
export async function sweepOrphanFiles(
  db: Database,
  storage: StorageProvider,
  { olderThan, batchSize = 500 }: OrphanSweepOptions,
): Promise<number> {
  const unused = (table: typeof propertyPhotos | typeof propertyDocuments | typeof contracts | typeof feedbacks, column: unknown) =>
    notExists(db.select({ one: table.id }).from(table).where(eq(column as never, storedFiles.id)));
  const orphans = await db
    .select({ id: storedFiles.id, storageKey: storedFiles.storageKey })
    .from(storedFiles)
    .where(
      and(
        lt(storedFiles.createdAt, olderThan),
        unused(propertyPhotos, propertyPhotos.fileId),
        unused(propertyDocuments, propertyDocuments.fileId),
        unused(contracts, contracts.pdfFileId),
        unused(feedbacks, feedbacks.attachmentFileId),
      ),
    )
    .limit(batchSize);

  let swept = 0;
  for (const file of orphans) {
    try {
      await storage.delete(file.storageKey);
      await db.delete(storedFiles).where(eq(storedFiles.id, file.id));
      swept += 1;
    } catch (error) {
      console.error(`Could not sweep the file ${file.id}`, error);
    }
  }
  return swept;
}
