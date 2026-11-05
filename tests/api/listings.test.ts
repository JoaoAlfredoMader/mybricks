import { afterAll, beforeAll, describe, it } from "vitest";
import { ensurePlatformAdmin } from "../../src/modules/auth/platform-admin.js";
import { check } from "../helpers/check.js";
import { JPEG, MIME, PNG } from "../helpers/fixtures.js";
import { type Account, Session, auth, createCast, prisma, resetDatabase } from "../helpers/world.js";

const UNKNOWN = "00000000-0000-4000-8000-000000000000";
const PRICE = 500_000_00;

/** Everything a card may show, and nothing else. */
const LISTING_KEYS = [
  "area", "bathrooms", "bedrooms", "builtYear", "city", "conservationState", "coverPhotoUrl", "id", "listedAt", "neighborhood",
  "parkingSpaces", "photoCount", "propertyType", "reference", "salePriceCents", "state", "subtypeName", "suites",
];

/** Text that only exists in private fields: it must never show up in a public answer. */
const SECRETS = ["Nome-Interno", "NOTA-SECRETA", "Rua do Segredo", "Bloco-Secreto", "88015-000", "Cliente-Secreto", "Agencia-Secreta", "Inquilino-Secreto"];

/**
 * One scenario told in order: each test builds on the data of the previous ones,
 * so run the file as a whole rather than a single test.
 */
describe("Public listings", () => {
  let ana: Account;
  let bia: Account;
  let carlos: Account;
  let operator: Session;
  let cityId: number;

  // Properties by role in the scenario.
  let apto: string; // ana, live, both areas
  let fazenda: string; // ana, live, rural
  let casaBia: string; // bia (a member), live
  let casaCarlos: string; // carlos (another organization), live
  let semFoto: string;
  let semBairro: string;
  let semEndereco: string;
  let semArea: string;
  let naoVenda: string;
  let oculto: string;
  let guestProperty: string;

  const listings = (query = "") => new Session().call("GET", `/api/listings${query}`);
  const idsOf = (response: { json: { items: { id: string }[] } }) => response.json.items.map((item) => item.id);
  const live = async () => idsOf(await listings("?limit=24"));
  const photos = (id: string) => `/api/properties/${id}/photos`;
  const cover = (id: string) => `/api/listings/${id}/cover`;

  const addPhoto = async (who: Account, id: string, file: { name: string; type: string; bytes: Uint8Array } = { name: "foto.png", type: MIME.png, bytes: PNG }) => {
    const response = await who.session.upload(photos(id), file);
    if (response.status !== 201) throw new Error(`photo: ${JSON.stringify(response)}`);
    return response.json as { id: string };
  };

  /** A property with everything a listing needs, except what `overrides` takes away. */
  const make = async (who: Account, name: string, overrides: Record<string, unknown> = {}) => {
    const response = await who.session.call("POST", "/api/properties", {
      name,
      propertyType: "residential",
      usageType: "rental",
      privateArea: 80,
      totalArea: 120,
      bedrooms: 2,
      address: { cityId, street: "Rua do Segredo", number: "123", complement: "Bloco-Secreto", postalCode: "88015-000", neighborhood: "Centro" },
      forSale: { priceCents: PRICE, consent: true },
      ...overrides,
    });
    if (response.status !== 201) throw new Error(`property ${name}: ${JSON.stringify(response)}`);
    return response.json as { id: string; forSale: { consentedAt: string; status: string; missing: string[] } | null };
  };

  const sell = (who: Account, id: string, forSale: unknown) => who.session.call("PATCH", `/api/properties/${id}`, { forSale });
  const view = async (who: Account, id: string) => (await who.session.call("GET", `/api/properties/${id}`)).json;
  const row = (id: string) => prisma.property.findUniqueOrThrow({ where: { id }, select: { listingPriceCents: true, listingConsentedAt: true, listingHiddenAt: true } });

  beforeAll(async () => {
    await resetDatabase();
  });
  afterAll(() => prisma.$disconnect());

  it("is readable without a session, and empty at first", async () => {
    const response = await new Session().call("GET", "/api/listings");
    check("no cookie -> 200", response.status === 200, response);
    check("the platform's WhatsApp, in wa.me format, and no items", response.json?.whatsappNumber === "5548991802046" && Array.isArray(response.json.items) && response.json.items.length === 0, response.json);

    const raw = await new Session().download("/api/listings");
    check("cached publicly for a minute", raw.headers.get("cache-control") === "public, max-age=60", raw.headers.get("cache-control"));

    check("limit 0 -> 400", (await listings("?limit=0")).status === 400);
    check("limit over 24 -> 400", (await listings("?limit=25")).status === 400);
    check("limit that is not a number -> 400", (await listings("?limit=abc")).status === 400);
    check("limit 24 is accepted", (await listings("?limit=24")).status === 200);

    ({ ana, bia, carlos } = await createCast());
    await ensurePlatformAdmin({ auth, prisma }, { email: "operador@example.com", name: "Operador", password: "senha-do-operador-1" });
    operator = new Session();
    await operator.call("POST", "/api/auth/sign-in/email", { email: "operador@example.com", password: "senha-do-operador-1" });
    cityId = (await prisma.city.findFirstOrThrow({ orderBy: { ibgeCode: "asc" } })).ibgeCode;
  });

  it("asks for the consent and a real price before a property goes up for sale", async () => {
    const base = { name: "Apto de teste", propertyType: "residential", usageType: "rental" };
    const create = (forSale: unknown) => ana.session.call("POST", "/api/properties", { ...base, forSale });

    const noConsent = await create({ priceCents: PRICE });
    check("no consent -> 422", noConsent.status === 422 && noConsent.json?.error?.code === "BUSINESS_RULE_VIOLATION", noConsent);
    check("it says what is wrong", JSON.stringify(noConsent.json?.error?.details).includes("forSale.consent"), noConsent.json);
    check("consent false -> 422", (await create({ priceCents: PRICE, consent: false })).status === 422);
    check("price 0 -> 422", (await create({ priceCents: 0, consent: true })).status === 422);
    check("a negative price -> 422", (await create({ priceCents: -1, consent: true })).status === 422);
    check("no price -> 422", (await create({ consent: true })).status === 422);
    check("an empty forSale -> 422", (await create({})).status === 422);
    check("a price that is not an integer is malformed input -> 400", (await create({ priceCents: 10.5, consent: true })).status === 400);
    check("a price that is text -> 400", (await create({ priceCents: "caro", consent: true })).status === 400);
    check("nothing was created by those attempts", (await prisma.property.count({ where: { name: "Apto de teste" } })) === 0);

    const created = await create({ priceCents: PRICE, consent: true });
    check("with both, it is created for sale", created.status === 201 && created.json?.forSale?.priceCents === PRICE, created.json?.forSale);
    check("it is pending: no photo, no address, no area yet", created.json?.forSale?.status === "pending" && created.json.forSale.missing.join() === "photo,address,area", created.json?.forSale);
    check("the consent date was recorded", Math.abs(Date.now() - new Date(created.json?.forSale?.consentedAt).getTime()) < 60_000);
    check("a property that is not for sale has forSale null", (await ana.session.call("POST", "/api/properties", base)).json?.forSale === null);

    const turnedOff = await sell(ana, created.json.id, null);
    check("an update without forSale leaves it alone, null takes it off", turnedOff.status === 200 && turnedOff.json?.forSale === null, turnedOff.json?.forSale);
    check("on an update the same rules hold: no consent -> 422", (await sell(ana, created.json.id, { priceCents: PRICE })).status === 422);
    check("on an update a zero price -> 422", (await sell(ana, created.json.id, { priceCents: 0, consent: true })).status === 422);
    check("nothing changed after the refusals", (await row(created.json.id)).listingPriceCents === null);
    await ana.session.call("DELETE", `/api/properties/${created.json.id}`);
  });

  it("goes live only when complete: it can be marked for sale before the photos", async () => {
    const draft = await make(ana, "Nome-Interno do Apto", {
      notes: "NOTA-SECRETA do apto",
      subtypeId: (await prisma.propertySubtype.findFirstOrThrow({ where: { propertyType: "residential" } })).id,
      estimatedValueCents: 123_456_78,
    });
    apto = draft.id;
    check("created for sale with address and area, but no photo: pending, missing the photo", draft.forSale?.status === "pending" && draft.forSale.missing.join() === "photo", draft.forSale);
    check("not public yet", !(await live()).includes(apto));
    check("its cover is a 404", (await new Session().download(cover(apto))).status === 404);

    await addPhoto(ana, apto);
    const after = await view(ana, apto);
    check("with a photo it is live and nothing is missing", after.forSale.status === "live" && after.forSale.missing.length === 0, after.forSale);
    check("it is public", (await live()).includes(apto));
    check("the list of properties carries forSale too", (await ana.session.call("GET", "/api/properties")).json.items.find((p: { id: string }) => p.id === apto)?.forSale?.status === "live");
  });

  it("builds the rest of the cast: live and not live", async () => {
    fazenda = (
      await make(ana, "Fazenda Boa Vista", { propertyType: "rural", usageType: "own_use", privateArea: null, totalArea: 12.5, bedrooms: null })
    ).id;
    await addPhoto(ana, fazenda);

    casaBia = (await make(bia, "Casa da Bia")).id;
    await addPhoto(bia, casaBia);

    casaCarlos = (await make(carlos, "Casa do Carlos")).id;
    await addPhoto(carlos, casaCarlos, { name: "c.jpg", type: MIME.jpeg, bytes: JPEG });

    semFoto = (await make(ana, "Sem foto")).id;
    semBairro = (await make(ana, "Sem bairro", { address: { cityId, street: "Rua do Segredo" } })).id;
    await addPhoto(ana, semBairro);
    semEndereco = (await make(ana, "Sem endereço", { address: null })).id;
    await addPhoto(ana, semEndereco);
    semArea = (await make(ana, "Sem área", { privateArea: null, totalArea: null })).id;
    await addPhoto(ana, semArea);
    naoVenda = (await make(ana, "Não está à venda", { forSale: null })).id;
    await addPhoto(ana, naoVenda);
    oculto = (await make(ana, "Vai ser ocultado")).id;
    await addPhoto(ana, oculto);

    const statuses = Object.fromEntries(
      await Promise.all(
        [semFoto, semBairro, semEndereco, semArea, naoVenda].map(async (id) => [id, (await view(ana, id)).forSale] as const),
      ),
    );
    check("no photo -> pending [photo]", statuses[semFoto]?.status === "pending" && statuses[semFoto].missing.join() === "photo", statuses[semFoto]);
    check("no neighborhood -> pending [address]", statuses[semBairro]?.status === "pending" && statuses[semBairro].missing.join() === "address", statuses[semBairro]);
    check("no address -> pending [address]", statuses[semEndereco]?.status === "pending" && statuses[semEndereco].missing.join() === "address", statuses[semEndereco]);
    check("no area -> pending [area]", statuses[semArea]?.status === "pending" && statuses[semArea].missing.join() === "area", statuses[semArea]);
    check("not for sale -> forSale null", statuses[naoVenda] === null);
  });

  it("lists only the live ones, newest consent first", async () => {
    const response = await listings();
    check("200 without a session", response.status === 200);
    const ids = idsOf(response);
    const expected = [oculto, casaCarlos, casaBia, fazenda, apto]; // creation order, reversed
    // `oculto` is live for now: the admin hides it further down.
    check("exactly the complete, for-sale, not hidden ones, newest consent first", ids.join() === expected.join(), { ids, expected });

    for (const [name, id] of [["no photo", semFoto], ["no neighborhood", semBairro], ["no address", semEndereco], ["no area", semArea], ["not for sale", naoVenda]] as const) {
      check(`${name} does not show`, !ids.includes(id));
    }

    check("limit trims the list, keeping the newest", idsOf(await listings("?limit=2")).join() === [oculto, casaCarlos].join());
    check("the default is 12 and the maximum 24: both accepted, the list is short here", (await listings("?limit=24")).json.items.length === 5);
  });

  it("never lets a private field out: a white list", async () => {
    const response = await listings();
    const items = response.json.items as Record<string, unknown>[];
    check("every item has exactly the white-listed fields", items.every((item) => Object.keys(item).sort().join() === [...LISTING_KEYS].sort().join()), items[0]);

    const text = JSON.stringify(response.json);
    for (const secret of SECRETS) check(`the answer does not contain "${secret}"`, !text.includes(secret));
    for (const forbidden of ["name", "notes", "street", "number", "complement", "postalCode", "latitude", "longitude", "clientId", "agencyId", "organizationId", "createdById", "estimatedValueCents", "annualExpensesCents", "ownershipPercentage", "financing", "manualRental", "rent", "documents", "occupancyRate"]) {
      check(`no "${forbidden}" key in the answer`, !new RegExp(`"${forbidden}"\\s*:`).test(text), forbidden);
    }
    for (const id of [ana.organizationId, ana.userId, carlos.organizationId, bia.userId]) check("no organization or user id in the answer", !text.includes(id));
    check("only the platform's number, not the owner's", Object.keys(response.json).sort().join() === "items,whatsappNumber");
  });

  it("shows the asking price, never the estimated value, with the area in the right unit", async () => {
    const items = (await listings()).json.items as { id: string; [key: string]: any }[];
    const card = items.find((item) => item.id === apto)!;
    check("the sale price", card.salePriceCents === PRICE, card.salePriceCents);
    check("the private area wins over the total one, in m2", card.area.value === 80 && card.area.unit === "m2", card.area);
    check("type, subtype, rooms", card.propertyType === "residential" && typeof card.subtypeName === "string" && card.bedrooms === 2 && card.suites === null, card);
    check("city, state and neighborhood", typeof card.city === "string" && card.state.length === 2 && card.neighborhood === "Centro", card);
    check("the reference is the first 8 characters of the id, in capitals", card.reference === apto.slice(0, 8).toUpperCase() && /^[0-9A-F]{8}$/.test(card.reference), card.reference);
    check("photo count and the path of the cover", card.photoCount === 1 && card.coverPhotoUrl === `/api/listings/${apto}/cover`, card);
    check("listed when the owner consented", card.listedAt === (await row(apto)).listingConsentedAt!.toISOString());
    check("the estimated value is nowhere in the card", !JSON.stringify(card).includes("12345678"));

    const farm = items.find((item) => item.id === fazenda)!;
    check("a rural property is measured in hectares, from the total area", farm.area.value === 12.5 && farm.area.unit === "ha", farm.area);
    check("everything else is in m2", items.filter((item) => item.id !== fazenda).every((item) => item.area.unit === "m2"));
  });

  it("agrees with the status the owner sees: the SQL and the derived rule are the same rule", async () => {
    const everything = [apto, fazenda, casaBia, casaCarlos, semFoto, semBairro, semEndereco, semArea, naoVenda, oculto];
    const publicIds = new Set(await live());
    const owners = [ana, carlos];
    const seen: string[] = [];
    for (const owner of owners) {
      const page = (await owner.session.call("GET", "/api/properties?pageSize=100")).json.items as { id: string; forSale: { status: string } | null }[];
      for (const property of page) {
        if (!everything.includes(property.id)) continue;
        seen.push(property.id);
        const isLive = property.forSale?.status === "live";
        check(`${property.id}: live for the owner <=> in the public list`, isLive === publicIds.has(property.id), { forSale: property.forSale, public: publicIds.has(property.id) });
      }
    }
    check("every property of the scenario was compared", everything.every((id) => seen.includes(id)), seen.length);

    // The same, after the admin hides one and a photo goes away.
    await operator.call("PATCH", `/api/admin/listings/${oculto}`, { hidden: true });
    const photo = (await ana.session.call("GET", photos(fazenda))).json[0];
    await ana.session.call("DELETE", `${photos(fazenda)}/${photo.id}`);
    const after = new Set(await live());
    for (const id of [oculto, fazenda, apto]) {
      const status = (await view(ana, id)).forSale.status;
      check(`after the changes ${id}: live <=> public`, (status === "live") === after.has(id), { status, public: after.has(id) });
    }
    check("hidden wins over pending and live", (await view(ana, oculto)).forSale.status === "hidden");
    check("the last photo may be deleted: the listing only goes back to pending", (await view(ana, fazenda)).forSale.status === "pending" && (await view(ana, fazenda)).forSale.missing.join() === "photo");

    await addPhoto(ana, fazenda);
    await operator.call("PATCH", `/api/admin/listings/${oculto}`, { hidden: false });
    check("a new photo and the admin showing it again bring both back", (await live()).includes(fazenda) && (await live()).includes(oculto));
  });

  it("never shows the demo workspaces", async () => {
    const guest = new Session();
    const signIn = await guest.call("POST", "/api/auth/sign-in/anonymous");
    check("(setup) a guest signs in", signIn.status === 200, signIn);
    const me = await guest.call("GET", "/api/me");
    const organization = await prisma.organization.findUniqueOrThrow({ where: { id: me.json.organizationId } });
    check("(setup) the guest works in a demo organization", organization.isDemo === true);

    const created = await guest.call("POST", "/api/properties", {
      name: "Casa do convidado", propertyType: "residential", usageType: "rental", privateArea: 70,
      address: { cityId, street: "Rua do Convidado", neighborhood: "Centro" },
      forSale: { priceCents: PRICE, consent: true },
    });
    guestProperty = created.json.id;
    await guest.upload(photos(guestProperty), { name: "g.png", type: MIME.png, bytes: PNG });
    check("the guest sees it as live: the rule does not know about demos", (await guest.call("GET", `/api/properties/${guestProperty}`)).json.forSale.status === "live");
    check("but it is not in the public list", !(await live()).includes(guestProperty));
    check("nor does its cover answer", (await new Session().download(cover(guestProperty))).status === 404);
  });

  it("keeps the consent date when only the price changes, and keeps the moderation when it is turned off", async () => {
    const before = await row(apto);
    const consentedAt = before.listingConsentedAt!.toISOString();

    await new Promise((resolve) => setTimeout(resolve, 15));
    const repriced = await sell(ana, apto, { priceCents: 450_000_00, consent: true });
    check("the price changed", repriced.status === 200 && repriced.json.forSale.priceCents === 450_000_00, repriced.json?.forSale);
    check("the consent date did not (in the answer nor in the database)", repriced.json.forSale.consentedAt === consentedAt && (await row(apto)).listingConsentedAt!.toISOString() === consentedAt);
    check("the public price follows", (await listings()).json.items.find((item: { id: string }) => item.id === apto)?.salePriceCents === 450_000_00);
    check("a price edit still needs the consent and a price", (await sell(ana, apto, { priceCents: 0, consent: true })).status === 422 && (await sell(ana, apto, { priceCents: PRICE })).status === 422);
    check("and the refused edits changed nothing", (await row(apto)).listingPriceCents === 450_000_00n);

    // Hide it, then try to cheat the moderation by turning the sale off and on.
    await operator.call("PATCH", `/api/admin/listings/${apto}`, { hidden: true });
    const hiddenAt = (await row(apto)).listingHiddenAt;
    check("(setup) the admin hid it", hiddenAt !== null && !(await live()).includes(apto));

    const off = await sell(ana, apto, null);
    const afterOff = await row(apto);
    check("turning it off clears the price and the consent", off.json.forSale === null && afterOff.listingPriceCents === null && afterOff.listingConsentedAt === null, afterOff);
    check("but not the moderation", afterOff.listingHiddenAt?.getTime() === hiddenAt!.getTime(), afterOff);

    await new Promise((resolve) => setTimeout(resolve, 15));
    const on = await sell(ana, apto, { priceCents: PRICE, consent: true });
    const afterOn = await row(apto);
    check("turning it on again takes a new consent: a new date", on.status === 200 && afterOn.listingConsentedAt!.toISOString() !== consentedAt && afterOn.listingConsentedAt!.getTime() > hiddenAt!.getTime(), afterOn);
    check("it is still hidden: the owner cannot undo the moderation", on.json.forSale.status === "hidden" && !(await live()).includes(apto) && afterOn.listingHiddenAt?.getTime() === hiddenAt!.getTime(), on.json.forSale);

    await operator.call("PATCH", `/api/admin/listings/${apto}`, { hidden: false });
    check("only the admin brings it back", (await live()).includes(apto) && (await view(ana, apto)).forSale.status === "live");
    check("turning off a property that is not for sale is harmless", (await sell(ana, naoVenda, null)).status === 200);
  });

  it("applies the same permissions as any property edit", async () => {
    check("another organization cannot touch it: 404", (await sell(carlos, apto, null)).status === 404 && (await sell(carlos, apto, { priceCents: 1, consent: true })).status === 404);
    check("a member cannot edit what the owner created: 404", (await sell(bia, apto, null)).status === 404);
    check("(and nothing changed)", (await row(apto)).listingPriceCents !== null);

    check("a member can take their own property off the market", (await sell(bia, casaBia, null)).status === 200 && !(await live()).includes(casaBia));
    check("and put it back", (await sell(bia, casaBia, { priceCents: PRICE, consent: true })).status === 200 && (await live()).includes(casaBia));
    check("the owner can edit the member's listing", (await sell(ana, casaBia, { priceCents: 777_00, consent: true })).status === 200 && (await row(casaBia)).listingPriceCents === 777_00n);
    check("another organization's property is not even reachable by id", (await sell(ana, casaCarlos, null)).status === 404);
  });

  it("lets only the platform admin hide a listing", async () => {
    const hide = (who: Session, id: string, body: unknown = { hidden: true }) => who.call("PATCH", `/api/admin/listings/${id}`, body);

    check("without a session -> 401", (await hide(new Session(), casaBia)).status === 401);
    check("the owner of the property -> 403", (await hide(ana.session, casaBia)).status === 403);
    check("a member -> 403", (await hide(bia.session, casaBia)).status === 403);
    check("another organization -> 403", (await hide(carlos.session, casaBia)).status === 403);
    check("(and it is still public)", (await live()).includes(casaBia));

    check("a property that is not for sale -> 404", (await hide(operator, naoVenda)).status === 404);
    check("one that does not exist -> 404", (await hide(operator, UNKNOWN)).status === 404);
    check("a body without hidden -> 400", (await hide(operator, casaBia, {})).status === 400);
    check("hidden that is not a boolean -> 400", (await hide(operator, casaBia, { hidden: "yes" })).status === 400);
    check("an id that is not a uuid -> 400", (await hide(operator, "abc")).status === 400);

    const hidden = await hide(operator, casaBia);
    check("hides it", hidden.status === 200 && hidden.json?.propertyId === casaBia && hidden.json.hidden === true && typeof hidden.json.hiddenAt === "string", hidden);
    check("out of the public list, and the cover is gone", !(await live()).includes(casaBia) && (await new Session().download(cover(casaBia))).status === 404);
    check("the owner sees why", (await view(bia, casaBia)).forSale.status === "hidden");

    const firstDate = (await row(casaBia)).listingHiddenAt!.toISOString();
    await new Promise((resolve) => setTimeout(resolve, 15));
    check("hiding twice keeps the first date", (await hide(operator, casaBia)).json?.hiddenAt === firstDate && (await row(casaBia)).listingHiddenAt!.toISOString() === firstDate);

    const shown = await hide(operator, casaBia, { hidden: false });
    check("shows it again", shown.status === 200 && shown.json?.hidden === false && shown.json.hiddenAt === null && (await live()).includes(casaBia), shown);
    check("showing a listing that is not hidden is harmless", (await hide(operator, casaBia, { hidden: false })).status === 200);

    await hide(operator, oculto);
    await sell(ana, oculto, null);
    check("a listing the owner turned off can still be moderated if it is for sale again, but not while off", (await hide(operator, oculto, { hidden: false })).status === 404);
    await sell(ana, oculto, { priceCents: PRICE, consent: true });
    await hide(operator, oculto, { hidden: false });
  });

  it("serves the cover of live listings only, publicly", async () => {
    const image = await new Session().download(cover(apto));
    check("a live listing -> 200 with the first photo", image.status === 200 && image.bytes.equals(PNG), image.status);
    const headers = image.headers;
    check("its type, public cache for an hour, nosniff and inline", headers.get("content-type") === "image/png" && headers.get("cache-control") === "public, max-age=3600" && headers.get("x-content-type-options") === "nosniff" && headers.get("content-disposition")?.startsWith("inline;") === true && headers.get("content-length") === String(PNG.length), Object.fromEntries(headers));
    check("the owner's file name does not leak", !(headers.get("content-disposition") ?? "").includes("foto"), headers.get("content-disposition"));

    const jpeg = await new Session().download(cover(casaCarlos));
    check("a JPEG is served as a JPEG", jpeg.status === 200 && jpeg.bytes.equals(JPEG) && jpeg.headers.get("content-type") === "image/jpeg", jpeg.headers.get("content-type"));

    check("pending (no neighborhood, with a photo) -> 404", (await new Session().download(cover(semBairro))).status === 404);
    check("pending (no photo) -> 404", (await new Session().download(cover(semFoto))).status === 404);
    check("not for sale -> 404", (await new Session().download(cover(naoVenda))).status === 404);
    check("unknown -> 404", (await new Session().download(cover(UNKNOWN))).status === 404);
    check("a 404 is a normal error body, not an image", (await new Session().call("GET", cover(UNKNOWN))).json?.error?.code === "NOT_FOUND");

    await operator.call("PATCH", `/api/admin/listings/${casaCarlos}`, { hidden: true });
    check("hidden -> 404", (await new Session().download(cover(casaCarlos))).status === 404);
    await operator.call("PATCH", `/api/admin/listings/${casaCarlos}`, { hidden: false });

    const first = (await ana.session.call("GET", photos(apto))).json[0] as { id: string };
    const second = await addPhoto(ana, apto, { name: "outra.jpg", type: MIME.jpeg, bytes: JPEG });
    check("the cover is the first by position: a second photo does not change it", (await new Session().download(cover(apto))).bytes.equals(PNG));
    await ana.session.call("PUT", `${photos(apto)}/order`, { photoIds: [second.id, first.id] });
    check("reordering the photos changes the cover", (await new Session().download(cover(apto))).bytes.equals(JPEG));
    check("and the card counts both photos", (await listings()).json.items.find((item: { id: string }) => item.id === apto)?.photoCount === 2);
  });

  it("leaves a trace of turning a listing on or off, and of moderation", async () => {
    const trail = (entityId: string) => prisma.auditLog.findMany({ where: { entityId }, orderBy: { id: "asc" } });
    const listingEvents = async (entityId: string) =>
      (await trail(entityId))
        .map((entry) => ({ entry, details: JSON.parse(entry.details ?? "{}") as Record<string, unknown> }))
        .filter(({ details }) => "listing" in details);

    const own = await listingEvents(casaBia);
    const kinds = own.map(({ details }) => details.listing);
    check("on at creation, off, on again are in the organization's trail", kinds.filter((kind) => kind === "enabled" || kind === "disabled").join() === "enabled,disabled,enabled", kinds);
    const enabled = own.find(({ details }) => details.listing === "enabled")!;
    check("each says who, on which property, in which organization, with the price", enabled.entry.entityType === "property" && enabled.entry.action === "update" && enabled.entry.actorUserId === bia.userId && enabled.entry.organizationId === ana.organizationId && enabled.details.priceCents === PRICE, enabled);
    check("a price edit alone is not a turn on or off", own.length === 3 + 2, kinds);

    const moderation = own.filter(({ details }) => details.listing === "hidden" || details.listing === "shown");
    check("hiding and showing are recorded, in that order", moderation.map(({ details }) => details.listing).join() === "hidden,shown", moderation.map(({ details }) => details.listing));
    const hide = moderation.find(({ details }) => details.listing === "hidden")!;
    check("as platform-level events of the operator, naming the property's organization", hide.entry.organizationId === null && hide.entry.actorEmail === "operador@example.com" && hide.entry.entityId === casaBia && hide.details.organizationId === ana.organizationId, hide);
    check("showing a listing that was not hidden leaves no extra entry", moderation.filter(({ details }) => details.listing === "shown").length === 1, moderation.length);
    check("the operator sees them in the platform trail", (await operator.call("GET", `/api/admin/audit-logs?entityType=property&pageSize=100`)).json.items.some((item: { entityId: string; details: string }) => item.entityId === casaBia && item.details.includes('"hidden"')));
    check("the owner's own trail does not carry the operator's moderation", !(await ana.session.call("GET", "/api/audit-logs?entityType=property&pageSize=100")).json.items.some((item: { actorEmail: string }) => item.actorEmail === "operador@example.com"));
  });
});
