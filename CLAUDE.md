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
- **`present()` (controllers):** la salida pública difiere de la fila de BD (fecha → `YYYY-MM-DD`, `createdAt` → ISO). Las fechas de entrada se parsean a `Date` UTC medianoche.
- **`AppError` + `errorHandler`:** un solo lugar decide el formato de error `{ error: { code, message, traceId } }`. `ZodError` → 422 `VALIDATION_ERROR` (con `details`), `AppError` → su `statusCode`/`code`, resto → 500. Por eso los handlers solo hacen `.parse()` y lanzan; no capturan errores.
- **`buildApp()` separado de `main.ts`:** permite tests con `app.inject` sin abrir puerto.
- **`config/env.ts`:** falla rápido (`process.exit(1)`) si el entorno es inválido; el resto del código importa `env`, nunca `process.env`.
- **`prisma.config.ts` lee `DB_*` por su cuenta:** el CLI de Prisma no pasa por `env.ts`, así que construye su propia URL.
- **`db/client.ts`:** única instancia de `PrismaClient` (adapter `pg`, pool configurado desde `env`). El cliente se importa de `./generated/client.js`, **no** de `@prisma/client`.
- **Importes en céntimos (enteros):** evita errores de coma flotante.
- **`docs/api.md`:** contrato público; cliente y código deben coincidir con él.

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

`pnpm typecheck && pnpm lint && pnpm test`. Si cambiaste el comportamiento de un endpoint, comprueba también `docs/api.md`.

### Tests

Los tests **no usan BD**: mockean `../src/db/client.js` con `vi.mock` + `vi.hoisted` y ejercitan las rutas con `app.inject` tras `await import("../src/app.js")`. Cualquier test nuevo que toque datos sigue ese patrón (ver `tests/expenses.test.ts`).

### Reglas del proyecto

- Importes en céntimos (enteros), nunca float.
- Imports relativos con extensión `.js` (ESM); `import type` para tipos (`verbatimModuleSyntax`).
- No edites migraciones ya aplicadas: crea una nueva.
- Si cambias la API (rutas, campos, códigos de error), actualiza `docs/api.md`.
- Errores de negocio: `throw new AppError(mensaje, status, "CODIGO_EN_MAYUSCULAS")` en el service; nunca `try/catch` en controllers para formatear respuestas.
- Nuevo recurso: un archivo por capa (`routes/`, `controllers/`, `services/`) y registro con `prefix` en `app.ts`.
- TypeScript estricto: sin `any`, `type` en vez de `interface`, args no usados con prefijo `_`. `exactOptionalPropertyTypes` está activo: no pases `undefined` explícito a props opcionales (usa spread condicional, como en `listExpenses`).
- Prettier: comillas dobles, `;`, coma final, 80 columnas.
- Ramas `feat/…` y `fix/…`; commits con Conventional Commits.
- `.env` está gitignored: nunca lo commitees; documenta variables nuevas en `.env.example` y `config/env.ts`.
