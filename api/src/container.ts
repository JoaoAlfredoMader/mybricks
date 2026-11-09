import type { Env } from "./config/env.js";
import { type ContainerOptions, composeContainer } from "./composition.js";
import { createPrismaClient } from "./lib/prisma.js";

export type { Container, ContainerOptions } from "./composition.js";

/** The container for Node: the server, the maintenance and admin scripts and the tests build the app through it. */
export function createContainer(env: Env, options: ContainerOptions = {}) {
  return composeContainer(createPrismaClient(env.DATABASE_URL), env, options);
}
