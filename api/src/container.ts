import type { Env } from "./config/env.js";
import { type ContainerOptions, composeContainer } from "./composition.js";
import { createStorage } from "./lib/storage/create-storage.js";
import { createDatabase } from "./db/client.node.js";

export type { Container } from "./composition.js";
export type NodeContainerOptions = Omit<ContainerOptions, "storage">;

/** The container for Node: the server, the scripts and the tests build the app through it. `close()` releases the database file. */
export function createContainer(env: Env, options: NodeContainerOptions = {}) {
  const { db, close } = createDatabase(env.DATABASE_URL);
  return { ...composeContainer(db, env, { ...options, storage: createStorage(env) }), close };
}
