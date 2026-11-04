# Expenses API

Amounts are in **cents (integers)**: `amountCents: 1250` = €12.50.
Dates are `YYYY-MM-DD`. Errors: `{ "error": { "code", "message", "traceId" } }`; validation errors (422) also include `details`.

## Expense

```json
{
  "id": "0b9f3a52-6c1e-4f7e-9d3a-2f6b8a1c4e10",
  "amountCents": 1250,
  "description": "Set lunch",
  "category": "food",
  "date": "2026-10-20",
  "createdAt": "2026-10-20T10:30:00.000Z"
}
```

## Endpoints

### `POST /expenses`

Body: `amountCents` (integer > 0), `description` (1–200), `category` (1–50), `date`.
Responses: `201` with the expense · `422` invalid data.

### `GET /expenses`

Optional query: `from`, `to` (both inclusive), `category`.
Responses: `200` array of expenses, by date descending · `422` invalid filters.

### `GET /expenses/summary`

Required query: `month` (`YYYY-MM`). Totals per category for that month.

```json
{
  "month": "2026-10",
  "totalCents": 5530,
  "count": 4,
  "categories": [
    { "category": "food", "totalCents": 3030, "count": 2 },
    { "category": "transport", "totalCents": 2500, "count": 2 }
  ]
}
```

Categories are ordered by `totalCents` descending, then by name. A month without expenses returns `200` with `totalCents: 0`, `count: 0` and `categories: []`. Categories are free text, so `Food` and `food` are different groups.
Responses: `200` summary · `422` missing or malformed `month`.

### `GET /expenses/:id`

Responses: `200` expense · `422` id is not a uuid · `404` `EXPENSE_NOT_FOUND`.

### `DELETE /expenses/:id`

Responses: `204` no body · `422` id is not a uuid · `404` `EXPENSE_NOT_FOUND`.

### `POST /books`

Registers a Book. Body: `{ "title", "author", "isbn" }` (non-empty strings, trimmed). Every call creates a new Book, even with an ISBN already registered.

```json
{ "id": "uuid", "title": "Dune", "author": "Frank Herbert", "isbn": "978-0441172719", "retired": false }
```

Responses: `201` book · `422` `VALIDATION_ERROR`.

### `GET /books/:id`

Responses: `200` book (same shape as above) · `422` id is not a uuid · `404` `BOOK_NOT_FOUND`.

### `GET /health`

Responses: `200` `{ "status": "ok" }`.
