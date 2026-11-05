-- Property listings: the owner can mark a property as for sale and, by doing so, consents to it
-- appearing as a public listing. The listing is the only data that leaves an organization.

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "listing_price_cents" BIGINT,
ADD COLUMN     "listing_consented_at" TIMESTAMPTZ(6),
ADD COLUMN     "listing_hidden_at" TIMESTAMPTZ(6);

-- A price is only valid when positive and backed by the owner's consent.
-- Not for sale = no price (the hidden date is kept on purpose: see schema.prisma).
ALTER TABLE properties ADD CONSTRAINT ck_properties_listing
  CHECK (listing_price_cents IS NULL OR (listing_price_cents > 0 AND listing_consented_at IS NOT NULL));

-- The public read walks the visible listings, newest consent first. Partial: most properties are not for sale.
CREATE INDEX ix_properties_public_listings
  ON properties (listing_consented_at DESC, id)
  WHERE listing_price_cents IS NOT NULL AND listing_hidden_at IS NULL;
