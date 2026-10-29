---
name: convenciones-api
description: Convenciones REST de la API de gastos. Úsala al crear o modificar endpoints, validaciones o respuestas de error.
---

- Rutas en plural y kebab-case: /gastos, /categorias
- JSON en camelCase; importes siempre en céntimos (enteros)
- Listados paginados con ?pagina= y ?limite= (máximo 100)
- Errores: { "error": { "codigo": "...", "mensaje": "..." } } con el status HTTP correcto
- Ejemplo de referencia: src/routes/gastos.ts
