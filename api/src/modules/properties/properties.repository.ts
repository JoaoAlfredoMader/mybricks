import { type SQL, and, count, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { atomic } from "../../db/atomic.js";
import type { Database } from "../../db/database.js";
import { constraintViolation } from "../../db/errors.js";
import { containsInsensitive } from "../../db/helpers.js";
import type {
  AcquisitionType,
  AmortizationSystem,
  ConservationState,
  PropertyType,
  RegistrationStatus,
  RentalMode,
  UsageType,
} from "../../db/enums.js";
import {
  agencies,
  cities,
  clients,
  properties,
  propertyAcquisitions,
  propertyAddresses,
  propertyFinancings,
  propertyInsurances,
  propertyLegalRecords,
  propertyManualRentals,
  propertySubtypes,
  propertyTypeUsages,
} from "../../db/schema.js";

/** A property with everything its read shows. The shape of the relations is the same the API always had. */
export interface PropertyRecord {
  id: string;
  createdById: string;
  clientId: string | null;
  agencyId: string | null;
  agency: { name: string } | null;
  name: string;
  propertyType: PropertyType;
  subtypeId: number | null;
  usageType: UsageType;
  ownershipPercentage: number;
  totalArea: number | null;
  privateArea: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  parkingSpotLabel: string | null;
  builtYear: number | null;
  conservationState: ConservationState | null;
  estimatedValueCents: bigint | null;
  annualExpensesCents: bigint;
  occupancyRate: number;
  rentalMode: RentalMode;
  notes: string | null;
  listingPriceCents: bigint | null;
  listingConsentedAt: Date | null;
  listingHiddenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  address: {
    cityId: number;
    postalCode: string | null;
    street: string;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    latitude: number | null;
    longitude: number | null;
    city: { name: string; state: string };
  } | null;
  manualRental: { tenantName: string | null; monthlyRentCents: bigint; dueDay: number | null } | null;
  acquisition: {
    acquisitionType: AcquisitionType;
    acquiredOn: Date | null;
    costCents: bigint | null;
    financing: {
      lender: string | null;
      financedAmountCents: bigint;
      termMonths: number;
      annualInterestRate: number;
      amortizationSystem: AmortizationSystem;
      firstInstallmentOn: Date;
    } | null;
  } | null;
  legalRecord: {
    registrationStatus: RegistrationStatus;
    irregularityDescription: string | null;
    registryNumber: string | null;
    registryOffice: string | null;
    notes: string | null;
  } | null;
  insurance: { description: string | null } | null;
  /** Only used to derive the status. */
  contracts: { id: string }[];
  /** Only used to derive the listing status. */
  _count: { photos: number };
}

/** Every query is bound to one organization; members are further limited to what they created. */
export interface PropertyScope {
  organizationId: string;
  createdById?: string;
}

export interface PropertyData {
  name: string;
  propertyType: PropertyType;
  subtypeId: number | null;
  usageType: UsageType;
  ownershipPercentage: number;
  totalArea: number | null;
  privateArea: number | null;
  bedrooms: number | null;
  suites: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  parkingSpotLabel: string | null;
  builtYear: number | null;
  conservationState: ConservationState | null;
  estimatedValueCents: bigint | null;
  annualExpensesCents: bigint;
  occupancyRate: number;
  rentalMode: RentalMode;
  notes: string | null;
  clientId: string | null;
  agencyId: string | null;
  /** Asking price of the for-sale listing; `null` = not for sale. */
  listingPriceCents: bigint | null;
  /** When the owner consented to the listing; set together with the price. */
  listingConsentedAt: Date | null;
}

export interface AddressData {
  cityId: number;
  postalCode: string | null;
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
}

export interface ManualRentalData {
  tenantName: string | null;
  monthlyRentCents: bigint;
  dueDay: number | null;
}

export interface AcquisitionData {
  acquisitionType: AcquisitionType;
  acquiredOn: Date | null;
  costCents: bigint | null;
}

export interface LegalRecordData {
  registrationStatus: RegistrationStatus;
  irregularityDescription: string | null;
  registryNumber: string | null;
  registryOffice: string | null;
  notes: string | null;
}

export interface InsuranceData {
  description: string | null;
}

export interface FinancingData {
  /** Must match the acquisition type; the database keeps the two in sync. */
  acquisitionType: AcquisitionType;
  lender: string | null;
  financedAmountCents: bigint;
  termMonths: number;
  annualInterestRate: number;
  amortizationSystem: AmortizationSystem;
  firstInstallmentOn: Date;
}

/** `undefined` leaves the child untouched, `null` removes it, a value creates or replaces it. */
export interface PropertyChildren {
  address?: AddressData | null;
  manualRental?: ManualRentalData | null;
  acquisition?: AcquisitionData | null;
  legalRecord?: LegalRecordData | null;
  insurance?: InsuranceData | null;
  financing?: FinancingData | null;
}

export interface PropertyListQuery {
  search?: string;
  propertyType?: PropertyType;
  usageType?: UsageType;
  clientId?: string;
  skip: number;
  take: number;
}

export interface PropertiesRepository {
  list(scope: PropertyScope, query: PropertyListQuery): Promise<{ items: PropertyRecord[]; total: number }>;
  findById(scope: PropertyScope, id: string): Promise<PropertyRecord | null>;
  create(
    scope: PropertyScope & { createdById: string },
    data: PropertyData,
    children: PropertyChildren,
  ): Promise<PropertyRecord>;
  update(
    scope: PropertyScope,
    id: string,
    data: Partial<PropertyData>,
    children: PropertyChildren,
  ): Promise<PropertyRecord | null>;
  delete(scope: PropertyScope, id: string): Promise<boolean>;

  isUsageAllowed(propertyType: PropertyType, usageType: UsageType): Promise<boolean>;
  subtypeBelongsTo(subtypeId: number, propertyType: PropertyType): Promise<boolean>;
  cityExists(cityId: number): Promise<boolean>;
  agencyExists(organizationId: string, agencyId: string): Promise<boolean>;
  /** Whether the client exists in the organization and is visible within the scope. */
  clientVisible(scope: PropertyScope, clientId: string): Promise<boolean>;
}

function whereFor(scope: PropertyScope): SQL {
  return and(
    eq(properties.organizationId, scope.organizationId),
    scope.createdById ? eq(properties.createdById, scope.createdById) : undefined,
  ) as SQL;
}

/** Repository layer: the only place that talks to the database. */
export function createPropertiesRepository(db: Database): PropertiesRepository {
  /** Loads properties with everything a read shows. Relations carry a `columns` list so key columns never leak into the API. */
  async function load(where: SQL, page?: { skip: number; take: number }): Promise<PropertyRecord[]> {
    const rows = await db.query.properties.findMany({
      where,
      with: {
        agency: { columns: { name: true } },
        address: {
          columns: { cityId: true, postalCode: true, street: true, number: true, complement: true, neighborhood: true, latitude: true, longitude: true },
          with: { city: { columns: { name: true, state: true } } },
        },
        manualRental: { columns: { tenantName: true, monthlyRentCents: true, dueDay: true } },
        acquisition: {
          columns: { acquisitionType: true, acquiredOn: true, costCents: true },
          with: {
            financing: {
              columns: { lender: true, financedAmountCents: true, termMonths: true, annualInterestRate: true, amortizationSystem: true, firstInstallmentOn: true },
            },
          },
        },
        legalRecord: { columns: { registrationStatus: true, irregularityDescription: true, registryNumber: true, registryOffice: true, notes: true } },
        insurance: { columns: { description: true } },
        contracts: { columns: { id: true }, where: (contract, { eq }) => eq(contract.status, "active"), limit: 1 },
      },
      // Written by hand: in the relational query the column helpers lose their table prefix, and "id" would
      // then mean the photo's id inside the subquery. The root table is aliased as "properties".
      extras: (_property, { sql }) => ({
        photoCount: sql<number>`(select count(*) from property_photos where property_photos.property_id = "properties"."id")`.as("photo_count"),
      }),
      orderBy: (property, { asc }) => [asc(property.name), asc(property.id)],
      ...(page ? { offset: page.skip, limit: page.take } : {}),
    });
    return rows.map(({ photoCount, ...row }) => ({ ...row, _count: { photos: Number(photoCount) } }));
  }

  async function findById(scope: PropertyScope, id: string): Promise<PropertyRecord | null> {
    return (await load(and(whereFor(scope), eq(properties.id, id)) as SQL))[0] ?? null;
  }

  /** The statements that write one child row, or remove it (`null`); `undefined` writes nothing. */
  function childStatements(id: string, children: PropertyChildren): BatchItem<"sqlite">[] {
    const statements: BatchItem<"sqlite">[] = [];
    if (children.address === null) statements.push(db.delete(propertyAddresses).where(eq(propertyAddresses.propertyId, id)));
    else if (children.address) {
      statements.push(
        db.insert(propertyAddresses).values({ propertyId: id, ...children.address })
          .onConflictDoUpdate({ target: propertyAddresses.propertyId, set: children.address }),
      );
    }

    if (children.manualRental === null) statements.push(db.delete(propertyManualRentals).where(eq(propertyManualRentals.propertyId, id)));
    else if (children.manualRental) {
      statements.push(
        db.insert(propertyManualRentals).values({ propertyId: id, ...children.manualRental })
          .onConflictDoUpdate({ target: propertyManualRentals.propertyId, set: children.manualRental }),
      );
    }

    // The financing follows the acquisition type through ON UPDATE CASCADE (composite foreign key).
    if (children.acquisition === null) statements.push(db.delete(propertyAcquisitions).where(eq(propertyAcquisitions.propertyId, id)));
    else if (children.acquisition) {
      statements.push(
        db.insert(propertyAcquisitions).values({ propertyId: id, ...children.acquisition })
          .onConflictDoUpdate({ target: propertyAcquisitions.propertyId, set: children.acquisition }),
      );
    }

    if (children.financing === null) statements.push(db.delete(propertyFinancings).where(eq(propertyFinancings.propertyId, id)));
    else if (children.financing) {
      statements.push(
        db.insert(propertyFinancings).values({ propertyId: id, ...children.financing })
          .onConflictDoUpdate({ target: propertyFinancings.propertyId, set: children.financing }),
      );
    }

    if (children.legalRecord === null) statements.push(db.delete(propertyLegalRecords).where(eq(propertyLegalRecords.propertyId, id)));
    else if (children.legalRecord) {
      statements.push(
        db.insert(propertyLegalRecords).values({ propertyId: id, ...children.legalRecord })
          .onConflictDoUpdate({ target: propertyLegalRecords.propertyId, set: children.legalRecord }),
      );
    }

    if (children.insurance === null) statements.push(db.delete(propertyInsurances).where(eq(propertyInsurances.propertyId, id)));
    else if (children.insurance) {
      statements.push(
        db.insert(propertyInsurances).values({ propertyId: id, ...children.insurance })
          .onConflictDoUpdate({ target: propertyInsurances.propertyId, set: children.insurance }),
      );
    }
    return statements;
  }

  return {
    async list(scope, { search, propertyType, usageType, clientId, skip, take }) {
      const where = and(
        whereFor(scope),
        propertyType ? eq(properties.propertyType, propertyType) : undefined,
        usageType ? eq(properties.usageType, usageType) : undefined,
        clientId ? eq(properties.clientId, clientId) : undefined,
        search ? containsInsensitive(properties.name, search) : undefined,
      ) as SQL;
      const [items, [total]] = await Promise.all([
        load(where, { skip, take }),
        db.select({ value: count() }).from(properties).where(where),
      ]);
      return { items, total: total?.value ?? 0 };
    },

    findById,

    async create(scope, data, children) {
      const id = crypto.randomUUID();
      // The property and every row that hangs from it go in ONE batch: all of them or none.
      await atomic(db, [
        db.insert(properties).values({ ...data, id, organizationId: scope.organizationId, createdById: scope.createdById }),
        ...childStatements(id, children),
      ]);
      const created = await findById({ organizationId: scope.organizationId }, id);
      if (!created) throw new Error("The property that was just created could not be read back");
      return created;
    },

    async update(scope, id, data, children) {
      // D1 has no interactive transaction: visibility is checked first, then ONE batch writes everything.
      const [visible] = await db.select({ id: properties.id }).from(properties).where(and(whereFor(scope), eq(properties.id, id)));
      if (!visible) return null;

      try {
        await atomic(db, [
          // `updatedAt` is always set: a patch that only touches child rows still has a non-empty SET.
          db.update(properties).set({ ...data, updatedAt: new Date() }).where(and(whereFor(scope), eq(properties.id, id))),
          ...childStatements(id, children),
        ]);
      } catch (error) {
        // The property was deleted between the check and the batch: the child inserts lost their parent.
        if (constraintViolation(error)?.kind === "foreign_key" && !(await findById(scope, id))) return null;
        throw error;
      }
      return findById(scope, id);
    },

    async delete(scope, id) {
      const removed = await db.delete(properties).where(and(whereFor(scope), eq(properties.id, id))).returning({ id: properties.id });
      return removed.length > 0;
    },

    async isUsageAllowed(propertyType, usageType) {
      const [row] = await db
        .select({ value: count() })
        .from(propertyTypeUsages)
        .where(and(eq(propertyTypeUsages.propertyType, propertyType), eq(propertyTypeUsages.usageType, usageType)));
      return (row?.value ?? 0) > 0;
    },

    async subtypeBelongsTo(subtypeId, propertyType) {
      const [row] = await db
        .select({ value: count() })
        .from(propertySubtypes)
        .where(and(eq(propertySubtypes.id, subtypeId), eq(propertySubtypes.propertyType, propertyType)));
      return (row?.value ?? 0) > 0;
    },

    async cityExists(cityId) {
      const [row] = await db.select({ value: count() }).from(cities).where(eq(cities.ibgeCode, cityId));
      return (row?.value ?? 0) > 0;
    },

    async agencyExists(organizationId, agencyId) {
      const [row] = await db
        .select({ value: count() })
        .from(agencies)
        .where(and(eq(agencies.id, agencyId), eq(agencies.organizationId, organizationId)));
      return (row?.value ?? 0) > 0;
    },

    async clientVisible(scope, clientId) {
      const [row] = await db
        .select({ value: count() })
        .from(clients)
        .where(
          and(
            eq(clients.id, clientId),
            eq(clients.organizationId, scope.organizationId),
            scope.createdById ? eq(clients.createdById, scope.createdById) : undefined,
          ),
        );
      return (row?.value ?? 0) > 0;
    },
  };
}
