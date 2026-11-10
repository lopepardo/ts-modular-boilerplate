# ts-modular-boilerplate

Plantilla de una API HTTP en TypeScript organizada como un **monolito modular por funcionalidad**. El dominio de ejemplo es una biblioteca: `catalog` (libros, módulo simple) y `lending` (préstamos, módulo con dominio rico).

> Este README está en construcción. Por ahora solo documenta las decisiones de arquitectura; las instrucciones de uso del día a día están en `CLAUDE.md`.

## Decisiones de arquitectura

Estas son las decisiones que dan forma al proyecto, con su porqué. La idea de fondo: **construir hoy un solo proceso y una sola base de datos, pero con las reglas de un sistema distribuido**, para que sacar un módulo a su propio servicio sea posible el día que haga falta, sin pagar antes el costo de operar varios servicios.

### 1. Monolito modular por funcionalidad, con capas internas

El código se organiza por módulo, no por tipo de archivo:

```
src/modules/<modulo>/
  http/          rutas Fastify, esquemas Zod, presenters
  application/   casos de uso y las interfaces (puertos) de los repositorios
  domain/        entidades y reglas (solo cuando el módulo ya tiene invariantes reales)
  infra/         implementación con Prisma
  index.ts       la única puerta pública del módulo
```

- **Cada módulo expone solo su `index.ts`.** Nadie importa los archivos internos de otro módulo.
- **Los módulos nunca se importan entre sí, ni siquiera por el `index.ts`.** Si `lending` necesita saber algo de `catalog`, declara un _puerto_ en su propia carpeta `application/ports/` (con tipos propios) y `app.ts` lo conecta con la API pública de `catalog`. Así la dirección de la dependencia se ve en un solo lugar, no pueden existir ciclos, y para probar `lending` basta con sustituir ese puerto.
- **`application` y `domain` no conocen el framework ni la base de datos:** no importan `http`, `infra`, `platform`, `fastify`, `zod`, Prisma ni `pg`; y `domain` tampoco importa `application`. Es lo justo de "hexagonal" que hace falta, sin la ceremonia completa.
- **ESLint hace cumplir estas reglas** (`no-restricted-imports`), y las propias reglas tienen tests en `tests/architecture-rules.test.ts`. Una regla que solo vive en un documento termina rompiéndose.
- **Un módulo empieza simple** (casos de uso + repositorio, como `catalog`) y se promueve a dominio rico (entidad con estado, objetos de valor, como `Loan` y `DueDate` en `lending`) solo cuando aparece una regla de negocio real. Las entidades de `domain` no se exportan.
- Las llamadas entre módulos son **síncronas y en el mismo proceso**. Los eventos de dominio quedan fuera hasta que un proyecto los necesite (ver decisión 4).

**Alternativas descartadas:** capas horizontales globales (`routes/`, `controllers/`, `services/`): simples, pero mezclan los módulos y no dejan ninguna frontera física; y hexagonal puro en todo el proyecto: máximo desacoplamiento, pero demasiada ceremonia para validar una idea.

### 2. Inyección de dependencias con funciones fábrica, sin contenedor

Los casos de uso y los módulos son funciones que reciben sus dependencias como argumento (`registerBookUseCase({ repository, generateId })`). No se usa ningún contenedor ni decoradores (`tsyringe`, `inversify`).

- **`src/app.ts` es la única raíz de composición:** es el único lugar que crea las dependencias concretas y conecta los módulos.
- **`src/main.ts` es dueño del proceso:** crea el cliente de Prisma, llama a `buildApp`, escucha en el puerto y, al recibir la señal de apagado, cierra la app y desconecta la base. `buildApp` está separado de `main.ts` para poder probar con `app.inject` sin abrir un puerto.
- **Las dependencias implícitas también se inyectan:** el reloj (`Clock`) y el generador de ids (`IdGenerator`). Así los tests son deterministas y no hay `Date.now()` ni singletons ocultos. Los ids los genera solo la aplicación; los modelos de Prisma declaran `@id` sin `@default`, de modo que hay una única fuente de ids.
- **`platform/` y `shared/` no conocen los módulos.** `platform` tiene la infraestructura transversal (configuración, cliente de base de datos, servidor HTTP, logging) y `shared` solo primitivas comunes (los errores de negocio, el reloj, los ids).

**Por qué sin contenedor:** con funciones y un único punto de composición, el flujo de dependencias se lee en un archivo y TypeScript lo verifica. Un contenedor oculta ese flujo detrás de magia en tiempo de ejecución.

### 3. Datos propios por módulo: un schema de Postgres por módulo y sin llaves foráneas entre módulos

Cada módulo se trata como si ya fuera un servicio con su propia base de datos que, por ahora, comparte servidor y proceso con los demás. La pregunta para cualquier decisión de datos: _si este módulo tuviera su propia base de datos mañana, ¿esto seguiría funcionando?_

- **Un schema de Postgres por módulo** (`catalog."Book"`, `lending."Loan"`), declarado con `@@schema("<modulo>")`, y **un archivo `.prisma` por módulo** en `prisma/schema/`. Extraer un módulo empezaría con `pg_dump -n <modulo>`.
- **Sin relaciones ni FK entre módulos.** `Loan.bookId` es una columna normal, igual que `memberId`, que apunta fuera de la aplicación. En Prisma una FK exige un campo de relación en ambos modelos, así que `catalog` terminaría conociendo a `lending` en su propio schema.
- **Sin joins entre módulos.** Si `lending` necesita datos de libros, se los pide a `catalog` por un puerto y los combina en memoria.
- **Cada módulo es el único que lee y escribe sus tablas.** ESLint rechaza `prisma.<modelo>` (también `tx.` y `this.prisma.`) fuera del `infra/` del módulo dueño, que es el que declara ese modelo en su `.prisma`. Es una heurística: no detecta alias, desestructuración ni SQL crudo. Los tests están exentos para poder borrar las filas que crean.

**La integridad no desaparece, se mueve:**

- _Dentro de un módulo_ la base de datos lo garantiza todo: FK entre sus propias tablas, `UNIQUE`, `CHECK`, `NOT NULL` e índices parciales. Ejemplo: `Loan_one_active_per_book` es un índice único parcial, así que un libro tiene como máximo un préstamo activo incluso con peticiones simultáneas.
- _Entre módulos_ lo garantiza el código: el puerto (`lending` comprueba que el libro existe antes de prestarlo) y las reglas de negocio (los libros se retiran, nunca se borran, así que un `bookId` guardado nunca queda colgando).

**Transacciones.** Lo que deba cambiar de forma atómica vive en el mismo módulo, y la transacción está en su repositorio (por ejemplo, `openLoan` serializa los préstamos de un miembro con un `advisory lock` dentro de una transacción). No hay transacciones entre módulos. Cuando una regla parece necesitarla, hay tres salidas: (1) rediseñar la regla para que cualquier orden de ejecución deje un estado válido (retirar un libro mientras se presta deja un préstamo activo de un libro retirado, y el dominio lo permite), (2) reaccionar con un evento (decisión 4), o (3) concluir que la frontera está mal puesta y que ambas cosas pertenecen al mismo módulo.

**Triggers.** Los triggers técnicos dentro de un módulo (`updatedAt`, columnas de auditoría) están bien. Las reglas de negocio viven en el código, donde los tests y quien revisa pueden verlas. Los triggers que cruzan módulos están prohibidos: son acoplamiento invisible.

**Alternativas descartadas:**

- _FK de `Loan.bookId` a `Book` con `onDelete: Restrict`_ (fue la primera decisión). La ganancia de integridad era pequeña, porque los libros no se borran y el préstamo ya verifica la existencia; en cambio, filtraba la dependencia al schema de `catalog`, hacía que borrar un módulo rompiera `prisma generate` y abría un camino sin lint a las tablas ajenas (`include: { book: true }`).
- _Todo en el schema `public`:_ más simple, pero la propiedad de cada tabla solo se vería en el nombre del archivo.

### 4. Escalera de evolución: agregar maquinaria distribuida solo cuando aparezca la necesidad

Extraer un módulo nunca es gratis: una llamada en proceso se convierte en una llamada de red que puede fallar o tardar, sus datos pasan a otra base de datos y los eventos necesitan un broker real. Por eso la maquinaria se agrega **paso a paso, y cada paso solo cuando su disparador es real**. Agregarla antes es la complejidad que esta arquitectura existe para evitar.

| Paso                | Disparador                                                                   | Qué agregar                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Hoy              | Los módulos solo necesitan respuestas unos de otros                          | Schema propio por módulo, ids en lugar de FK, llamadas síncronas por puertos conectados en `app.ts`, transacciones dentro de un módulo                  |
| 2. Reacción         | "Cuando pasa X en A, B debe hacer Y"                                         | Eventos en memoria: A publica por un puerto y `app.ts` suscribe a B. Sigue siendo un proceso y A sigue siendo dueño de la transacción                   |
| 3. Reacción durable | La reacción no puede perderse si el proceso muere                            | Una tabla _outbox_ en el schema de A: A guarda su cambio y el evento en la misma transacción, y un relay lo entrega a B después (consistencia eventual) |
| 4. Extracción       | Un módulo necesita escalar, desplegarse o tener dueño de forma independiente | Mover su schema a su propia base de datos, reemplazar el adaptador de `app.ts` por un cliente HTTP y publicar el outbox en un broker                    |

**Señales para subir un escalón:**

- Un caso de uso necesita escribir en dos módulos de forma atómica: primero cuestiona la frontera (decisión 3); si se sostiene, usa un evento (paso 2 o 3).
- `catalog` necesita preguntarle algo a `lending`: el orden de construcción en `app.ts` impide los ciclos; invierte la dependencia con un evento en lugar de crear un segundo puerto.

**Consecuencias:** las consultas que cruzan módulos (reportes) leen por puertos o desde un módulo de reportes de solo lectura; nunca hacen joins entre schemas dentro del `infra` de un módulo. Los eventos de dominio no forman parte del boilerplate hoy.

### 5. Tests contra Postgres real, sin repositorios en memoria

Los tests levantan la aplicación real sobre el Postgres local (`docker compose up -d postgres` y `pnpm db:migrate`). No hay repositorios en memoria, ni un Prisma falso, ni `vi.mock` del cliente de base de datos.

- **`createTestApp()`** (`tests/support/testApp.ts`) arma la app con los repositorios reales, solo inyecta `generateId` y `clock`, registra los ids que se generan y devuelve un `cleanup` que borra únicamente las filas que creó el test. Los datos propios del desarrollador en la misma base nunca se tocan.
- **Qué se gana:** lo que corre en los tests es lo que corre en producción, incluidas las migraciones y las restricciones de la base de datos (el índice único parcial, por ejemplo, se prueba de verdad con peticiones concurrentes). Además se evita mantener dos implementaciones de cada repositorio que puedan divergir sin que nadie lo note.
- **Qué se paga:** hace falta tener Postgres levantado para correr `pnpm test`, y los archivos de test corren uno a la vez porque comparten la base de datos.
