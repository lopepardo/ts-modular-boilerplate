# API modular en TypeScript con Fastify, Prisma y PostgreSQL

Plantilla para empezar una API HTTP como un **monolito modular**: un solo proceso y una sola base de datos, con módulos separados por reglas que ESLint hace cumplir. Cada módulo es dueño de su código y de sus datos y habla con los demás por contratos, así que puede salir a su propio servicio el día que haga falta, sin pagar antes el costo de operar varios.

El dominio de ejemplo (una biblioteca con `catalog` y `lending`) solo sirve para mostrar un módulo simple y uno con reglas de negocio. Se reemplaza al empezar tu proyecto.

Pila: Node.js 26 + TypeScript (ESM), Fastify 5, Prisma 7 sobre PostgreSQL 18, Zod 4, Vitest, ESLint + Prettier y pnpm.

## Cómo funciona

```text
Cliente ──► Fastify ──┬─► /books   catalog ──► schema catalog ─┐
                      │                                        ├── PostgreSQL
                      └─► /loans   lending ──► schema lending ─┘
                                       │
                                       └── puerto BookCatalog ──(lo conecta app.ts)──► catalog
```

1. Fastify recibe la petición y Zod valida body, query y params (si algo falla, responde `400`).
2. La ruta (`http/`) llama a un caso de uso (`application/`), que aplica las reglas y guarda con un repositorio (`infra/`, con Prisma). Si necesita algo de otro módulo, lo pide por un puerto que `src/app.ts` conecta.
3. Cualquier error de negocio se traduce en un solo lugar a `{ "error": { "code", "message", "traceId" } }`.

## Estructura del repositorio

```text
src/
  main.ts                 arranque y apagado ordenado
  app.ts                  única raíz de composición: crea y conecta los módulos
  modules/<modulo>/
    http/                 rutas, esquemas Zod y presenters
    application/          casos de uso y puertos (repositorios y lo que necesita de otros módulos)
    domain/               tipos de las entidades; reglas solo cuando el módulo ya las necesita
    infra/                repositorios con Prisma
    index.ts              la única puerta pública del módulo
  platform/               infraestructura común: configuración, base de datos, servidor HTTP, logging
  shared/                 piezas mínimas comunes: errores de negocio, reloj, generador de ids
prisma/schema/            un archivo .prisma por módulo (+ base.prisma)
tests/                    Vitest contra Postgres real (tests/domain/: reglas del dominio, sin base)
docs/api.md               contrato de los endpoints (y docs/api/: colección de requests para probar a mano)
CONTEXT.md                vocabulario del dominio (CLAUDE.md y .claude/: instrucciones para el asistente de IA)
```

## Decisiones de arquitectura

### 1. Monolito modular por funcionalidad, con capas internas

El código se organiza por módulo, no por tipo de archivo (`routes/`, `services/`...).

- **Cada módulo expone solo su `index.ts`**, y los módulos nunca se importan entre sí. Si `lending` necesita algo de `catalog`, declara un puerto con tipos propios y `app.ts` lo conecta. Así la dependencia se ve en un solo lugar, no hay ciclos y en los tests basta con sustituir el puerto.
- **`application` y `domain` no conocen el framework ni la base de datos** (`http`, `infra`, `platform`, `fastify`, `zod`, Prisma, `pg`). Es lo útil de "hexagonal" sin la ceremonia completa.
- **ESLint lo hace cumplir y las reglas tienen tests** (`tests/architecture-rules.test.ts`): una regla que solo vive en un documento termina rompiéndose.
- **En `domain/`, datos inmutables y funciones; nunca clases.** `Loan` es un tipo `Readonly` con un _brand_ no exportado: solo nace de `borrow` (aplica las reglas) o de `rehydrateLoan` (solo `infra`). Los instantes son `Temporal.Instant`; un dato sin reglas es un `type` plano (`Book`). Es el mismo estilo de funciones que ya usan los casos de uso, repositorios y rutas.
- **Un módulo empieza simple** (casos de uso, repositorio y un `type`). El _brand_ y las funciones con reglas llegan cuando aparece una regla de negocio real.

Descartado: capas horizontales globales (mezclan los módulos), hexagonal puro (demasiada ceremonia) y entidades como clases (obligan a reconstruir instancias en cada frontera, porque Prisma y JSON usan objetos planos).

### 2. Inyección de dependencias con funciones, sin contenedor

Los casos de uso son funciones que reciben sus dependencias como argumento; no hay contenedor ni decoradores.

- **`src/app.ts` es el único lugar que crea dependencias concretas.** El flujo se lee en un archivo y TypeScript lo verifica.
- **El reloj y el generador de ids también se inyectan:** tests deterministas, sin `Date.now()` ni singletons ocultos.
- **`buildApp` está separado de `main.ts`** para probar con `app.inject` sin abrir un puerto.

### 3. Datos propios por módulo: un schema de Postgres por módulo y sin llaves foráneas entre módulos

Cada módulo se trata como si ya tuviera su propia base de datos. La pregunta guía: _si este módulo tuviera su propia base mañana, ¿esto seguiría funcionando?_

- **Un schema de Postgres y un archivo `.prisma` por módulo.** Extraerlo empezaría con `pg_dump -n <modulo>`.
- **Sin FK, relaciones ni joins entre módulos:** el id de otro módulo es una columna normal, y los datos ajenos se piden por un puerto.
- **Cada módulo es el único que lee y escribe sus tablas.** ESLint rechaza `prisma.<modelo>` fuera del `infra/` del dueño (heurística: no detecta alias ni SQL crudo).
- **La integridad se mueve, no desaparece:** dentro de un módulo la garantiza la base (FK, `UNIQUE`, índices parciales); entre módulos, el código.
- **Las transacciones viven dentro de un módulo.** Si una regla parece necesitar una entre módulos, rediseña para que cualquier orden deje un estado válido, reacciona con un evento (decisión 4) o corrige la frontera.
- **Los triggers** son solo técnicos (`updatedAt`, auditoría); las reglas de negocio viven en el código.

Descartado: una FK entre módulos (filtra la dependencia al schema ajeno y borrar un módulo rompe `prisma generate`) y todo en `public` (la propiedad de cada tabla solo se vería en el nombre de un archivo).

### 4. Escalera de evolución: agregar maquinaria distribuida solo cuando aparezca la necesidad

Extraer un módulo nunca es gratis (llamadas de red que fallan, datos en otra base, un broker para los eventos), así que cada pieza se agrega **solo cuando su disparador es real**.

| Paso                | Disparador                                                         | Qué agregar                                                                                                              |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1. Hoy              | Los módulos solo necesitan respuestas unos de otros                | Schema propio, ids en vez de FK, llamadas síncronas por puertos, transacciones dentro de un módulo                       |
| 2. Reacción         | "Cuando pasa X en A, B debe hacer Y"                               | Eventos en memoria: A publica por un puerto y `app.ts` suscribe a B                                                      |
| 3. Reacción durable | La reacción no puede perderse si el proceso muere                  | Tabla _outbox_ en el schema de A: guarda el cambio y el evento en la misma transacción, y un relay lo entrega después    |
| 4. Extracción       | Un módulo necesita escalar, desplegarse o tener dueño por separado | Mover su schema a su propia base, cambiar el adaptador de `app.ts` por un cliente HTTP y publicar el outbox en un broker |

Si un caso de uso necesita escribir en dos módulos de forma atómica, primero cuestiona la frontera; si se sostiene, usa un evento. Los reportes que cruzan módulos leen por puertos, nunca con joins entre schemas.

### 5. Tests contra Postgres real, sin repositorios en memoria

Los tests levantan la app real sobre el Postgres local: sin repositorios en memoria, Prisma falso ni `vi.mock` de la base.

- **Se gana** que los tests ejercitan lo mismo que producción (migraciones y restricciones incluidas; un índice único parcial se prueba con peticiones concurrentes) y que no hay dos implementaciones de cada repositorio que puedan divergir.
- **Se paga** con necesitar Postgres levantado y con que los archivos de test corran uno a la vez.
- Cada test borra solo las filas que creó (`createTestApp()` en `tests/support/testApp.ts`).
- **Excepción:** `tests/domain/` prueba el dominio puro sin base de datos ni app.

## Cómo usarla

Necesitas Node.js 26, pnpm 12.15.0 (fijado en `package.json`) y Docker.

### Ejecutar localmente

```bash
cp .env.example .env            # edita DB_PASSWORD, es obligatoria
docker compose up -d postgres
pnpm install
pnpm db:generate                # obligatorio: sin el cliente de Prisma generado fallan tsc, dev y lint
pnpm db:migrate
pnpm dev                        # http://localhost:3000/health
```

Otros comandos: `pnpm test -- tests/lending.test.ts` (un solo archivo), `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm build` y `pnpm start`. Tras cada cambio en `prisma/schema/*.prisma`, repite `pnpm db:generate`.

Antes de dar algo por terminado: `pnpm typecheck && pnpm lint && pnpm test`. Si cambias un endpoint o un código de error, actualiza también `docs/api.md` y el test.

Las variables de entorno se validan al arrancar y el proceso falla rápido si alguna es inválida. Están documentadas en `.env.example`.

### Empezar un proyecto desde esta plantilla

1. Crea tu primer módulo copiando `src/modules/catalog/` (el módulo simple) a `src/modules/<nombre>/`: renombra sus archivos y exportaciones, añade `prisma/schema/<nombre>.prisma` con su propio schema (y agrégalo a `datasource.schemas` en `base.prisma`) y móntalo en `src/app.ts`.
2. Borra los módulos de ejemplo `catalog` y `lending`, sus archivos `.prisma` y migraciones (regenéralas con `pnpm db:migrate`), sus `tests/*.test.ts`, la colección de `docs/api/` y las secciones correspondientes de `docs/api.md`. Quita su cableado de `src/app.ts`.
3. Actualiza el nombre en `package.json`, `.env.example`, `CONTEXT.md` (el vocabulario del dominio) y este README.

### Imagen de producción

- Se construye en dos etapas (el cliente de Prisma se genera dentro, sin credenciales) y corre con un usuario sin privilegios.
- Solo lee variables de entorno, así que la misma imagen sirve en cualquier lugar.
- **Las migraciones son manuales:** no se ejecutan al construir ni al arrancar. Fuera de desarrollo usa `prisma migrate deploy`, nunca `migrate dev` (puede pedir resetear la base).

```bash
docker compose --profile app up --build -d    # API + Postgres, para probar la imagen en local
pnpm db:migrate
docker compose --profile app down             # añade -v para borrar también los datos locales
```

## Límites actuales

- No hay autenticación ni autorización.
- CORS está abierto a cualquier origen.
- Los listados no están paginados; hay que paginarlos antes de usarlos con datos reales.
- No hay límite de peticiones, HTTPS, eventos de dominio ni documentación OpenAPI generada.
- Las migraciones son manuales y todavía no hay integración continua (CI).
