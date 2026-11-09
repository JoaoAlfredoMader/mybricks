import { type SQL, and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { atomic } from "../../db/atomic.js";
import type { Database } from "../../db/database.js";
import { properties, propertyPhotos, storedFiles } from "../../db/schema.js";

export interface PhotoRecord {
  id: string;
  propertyId: string;
  position: number;
  createdAt: Date;
  file: { storageKey: string; fileName: string; mimeType: string; sizeBytes: bigint };
}

/** Photos belong to a property: members only reach those of properties they created. */
export interface PhotoScope {
  organizationId: string;
  propertyCreatedById?: string;
}

export interface NewPhotoFile {
  uploadedById: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PhotosRepository {
  propertyVisible(scope: PhotoScope, propertyId: string): Promise<boolean>;
  count(scope: PhotoScope, propertyId: string): Promise<number>;
  list(scope: PhotoScope, propertyId: string): Promise<PhotoRecord[]>;
  findById(scope: PhotoScope, propertyId: string, id: string): Promise<PhotoRecord | null>;
  /** Records the file and attaches it at the end of the property's photos, in one transaction. */
  create(scope: PhotoScope, propertyId: string, file: NewPhotoFile): Promise<PhotoRecord>;
  /** Rewrites the positions in the given order (0, 1, 2...). */
  reorder(scope: PhotoScope, propertyId: string, orderedIds: readonly string[]): Promise<void>;
  /** Removes the photo and its file record. Returns the storage key so the caller can delete the object. */
  delete(scope: PhotoScope, propertyId: string, id: string): Promise<{ storageKey: string } | null>;
}

/** Repository layer: the only place that talks to the database. */
export function createPhotosRepository(db: Database): PhotosRepository {
  const propertyScope = (scope: PhotoScope): SQL =>
    and(
      eq(properties.organizationId, scope.organizationId),
      scope.propertyCreatedById ? eq(properties.createdById, scope.propertyCreatedById) : undefined,
    ) as SQL;

  /** A photo is visible when its property is. */
  const whereFor = (scope: PhotoScope, propertyId: string): SQL =>
    and(
      eq(propertyPhotos.propertyId, propertyId),
      inArray(propertyPhotos.propertyId, db.select({ id: properties.id }).from(properties).where(propertyScope(scope))),
    ) as SQL;

  async function load(where: SQL): Promise<PhotoRecord[]> {
    const rows = await db
      .select({
        id: propertyPhotos.id,
        propertyId: propertyPhotos.propertyId,
        position: propertyPhotos.position,
        createdAt: propertyPhotos.createdAt,
        storageKey: storedFiles.storageKey,
        fileName: storedFiles.fileName,
        mimeType: storedFiles.mimeType,
        sizeBytes: storedFiles.sizeBytes,
      })
      .from(propertyPhotos)
      .innerJoin(storedFiles, eq(storedFiles.id, propertyPhotos.fileId))
      .where(where)
      .orderBy(asc(propertyPhotos.position), asc(propertyPhotos.createdAt), asc(propertyPhotos.id));
    return rows.map(({ storageKey, fileName, mimeType, sizeBytes, ...photo }) => ({
      ...photo,
      file: { storageKey, fileName, mimeType, sizeBytes },
    }));
  }

  return {
    async propertyVisible(scope, propertyId) {
      const [row] = await db.select({ id: properties.id }).from(properties).where(and(propertyScope(scope), eq(properties.id, propertyId)));
      return row !== undefined;
    },

    async count(scope, propertyId) {
      const [row] = await db.select({ value: count() }).from(propertyPhotos).where(whereFor(scope, propertyId));
      return row?.value ?? 0;
    },

    list(scope, propertyId) {
      return load(whereFor(scope, propertyId));
    },

    async findById(scope, propertyId, id) {
      return (await load(and(whereFor(scope, propertyId), eq(propertyPhotos.id, id)) as SQL))[0] ?? null;
    },

    async create(scope, propertyId, file) {
      const fileId = crypto.randomUUID();
      const photoId = crypto.randomUUID();
      // The stored file and the photo go in ONE batch. The position is computed by the statement itself
      // (end of the property's photos), so no read has to sit between the two writes.
      await atomic(db, [
        db.insert(storedFiles).values({ ...file, id: fileId, organizationId: scope.organizationId, sizeBytes: BigInt(file.sizeBytes) }),
        db.insert(propertyPhotos).values({
          id: photoId,
          organizationId: scope.organizationId,
          propertyId,
          fileId,
          position: sql<number>`(select coalesce(max(${propertyPhotos.position}), -1) + 1 from ${propertyPhotos} where ${propertyPhotos.propertyId} = ${propertyId})`,
        }),
      ]);
      const [created] = await load(eq(propertyPhotos.id, photoId));
      if (!created) throw new Error("The photo that was just created could not be read back");
      return created;
    },

    async reorder(scope, propertyId, orderedIds) {
      const [first, ...rest] = orderedIds.map((id, position) =>
        db.update(propertyPhotos).set({ position }).where(and(whereFor(scope, propertyId), eq(propertyPhotos.id, id))),
      );
      if (!first) return;
      await atomic(db, [first, ...rest]);
    },

    async delete(scope, propertyId, id) {
      const [photo] = await db
        .select({ fileId: propertyPhotos.fileId, storageKey: storedFiles.storageKey })
        .from(propertyPhotos)
        .innerJoin(storedFiles, eq(storedFiles.id, propertyPhotos.fileId))
        .where(and(whereFor(scope, propertyId), eq(propertyPhotos.id, id)));
      if (!photo) return null;
      // The photo goes before its file (the foreign key would refuse the opposite order); both or neither.
      await atomic(db, [db.delete(propertyPhotos).where(eq(propertyPhotos.id, id)), db.delete(storedFiles).where(eq(storedFiles.id, photo.fileId))]);
      return { storageKey: photo.storageKey };
    },
  };
}
