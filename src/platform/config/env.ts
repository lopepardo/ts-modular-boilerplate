import "dotenv/config";
import { z } from "zod";

const RawEnvSchema = z.object({
  APP_NAME: z.string().default("ts-modular-boilerplate"),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_VERSION: z.string().default("unversioned"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("debug"),
  DB_HOST: z.string().default("localhost"), //postgres
  DB_PORT: z.coerce.number().int().default(5432),
  DB_USER: z.string().default("apigastos"),
  DB_PASSWORD: z.string().default("apigastos_password"),
  DB_NAME: z.string().default("apigastos"),
  DB_SSL: z.stringbool().default(false),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(0),
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(2000),
  DB_POOL_MAX_LIFETIME_SECONDS: z.coerce.number().int().positive().default(300),
});

const AppConfigSchema = RawEnvSchema.transform((rawEnv) => {
  return {
    APP_NAME: rawEnv.APP_NAME,
    APP_ENV: rawEnv.APP_ENV,
    APP_VERSION: rawEnv.APP_VERSION,
    PORT: rawEnv.PORT,
    LOG_LEVEL: rawEnv.LOG_LEVEL,
    DB_HOST: rawEnv.DB_HOST,
    DB_PORT: rawEnv.DB_PORT,
    DB_USER: rawEnv.DB_USER,
    DB_PASSWORD: rawEnv.DB_PASSWORD,
    DB_NAME: rawEnv.DB_NAME,
    DB_SSL: rawEnv.DB_SSL,
    DB_POOL_MAX: rawEnv.DB_POOL_MAX,
    DB_POOL_MIN: rawEnv.DB_POOL_MIN,
    DB_POOL_IDLE_TIMEOUT_MS: rawEnv.DB_POOL_IDLE_TIMEOUT_MS,
    DB_POOL_CONNECTION_TIMEOUT_MS: rawEnv.DB_POOL_CONNECTION_TIMEOUT_MS,
    DB_POOL_MAX_LIFETIME_SECONDS: rawEnv.DB_POOL_MAX_LIFETIME_SECONDS,
  };
});

export type AppConfig = z.output<typeof AppConfigSchema>;

export const loadEnv = (): AppConfig => {
  const parsedEnv = AppConfigSchema.safeParse(process.env);

  if (!parsedEnv.success) {
    console.error(
      "Invalid environment variables:",
      z.flattenError(parsedEnv.error).fieldErrors,
    );
    process.exit(1);
  }

  return parsedEnv.data;
};

export const env = loadEnv();
