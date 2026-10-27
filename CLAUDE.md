# Gastos API

API REST de gastos personales (Node + TypeScript ESM, Fastify 5, Prisma 7 sobre PostgreSQL, Zod 4). El dominio y los mensajes de error están en inglés (`expenses`, `amountCents`, `category`…); mantenlo así.

## Comandos

Gestor de paquetes: pnpm.

- `docker compose up -d postgres` — Postgres local (necesita `DB_PASSWORD` en `.env`; copia `.env.example`)
- `pnpm db:generate` — genera el cliente Prisma en `src/db/generated/` (está en `.gitignore`: ejecútalo tras clonar y tras cambiar `schema.prisma`, o `tsc`/`dev` fallarán)
- `pnpm db:migrate` — `prisma migrate dev`
- `pnpm dev` — servidor con recarga (`tsx watch`) en :3000
- `pnpm test` — suite completa (Vitest); un solo archivo: `pnpm test -- tests/expenses.test.ts`; un test: `pnpm test -- -t "nombre"`
- `pnpm typecheck && pnpm lint` — antes de dar algo por terminado
- `pnpm build` / `pnpm start` — compila a `dist/` y ejecuta

## Arquitectura

Tres capas, un archivo por recurso (hoy solo `expenses`):

- `src/routes/expenses.ts` — plugin Fastify que enlaza rutas con `src/controllers/expenses.ts`, donde están los esquemas Zod (body/query/params) y `present()` (fecha → `YYYY-MM-DD`, `createdAt` → ISO). Las fechas de entrada se parsean a `Date` UTC medianoche.
- `src/services/expenses.ts` — lógica y acceso a datos vía Prisma. Lanza `AppError` (`src/shared/AppError.ts`: mensaje, `statusCode`, `code`); p. ej. gasto inexistente → 404 `EXPENSE_NOT_FOUND`.
- `src/app.ts` — `async buildApp()` crea la instancia Fastify (sin `listen`, para poder usarla en tests con `await buildApp()` + `app.inject`) y registra `errorHandler`.
- `src/handlers/errorHandler.ts` — mapeo central de errores: `ZodError` → 422 `VALIDATION_ERROR` con `details`, `AppError` → su `statusCode`, resto → 500. Los handlers solo hacen `.parse()` y lanzan; no capturan errores.
- `src/main.ts` — arranque: `buildApp` + `listen`.
- `src/config/env.ts` — valida `process.env` con Zod al importarse y exporta `env`; sale con `process.exit(1)` si es inválido. `prisma.config.ts` (CLI de Prisma) lee las variables `DB_*` por separado y construye su propia URL.
- `src/db/client.ts` — singleton `prisma` con `@prisma/adapter-pg` y parámetros de pool desde `env`. El cliente generado se importa desde `./generated/client.js` (generator `prisma-client`, no `@prisma/client`).

## Tests

`tests/expenses.test.ts` mockea `../src/db/client.js` con `vi.mock` (no hay BD en los tests) y ejercita las rutas con `app.inject`. Cualquier test nuevo que toque la capa de datos debe seguir ese patrón de mock.

## Reglas del proyecto

- Los importes se guardan en céntimos (enteros), nunca en float
- No edites migraciones ya aplicadas: crea una nueva
- Imports relativos con extensión `.js` (ESM)
- Ramas `feat/…` y `fix/…`; commits con Conventional Commits
- `docs/api.md` es el contrato de los endpoints; actualízalo si cambias la API
