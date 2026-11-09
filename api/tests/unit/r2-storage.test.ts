import { describe, expect, it } from "vitest";
import { type R2BucketLike, createR2Storage } from "../../src/lib/storage/r2-storage.js";

/** A bucket in memory with the same surface as a Cloudflare R2 binding. */
function fakeBucket() {
  const objects = new Map<string, { bytes: Uint8Array; contentType?: string }>();
  const bucket: R2BucketLike = {
    async put(key, value, options) {
      objects.set(key, { bytes: value, contentType: options?.httpMetadata?.contentType });
    },
    async get(key) {
      const object = objects.get(key);
      if (!object) return null;
      return {
        arrayBuffer: async () => object.bytes.buffer.slice(object.bytes.byteOffset, object.bytes.byteOffset + object.bytes.byteLength) as ArrayBuffer,
        httpMetadata: { contentType: object.contentType },
      };
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  return { bucket, objects };
}

describe("R2 storage", () => {
  it("stores, reads back and deletes an object", async () => {
    const { bucket } = fakeBucket();
    const storage = createR2Storage(bucket);
    await storage.put("org-1/a.png", Buffer.from([1, 2, 3]), { contentType: "image/png" });

    const stored = await storage.get("org-1/a.png");
    expect(stored?.contentType).toBe("image/png");
    expect(stored?.sizeBytes).toBe(3);
    expect([...(stored?.body ?? [])]).toEqual([1, 2, 3]);

    await storage.delete("org-1/a.png");
    expect(await storage.get("org-1/a.png")).toBeNull();
  });

  it("deleting a key that is not there is not an error", async () => {
    const storage = createR2Storage(fakeBucket().bucket);
    await expect(storage.delete("org-1/missing.png")).resolves.toBeUndefined();
  });

  it("refuses keys that could leave the organization's folder", async () => {
    const storage = createR2Storage(fakeBucket().bucket);
    await expect(storage.put("../secret", Buffer.from([1]), { contentType: "text/plain" })).rejects.toThrow(/Unsafe storage key/);
    await expect(storage.get("/etc/passwd")).rejects.toThrow(/Unsafe storage key/);
  });
});
