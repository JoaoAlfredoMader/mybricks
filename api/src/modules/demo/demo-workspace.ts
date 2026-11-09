import { and, eq, getTableColumns } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { atomic } from "../../db/atomic.js";
import type { Database } from "../../db/database.js";
import { chunk, D1_MAX_PARAMETERS } from "../../db/helpers.js";
import {
  agencies,
  cities,
  clients,
  contractRentTerms,
  contracts,
  occupants,
  propertyAcquisitions,
  propertyAddresses,
  propertyFinancings,
  propertyInsurances,
  propertyLegalRecords,
  propertyManualRentals,
  propertyProposals,
  propertySubtypes,
  properties,
  reservations,
  transactionCategories,
  transactions,
} from "../../db/schema.js";
import { type DemoPlan, buildDemoPlan } from "./demo-data.js";

export interface DemoSeeder {
  /** Fills a guest's demo organization with a sample portfolio. The guest becomes the author of everything. */
  seed(input: { organizationId: string; ownerUserId: string }): Promise<void>;
}

export interface DemoSeederOptions {
  /** The calendar day the sample portfolio is built around; injectable for tests. */
  today?: () => Date;
}

const startOfToday = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

/** Parameters kept under D1's limit of 100 per statement, with room to spare. */
const PARAMETER_BUDGET = D1_MAX_PARAMETERS - 10;

/** Multi-row INSERT statements for the rows, split so no statement binds more than the budget. */
function insertRows<T extends SQLiteTable>(db: Database, table: T, rows: T["$inferInsert"][]) {
  const perRow = Object.keys(getTableColumns(table)).length;
  return chunk(rows, Math.max(1, Math.floor(PARAMETER_BUDGET / perRow))).map((part) => db.insert(table).values(part));
}

/** Writes a plan into one organization, in a single batch: either all of it or none. */
export function createDemoSeeder(db: Database, { today = startOfToday }: DemoSeederOptions = {}): DemoSeeder {
  return {
    async seed({ organizationId, ownerUserId }) {
      const plan: DemoPlan = buildDemoPlan(today());

      // Reference data is looked up first, outside the batch.
      const subtypes = new Map(
        (await db.select().from(propertySubtypes)).map((subtype) => [`${subtype.propertyType}:${subtype.name}`, subtype.id]),
      );
      const categories = new Map(
        (await db.select().from(transactionCategories)).map((category) => [`${category.transactionType}:${category.name}`, category.id]),
      );
      const cityCodes = new Map<string, number>();
      for (const { city, state } of new Set(plan.properties.map((property) => ({ city: property.address.city, state: property.address.state })))) {
        const [found] = await db.select({ ibgeCode: cities.ibgeCode }).from(cities).where(and(eq(cities.name, city), eq(cities.state, state)));
        if (!found) throw new Error(`Demo data needs the city ${city}/${state}: run the migrations`);
        cityCodes.set(`${city}/${state}`, found.ibgeCode);
      }
      const lookup = <T>(map: Map<string, T>, key: string, what: string): T => {
        const value = map.get(key);
        if (value === undefined) throw new Error(`Demo data needs the ${what} "${key}": run the migrations`);
        return value;
      };

      // Ids come from here, not from the database, so a row can refer to one inserted earlier in the batch.
      const agencyIds = new Map(plan.agencies.map((agency) => [agency.key, crypto.randomUUID()]));
      const clientIds = new Map(plan.clients.map((client) => [client.key, crypto.randomUUID()]));
      const occupantIds = new Map(plan.occupants.map((occupant) => [occupant.key, crypto.randomUUID()]));
      const propertyIds = new Map(plan.properties.map((property) => [property.key, crypto.randomUUID()]));
      const contractIds = new Map(plan.contracts.map((contract) => [contract.key, crypto.randomUUID()]));

      const statements = [
        ...insertRows(
          db,
          agencies,
          plan.agencies.map((agency) => ({ id: agencyIds.get(agency.key)!, organizationId, name: agency.name })),
        ),
        ...insertRows(
          db,
          clients,
          plan.clients.map(({ key, ...client }) => ({ ...client, id: clientIds.get(key)!, organizationId, createdById: ownerUserId })),
        ),
        ...insertRows(
          db,
          occupants,
          plan.occupants.map(({ key, ...occupant }) => ({ ...occupant, id: occupantIds.get(key)!, organizationId })),
        ),
        ...insertRows(
          db,
          properties,
          plan.properties.map((property) => ({
            id: propertyIds.get(property.key)!,
            organizationId,
            createdById: ownerUserId,
            name: property.name,
            propertyType: property.propertyType,
            subtypeId: lookup(subtypes, `${property.propertyType}:${property.subtype}`, "property subtype"),
            usageType: property.usageType,
            rentalMode: property.rentalMode,
            clientId: property.clientKey ? clientIds.get(property.clientKey)! : null,
            agencyId: property.agencyKey ? agencyIds.get(property.agencyKey)! : null,
            ownershipPercentage: Number(property.ownershipPercentage),
            totalArea: property.totalArea == null ? null : Number(property.totalArea),
            privateArea: property.privateArea == null ? null : Number(property.privateArea),
            bedrooms: property.bedrooms ?? null,
            bathrooms: property.bathrooms ?? null,
            parkingSpaces: property.parkingSpaces ?? null,
            parkingSpotLabel: property.parkingSpotLabel ?? null,
            builtYear: property.builtYear ?? null,
            conservationState: property.conservationState ?? null,
            estimatedValueCents: BigInt(property.estimatedValueCents),
            annualExpensesCents: BigInt(property.annualExpensesCents),
            occupancyRate: Number(property.occupancyRate),
            notes: property.notes ?? null,
          })),
        ),
        ...insertRows(
          db,
          propertyAddresses,
          plan.properties.map(({ key, address }) => ({
            propertyId: propertyIds.get(key)!,
            cityId: lookup(cityCodes, `${address.city}/${address.state}`, "city"),
            postalCode: address.postalCode,
            street: address.street,
            number: address.number,
            complement: address.complement ?? null,
            neighborhood: address.neighborhood,
          })),
        ),
        ...insertRows(
          db,
          propertyManualRentals,
          plan.properties.flatMap(({ key, manualRental }) =>
            manualRental ? [{ ...manualRental, propertyId: propertyIds.get(key)!, monthlyRentCents: BigInt(manualRental.monthlyRentCents) }] : [],
          ),
        ),
        ...insertRows(
          db,
          propertyAcquisitions,
          plan.properties.flatMap(({ key, acquisition }) =>
            acquisition
              ? [
                  {
                    propertyId: propertyIds.get(key)!,
                    acquisitionType: acquisition.acquisitionType,
                    acquiredOn: acquisition.acquiredOn,
                    costCents: BigInt(acquisition.costCents),
                  },
                ]
              : [],
          ),
        ),
        ...insertRows(
          db,
          propertyFinancings,
          plan.properties.flatMap(({ key, acquisition, financing }) =>
            acquisition && financing
              ? [
                  {
                    ...financing,
                    propertyId: propertyIds.get(key)!,
                    acquisitionType: acquisition.acquisitionType,
                    financedAmountCents: BigInt(financing.financedAmountCents),
                  },
                ]
              : [],
          ),
        ),
        ...insertRows(
          db,
          propertyLegalRecords,
          plan.properties.flatMap(({ key, legalRecord }) =>
            legalRecord ? [{ ...legalRecord, propertyId: propertyIds.get(key)!, irregularityDescription: legalRecord.irregularityDescription ?? null }] : [],
          ),
        ),
        ...insertRows(
          db,
          propertyInsurances,
          plan.properties.flatMap(({ key, insurance }) => (insurance ? [{ ...insurance, propertyId: propertyIds.get(key)! }] : [])),
        ),
        ...insertRows(
          db,
          contracts,
          plan.contracts.map((contract) => ({
            id: contractIds.get(contract.key)!,
            organizationId,
            propertyId: propertyIds.get(contract.propertyKey)!,
            occupantId: occupantIds.get(contract.occupantKey)!,
            contractType: contract.contractType,
            status: contract.status,
            startDate: contract.startDate,
            endDate: contract.endDate,
            notes: contract.notes ?? null,
          })),
        ),
        ...insertRows(
          db,
          contractRentTerms,
          plan.contracts.flatMap((contract) =>
            contract.rentTerms
              ? [
                  {
                    ...contract.rentTerms,
                    contractId: contractIds.get(contract.key)!,
                    contractType: contract.contractType,
                    monthlyRentCents: BigInt(contract.rentTerms.monthlyRentCents),
                  },
                ]
              : [],
          ),
        ),
        ...insertRows(
          db,
          reservations,
          plan.reservations.map((reservation) => ({
            organizationId,
            propertyId: propertyIds.get(reservation.propertyKey)!,
            contractId: contractIds.get(reservation.contractKey)!,
            occupantId: occupantIds.get(reservation.occupantKey)!,
            checkIn: reservation.checkIn,
            checkOut: reservation.checkOut,
            totalAmountCents: BigInt(reservation.totalAmountCents),
            status: reservation.status,
          })),
        ),
        ...insertRows(
          db,
          transactions,
          plan.transactions.map((transaction) => ({
            organizationId,
            propertyId: propertyIds.get(transaction.propertyKey)!,
            categoryId: lookup(categories, `${transaction.category.type}:${transaction.category.name}`, "transaction category"),
            amountCents: BigInt(transaction.amountCents),
            occurredOn: transaction.occurredOn,
            description: transaction.description,
            isRecurring: transaction.isRecurring,
            recurrenceEndsOn: transaction.recurrenceEndsOn ?? null,
          })),
        ),
        ...insertRows(
          db,
          propertyProposals,
          plan.proposals.map((proposal) => ({
            propertyId: propertyIds.get(proposal.propertyKey)!,
            proposalType: proposal.proposalType,
            amountCents: BigInt(proposal.amountCents),
            proposalDate: proposal.proposalDate,
            contact: proposal.contact,
            notes: proposal.notes ?? null,
          })),
        ),
      ];

      // Empty tables produce no statement; at least the properties are always there.
      await atomic(db, statements as unknown as [(typeof statements)[number], ...(typeof statements)[number][]]);
    },
  };
}
