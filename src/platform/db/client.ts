import { PrismaPg } from "@prisma/adapter-pg";
import type { AppConfig } from "../config/env.js";
import { PrismaClient } from "./generated/client.js";

export type { PrismaClient };

/** Builds the Prisma client. Only `main.ts` calls it; everyone else receives it. */
export const createPrismaClient = (config: AppConfig): PrismaClient => {
  const adapter = new PrismaPg({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    ssl: config.DB_SSL,
    max: config.DB_POOL_MAX,
    min: config.DB_POOL_MIN,
    idleTimeoutMillis: config.DB_POOL_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: config.DB_POOL_CONNECTION_TIMEOUT_MS,
    maxLifetimeSeconds: config.DB_POOL_MAX_LIFETIME_SECONDS,
  });

  return new PrismaClient({ adapter });
};
