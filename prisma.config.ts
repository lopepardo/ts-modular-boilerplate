import "dotenv/config";
import { defineConfig } from "prisma/config";

const {
  DB_USER = "apilibrary",
  DB_PASSWORD = "apilibrary_password",
  DB_HOST = "localhost",
  DB_PORT = "5432",
  DB_NAME = "apilibrary",
} = process.env;

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  },
});
