# Gastos API

API REST de gastos personales. Dominio y mensajes de error en **inglés** (`expenses`, `amountCents`, `category`…); mantenlo así. Hoy solo existe el recurso `expenses` (+ `GET /health`).

**Stack:** Node + TypeScript ESM (`nodenext`, `strict`), Fastify 5, Prisma 7 (`prisma-client` + `@prisma/adapter-pg`) sobre PostgreSQL 18, Zod 4, Vitest, ESLint (typescript-eslint type-checked) + Prettier, pnpm.

**Mapa de carpetas:**

```
src/
  main.ts            arranque: buildApp() + listen (0.0.0.0:env.PORT)
  app.ts             buildApp(): Fastify, CORS, /health, errorHandler, rutas
  routes/            plugins Fastify: enlazan verbo+ruta → controller
  controllers/       esquemas Zod (body/query/params) y present()
  services/          lógica de negocio + acceso a datos (Prisma)
  handlers/          errorHandler.ts (mapeo central de errores)
  shared/            AppError
  config/env.ts      valida process.env con Zod y exporta `env`
  db/client.ts       singleton `prisma`
  db/generated/      cliente Prisma generado (gitignored)
prisma/              schema.prisma + migrations/
tests/               *.test.ts (Vitest, sin BD)
docs/api.md          contrato de los endpoints
docs/api/            colección de requests (OpenCollection/Bruno) para probar a mano
prisma.config.ts     config del CLI de Prisma
docker-compose.yml   Postgres local
```

## ¿Por qué existe cada parte?

- **routes → controllers → services:** cada capa tiene una sola responsabilidad. Rutas = cableado; controllers = frontera HTTP (validar entrada, formatear salida); services = reglas y datos, sin conocer Fastify.
- **`AppError` + `errorHandler`:** un solo lugar decide el formato de error `{ error: { code, message, traceId } }`. `ZodError` → 422 `VALIDATION_ERROR` (con `details`), `AppError` → su `statusCode`/`code`, resto → 500. Por eso los handlers solo hacen `.parse()` y lanzan; no capturan errores.
- **`buildApp()` separado de `main.ts`:** permite tests con `app.inject` sin abrir puerto.
- **`config/env.ts`:** falla rápido (`process.exit(1)`) si el entorno es inválido; el resto del código importa `env`, nunca `process.env`.
- **`docs/api.md`:** contrato público; cliente y código deben coincidir con él.
- **Reglas por capa:** el detalle de services, tests y Prisma vive en `.claude/rules/` y se carga al tocar esos archivos. Convenciones REST completas: skill `convenciones-api`.

## ¿Cómo se trabaja?

### Primera vez

```
cp .env.example .env            # DB_PASSWORD es necesaria para docker compose
docker compose up -d postgres
pnpm install
pnpm db:generate                # obligatorio: sin él tsc/dev/lint fallan
pnpm db:migrate
```

### Comandos

- `pnpm dev` — servidor con recarga (`tsx watch`) en :3000
- `pnpm test` — Vitest; un archivo: `pnpm test -- tests/expenses.test.ts`; un test: `pnpm test -- -t "nombre"`
- `pnpm typecheck` — `tsc --noEmit` (incluye `tests/`)
- `pnpm lint` / `pnpm format` — ESLint / Prettier
- `pnpm db:generate` — tras clonar y tras cada cambio de `schema.prisma`
- `pnpm db:migrate` — `prisma migrate dev`
- `pnpm build` / `pnpm start` — compila a `dist/` y ejecuta

### Verificación (antes de dar algo por terminado)

`pnpm typecheck && pnpm lint && pnpm test`. Si cambiaste un endpoint, actualiza `docs/api.md`.

### Reglas del proyecto

- Imports relativos con extensión `.js` (ESM); `import type` para tipos (`verbatimModuleSyntax`).
- TypeScript estricto: sin `any`, `type` en vez de `interface`, args no usados con prefijo `_`. `exactOptionalPropertyTypes` activo: sin `undefined` explícito en props opcionales (spread condicional).
- Prettier: comillas dobles, `;`, coma final, 80 columnas.
- Ramas `feat/…` y `fix/…`; commits con Conventional Commits.
- `.env` está gitignored: nunca lo commitees; documenta variables nuevas en `.env.example` y `config/env.ts`.
