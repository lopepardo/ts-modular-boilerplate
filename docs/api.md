# Expenses API

## Endpoints

### `POST /books`

Registers a Book. Body: `{ "title", "author", "isbn" }` (non-empty strings, trimmed). Every call creates a new Book, even with an ISBN already registered.

```json
{
  "id": "uuid",
  "title": "Dune",
  "author": "Frank Herbert",
  "isbn": "978-0441172719",
  "retired": false
}
```

Responses: `201` book · `422` `VALIDATION_ERROR`.

### `GET /books/:id`

Responses: `200` book (same shape as above) · `422` id is not a uuid · `404` `BOOK_NOT_FOUND`.

### `GET /health`

Responses: `200` `{ "status": "ok" }`.
