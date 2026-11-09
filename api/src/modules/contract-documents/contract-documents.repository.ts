import { type SQL, and, eq, inArray } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { AdjustmentIndex, ContractType } from "../../db/enums.js";
import { contracts, organizations, properties, storedFiles } from "../../db/schema.js";
import { AppError } from "../../shared/errors/app-error.js";
import type { AddressParts } from "./formatting.js";

/** Everything the document needs, already flattened. */
export interface ContractForDocument {
  id: string;
  contractType: ContractType;
  startDate: Date;
  endDate: Date | null;
  hasPdf: boolean;
  organizationName: string;
  tenant: { name: string; document: string | null };
  /** The property's client (its owner), if it has one. */
  landlord: { name: string; document: string | null } | null;
  propertyName: string;
  address: AddressParts | null;
  rentTerms: { monthlyRentCents: bigint; dueDay: number; adjustmentIndex: AdjustmentIndex | null } | null;
}

/** Contracts belong to a property: members only reach those of properties they created. */
export interface DocumentScope {
  organizationId: string;
  propertyCreatedById?: string;
}

export interface NewPdfFile {
  uploadedById: string;
  storageKey: string;
  fileName: string;
  sizeBytes: number;
}

export interface StoredPdf {
  storageKey: string;
  fileName: string;
}

export interface ContractDocumentsRepository {
  load(scope: DocumentScope, contractId: string): Promise<ContractForDocument | null>;
  /**
   * Records the new PDF and makes it the contract's one, in a single batch. The previous PDF's
   * record is removed and its storage key returned, so the caller can delete the old object.
   */
  replacePdf(scope: DocumentScope, contractId: string, file: NewPdfFile): Promise<{ previousStorageKey: string | null }>;
  findPdf(scope: DocumentScope, contractId: string): Promise<StoredPdf | null>;
}

function whereFor(db: Database, scope: DocumentScope, contractId: string): SQL {
  const visible = scope.propertyCreatedById
    ? inArray(
        contracts.propertyId,
        db.select({ id: properties.id }).from(properties).where(eq(properties.createdById, scope.propertyCreatedById)),
      )
    : undefined;
  return and(eq(contracts.id, contractId), eq(contracts.organizationId, scope.organizationId), visible)!;
}

/** Repository layer: the only place that talks to the database. */
export function createContractDocumentsRepository(db: Database): ContractDocumentsRepository {
  return {
    async load(scope, contractId) {
      const row = await db.query.contracts.findFirst({
        columns: { id: true, contractType: true, startDate: true, endDate: true, pdfFileId: true },
        with: {
          occupant: { columns: { name: true, document: true } },
          rentTerms: { columns: { monthlyRentCents: true, dueDay: true, adjustmentIndex: true } },
          property: {
            columns: { name: true },
            with: {
              client: { columns: { name: true, document: true } },
              address: {
                columns: { street: true, number: true, complement: true, neighborhood: true, postalCode: true },
                with: { city: { columns: { name: true, state: true } } },
              },
            },
          },
        },
        where: whereFor(db, scope, contractId),
      });
      if (!row) return null;

      const [organization] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, scope.organizationId));
      if (!organization) throw AppError.notFound("Organization not found");

      const address = row.property.address;
      return {
        id: row.id,
        contractType: row.contractType,
        startDate: row.startDate,
        endDate: row.endDate,
        hasPdf: row.pdfFileId !== null,
        organizationName: organization.name,
        tenant: row.occupant,
        landlord: row.property.client,
        propertyName: row.property.name,
        address: address && {
          street: address.street,
          number: address.number,
          complement: address.complement,
          neighborhood: address.neighborhood,
          postalCode: address.postalCode,
          city: address.city.name,
          state: address.city.state,
        },
        rentTerms: row.rentTerms,
      };
    },

    async replacePdf(scope, contractId, file) {
      const [current] = await db
        .select({ pdfFileId: contracts.pdfFileId, storageKey: storedFiles.storageKey })
        .from(contracts)
        .leftJoin(storedFiles, eq(storedFiles.id, contracts.pdfFileId))
        .where(whereFor(db, scope, contractId));
      if (!current) throw AppError.notFound("Contract not found");

      const fileId = crypto.randomUUID();
      const insert = db.insert(storedFiles).values({
        id: fileId,
        organizationId: scope.organizationId,
        uploadedById: file.uploadedById,
        storageKey: file.storageKey,
        fileName: file.fileName,
        mimeType: "application/pdf",
        sizeBytes: BigInt(file.sizeBytes),
      });
      const link = db.update(contracts).set({ pdfFileId: fileId, updatedAt: new Date() }).where(eq(contracts.id, contractId));

      // The reads above are outside the batch: two PDFs generated at the very same instant could leave one
      // stored record without owner (the orphan sweep removes it), never a contract without its file.
      if (current.pdfFileId) {
        await db.batch([insert, link, db.delete(storedFiles).where(eq(storedFiles.id, current.pdfFileId))]);
      } else {
        await db.batch([insert, link]);
      }
      return { previousStorageKey: current.storageKey ?? null };
    },

    async findPdf(scope, contractId) {
      const [row] = await db
        .select({ storageKey: storedFiles.storageKey, fileName: storedFiles.fileName })
        .from(contracts)
        .innerJoin(storedFiles, eq(storedFiles.id, contracts.pdfFileId))
        .where(whereFor(db, scope, contractId));
      return row ?? null;
    },
  };
}
