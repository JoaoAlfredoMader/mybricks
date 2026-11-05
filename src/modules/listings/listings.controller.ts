import type { ListingsDto } from "./listings.dto.js";
import type { ListListingsInput } from "./listings.schemas.js";
import type { ListingCover, ListingsService, ModerationResult } from "./listings.service.js";

export interface HttpResult<TBody, TStatus extends number = 200> {
  status: TStatus;
  body: TBody;
}

export interface ListingsController {
  list(query: ListListingsInput): Promise<HttpResult<ListingsDto>>;
  cover(propertyId: string): Promise<HttpResult<ListingCover>>;
  setHidden(propertyId: string, hidden: boolean): Promise<HttpResult<ModerationResult>>;
}

/** Controller layer: receives validated input, calls the service, maps to status + DTO. */
export function createListingsController(service: ListingsService): ListingsController {
  return {
    async list(query) {
      return { status: 200, body: await service.list(query) };
    },
    async cover(propertyId) {
      return { status: 200, body: await service.cover(propertyId) };
    },
    async setHidden(propertyId, hidden) {
      return { status: 200, body: await service.setHidden(propertyId, hidden) };
    },
  };
}
