import "dotenv/config";
import { defineConfig } from "prisma/config";

const {
  DB_USER = "apigastos",
  DB_PASSWORD = "apigastos_password",
  DB_HOST = "localhost",
  DB_PORT = "5432",
  DB_NAME = "apigastos",
} = process.env;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`,
  },
});
