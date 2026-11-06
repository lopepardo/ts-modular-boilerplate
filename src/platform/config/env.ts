import "dotenv/config";
import { z } from "zod";

const nonEmpty = z.string().min(1);
const positiveInt = z.coerce.number().int().positive();

const EnvSchema = z
  .object({
    APP_NAME: nonEmpty.default("ts-modular-boilerplate"),
    APP_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_VERSION: nonEmpty.default("unversioned"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
      .default("debug"),
    DB_HOST: nonEmpty.default("localhost"),
    DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    DB_USER: nonEmpty.default("apilibrary"),
    DB_PASSWORD: nonEmpty,
    DB_NAME: nonEmpty.default("apilibrary"),
    DB_SSL: z.stringbool().default(false),
    DB_POOL_MAX: positiveInt.default(10),
    DB_POOL_MIN: z.coerce.number().int().min(0).default(0),
    DB_POOL_IDLE_TIMEOUT_MS: positiveInt.default(30000),
    DB_POOL_CONNECTION_TIMEOUT_MS: positiveInt.default(2000),
    DB_POOL_MAX_LIFETIME_SECONDS: positiveInt.default(300),
  })
  .refine((raw) => raw.DB_POOL_MIN <= raw.DB_POOL_MAX, {
    path: ["DB_POOL_MIN"],
    message: "DB_POOL_MIN must be less than or equal to DB_POOL_MAX",
  });

export type AppConfig = z.output<typeof EnvSchema>;

export const loadEnv = (): AppConfig => {
  const parsedEnv = EnvSchema.safeParse(process.env);

  if (!parsedEnv.success) {
    console.error("Invalid environment variables:", z.flattenError(parsedEnv.error).fieldErrors);
    process.exit(1);
  }

  return parsedEnv.data;
};

export const env = loadEnv();
