import type { TenantScope } from "../../shared/http/tenant.js";
import type { FinancingScheduleDto, Page, PropertyDto } from "./properties.dto.js";
import type { CreatePropertyInput, ListPropertiesInput, UpdatePropertyInput } from "./properties.schemas.js";
import type { ListingChange, PropertiesService } from "./properties.service.js";

export interface HttpResult<TBody, TStatus extends number = 200> {
  status: TStatus;
  body: TBody;
}

/** A write also says whether it turned the for-sale listing on or off, so the route can audit it. */
export type PropertyWriteResult<TStatus extends number> = HttpResult<PropertyDto, TStatus> & {
  listingChange: ListingChange | null;
};

export interface PropertiesController {
  list(tenant: TenantScope, query: ListPropertiesInput): Promise<HttpResult<Page<PropertyDto>>>;
  get(tenant: TenantScope, id: string): Promise<HttpResult<PropertyDto>>;
  create(tenant: TenantScope, input: CreatePropertyInput): Promise<PropertyWriteResult<201>>;
  update(tenant: TenantScope, id: string, input: UpdatePropertyInput): Promise<PropertyWriteResult<200>>;
  remove(tenant: TenantScope, id: string): Promise<HttpResult<null, 204>>;
  financingSchedule(
    tenant: TenantScope,
    id: string,
    options: { asOf?: string | undefined },
  ): Promise<HttpResult<FinancingScheduleDto>>;
}

/**
 * Controller layer: receives already-validated input (never the Hono Context),
 * calls the service and maps the result to a status code and DTO.
 */
export function createPropertiesController(service: PropertiesService): PropertiesController {
  return {
    async list(tenant, query) {
      return { status: 200, body: await service.list(tenant, query) };
    },
    async get(tenant, id) {
      return { status: 200, body: await service.get(tenant, id) };
    },
    async create(tenant, input) {
      const { property, listingChange } = await service.create(tenant, input);
      return { status: 201, body: property, listingChange };
    },
    async update(tenant, id, input) {
      const { property, listingChange } = await service.update(tenant, id, input);
      return { status: 200, body: property, listingChange };
    },
    async remove(tenant, id) {
      await service.remove(tenant, id);
      return { status: 204, body: null };
    },
    async financingSchedule(tenant, id, options) {
      return { status: 200, body: await service.financingSchedule(tenant, id, options) };
    },
  };
}
