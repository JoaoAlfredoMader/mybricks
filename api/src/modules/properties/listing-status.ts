import type { Prisma } from "../../generated/prisma/client.js";

/**
 * Where a for-sale property stands as a public listing. Derived on every read, never stored:
 * - `hidden`: the platform admin took it down (it wins over everything else);
 * - `pending`: something is missing (see `ListingGap`), so it is not public yet;
 * - `live`: it shows up in the public listings.
 */
export type ListingStatus = "pending" | "live" | "hidden";

/** What a for-sale property still needs before it can go live. */
export type ListingGap = "photo" | "address" | "area";

type AreaValue = number | { toNumber(): number };

export interface ListingFacts {
  hiddenAt: Date | null;
  photoCount: number;
  /** `null` when the property has no address at all. The city comes with the address. */
  address: { neighborhood: string | null } | null;
  privateArea: AreaValue | null;
  totalArea: AreaValue | null;
}

export interface ListingState {
  status: ListingStatus;
  /** Empty when nothing is missing. */
  missing: ListingGap[];
}

/**
 * The "live" rule has two faces that must agree: this one, which labels a single property, and
 * `liveListingWhere` below, which filters the public query in SQL. Change them together; a test
 * runs both against the same properties.
 */
export function listingGaps(facts: ListingFacts): ListingGap[] {
  const missing: ListingGap[] = [];
  if (facts.photoCount === 0) missing.push("photo");
  // An address without a neighborhood is as good as no address: the card needs "neighborhood, city".
  if (!facts.address?.neighborhood) missing.push("address");
  if (facts.privateArea === null && facts.totalArea === null) missing.push("area");
  return missing;
}

/** Only meaningful for a property that is for sale. */
export function deriveListingState(facts: ListingFacts): ListingState {
  const missing = listingGaps(facts);
  if (facts.hiddenAt !== null) return { status: "hidden", missing };
  return { status: missing.length > 0 ? "pending" : "live", missing };
}

/**
 * The SQL face of the rule: which properties are public listings. The public read is not tenant
 * scoped (it crosses organizations on purpose), so this `where` is the whole access control:
 * for sale, not hidden, not from a demo workspace, with a photo, a neighborhood and an area.
 */
export function liveListingWhere(): Prisma.PropertyWhereInput {
  return {
    listingPriceCents: { not: null },
    listingHiddenAt: null,
    organization: { isDemo: false },
    photos: { some: {} },
    address: { is: { AND: [{ neighborhood: { not: null } }, { neighborhood: { not: "" } }] } },
    OR: [{ privateArea: { not: null } }, { totalArea: { not: null } }],
  };
}
