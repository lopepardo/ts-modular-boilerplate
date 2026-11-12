# Library API

Invalid input (body, query or params) returns `400` `VALIDATION_ERROR` with `details`, a list of `{ "in", "path", "message" }` where `in` is `body`, `params`, `querystring` or `headers` and `path` is the dotted field path (empty when the whole `in` value is invalid, e.g. a body that is an array). Business-rule failures use `404`, `409` or `422` with a specific `code`. Every error has the shape `{ "error": { "code", "message", "traceId" } }`.

Errors that do not come from a module's rules:

| Status | `code`                   | When                                                                             |
| ------ | ------------------------ | -------------------------------------------------------------------------------- |
| `400`  | `INVALID_JSON`           | Request body is empty or not valid JSON.                                         |
| `404`  | `ROUTE_NOT_FOUND`        | No route matches the request.                                                    |
| `413`  | `PAYLOAD_TOO_LARGE`      | Request body is too large.                                                       |
| `415`  | `UNSUPPORTED_MEDIA_TYPE` | Unsupported `Content-Type`.                                                      |
| `4xx`  | `BAD_REQUEST`            | Any other client error from the server framework (status kept, generic message). |
| `500`  | `INTERNAL_SERVER_ERROR`  | Unexpected error; the message is always generic.                                 |

## Endpoints

### `POST /books`

Registers a Book. Body: `{ "title", "author", "isbn" }` (non-empty strings, trimmed; `title` and `author` up to 200 characters, `isbn` up to 32). Every call creates a new Book, even with an ISBN already registered.

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

### `GET /books`

Lists Books, optionally narrowed by query parameters (all combined with AND; no pagination yet). Results are ordered by `title`, then `id`.

| Parameter | Matches                                                  |
| --------- | -------------------------------------------------------- |
| `title`   | Part of the title, case-insensitive (1–200 characters).  |
| `author`  | Part of the author, case-insensitive (1–200 characters). |
| `isbn`    | Exactly this ISBN (1–32 characters).                     |
| `retired` | `true` for Retired Books only, `false` for the others.   |

Responses: `200` array of books (same shape as above, `[]` when nothing matches) · `400` `VALIDATION_ERROR`.

### `GET /books/:id`

Responses: `200` book (same shape as above) · `400` `VALIDATION_ERROR` (id is not a uuid) · `404` `BOOK_NOT_FOUND`.

### `POST /books/:id/retire`

Takes the Book out of circulation. It stays in the catalog and can still be viewed; Books are never deleted (there is no `DELETE /books/:id`). Idempotent: retiring a Book that is already Retired succeeds and changes nothing. No body.

Responses: `200` book with `"retired": true` · `400` `VALIDATION_ERROR` (id is not a uuid) · `404` `BOOK_NOT_FOUND`.

### `POST /loans`

A Member borrows a Book. Body: `{ "memberId", "bookId" }` (`memberId` is an opaque external id, a non-empty trimmed string up to 200 characters and not validated against any registry; `bookId` is a uuid). The Loan is `active` and its `dueDate` is 14 days after `borrowedAt`.

```json
{
  "id": "uuid",
  "bookId": "uuid",
  "memberId": "member-1",
  "status": "active",
  "overdue": false,
  "borrowedAt": "2026-03-01T10:00:00.000Z",
  "dueDate": "2026-03-15T10:00:00.000Z"
}
```

A Book has at most one `active` Loan; a Member has at most 3 `active` Loans (returned ones do not count) and cannot borrow while any of their active Loans is Overdue (its `dueDate` has passed; derived from the clock, never stored). The rules hold under concurrent requests.

Responses: `201` loan · `400` `VALIDATION_ERROR` · `404` `BOOK_NOT_FOUND` · `409` `BOOK_RETIRED`, `BOOK_ALREADY_LOANED`, `LOAN_LIMIT_REACHED` or `MEMBER_HAS_OVERDUE_LOANS`.

### `POST /loans/:id/return`

A Member returns a Loan: it moves from `active` to `returned`, with no way back. A Loan can be returned even if its Book was Retired after it was borrowed. No body.

Responses: `200` loan with `"status": "returned"` (same shape as above) · `400` `VALIDATION_ERROR` (id is not a uuid) · `404` `LOAN_NOT_FOUND` · `409` `LOAN_ALREADY_RETURNED`.

### `GET /loans`

Lists Loans, ordered by `borrowedAt`, then `id`. Optional query filters, combinable: `memberId` (trimmed, 1–200 characters) and `status` (`active` or `returned`). Every Loan has an `overdue` flag: `true` only for an `active` Loan whose `dueDate` has passed, computed on read from the clock (nothing is stored; `returned` Loans are never overdue). Not paginated yet: returns every matching row.

Responses: `200` array of loans (same shape as `POST /loans`) · `400` `VALIDATION_ERROR` (invalid `status` or empty `memberId`).

### `GET /loans/:id`

Responses: `200` loan (same shape, including `overdue`) · `400` `VALIDATION_ERROR` (id is not a uuid) · `404` `LOAN_NOT_FOUND`.

### `GET /health`

Responses: `200` `{ "status": "ok" }`.
