import type { Env } from "./config/env.js";
import { type ContainerOptions, composeContainer } from "./composition.js";
import { createDatabase } from "./db/client.node.js";

export type { Container, ContainerOptions } from "./composition.js";

/** The container for Node: the server, the scripts and the tests build the app through it. `close()` releases the database file. */
export function createContainer(env: Env, options: ContainerOptions = {}) {
  const { db, close } = createDatabase(env.DATABASE_URL);
  return { ...composeContainer(db, env, options), close };
}
