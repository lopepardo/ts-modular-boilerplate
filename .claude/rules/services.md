---
paths:
  - "src/services/**/*.ts"
---

# Services

- Import `prisma` from `../platform/db/client.js`; never create another `PrismaClient`.
- For endpoints, errors and layers, follow the `api-conventions` skill.
