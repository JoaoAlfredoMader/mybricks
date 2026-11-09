// Started from the former Prisma schema by a one-off converter, then maintained by hand.
// SQLite (Cloudflare D1). Ids are UUID text created by the application; money is integer cents
// (bigint in the app); calendar days are text (YYYY-MM-DD); moments are epoch milliseconds.
import { relations, sql } from "drizzle-orm";
import { check, foreignKey, index, integer, primaryKey, real, sqliteTable, text, unique, uniqueIndex } from "drizzle-orm/sqlite-core";
import { cents, dateOnly, flag, instant } from "./types.js";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: flag("email_verified").notNull().default(false),
    image: text("image"),
    isAnonymous: flag("is_anonymous").notNull().default(false),
    role: text("role").notNull().default("user"),
    banned: flag("banned").notNull().default(false),
    banReason: text("ban_reason"),
    banExpires: instant("ban_expires_at"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("uq_users_email_lower").on(sql`lower(${t.email})`),
  ],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    token: text("token").notNull().unique(),
    expiresAt: instant("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull(),
    activeOrganizationId: text("active_organization_id"),
    impersonatedBy: text("impersonated_by_id"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    index("ix_sessions_user_id").on(t.userId),
    index("ix_sessions_expires_at").on(t.expiresAt),
    index("ix_sessions_active_organization_id").on(t.activeOrganizationId),
    index("ix_sessions_impersonated_by_id").on(t.impersonatedBy),
    foreignKey({ name: "fk_sessions_user", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_sessions_activeOrganization", columns: [t.activeOrganizationId], foreignColumns: [organizations.id] }).onDelete("set null").onUpdate("cascade"),
    foreignKey({ name: "fk_sessions_impersonator", columns: [t.impersonatedBy], foreignColumns: [users.id] }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: instant("access_token_expires_at"),
    refreshTokenExpiresAt: instant("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    unique("uq_accounts_provider_id_account_id").on(t.providerId, t.accountId),
    index("ix_accounts_user_id").on(t.userId),
    foreignKey({ name: "fk_accounts_user", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: instant("expires_at").notNull(),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    index("ix_verifications_identifier").on(t.identifier),
  ],
);

export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    logo: text("logo"),
    metadata: text("metadata"),
    isDemo: flag("is_demo").notNull().default(false),
    demoExpiresAt: instant("demo_expires_at"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index("ix_organizations_is_demo_demo_expires_at").on(t.isDemo, t.demoExpiresAt),
  ],
);

export const members = sqliteTable(
  "members",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("member"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    unique("uq_members_organization_id_user_id").on(t.organizationId, t.userId),
    index("ix_members_user_id").on(t.userId),
    foreignKey({ name: "fk_members_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_members_user", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("member"),
    status: text("status", { enum: ["pending", "accepted", "rejected", "canceled"] }).notNull().default("pending"),
    expiresAt: instant("expires_at").notNull(),
    inviterId: text("inviter_id").notNull(),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index("ix_invitations_organization_id_email").on(t.organizationId, t.email),
    index("ix_invitations_inviter_id").on(t.inviterId),
    foreignKey({ name: "fk_invitations_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_invitations_inviter", columns: [t.inviterId], foreignColumns: [users.id] }).onDelete("cascade").onUpdate("cascade"),
    check("ck_invitations_status", sql`${t.status} in ('pending', 'accepted', 'rejected', 'canceled')`),
  ],
);

export const clients = sqliteTable(
  "clients",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    createdById: text("created_by_id").notNull(),
    name: text("name").notNull(),
    personType: text("person_type", { enum: ["individual", "company"] }).notNull().default("individual"),
    document: text("document"),
    email: text("email"),
    whatsapp: text("whatsapp"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    unique("uq_clients_id_organization_id").on(t.id, t.organizationId),
    unique("uq_clients_organization_id_document").on(t.organizationId, t.document),
    index("ix_clients_organization_id_created_by_id").on(t.organizationId, t.createdById),
    foreignKey({ name: "fk_clients_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_clients_createdBy", columns: [t.organizationId, t.createdById], foreignColumns: [members.organizationId, members.userId] }).onDelete("no action").onUpdate("cascade"),
    check("ck_clients_person_type", sql`${t.personType} in ('individual', 'company')`),
  ],
);

export const occupants = sqliteTable(
  "occupants",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
    document: text("document"),
    email: text("email"),
    phone: text("phone"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    unique("uq_occupants_id_organization_id").on(t.id, t.organizationId),
    unique("uq_occupants_organization_id_document").on(t.organizationId, t.document),
    foreignKey({ name: "fk_occupants_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const agencies = sqliteTable(
  "agencies",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    name: text("name").notNull(),
  },
  (t) => [
    unique("uq_agencies_id_organization_id").on(t.id, t.organizationId),
    unique("uq_agencies_organization_id_name").on(t.organizationId, t.name),
    foreignKey({ name: "fk_agencies_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const cities = sqliteTable(
  "cities",
  {
    ibgeCode: integer("ibge_code").primaryKey(),
    name: text("name").notNull(),
    state: text("state").notNull(),
    /** Lower case, no accents: what the city search compares against (SQLite has no unaccent()). */
    nameSearch: text("name_search").notNull().default(""),
  },
  (t) => [
    unique("uq_cities_state_name").on(t.state, t.name),
    index("ix_cities_name_search").on(t.nameSearch),
  ],
);

export const propertySubtypes = sqliteTable(
  "property_subtypes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    propertyType: text("property_type", { enum: ["residential", "commercial", "land", "logistics", "rural", "parking"] }).notNull(),
    name: text("name").notNull(),
  },
  (t) => [
    unique("uq_property_subtypes_property_type_name").on(t.propertyType, t.name),
    unique("uq_property_subtypes_id_property_type").on(t.id, t.propertyType),
    check("ck_property_subtypes_property_type", sql`${t.propertyType} in ('residential', 'commercial', 'land', 'logistics', 'rural', 'parking')`),
  ],
);

export const propertyTypeUsages = sqliteTable(
  "property_type_usages",
  {
    propertyType: text("property_type", { enum: ["residential", "commercial", "land", "logistics", "rural", "parking"] }).notNull(),
    usageType: text("usage_type", { enum: ["rental", "short_stay", "agricultural_lease", "concession", "own_use", "loan_for_use"] }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.propertyType, t.usageType] }),
    check("ck_property_type_usages_property_type", sql`${t.propertyType} in ('residential', 'commercial', 'land', 'logistics', 'rural', 'parking')`),
    check("ck_property_type_usages_usage_type", sql`${t.usageType} in ('rental', 'short_stay', 'agricultural_lease', 'concession', 'own_use', 'loan_for_use')`),
  ],
);

export const transactionCategories = sqliteTable(
  "transaction_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    transactionType: text("transaction_type", { enum: ["revenue", "expense"] }).notNull(),
    name: text("name").notNull(),
  },
  (t) => [
    unique("uq_transaction_categories_transaction_type_name").on(t.transactionType, t.name),
    check("ck_transaction_categories_transaction_type", sql`${t.transactionType} in ('revenue', 'expense')`),
  ],
);

export const properties = sqliteTable(
  "properties",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    createdById: text("created_by_id").notNull(),
    clientId: text("client_id"),
    agencyId: text("agency_id"),
    name: text("name").notNull(),
    propertyType: text("property_type", { enum: ["residential", "commercial", "land", "logistics", "rural", "parking"] }).notNull(),
    subtypeId: integer("subtype_id"),
    usageType: text("usage_type", { enum: ["rental", "short_stay", "agricultural_lease", "concession", "own_use", "loan_for_use"] }).notNull(),
    ownershipPercentage: real("ownership_percentage").notNull().default(100),
    totalArea: real("total_area"),
    privateArea: real("private_area"),
    bedrooms: integer("bedrooms"),
    suites: integer("suites"),
    bathrooms: integer("bathrooms"),
    parkingSpaces: integer("parking_spaces"),
    parkingSpotLabel: text("parking_spot_label"),
    builtYear: integer("built_year"),
    conservationState: text("conservation_state", { enum: ["degraded", "poor", "regular", "good", "excellent"] }),
    estimatedValueCents: cents("estimated_value_cents"),
    annualExpensesCents: cents("annual_expenses_cents").notNull().default(sql`0`),
    occupancyRate: real("occupancy_rate").notNull().default(90),
    rentalMode: text("rental_mode", { enum: ["manual", "contract"] }).notNull().default("manual"),
    notes: text("notes"),
    listingPriceCents: cents("listing_price_cents"),
    listingConsentedAt: instant("listing_consented_at"),
    listingHiddenAt: instant("listing_hidden_at"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    unique("uq_properties_id_organization_id").on(t.id, t.organizationId),
    index("ix_properties_organization_id_created_by_id").on(t.organizationId, t.createdById),
    index("ix_properties_organization_id_client_id").on(t.organizationId, t.clientId),
    index("ix_properties_organization_id_agency_id").on(t.organizationId, t.agencyId),
    index("ix_properties_organization_id_property_type").on(t.organizationId, t.propertyType),
    index("ix_properties_subtype_id").on(t.subtypeId),
    foreignKey({ name: "fk_properties_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_properties_createdBy", columns: [t.organizationId, t.createdById], foreignColumns: [members.organizationId, members.userId] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "fk_properties_client", columns: [t.clientId, t.organizationId], foreignColumns: [clients.id, clients.organizationId] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "fk_properties_agency", columns: [t.agencyId, t.organizationId], foreignColumns: [agencies.id, agencies.organizationId] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "fk_properties_subtype", columns: [t.subtypeId, t.propertyType], foreignColumns: [propertySubtypes.id, propertySubtypes.propertyType] }).onDelete("restrict").onUpdate("cascade"),
    foreignKey({ name: "fk_properties_allowedUsage", columns: [t.propertyType, t.usageType], foreignColumns: [propertyTypeUsages.propertyType, propertyTypeUsages.usageType] }).onDelete("restrict").onUpdate("cascade"),
    check("ck_properties_property_type", sql`${t.propertyType} in ('residential', 'commercial', 'land', 'logistics', 'rural', 'parking')`),
    check("ck_properties_usage_type", sql`${t.usageType} in ('rental', 'short_stay', 'agricultural_lease', 'concession', 'own_use', 'loan_for_use')`),
    check("ck_properties_conservation_state", sql`${t.conservationState} in ('degraded', 'poor', 'regular', 'good', 'excellent')`),
    check("ck_properties_rental_mode", sql`${t.rentalMode} in ('manual', 'contract')`),
    check("ck_properties_ownership", sql`${t.ownershipPercentage} > 0 AND ${t.ownershipPercentage} <= 100`),
    check("ck_properties_occupancy", sql`${t.occupancyRate} >= 0 AND ${t.occupancyRate} <= 100`),
    check("ck_properties_parking_spot", sql`${t.parkingSpotLabel} IS NULL OR ${t.propertyType} = 'parking'`),
    check("ck_properties_values", sql`COALESCE(${t.estimatedValueCents}, 0) >= 0 AND ${t.annualExpensesCents} >= 0`),
    check("ck_properties_areas", sql`COALESCE(${t.totalArea}, 0) >= 0 AND COALESCE(${t.privateArea}, 0) >= 0`),
    check("ck_properties_listing", sql`${t.listingPriceCents} IS NULL OR (${t.listingPriceCents} > 0 AND ${t.listingConsentedAt} IS NOT NULL)`),
    index("ix_properties_public_listings").on(sql`${t.listingConsentedAt} desc`, t.id).where(sql`${t.listingPriceCents} IS NOT NULL AND ${t.listingHiddenAt} IS NULL`),
  ],
);

export const propertyManualRentals = sqliteTable(
  "property_manual_rentals",
  {
    propertyId: text("property_id").primaryKey(),
    tenantName: text("tenant_name"),
    monthlyRentCents: cents("monthly_rent_cents").notNull().default(sql`0`),
    dueDay: integer("due_day"),
  },
  (t) => [
    foreignKey({ name: "fk_property_manual_rentals_property", columns: [t.propertyId], foreignColumns: [properties.id] }).onDelete("cascade").onUpdate("cascade"),
    check("ck_manual_rentals_values", sql`${t.monthlyRentCents} >= 0 AND (${t.dueDay} IS NULL OR ${t.dueDay} BETWEEN 1 AND 31)`),
  ],
);

export const propertyAddresses = sqliteTable(
  "property_addresses",
  {
    propertyId: text("property_id").primaryKey(),
    cityId: integer("city_id").notNull(),
    postalCode: text("postal_code"),
    street: text("street").notNull(),
    number: text("number"),
    complement: text("complement"),
    neighborhood: text("neighborhood"),
    latitude: real("latitude"),
    longitude: real("longitude"),
  },
  (t) => [
    index("ix_property_addresses_city_id").on(t.cityId),
    foreignKey({ name: "fk_property_addresses_property", columns: [t.propertyId], foreignColumns: [properties.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_property_addresses_city", columns: [t.cityId], foreignColumns: [cities.ibgeCode] }).onDelete("restrict").onUpdate("cascade"),
  ],
);

export const propertyAcquisitions = sqliteTable(
  "property_acquisitions",
  {
    propertyId: text("property_id").primaryKey(),
    acquisitionType: text("acquisition_type", { enum: ["purchase", "construction", "inheritance", "other"] }).notNull(),
    acquiredOn: dateOnly("acquired_on"),
    costCents: cents("cost_cents"),
  },
  (t) => [
    unique("uq_property_acquisitions_property_id_acquisition_type").on(t.propertyId, t.acquisitionType),
    foreignKey({ name: "fk_property_acquisitions_property", columns: [t.propertyId], foreignColumns: [properties.id] }).onDelete("cascade").onUpdate("cascade"),
    check("ck_property_acquisitions_acquisition_type", sql`${t.acquisitionType} in ('purchase', 'construction', 'inheritance', 'other')`),
    check("ck_acquisitions_cost", sql`${t.costCents} IS NULL OR ${t.costCents} >= 0`),
  ],
);

export const propertyFinancings = sqliteTable(
  "property_financings",
  {
    propertyId: text("property_id").primaryKey(),
    acquisitionType: text("acquisition_type", { enum: ["purchase", "construction", "inheritance", "other"] }).notNull(),
    lender: text("lender"),
    financedAmountCents: cents("financed_amount_cents").notNull(),
    termMonths: integer("term_months").notNull(),
    annualInterestRate: real("annual_interest_rate").notNull(),
    amortizationSystem: text("amortization_system", { enum: ["sac", "price"] }).notNull(),
    firstInstallmentOn: dateOnly("first_installment_on").notNull(),
  },
  (t) => [
    unique("uq_property_financings_property_id_acquisition_type").on(t.propertyId, t.acquisitionType),
    foreignKey({ name: "fk_property_financings_acquisition", columns: [t.propertyId, t.acquisitionType], foreignColumns: [propertyAcquisitions.propertyId, propertyAcquisitions.acquisitionType] }).onDelete("cascade").onUpdate("cascade"),
    check("ck_property_financings_acquisition_type", sql`${t.acquisitionType} in ('purchase', 'construction', 'inheritance', 'other')`),
    check("ck_property_financings_amortization_system", sql`${t.amortizationSystem} in ('sac', 'price')`),
    check("ck_financings_acquisition_type", sql`${t.acquisitionType} IN ('purchase', 'construction')`),
    check("ck_financings_values", sql`${t.financedAmountCents} > 0 AND ${t.termMonths} > 0 AND ${t.annualInterestRate} >= 0`),
  ],
);

export const propertyLegalRecords = sqliteTable(
  "property_legal_records",
  {
    propertyId: text("property_id").primaryKey(),
    registrationStatus: text("registration_status", { enum: ["regular", "irregular"] }).notNull().default("regular"),
    irregularityDescription: text("irregularity_description"),
    registryNumber: text("registry_number"),
    registryOffice: text("registry_office"),
    notes: text("notes"),
  },
  (t) => [
    foreignKey({ name: "fk_property_legal_records_property", columns: [t.propertyId], foreignColumns: [properties.id] }).onDelete("cascade").onUpdate("cascade"),
    check("ck_property_legal_records_registration_status", sql`${t.registrationStatus} in ('regular', 'irregular')`),
    check("ck_legal_irregularity", sql`${t.irregularityDescription} IS NULL OR ${t.registrationStatus} = 'irregular'`),
  ],
);

export const propertyInsurances = sqliteTable(
  "property_insurances",
  {
    propertyId: text("property_id").primaryKey(),
    description: text("description"),
  },
  (t) => [
    foreignKey({ name: "fk_property_insurances_property", columns: [t.propertyId], foreignColumns: [properties.id] }).onDelete("cascade").onUpdate("cascade"),
  ],
);

export const propertyProposals = sqliteTable(
  "property_proposals",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    propertyId: text("property_id").notNull(),
    proposalType: text("proposal_type", { enum: ["purchase", "sale", "rental", "linked", "informal"] }).notNull(),
    amountCents: cents("amount_cents").notNull(),
    proposalDate: dateOnly("proposal_date").notNull(),
    contact: text("contact"),
    notes: text("notes"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index("ix_property_proposals_property_id_proposal_date").on(t.propertyId, t.proposalDate),
    foreignKey({ name: "fk_property_proposals_property", columns: [t.propertyId], foreignColumns: [properties.id] }).onDelete("cascade").onUpdate("cascade"),
    check("ck_property_proposals_proposal_type", sql`${t.proposalType} in ('purchase', 'sale', 'rental', 'linked', 'informal')`),
    check("ck_proposals_amount", sql`${t.amountCents} > 0`),
  ],
);

export const storedFiles = sqliteTable(
  "stored_files",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    uploadedById: text("uploaded_by_id").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: cents("size_bytes").notNull(),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    unique("uq_stored_files_id_organization_id").on(t.id, t.organizationId),
    index("ix_stored_files_organization_id_uploaded_by_id").on(t.organizationId, t.uploadedById),
    index("ix_stored_files_created_at").on(t.createdAt),
    foreignKey({ name: "fk_stored_files_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_stored_files_uploadedBy", columns: [t.organizationId, t.uploadedById], foreignColumns: [members.organizationId, members.userId] }).onDelete("no action").onUpdate("cascade"),
    check("ck_stored_files_size", sql`${t.sizeBytes} >= 0`),
  ],
);

export const propertyPhotos = sqliteTable(
  "property_photos",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    propertyId: text("property_id").notNull(),
    fileId: text("file_id").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    unique("uq_property_photos_property_id_file_id").on(t.propertyId, t.fileId),
    index("ix_property_photos_property_id_position").on(t.propertyId, t.position),
    index("ix_property_photos_file_id_organization_id").on(t.fileId, t.organizationId),
    foreignKey({ name: "fk_property_photos_property", columns: [t.propertyId, t.organizationId], foreignColumns: [properties.id, properties.organizationId] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_property_photos_file", columns: [t.fileId, t.organizationId], foreignColumns: [storedFiles.id, storedFiles.organizationId] }).onDelete("no action").onUpdate("cascade"),
  ],
);

export const propertyDocuments = sqliteTable(
  "property_documents",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    propertyId: text("property_id").notNull(),
    fileId: text("file_id").notNull().unique(),
    category: text("category"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index("ix_property_documents_property_id").on(t.propertyId),
    foreignKey({ name: "fk_property_documents_property", columns: [t.propertyId, t.organizationId], foreignColumns: [properties.id, properties.organizationId] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_property_documents_file", columns: [t.fileId, t.organizationId], foreignColumns: [storedFiles.id, storedFiles.organizationId] }).onDelete("no action").onUpdate("cascade"),
  ],
);

export const contracts = sqliteTable(
  "contracts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    propertyId: text("property_id").notNull(),
    occupantId: text("occupant_id").notNull(),
    contractType: text("contract_type", { enum: ["conventional", "short_stay"] }).notNull(),
    status: text("status", { enum: ["active", "ended", "cancelled"] }).notNull().default("active"),
    startDate: dateOnly("start_date").notNull(),
    endDate: dateOnly("end_date"),
    notes: text("notes"),
    pdfFileId: text("pdf_file_id"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    unique("uq_contracts_id_organization_id").on(t.id, t.organizationId),
    unique("uq_contracts_id_property_id").on(t.id, t.propertyId),
    unique("uq_contracts_id_contract_type").on(t.id, t.contractType),
    index("ix_contracts_property_id_status").on(t.propertyId, t.status),
    index("ix_contracts_organization_id_status").on(t.organizationId, t.status),
    index("ix_contracts_occupant_id_organization_id").on(t.occupantId, t.organizationId),
    index("ix_contracts_pdf_file_id_organization_id").on(t.pdfFileId, t.organizationId),
    foreignKey({ name: "fk_contracts_property", columns: [t.propertyId, t.organizationId], foreignColumns: [properties.id, properties.organizationId] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_contracts_occupant", columns: [t.occupantId, t.organizationId], foreignColumns: [occupants.id, occupants.organizationId] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "fk_contracts_pdfFile", columns: [t.pdfFileId, t.organizationId], foreignColumns: [storedFiles.id, storedFiles.organizationId] }).onDelete("no action").onUpdate("cascade"),
    check("ck_contracts_contract_type", sql`${t.contractType} in ('conventional', 'short_stay')`),
    check("ck_contracts_status", sql`${t.status} in ('active', 'ended', 'cancelled')`),
    check("ck_contracts_dates", sql`${t.endDate} IS NULL OR ${t.endDate} > ${t.startDate}`),
    uniqueIndex("uq_contracts_one_active_per_property").on(t.propertyId).where(sql`${t.status} = 'active'`),
  ],
);

export const contractRentTerms = sqliteTable(
  "contract_rent_terms",
  {
    contractId: text("contract_id").primaryKey(),
    contractType: text("contract_type", { enum: ["conventional", "short_stay"] }).notNull(),
    monthlyRentCents: cents("monthly_rent_cents").notNull(),
    dueDay: integer("due_day").notNull(),
    adjustmentIndex: text("adjustment_index", { enum: ["igpm", "ipca", "inpc", "igpdi", "other"] }),
  },
  (t) => [
    unique("uq_contract_rent_terms_contract_id_contract_type").on(t.contractId, t.contractType),
    foreignKey({ name: "fk_contract_rent_terms_contract", columns: [t.contractId, t.contractType], foreignColumns: [contracts.id, contracts.contractType] }).onDelete("cascade").onUpdate("cascade"),
    check("ck_contract_rent_terms_contract_type", sql`${t.contractType} in ('conventional', 'short_stay')`),
    check("ck_contract_rent_terms_adjustment_index", sql`${t.adjustmentIndex} in ('igpm', 'ipca', 'inpc', 'igpdi', 'other')`),
    check("ck_rent_terms_type", sql`${t.contractType} = 'conventional'`),
    check("ck_rent_terms_values", sql`${t.monthlyRentCents} > 0 AND ${t.dueDay} BETWEEN 1 AND 31`),
  ],
);

export const reservations = sqliteTable(
  "reservations",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    propertyId: text("property_id").notNull(),
    contractId: text("contract_id"),
    occupantId: text("occupant_id").notNull(),
    checkIn: dateOnly("check_in").notNull(),
    checkOut: dateOnly("check_out").notNull(),
    totalAmountCents: cents("total_amount_cents").notNull().default(sql`0`),
    status: text("status", { enum: ["confirmed", "cancelled"] }).notNull().default("confirmed"),
    notes: text("notes"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    index("ix_reservations_property_id_check_in").on(t.propertyId, t.checkIn),
    index("ix_reservations_organization_id_check_in").on(t.organizationId, t.checkIn),
    index("ix_reservations_contract_id_property_id").on(t.contractId, t.propertyId),
    index("ix_reservations_occupant_id_organization_id").on(t.occupantId, t.organizationId),
    foreignKey({ name: "fk_reservations_property", columns: [t.propertyId, t.organizationId], foreignColumns: [properties.id, properties.organizationId] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_reservations_occupant", columns: [t.occupantId, t.organizationId], foreignColumns: [occupants.id, occupants.organizationId] }).onDelete("no action").onUpdate("cascade"),
    foreignKey({ name: "fk_reservations_contract", columns: [t.contractId, t.propertyId], foreignColumns: [contracts.id, contracts.propertyId] }).onDelete("no action").onUpdate("cascade"),
    check("ck_reservations_status", sql`${t.status} in ('confirmed', 'cancelled')`),
    check("ck_reservations_dates", sql`${t.checkOut} > ${t.checkIn}`),
    check("ck_reservations_total", sql`${t.totalAmountCents} >= 0`),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    propertyId: text("property_id").notNull(),
    categoryId: integer("category_id").notNull(),
    amountCents: cents("amount_cents").notNull(),
    occurredOn: dateOnly("occurred_on").notNull(),
    description: text("description"),
    isRecurring: flag("is_recurring").notNull().default(false),
    recurrenceEndsOn: dateOnly("recurrence_ends_on"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    index("ix_transactions_property_id_occurred_on").on(t.propertyId, t.occurredOn),
    index("ix_transactions_organization_id_occurred_on").on(t.organizationId, t.occurredOn),
    index("ix_transactions_category_id").on(t.categoryId),
    foreignKey({ name: "fk_transactions_property", columns: [t.propertyId, t.organizationId], foreignColumns: [properties.id, properties.organizationId] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_transactions_category", columns: [t.categoryId], foreignColumns: [transactionCategories.id] }).onDelete("restrict").onUpdate("cascade"),
    check("ck_transactions_amount", sql`${t.amountCents} > 0`),
    check("ck_transactions_recurrence", sql`${t.recurrenceEndsOn} IS NULL OR (${t.isRecurring} AND ${t.recurrenceEndsOn} >= ${t.occurredOn})`),
  ],
);

export const contractTemplates = sqliteTable(
  "contract_templates",
  {
    organizationId: text("organization_id").primaryKey(),
    header: text("header").notNull(),
    clauses: text("clauses").notNull(),
    footer: text("footer").notNull(),
    updatedById: text("updated_by_id"),
    updatedAt: instant("updated_at").notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (t) => [
    foreignKey({ name: "fk_contract_templates_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_contract_templates_updatedBy", columns: [t.updatedById], foreignColumns: [users.id] }).onDelete("set null").onUpdate("cascade"),
  ],
);

export const feedbacks = sqliteTable(
  "feedbacks",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    organizationId: text("organization_id").notNull(),
    userId: text("user_id").notNull(),
    message: text("message").notNull(),
    attachmentFileId: text("attachment_file_id"),
    status: text("status", { enum: ["open", "resolved"] }).notNull().default("open"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index("ix_feedbacks_status_created_at").on(t.status, t.createdAt),
    index("ix_feedbacks_user_id").on(t.userId),
    index("ix_feedbacks_attachment_file_id_organization_id").on(t.attachmentFileId, t.organizationId),
    foreignKey({ name: "fk_feedbacks_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_feedbacks_user", columns: [t.userId], foreignColumns: [users.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_feedbacks_attachment", columns: [t.attachmentFileId, t.organizationId], foreignColumns: [storedFiles.id, storedFiles.organizationId] }).onDelete("no action").onUpdate("cascade"),
    check("ck_feedbacks_status", sql`${t.status} in ('open', 'resolved')`),
  ],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    organizationId: text("organization_id"),
    actorUserId: text("actor_user_id"),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    actorRole: text("actor_role"),
    impersonatedById: text("impersonated_by_id"),
    action: text("action", { enum: ["login", "logout", "create", "update", "delete", "view", "upload", "end_contract", "cancel", "generate_pdf", "generate_report", "invite_member", "remove_member", "impersonate_start", "impersonate_end", "unauthorized_access"] }).notNull(),
    entityType: text("entity_type", { enum: ["property", "client", "transaction", "document", "photo", "contract", "reservation", "occupant", "member", "organization", "report", "feedback"] }),
    entityId: text("entity_id"),
    details: text("details"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: instant("created_at").notNull().$defaultFn(() => new Date()),
  },
  (t) => [
    index("ix_audit_logs_organization_id_created_at").on(t.organizationId, t.createdAt),
    index("ix_audit_logs_actor_user_id_created_at").on(t.actorUserId, t.createdAt),
    index("ix_audit_logs_action").on(t.action),
    index("ix_audit_logs_impersonated_by_id").on(t.impersonatedById),
    foreignKey({ name: "fk_audit_logs_organization", columns: [t.organizationId], foreignColumns: [organizations.id] }).onDelete("cascade").onUpdate("cascade"),
    foreignKey({ name: "fk_audit_logs_actor", columns: [t.actorUserId], foreignColumns: [users.id] }).onDelete("set null").onUpdate("cascade"),
    foreignKey({ name: "fk_audit_logs_impersonator", columns: [t.impersonatedById], foreignColumns: [users.id] }).onDelete("set null").onUpdate("cascade"),
    check("ck_audit_logs_action", sql`${t.action} in ('login', 'logout', 'create', 'update', 'delete', 'view', 'upload', 'end_contract', 'cancel', 'generate_pdf', 'generate_report', 'invite_member', 'remove_member', 'impersonate_start', 'impersonate_end', 'unauthorized_access')`),
    check("ck_audit_logs_entity_type", sql`${t.entityType} in ('property', 'client', 'transaction', 'document', 'photo', 'contract', 'reservation', 'occupant', 'member', 'organization', 'report', 'feedback')`),
  ],
);

export const usersRelations = relations(users, ({ one, many }) => ({
  sessions: many(sessions, { relationName: "Session_user" }),
  impersonatedSessions: many(sessions, { relationName: "Session_impersonator" }),
  accounts: many(accounts, { relationName: "Account_user" }),
  memberships: many(members, { relationName: "Member_user" }),
  invitationsSent: many(invitations, { relationName: "Invitation_inviter" }),
  contractTemplatesUpdated: many(contractTemplates, { relationName: "ContractTemplate_updatedBy" }),
  feedbacks: many(feedbacks, { relationName: "Feedback_user" }),
  auditLogsAsActor: many(auditLogs, { relationName: "AuditLog_actor" }),
  auditLogsImpersonated: many(auditLogs, { relationName: "AuditLog_impersonator" }),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, { relationName: "Session_user", fields: [sessions.userId], references: [users.id] }),
  activeOrganization: one(organizations, { relationName: "Session_activeOrganization", fields: [sessions.activeOrganizationId], references: [organizations.id] }),
  impersonator: one(users, { relationName: "Session_impersonator", fields: [sessions.impersonatedBy], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { relationName: "Account_user", fields: [accounts.userId], references: [users.id] }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  sessions: many(sessions, { relationName: "Session_activeOrganization" }),
  members: many(members, { relationName: "Member_organization" }),
  invitations: many(invitations, { relationName: "Invitation_organization" }),
  clients: many(clients, { relationName: "Client_organization" }),
  occupants: many(occupants, { relationName: "Occupant_organization" }),
  agencies: many(agencies, { relationName: "Agency_organization" }),
  properties: many(properties, { relationName: "Property_organization" }),
  storedFiles: many(storedFiles, { relationName: "StoredFile_organization" }),
  contractTemplate: one(contractTemplates),
  feedbacks: many(feedbacks, { relationName: "Feedback_organization" }),
  auditLogs: many(auditLogs, { relationName: "AuditLog_organization" }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  organization: one(organizations, { relationName: "Member_organization", fields: [members.organizationId], references: [organizations.id] }),
  user: one(users, { relationName: "Member_user", fields: [members.userId], references: [users.id] }),
  clientsCreated: many(clients, { relationName: "Client_createdBy" }),
  propertiesCreated: many(properties, { relationName: "Property_createdBy" }),
  filesUploaded: many(storedFiles, { relationName: "StoredFile_uploadedBy" }),
}));

export const invitationsRelations = relations(invitations, ({ one, many }) => ({
  organization: one(organizations, { relationName: "Invitation_organization", fields: [invitations.organizationId], references: [organizations.id] }),
  inviter: one(users, { relationName: "Invitation_inviter", fields: [invitations.inviterId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organization: one(organizations, { relationName: "Client_organization", fields: [clients.organizationId], references: [organizations.id] }),
  createdBy: one(members, { relationName: "Client_createdBy", fields: [clients.organizationId, clients.createdById], references: [members.organizationId, members.userId] }),
  properties: many(properties, { relationName: "Property_client" }),
}));

export const occupantsRelations = relations(occupants, ({ one, many }) => ({
  organization: one(organizations, { relationName: "Occupant_organization", fields: [occupants.organizationId], references: [organizations.id] }),
  contracts: many(contracts, { relationName: "Contract_occupant" }),
  reservations: many(reservations, { relationName: "Reservation_occupant" }),
}));

export const agenciesRelations = relations(agencies, ({ one, many }) => ({
  organization: one(organizations, { relationName: "Agency_organization", fields: [agencies.organizationId], references: [organizations.id] }),
  properties: many(properties, { relationName: "Property_agency" }),
}));

export const citiesRelations = relations(cities, ({ one, many }) => ({
  addresses: many(propertyAddresses, { relationName: "PropertyAddress_city" }),
}));

export const propertySubtypesRelations = relations(propertySubtypes, ({ one, many }) => ({
  properties: many(properties, { relationName: "Property_subtype" }),
}));

export const propertyTypeUsagesRelations = relations(propertyTypeUsages, ({ one, many }) => ({
  properties: many(properties, { relationName: "Property_allowedUsage" }),
}));

export const transactionCategoriesRelations = relations(transactionCategories, ({ one, many }) => ({
  transactions: many(transactions, { relationName: "Transaction_category" }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  organization: one(organizations, { relationName: "Property_organization", fields: [properties.organizationId], references: [organizations.id] }),
  createdBy: one(members, { relationName: "Property_createdBy", fields: [properties.organizationId, properties.createdById], references: [members.organizationId, members.userId] }),
  client: one(clients, { relationName: "Property_client", fields: [properties.clientId, properties.organizationId], references: [clients.id, clients.organizationId] }),
  agency: one(agencies, { relationName: "Property_agency", fields: [properties.agencyId, properties.organizationId], references: [agencies.id, agencies.organizationId] }),
  subtype: one(propertySubtypes, { relationName: "Property_subtype", fields: [properties.subtypeId, properties.propertyType], references: [propertySubtypes.id, propertySubtypes.propertyType] }),
  allowedUsage: one(propertyTypeUsages, { relationName: "Property_allowedUsage", fields: [properties.propertyType, properties.usageType], references: [propertyTypeUsages.propertyType, propertyTypeUsages.usageType] }),
  manualRental: one(propertyManualRentals),
  address: one(propertyAddresses),
  acquisition: one(propertyAcquisitions),
  legalRecord: one(propertyLegalRecords),
  insurance: one(propertyInsurances),
  proposals: many(propertyProposals, { relationName: "PropertyProposal_property" }),
  photos: many(propertyPhotos, { relationName: "PropertyPhoto_property" }),
  documents: many(propertyDocuments, { relationName: "PropertyDocument_property" }),
  contracts: many(contracts, { relationName: "Contract_property" }),
  reservations: many(reservations, { relationName: "Reservation_property" }),
  transactions: many(transactions, { relationName: "Transaction_property" }),
}));

export const propertyManualRentalsRelations = relations(propertyManualRentals, ({ one, many }) => ({
  property: one(properties, { relationName: "PropertyManualRental_property", fields: [propertyManualRentals.propertyId], references: [properties.id] }),
}));

export const propertyAddressesRelations = relations(propertyAddresses, ({ one, many }) => ({
  property: one(properties, { relationName: "PropertyAddress_property", fields: [propertyAddresses.propertyId], references: [properties.id] }),
  city: one(cities, { relationName: "PropertyAddress_city", fields: [propertyAddresses.cityId], references: [cities.ibgeCode] }),
}));

export const propertyAcquisitionsRelations = relations(propertyAcquisitions, ({ one, many }) => ({
  property: one(properties, { relationName: "PropertyAcquisition_property", fields: [propertyAcquisitions.propertyId], references: [properties.id] }),
  financing: one(propertyFinancings),
}));

export const propertyFinancingsRelations = relations(propertyFinancings, ({ one, many }) => ({
  acquisition: one(propertyAcquisitions, { relationName: "PropertyFinancing_acquisition", fields: [propertyFinancings.propertyId, propertyFinancings.acquisitionType], references: [propertyAcquisitions.propertyId, propertyAcquisitions.acquisitionType] }),
}));

export const propertyLegalRecordsRelations = relations(propertyLegalRecords, ({ one, many }) => ({
  property: one(properties, { relationName: "PropertyLegalRecord_property", fields: [propertyLegalRecords.propertyId], references: [properties.id] }),
}));

export const propertyInsurancesRelations = relations(propertyInsurances, ({ one, many }) => ({
  property: one(properties, { relationName: "PropertyInsurance_property", fields: [propertyInsurances.propertyId], references: [properties.id] }),
}));

export const propertyProposalsRelations = relations(propertyProposals, ({ one, many }) => ({
  property: one(properties, { relationName: "PropertyProposal_property", fields: [propertyProposals.propertyId], references: [properties.id] }),
}));

export const storedFilesRelations = relations(storedFiles, ({ one, many }) => ({
  organization: one(organizations, { relationName: "StoredFile_organization", fields: [storedFiles.organizationId], references: [organizations.id] }),
  uploadedBy: one(members, { relationName: "StoredFile_uploadedBy", fields: [storedFiles.organizationId, storedFiles.uploadedById], references: [members.organizationId, members.userId] }),
  photos: many(propertyPhotos, { relationName: "PropertyPhoto_file" }),
  documents: many(propertyDocuments, { relationName: "PropertyDocument_file" }),
  contractPdfs: many(contracts, { relationName: "Contract_pdfFile" }),
  feedbackAttachments: many(feedbacks, { relationName: "Feedback_attachment" }),
}));

export const propertyPhotosRelations = relations(propertyPhotos, ({ one, many }) => ({
  property: one(properties, { relationName: "PropertyPhoto_property", fields: [propertyPhotos.propertyId, propertyPhotos.organizationId], references: [properties.id, properties.organizationId] }),
  file: one(storedFiles, { relationName: "PropertyPhoto_file", fields: [propertyPhotos.fileId, propertyPhotos.organizationId], references: [storedFiles.id, storedFiles.organizationId] }),
}));

export const propertyDocumentsRelations = relations(propertyDocuments, ({ one, many }) => ({
  property: one(properties, { relationName: "PropertyDocument_property", fields: [propertyDocuments.propertyId, propertyDocuments.organizationId], references: [properties.id, properties.organizationId] }),
  file: one(storedFiles, { relationName: "PropertyDocument_file", fields: [propertyDocuments.fileId, propertyDocuments.organizationId], references: [storedFiles.id, storedFiles.organizationId] }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  property: one(properties, { relationName: "Contract_property", fields: [contracts.propertyId, contracts.organizationId], references: [properties.id, properties.organizationId] }),
  occupant: one(occupants, { relationName: "Contract_occupant", fields: [contracts.occupantId, contracts.organizationId], references: [occupants.id, occupants.organizationId] }),
  pdfFile: one(storedFiles, { relationName: "Contract_pdfFile", fields: [contracts.pdfFileId, contracts.organizationId], references: [storedFiles.id, storedFiles.organizationId] }),
  rentTerms: one(contractRentTerms),
  reservations: many(reservations, { relationName: "Reservation_contract" }),
}));

export const contractRentTermsRelations = relations(contractRentTerms, ({ one, many }) => ({
  contract: one(contracts, { relationName: "ContractRentTerms_contract", fields: [contractRentTerms.contractId, contractRentTerms.contractType], references: [contracts.id, contracts.contractType] }),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  property: one(properties, { relationName: "Reservation_property", fields: [reservations.propertyId, reservations.organizationId], references: [properties.id, properties.organizationId] }),
  occupant: one(occupants, { relationName: "Reservation_occupant", fields: [reservations.occupantId, reservations.organizationId], references: [occupants.id, occupants.organizationId] }),
  contract: one(contracts, { relationName: "Reservation_contract", fields: [reservations.contractId, reservations.propertyId], references: [contracts.id, contracts.propertyId] }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  property: one(properties, { relationName: "Transaction_property", fields: [transactions.propertyId, transactions.organizationId], references: [properties.id, properties.organizationId] }),
  category: one(transactionCategories, { relationName: "Transaction_category", fields: [transactions.categoryId], references: [transactionCategories.id] }),
}));

export const contractTemplatesRelations = relations(contractTemplates, ({ one, many }) => ({
  organization: one(organizations, { relationName: "ContractTemplate_organization", fields: [contractTemplates.organizationId], references: [organizations.id] }),
  updatedBy: one(users, { relationName: "ContractTemplate_updatedBy", fields: [contractTemplates.updatedById], references: [users.id] }),
}));

export const feedbacksRelations = relations(feedbacks, ({ one, many }) => ({
  organization: one(organizations, { relationName: "Feedback_organization", fields: [feedbacks.organizationId], references: [organizations.id] }),
  user: one(users, { relationName: "Feedback_user", fields: [feedbacks.userId], references: [users.id] }),
  attachment: one(storedFiles, { relationName: "Feedback_attachment", fields: [feedbacks.attachmentFileId, feedbacks.organizationId], references: [storedFiles.id, storedFiles.organizationId] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one, many }) => ({
  organization: one(organizations, { relationName: "AuditLog_organization", fields: [auditLogs.organizationId], references: [organizations.id] }),
  actor: one(users, { relationName: "AuditLog_actor", fields: [auditLogs.actorUserId], references: [users.id] }),
  impersonator: one(users, { relationName: "AuditLog_impersonator", fields: [auditLogs.impersonatedById], references: [users.id] }),
}));

