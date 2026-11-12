import "dotenv/config";
import { defineConfig } from "prisma/config";

const {
  DB_USER = "app",
  DB_PASSWORD,
  DB_HOST = "localhost",
  DB_PORT = "5432",
  DB_NAME = "app",
} = process.env;

// Without DB_PASSWORD the URL stays empty: `generate` and `validate` still work (e.g. in the Docker
// build) and commands that connect fail. Throwing here would break every command.
const url = DB_PASSWORD
  ? `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
  : "";

export default defineConfig({
  schema: "prisma/schema",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url },
});
