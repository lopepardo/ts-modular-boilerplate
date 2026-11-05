import type { AppConfig } from "../config/env.js";

type LoggerConfig = Pick<AppConfig, "APP_NAME" | "APP_ENV" | "LOG_LEVEL">;

const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "*.password",
  "*.token",
  "*.authorization",
];

const isoTimestamp = (): string => `,"time":"${new Date().toISOString()}"`;

/**
 * Pure builder for the Fastify/pino logger options.
 * - development: human-readable output through pino-pretty (local time).
 * - test: silent.
 * - otherwise: structured JSON with text levels and ISO timestamps.
 */
export const buildLoggerOptions = (config: LoggerConfig) => {
  const { APP_NAME, APP_ENV, LOG_LEVEL } = config;

  const redact = { paths: REDACTED_PATHS, censor: "[REDACTED]" };

  if (APP_ENV === "development") {
    return {
      level: LOG_LEVEL,
      redact,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: true,
          ignore: "pid,hostname,req.host,req.remoteAddress,req.remotePort",
        },
      },
    };
  }

  return {
    level: APP_ENV === "test" ? "silent" : LOG_LEVEL,
    base: { service: APP_NAME, environment: APP_ENV },
    timestamp: isoTimestamp,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    redact,
  };
};
