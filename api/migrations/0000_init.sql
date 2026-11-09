CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_accounts_user_id` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_accounts_provider_id_account_id` ON `accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `agencies` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_agencies_id_organization_id` ON `agencies` (`id`,`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_agencies_organization_id_name` ON `agencies` (`organization_id`,`name`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` text,
	`actor_user_id` text,
	`actor_name` text,
	`actor_email` text,
	`actor_role` text,
	`impersonated_by_id` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`impersonated_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "ck_audit_logs_action" CHECK("audit_logs"."action" in ('login', 'logout', 'create', 'update', 'delete', 'view', 'upload', 'end_contract', 'cancel', 'generate_pdf', 'generate_report', 'invite_member', 'remove_member', 'impersonate_start', 'impersonate_end', 'unauthorized_access')),
	CONSTRAINT "ck_audit_logs_entity_type" CHECK("audit_logs"."entity_type" in ('property', 'client', 'transaction', 'document', 'photo', 'contract', 'reservation', 'occupant', 'member', 'organization', 'report', 'feedback'))
);
--> statement-breakpoint
CREATE INDEX `ix_audit_logs_organization_id_created_at` ON `audit_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_audit_logs_actor_user_id_created_at` ON `audit_logs` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_audit_logs_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `ix_audit_logs_impersonated_by_id` ON `audit_logs` (`impersonated_by_id`);--> statement-breakpoint
CREATE TABLE `cities` (
	`ibge_code` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`state` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_cities_state_name` ON `cities` (`state`,`name`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`name` text NOT NULL,
	`person_type` text DEFAULT 'individual' NOT NULL,
	`document` text,
	`email` text,
	`whatsapp` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`created_by_id`) REFERENCES `members`(`organization_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_clients_person_type" CHECK("clients"."person_type" in ('individual', 'company'))
);
--> statement-breakpoint
CREATE INDEX `ix_clients_organization_id_created_by_id` ON `clients` (`organization_id`,`created_by_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_clients_id_organization_id` ON `clients` (`id`,`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_clients_organization_id_document` ON `clients` (`organization_id`,`document`);--> statement-breakpoint
CREATE TABLE `contract_rent_terms` (
	`contract_id` text PRIMARY KEY NOT NULL,
	`contract_type` text NOT NULL,
	`monthly_rent_cents` integer NOT NULL,
	`due_day` integer NOT NULL,
	`adjustment_index` text,
	FOREIGN KEY (`contract_id`,`contract_type`) REFERENCES `contracts`(`id`,`contract_type`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_contract_rent_terms_contract_type" CHECK("contract_rent_terms"."contract_type" in ('conventional', 'short_stay')),
	CONSTRAINT "ck_contract_rent_terms_adjustment_index" CHECK("contract_rent_terms"."adjustment_index" in ('igpm', 'ipca', 'inpc', 'igpdi', 'other')),
	CONSTRAINT "ck_rent_terms_type" CHECK("contract_rent_terms"."contract_type" = 'conventional'),
	CONSTRAINT "ck_rent_terms_values" CHECK("contract_rent_terms"."monthly_rent_cents" > 0 AND "contract_rent_terms"."due_day" BETWEEN 1 AND 31)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_contract_rent_terms_contract_id_contract_type` ON `contract_rent_terms` (`contract_id`,`contract_type`);--> statement-breakpoint
CREATE TABLE `contract_templates` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`header` text NOT NULL,
	`clauses` text NOT NULL,
	`footer` text NOT NULL,
	`updated_by_id` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`property_id` text NOT NULL,
	`occupant_id` text NOT NULL,
	`contract_type` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`notes` text,
	`pdf_file_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`property_id`,`organization_id`) REFERENCES `properties`(`id`,`organization_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`occupant_id`,`organization_id`) REFERENCES `occupants`(`id`,`organization_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pdf_file_id`,`organization_id`) REFERENCES `stored_files`(`id`,`organization_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_contracts_contract_type" CHECK("contracts"."contract_type" in ('conventional', 'short_stay')),
	CONSTRAINT "ck_contracts_status" CHECK("contracts"."status" in ('active', 'ended', 'cancelled')),
	CONSTRAINT "ck_contracts_dates" CHECK("contracts"."end_date" IS NULL OR "contracts"."end_date" > "contracts"."start_date")
);
--> statement-breakpoint
CREATE INDEX `ix_contracts_property_id_status` ON `contracts` (`property_id`,`status`);--> statement-breakpoint
CREATE INDEX `ix_contracts_organization_id_status` ON `contracts` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `ix_contracts_occupant_id_organization_id` ON `contracts` (`occupant_id`,`organization_id`);--> statement-breakpoint
CREATE INDEX `ix_contracts_pdf_file_id_organization_id` ON `contracts` (`pdf_file_id`,`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_contracts_one_active_per_property` ON `contracts` (`property_id`) WHERE "contracts"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX `uq_contracts_id_organization_id` ON `contracts` (`id`,`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_contracts_id_property_id` ON `contracts` (`id`,`property_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_contracts_id_contract_type` ON `contracts` (`id`,`contract_type`);--> statement-breakpoint
CREATE TABLE `feedbacks` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`attachment_file_id` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_file_id`,`organization_id`) REFERENCES `stored_files`(`id`,`organization_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_feedbacks_status" CHECK("feedbacks"."status" in ('open', 'resolved'))
);
--> statement-breakpoint
CREATE INDEX `ix_feedbacks_status_created_at` ON `feedbacks` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `ix_feedbacks_user_id` ON `feedbacks` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_feedbacks_attachment_file_id_organization_id` ON `feedbacks` (`attachment_file_id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`inviter_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_invitations_status" CHECK("invitations"."status" in ('pending', 'accepted', 'rejected', 'canceled'))
);
--> statement-breakpoint
CREATE INDEX `ix_invitations_organization_id_email` ON `invitations` (`organization_id`,`email`);--> statement-breakpoint
CREATE INDEX `ix_invitations_inviter_id` ON `invitations` (`inviter_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ix_members_user_id` ON `members` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_members_organization_id_user_id` ON `members` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `occupants` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`document` text,
	`email` text,
	`phone` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_occupants_id_organization_id` ON `occupants` (`id`,`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_occupants_organization_id_document` ON `occupants` (`organization_id`,`document`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`metadata` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`demo_expires_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE INDEX `ix_organizations_is_demo_demo_expires_at` ON `organizations` (`is_demo`,`demo_expires_at`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`created_by_id` text NOT NULL,
	`client_id` text,
	`agency_id` text,
	`name` text NOT NULL,
	`property_type` text NOT NULL,
	`subtype_id` integer,
	`usage_type` text NOT NULL,
	`ownership_percentage` real DEFAULT 100 NOT NULL,
	`total_area` real,
	`private_area` real,
	`bedrooms` integer,
	`suites` integer,
	`bathrooms` integer,
	`parking_spaces` integer,
	`parking_spot_label` text,
	`built_year` integer,
	`conservation_state` text,
	`estimated_value_cents` integer,
	`annual_expenses_cents` integer DEFAULT 0 NOT NULL,
	`occupancy_rate` real DEFAULT 90 NOT NULL,
	`rental_mode` text DEFAULT 'manual' NOT NULL,
	`notes` text,
	`listing_price_cents` integer,
	`listing_consented_at` integer,
	`listing_hidden_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`created_by_id`) REFERENCES `members`(`organization_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`,`organization_id`) REFERENCES `clients`(`id`,`organization_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agency_id`,`organization_id`) REFERENCES `agencies`(`id`,`organization_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subtype_id`,`property_type`) REFERENCES `property_subtypes`(`id`,`property_type`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`property_type`,`usage_type`) REFERENCES `property_type_usages`(`property_type`,`usage_type`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_properties_property_type" CHECK("properties"."property_type" in ('residential', 'commercial', 'land', 'logistics', 'rural', 'parking')),
	CONSTRAINT "ck_properties_usage_type" CHECK("properties"."usage_type" in ('rental', 'short_stay', 'agricultural_lease', 'concession', 'own_use', 'loan_for_use')),
	CONSTRAINT "ck_properties_conservation_state" CHECK("properties"."conservation_state" in ('degraded', 'poor', 'regular', 'good', 'excellent')),
	CONSTRAINT "ck_properties_rental_mode" CHECK("properties"."rental_mode" in ('manual', 'contract')),
	CONSTRAINT "ck_properties_ownership" CHECK("properties"."ownership_percentage" > 0 AND "properties"."ownership_percentage" <= 100),
	CONSTRAINT "ck_properties_occupancy" CHECK("properties"."occupancy_rate" >= 0 AND "properties"."occupancy_rate" <= 100),
	CONSTRAINT "ck_properties_parking_spot" CHECK("properties"."parking_spot_label" IS NULL OR "properties"."property_type" = 'parking'),
	CONSTRAINT "ck_properties_values" CHECK(COALESCE("properties"."estimated_value_cents", 0) >= 0 AND "properties"."annual_expenses_cents" >= 0),
	CONSTRAINT "ck_properties_areas" CHECK(COALESCE("properties"."total_area", 0) >= 0 AND COALESCE("properties"."private_area", 0) >= 0),
	CONSTRAINT "ck_properties_listing" CHECK("properties"."listing_price_cents" IS NULL OR ("properties"."listing_price_cents" > 0 AND "properties"."listing_consented_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX `ix_properties_organization_id_created_by_id` ON `properties` (`organization_id`,`created_by_id`);--> statement-breakpoint
CREATE INDEX `ix_properties_organization_id_client_id` ON `properties` (`organization_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `ix_properties_organization_id_agency_id` ON `properties` (`organization_id`,`agency_id`);--> statement-breakpoint
CREATE INDEX `ix_properties_organization_id_property_type` ON `properties` (`organization_id`,`property_type`);--> statement-breakpoint
CREATE INDEX `ix_properties_subtype_id` ON `properties` (`subtype_id`);--> statement-breakpoint
CREATE INDEX `ix_properties_public_listings` ON `properties` ("listing_consented_at" desc,`id`) WHERE "properties"."listing_price_cents" IS NOT NULL AND "properties"."listing_hidden_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_properties_id_organization_id` ON `properties` (`id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `property_acquisitions` (
	`property_id` text PRIMARY KEY NOT NULL,
	`acquisition_type` text NOT NULL,
	`acquired_on` text,
	`cost_cents` integer,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_property_acquisitions_acquisition_type" CHECK("property_acquisitions"."acquisition_type" in ('purchase', 'construction', 'inheritance', 'other')),
	CONSTRAINT "ck_acquisitions_cost" CHECK("property_acquisitions"."cost_cents" IS NULL OR "property_acquisitions"."cost_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_property_acquisitions_property_id_acquisition_type` ON `property_acquisitions` (`property_id`,`acquisition_type`);--> statement-breakpoint
CREATE TABLE `property_addresses` (
	`property_id` text PRIMARY KEY NOT NULL,
	`city_id` integer NOT NULL,
	`postal_code` text,
	`street` text NOT NULL,
	`number` text,
	`complement` text,
	`neighborhood` text,
	`latitude` real,
	`longitude` real,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`ibge_code`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `ix_property_addresses_city_id` ON `property_addresses` (`city_id`);--> statement-breakpoint
CREATE TABLE `property_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`property_id` text NOT NULL,
	`file_id` text NOT NULL,
	`category` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`property_id`,`organization_id`) REFERENCES `properties`(`id`,`organization_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`,`organization_id`) REFERENCES `stored_files`(`id`,`organization_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `property_documents_file_id_unique` ON `property_documents` (`file_id`);--> statement-breakpoint
CREATE INDEX `ix_property_documents_property_id` ON `property_documents` (`property_id`);--> statement-breakpoint
CREATE TABLE `property_financings` (
	`property_id` text PRIMARY KEY NOT NULL,
	`acquisition_type` text NOT NULL,
	`lender` text,
	`financed_amount_cents` integer NOT NULL,
	`term_months` integer NOT NULL,
	`annual_interest_rate` real NOT NULL,
	`amortization_system` text NOT NULL,
	`first_installment_on` text NOT NULL,
	FOREIGN KEY (`property_id`,`acquisition_type`) REFERENCES `property_acquisitions`(`property_id`,`acquisition_type`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "ck_property_financings_acquisition_type" CHECK("property_financings"."acquisition_type" in ('purchase', 'construction', 'inheritance', 'other')),
	CONSTRAINT "ck_property_financings_amortization_system" CHECK("property_financings"."amortization_system" in ('sac', 'price')),
	CONSTRAINT "ck_financings_acquisition_type" CHECK("property_financings"."acquisition_type" IN ('purchase', 'construction')),
	CONSTRAINT "ck_financings_values" CHECK("property_financings"."financed_amount_cents" > 0 AND "property_financings"."term_months" > 0 AND "property_financings"."annual_interest_rate" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_property_financings_property_id_acquisition_type` ON `property_financings` (`property_id`,`acquisition_type`);--> statement-breakpoint
CREATE TABLE `property_insurances` (
	`property_id` text PRIMARY KEY NOT NULL,
	`description` text,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `property_legal_records` (
	`property_id` text PRIMARY KEY NOT NULL,
	`registration_status` text DEFAULT 'regular' NOT NULL,
	`irregularity_description` text,
	`registry_number` text,
	`registry_office` text,
	`notes` text,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_property_legal_records_registration_status" CHECK("property_legal_records"."registration_status" in ('regular', 'irregular')),
	CONSTRAINT "ck_legal_irregularity" CHECK("property_legal_records"."irregularity_description" IS NULL OR "property_legal_records"."registration_status" = 'irregular')
);
--> statement-breakpoint
CREATE TABLE `property_manual_rentals` (
	`property_id` text PRIMARY KEY NOT NULL,
	`tenant_name` text,
	`monthly_rent_cents` integer DEFAULT 0 NOT NULL,
	`due_day` integer,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_manual_rentals_values" CHECK("property_manual_rentals"."monthly_rent_cents" >= 0 AND ("property_manual_rentals"."due_day" IS NULL OR "property_manual_rentals"."due_day" BETWEEN 1 AND 31))
);
--> statement-breakpoint
CREATE TABLE `property_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`property_id` text NOT NULL,
	`file_id` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`property_id`,`organization_id`) REFERENCES `properties`(`id`,`organization_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`file_id`,`organization_id`) REFERENCES `stored_files`(`id`,`organization_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_property_photos_property_id_position` ON `property_photos` (`property_id`,`position`);--> statement-breakpoint
CREATE INDEX `ix_property_photos_file_id_organization_id` ON `property_photos` (`file_id`,`organization_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_property_photos_property_id_file_id` ON `property_photos` (`property_id`,`file_id`);--> statement-breakpoint
CREATE TABLE `property_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`proposal_type` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`proposal_date` text NOT NULL,
	`contact` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ck_property_proposals_proposal_type" CHECK("property_proposals"."proposal_type" in ('purchase', 'sale', 'rental', 'linked', 'informal')),
	CONSTRAINT "ck_proposals_amount" CHECK("property_proposals"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE INDEX `ix_property_proposals_property_id_proposal_date` ON `property_proposals` (`property_id`,`proposal_date`);--> statement-breakpoint
CREATE TABLE `property_subtypes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`property_type` text NOT NULL,
	`name` text NOT NULL,
	CONSTRAINT "ck_property_subtypes_property_type" CHECK("property_subtypes"."property_type" in ('residential', 'commercial', 'land', 'logistics', 'rural', 'parking'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_property_subtypes_property_type_name` ON `property_subtypes` (`property_type`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_property_subtypes_id_property_type` ON `property_subtypes` (`id`,`property_type`);--> statement-breakpoint
CREATE TABLE `property_type_usages` (
	`property_type` text NOT NULL,
	`usage_type` text NOT NULL,
	PRIMARY KEY(`property_type`, `usage_type`),
	CONSTRAINT "ck_property_type_usages_property_type" CHECK("property_type_usages"."property_type" in ('residential', 'commercial', 'land', 'logistics', 'rural', 'parking')),
	CONSTRAINT "ck_property_type_usages_usage_type" CHECK("property_type_usages"."usage_type" in ('rental', 'short_stay', 'agricultural_lease', 'concession', 'own_use', 'loan_for_use'))
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`property_id` text NOT NULL,
	`contract_id` text,
	`occupant_id` text NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`total_amount_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`property_id`,`organization_id`) REFERENCES `properties`(`id`,`organization_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`occupant_id`,`organization_id`) REFERENCES `occupants`(`id`,`organization_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`,`property_id`) REFERENCES `contracts`(`id`,`property_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_reservations_status" CHECK("reservations"."status" in ('confirmed', 'cancelled')),
	CONSTRAINT "ck_reservations_dates" CHECK("reservations"."check_out" > "reservations"."check_in"),
	CONSTRAINT "ck_reservations_total" CHECK("reservations"."total_amount_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ix_reservations_property_id_check_in` ON `reservations` (`property_id`,`check_in`);--> statement-breakpoint
CREATE INDEX `ix_reservations_organization_id_check_in` ON `reservations` (`organization_id`,`check_in`);--> statement-breakpoint
CREATE INDEX `ix_reservations_contract_id_property_id` ON `reservations` (`contract_id`,`property_id`);--> statement-breakpoint
CREATE INDEX `ix_reservations_occupant_id_organization_id` ON `reservations` (`occupant_id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`active_organization_id` text,
	`impersonated_by_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`active_organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`impersonated_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `ix_sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_sessions_expires_at` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `ix_sessions_active_organization_id` ON `sessions` (`active_organization_id`);--> statement-breakpoint
CREATE INDEX `ix_sessions_impersonated_by_id` ON `sessions` (`impersonated_by_id`);--> statement-breakpoint
CREATE TABLE `stored_files` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`uploaded_by_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`,`uploaded_by_id`) REFERENCES `members`(`organization_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "ck_stored_files_size" CHECK("stored_files"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stored_files_storage_key_unique` ON `stored_files` (`storage_key`);--> statement-breakpoint
CREATE INDEX `ix_stored_files_organization_id_uploaded_by_id` ON `stored_files` (`organization_id`,`uploaded_by_id`);--> statement-breakpoint
CREATE INDEX `ix_stored_files_created_at` ON `stored_files` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_stored_files_id_organization_id` ON `stored_files` (`id`,`organization_id`);--> statement-breakpoint
CREATE TABLE `transaction_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`transaction_type` text NOT NULL,
	`name` text NOT NULL,
	CONSTRAINT "ck_transaction_categories_transaction_type" CHECK("transaction_categories"."transaction_type" in ('revenue', 'expense'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_transaction_categories_transaction_type_name` ON `transaction_categories` (`transaction_type`,`name`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`property_id` text NOT NULL,
	`category_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`occurred_on` text NOT NULL,
	`description` text,
	`is_recurring` integer DEFAULT false NOT NULL,
	`recurrence_ends_on` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`property_id`,`organization_id`) REFERENCES `properties`(`id`,`organization_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `transaction_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "ck_transactions_amount" CHECK("transactions"."amount_cents" > 0),
	CONSTRAINT "ck_transactions_recurrence" CHECK("transactions"."recurrence_ends_on" IS NULL OR ("transactions"."is_recurring" AND "transactions"."recurrence_ends_on" >= "transactions"."occurred_on"))
);
--> statement-breakpoint
CREATE INDEX `ix_transactions_property_id_occurred_on` ON `transactions` (`property_id`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `ix_transactions_organization_id_occurred_on` ON `transactions` (`organization_id`,`occurred_on`);--> statement-breakpoint
CREATE INDEX `ix_transactions_category_id` ON `transactions` (`category_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`is_anonymous` integer DEFAULT false NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`ban_reason` text,
	`ban_expires_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_email_lower` ON `users` (lower("email"));--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ix_verifications_identifier` ON `verifications` (`identifier`);