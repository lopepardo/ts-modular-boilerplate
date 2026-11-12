# API modular en TypeScript con Fastify, Prisma y PostgreSQL

Plantilla para empezar una API HTTP como un **monolito modular**: un solo proceso y una sola base de datos, pero con los módulos separados por reglas que ESLint hace cumplir. La idea es construir hoy con las reglas de un sistema distribuido (cada módulo es dueño de su código y de sus datos, y habla con los demás por contratos), para que un módulo pueda crecer o salir a su propio servicio el día que haga falta, sin pagar antes el costo de operar varios servicios.

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
2. La ruta (`http/`) llama a un caso de uso (`application/`), que aplica las reglas y guarda con un repositorio (`infra/`, con Prisma).
3. Si el caso de uso necesita algo de otro módulo, lo pide por un puerto que `src/app.ts` conecta.
4. Cualquier error de negocio se traduce en un solo lugar a `{ "error": { "code", "message", "traceId" } }`.

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
CONTEXT.md                vocabulario y reglas del dominio
CLAUDE.md                 instrucciones para el asistente de IA (+ .claude/: reglas por capa, skills y agentes)
```

## Decisiones de arquitectura

### 1. Monolito modular por funcionalidad, con capas internas

El código se organiza por módulo, no por tipo de archivo (`routes/`, `services/`...).

- **Cada módulo expone solo su `index.ts`.** Nadie importa los archivos internos de otro módulo.
- **Los módulos nunca se importan entre sí, ni siquiera por el `index.ts`.** Si `lending` necesita algo de `catalog`, declara un puerto con tipos propios y `app.ts` lo conecta con la API pública de `catalog`. Así la dirección de la dependencia se ve en un solo lugar, no pueden existir ciclos y, para probar `lending`, basta con sustituir el puerto.
- **`application` y `domain` no conocen el framework ni la base de datos:** no importan `http`, `infra`, `platform`, `fastify`, `zod`, Prisma ni `pg`. Es lo justo de "hexagonal" que hace falta, sin la ceremonia completa.
- **ESLint lo hace cumplir y las propias reglas tienen tests** (`tests/architecture-rules.test.ts`). Una regla que solo vive en un documento termina rompiéndose.
- **En `domain/`, datos inmutables y funciones; nunca clases.** `Loan` es un tipo `Readonly` con un _brand_ que no se exporta: solo nace de `borrow` (aplica las reglas) o de `rehydrateLoan` (reconstruye lo guardado y solo lo usa `infra`). Los instantes son `Temporal.Instant`, que es inmutable. Un dato sin reglas es un `type` (`Book`) y los estados con campos distintos se modelan con uniones discriminadas. En los bordes solo se convierten valores (`Date` ↔ `Temporal.Instant` en `infra`, texto ISO en el presenter); nunca hay que reconstruir instancias. Los casos de uso, repositorios y rutas ya eran funciones: un solo estilo en todo el proyecto.
- **Un módulo empieza simple:** casos de uso, repositorio y un `type` plano en `domain/` (`Book`). El _brand_ y las funciones con reglas llegan solo cuando aparece una regla de negocio real (`Loan`).

Descartado: capas horizontales globales (mezclan los módulos y no dejan ninguna frontera), hexagonal puro en todo el proyecto (demasiada ceremonia para validar una idea) y entidades como clases (obligan a reconstruir instancias en cada frontera, porque Prisma y JSON trabajan con objetos planos, y mezclan dos estilos en el proyecto).

### 2. Inyección de dependencias con funciones, sin contenedor

Los casos de uso son funciones que reciben sus dependencias como argumento. No hay contenedor ni decoradores (`tsyringe`, `inversify`).

- **`src/app.ts` es el único lugar que crea las dependencias concretas.** El flujo de dependencias se lee en un archivo y TypeScript lo verifica; un contenedor lo escondería detrás de magia en tiempo de ejecución.
- **El reloj y el generador de ids también se inyectan,** así los tests son deterministas y no hay `Date.now()` ni singletons ocultos.
- **`buildApp` está separado de `main.ts`** para probar con `app.inject` sin abrir un puerto.

### 3. Datos propios por módulo: un schema de Postgres por módulo y sin llaves foráneas entre módulos

Cada módulo se trata como si ya tuviera su propia base de datos, aunque por ahora comparta servidor. La pregunta para cualquier decisión de datos: _si este módulo tuviera su propia base de datos mañana, ¿esto seguiría funcionando?_

- **Un schema de Postgres y un archivo `.prisma` por módulo.** Extraer un módulo empezaría con `pg_dump -n <modulo>`.
- **Sin relaciones ni FK entre módulos:** el id de otro módulo es una columna normal. Tampoco hay joins entre módulos; si `lending` necesita datos de un libro, se los pide a `catalog` por un puerto.
- **Cada módulo es el único que lee y escribe sus tablas.** ESLint rechaza `prisma.<modelo>` fuera del `infra/` del módulo dueño (es una heurística: no detecta alias ni SQL crudo).
- **La integridad no desaparece, se mueve.** Dentro de un módulo la garantiza la base de datos (FK, `UNIQUE`, índices parciales). Entre módulos la garantiza el código (el puerto y las reglas de negocio).
- **Las transacciones viven dentro de un módulo,** en su repositorio. No hay transacciones entre módulos: si una regla parece necesitarla, se rediseña para que cualquier orden de ejecución deje un estado válido, se reacciona con un evento (decisión 4), o la frontera estaba mal puesta y ambas cosas pertenecen al mismo módulo.
- **Los triggers** solo son técnicos y dentro de un módulo (`updatedAt`, auditoría). Las reglas de negocio viven en el código, donde se ven y se prueban.

Descartado: una FK entre módulos (ganancia de integridad pequeña, pero filtra la dependencia al schema ajeno y hace que borrar un módulo rompa `prisma generate`) y dejar todo en el schema `public` (la propiedad de cada tabla solo se vería en el nombre de un archivo).

### 4. Escalera de evolución: agregar maquinaria distribuida solo cuando aparezca la necesidad

Extraer un módulo nunca es gratis: una llamada en proceso pasa a ser una llamada de red que puede fallar, sus datos pasan a otra base y los eventos necesitan un broker. Por eso cada pieza se agrega **solo cuando su disparador es real**. Agregarla antes es la complejidad que esta arquitectura existe para evitar.

| Paso                | Disparador                                                         | Qué agregar                                                                                                              |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1. Hoy              | Los módulos solo necesitan respuestas unos de otros                | Schema propio, ids en vez de FK, llamadas síncronas por puertos, transacciones dentro de un módulo                       |
| 2. Reacción         | "Cuando pasa X en A, B debe hacer Y"                               | Eventos en memoria: A publica por un puerto y `app.ts` suscribe a B                                                      |
| 3. Reacción durable | La reacción no puede perderse si el proceso muere                  | Tabla _outbox_ en el schema de A: guarda el cambio y el evento en la misma transacción, y un relay lo entrega después    |
| 4. Extracción       | Un módulo necesita escalar, desplegarse o tener dueño por separado | Mover su schema a su propia base, cambiar el adaptador de `app.ts` por un cliente HTTP y publicar el outbox en un broker |

Si un caso de uso necesita escribir en dos módulos de forma atómica, primero cuestiona la frontera; si se sostiene, usa un evento. Los reportes que cruzan módulos leen por puertos o desde un módulo de solo lectura, nunca con joins entre schemas.

### 5. Tests contra Postgres real, sin repositorios en memoria

Los tests levantan la aplicación real sobre el Postgres local. No hay repositorios en memoria, ni un Prisma falso, ni `vi.mock` de la base de datos.

- **Se gana** que lo que corre en los tests es lo que corre en producción, incluidas las migraciones y las restricciones de la base (por ejemplo, un índice único parcial se prueba de verdad con peticiones concurrentes), y no hay dos implementaciones de cada repositorio que puedan divergir sin que nadie lo note.
- **Se paga** con tener Postgres levantado para correr `pnpm test`, y con que los archivos de test corran uno a la vez porque comparten la base.
- Cada test borra solo las filas que creó (`createTestApp()` en `tests/support/testApp.ts`), así que tus datos locales no se tocan.
- **La excepción es `domain/`:** es código puro, así que `tests/domain/` prueba sus reglas sin base de datos ni app.

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

| Comando                                        | Qué hace                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `pnpm dev`                                     | Servidor con recarga en el puerto 3000                                             |
| `pnpm test`                                    | Tests contra el Postgres local (un archivo: `pnpm test -- tests/lending.test.ts`)  |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | Tipos / ESLint / Prettier                                                          |
| `pnpm db:generate`                             | Genera el cliente de Prisma; repítelo tras cada cambio en `prisma/schema/*.prisma` |
| `pnpm db:migrate`                              | `prisma migrate dev`                                                               |
| `pnpm build` / `pnpm start`                    | Compila a `dist/` y lo ejecuta                                                     |

Antes de dar algo por terminado: `pnpm typecheck && pnpm lint && pnpm test`. Si cambias un endpoint o un código de error, actualiza también `docs/api.md` y el test.

Las variables de entorno se validan al arrancar y el proceso falla rápido si alguna es inválida. Están documentadas en `.env.example`.

### Empezar un proyecto desde esta plantilla

1. Crea tu primer módulo copiando `src/modules/catalog/` (el módulo simple) a `src/modules/<nombre>/`: renombra sus archivos y exportaciones, añade `prisma/schema/<nombre>.prisma` con su propio schema (y agrégalo a `datasource.schemas` en `base.prisma`) y móntalo en `src/app.ts`.
2. Borra los módulos de ejemplo `catalog` y `lending`, sus archivos `.prisma` y migraciones (regenéralas con `pnpm db:migrate`), sus `tests/*.test.ts`, la colección de `docs/api/` y las secciones correspondientes de `docs/api.md`. Quita su cableado de `src/app.ts`.
3. Actualiza el nombre en `package.json`, `.env.example`, `CONTEXT.md` (el vocabulario del dominio) y este README.

### Imagen de producción

Se construye en dos etapas, corre con un usuario sin privilegios y solo lee variables de entorno, así que la misma imagen sirve en cualquier lugar. **Las migraciones son manuales:** no se ejecutan al construir ni al arrancar. En local se aplican con `pnpm db:migrate`; fuera de desarrollo usa `prisma migrate deploy`, nunca `migrate dev` (puede pedir resetear la base).

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
