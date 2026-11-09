import { type StorageProvider, assertSafeKey } from "./storage.js";

/** The slice of a Cloudflare R2 bucket binding this driver needs (the Worker types would clash with Node's). */
export interface R2BucketLike {
  put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
}

/** Worker driver: the R2 bucket bound to the Worker. No keys, no endpoint, no SDK: the binding is the credential. */
export function createR2Storage(bucket: R2BucketLike): StorageProvider {
  return {
    async put(key, body, { contentType }) {
      assertSafeKey(key);
      await bucket.put(key, body, { httpMetadata: { contentType } });
    },

    async get(key) {
      assertSafeKey(key);
      const object = await bucket.get(key);
      if (!object) return null;
      const body = Buffer.from(await object.arrayBuffer());
      return { body, contentType: object.httpMetadata?.contentType ?? null, sizeBytes: body.length };
    },

    async delete(key) {
      assertSafeKey(key);
      // R2 answers success for a key that is not there, which is the idempotence we want.
      await bucket.delete(key);
    },
  };
}
