import { describe, expect, it } from "vitest";
import {
  type ListingFacts,
  deriveListingState,
  listingGaps,
  liveListingWhere,
} from "../../src/modules/properties/listing-status.js";

const complete: ListingFacts = {
  hiddenAt: null,
  photoCount: 1,
  address: { neighborhood: "Centro" },
  privateArea: 80,
  totalArea: null,
};
const facts = (overrides: Partial<ListingFacts>): ListingFacts => ({ ...complete, ...overrides });

describe("listing status", () => {
  it("is live when nothing is missing and it was not hidden", () => {
    expect(deriveListingState(complete)).toEqual({ status: "live", missing: [] });
  });

  it("is pending while a photo is missing", () => {
    expect(deriveListingState(facts({ photoCount: 0 }))).toEqual({ status: "pending", missing: ["photo"] });
  });

  it("is pending without an address, and without a neighborhood", () => {
    expect(deriveListingState(facts({ address: null }))).toEqual({ status: "pending", missing: ["address"] });
    expect(deriveListingState(facts({ address: { neighborhood: null } }))).toEqual({ status: "pending", missing: ["address"] });
    expect(deriveListingState(facts({ address: { neighborhood: "" } }))).toEqual({ status: "pending", missing: ["address"] });
  });

  it("is pending when it has neither a private nor a total area", () => {
    expect(deriveListingState(facts({ privateArea: null, totalArea: null }))).toEqual({ status: "pending", missing: ["area"] });
  });

  it("accepts either area, in any numeric form", () => {
    expect(listingGaps(facts({ privateArea: null, totalArea: 120 }))).toEqual([]);
    expect(listingGaps(facts({ privateArea: { toNumber: () => 55.5 }, totalArea: null }))).toEqual([]);
    expect(listingGaps(facts({ privateArea: 0, totalArea: null }))).toEqual([]);
  });

  it("lists every gap, in a stable order", () => {
    const empty = facts({ photoCount: 0, address: null, privateArea: null, totalArea: null });
    expect(listingGaps(empty)).toEqual(["photo", "address", "area"]);
    expect(deriveListingState(empty)).toEqual({ status: "pending", missing: ["photo", "address", "area"] });
  });

  it("is hidden whenever the admin hid it, ahead of pending, and still reports what is missing", () => {
    const hiddenAt = new Date("2026-11-01T00:00:00Z");
    expect(deriveListingState(facts({ hiddenAt }))).toEqual({ status: "hidden", missing: [] });
    expect(deriveListingState(facts({ hiddenAt, photoCount: 0 }))).toEqual({ status: "hidden", missing: ["photo"] });
  });

  it("filters the public query by the same conditions", () => {
    // The agreement with the live status, against real rows, is tested in tests/api/listings.test.ts.
    const where = liveListingWhere();
    expect(where.listingPriceCents).toEqual({ not: null });
    expect(where.listingHiddenAt).toBeNull();
    expect(where.organization).toEqual({ isDemo: false });
    expect(where.photos).toEqual({ some: {} });
    expect(where.address).toBeDefined();
    expect(where.OR).toHaveLength(2);
  });
});
