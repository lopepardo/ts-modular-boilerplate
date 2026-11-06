# Library API

Invalid input (body, query or params) returns `400` `VALIDATION_ERROR` with `details`, a list of `{ "in", "path", "message" }` where `in` is `body`, `params`, `querystring` or `headers` and `path` is the dotted field path (empty when the whole `in` value is invalid, e.g. a body that is an array). Business-rule failures use `404`, `409` or `422` with a specific `code`. Every error has the shape `{ "error": { "code", "message", "traceId" } }`.

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

Responses: `201` book · `400` `VALIDATION_ERROR`.

### `GET /books/:id`

Responses: `200` book (same shape as above) · `400` `VALIDATION_ERROR` (id is not a uuid) · `404` `BOOK_NOT_FOUND`.

### `GET /health`

Responses: `200` `{ "status": "ok" }`.

## Pending

TODO: document these endpoints once they are implemented (see `.scratch/modular-boilerplate/issues/`): `GET /books`, `POST /books/:id/retire`, and the `lending` module (`POST /loans`, `GET /loans`, `GET /loans/:id`, `POST /loans/:id/return`).
