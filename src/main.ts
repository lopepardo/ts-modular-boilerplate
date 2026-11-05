import { buildApp } from "./app.js";
import { env } from "./platform/config/env.js";
import { createPrismaClient } from "./platform/db/client.js";

const prisma = createPrismaClient(env);
const app = await buildApp({ prisma });

// Stop accepting connections, drain in-flight requests, then release the DB.
// Docker sends SIGKILL after its stop grace period, so no watchdog is needed.
let shuttingDown = false;
const shutdown = async (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "Shutting down gracefully");
  try {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    app.log.error(error, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", (signal) => void shutdown(signal));
process.on("SIGINT", (signal) => void shutdown(signal));

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
