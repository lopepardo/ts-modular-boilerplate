import "dotenv/config";
import { defineConfig } from "prisma/config";

const {
  DB_USER = "app",
  DB_HOST = "localhost",
  DB_PORT = "5432",
  DB_NAME = "app",
} = process.env;

const { DB_PASSWORD } = process.env;
if (!DB_PASSWORD) {
  throw new Error("DB_PASSWORD is required (see .env.example)");
}

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  },
});
