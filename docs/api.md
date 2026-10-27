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

### `GET /expenses/:id`

Responses: `200` expense · `422` id is not a uuid · `404` `EXPENSE_NOT_FOUND`.

### `DELETE /expenses/:id`

Responses: `204` no body · `422` id is not a uuid · `404` `EXPENSE_NOT_FOUND`.
