import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/database.js";
import type { PropertyType, TransactionType, UsageType } from "../../db/enums.js";
import { containsSensitive, searchKey } from "../../db/helpers.js";
import { cities, propertySubtypes, propertyTypeUsages, transactionCategories } from "../../db/schema.js";

export interface CityRecord {
  ibgeCode: number;
  name: string;
  state: string;
}

export interface PropertySubtypeRecord {
  id: number;
  propertyType: PropertyType;
  name: string;
}

export interface PropertyTypeUsageRecord {
  propertyType: PropertyType;
  usageType: UsageType;
}

export interface TransactionCategoryRecord {
  id: number;
  transactionType: TransactionType;
  name: string;
}

export interface LookupsRepository {
  listTransactionCategories(): Promise<TransactionCategoryRecord[]>;
  searchCities(query: { search: string; state?: string; limit: number }): Promise<CityRecord[]>;
  listPropertySubtypes(): Promise<PropertySubtypeRecord[]>;
  listPropertyTypeUsages(): Promise<PropertyTypeUsageRecord[]>;
}

/** Repository layer: reference data shared by every organization (no tenant filter). */
export function createLookupsRepository(db: Database): LookupsRepository {
  return {
    searchCities({ search, state, limit }) {
      // SQLite has no unaccent(): `name_search` holds the name in lower case without accents, and the term
      // gets the same treatment, so "sao paulo" finds "São Paulo". `%`, `_` and `\` are matched literally.
      return db
        .select({ ibgeCode: cities.ibgeCode, name: cities.name, state: cities.state })
        .from(cities)
        .where(and(containsSensitive(cities.nameSearch, searchKey(search)), state ? eq(cities.state, state) : undefined))
        .orderBy(asc(cities.nameSearch), asc(cities.name), asc(cities.state))
        .limit(limit);
    },

    listTransactionCategories() {
      return db.select().from(transactionCategories)// Revenue first, as the enum was declared (alphabetically "expense" would come first).
        .orderBy(sql`CASE ${transactionCategories.transactionType} WHEN 'revenue' THEN 0 ELSE 1 END`, asc(transactionCategories.name));
    },

    listPropertySubtypes() {
      return db.select().from(propertySubtypes).orderBy(asc(propertySubtypes.propertyType), asc(propertySubtypes.name));
    },

    listPropertyTypeUsages() {
      return db.select().from(propertyTypeUsages);
    },
  };
}
