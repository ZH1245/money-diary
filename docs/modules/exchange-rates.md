# Exchange rates module

> Read before editing `src/features/exchange-rates/`.
> Global: [AGENTS.md](../../AGENTS.md)

## Purpose

Fetch FX rates so transactions logged in a foreign currency convert to the user's ledger
currency.

## File tree

```text
exchange-rates/
  api/exchange-rate-api.ts             # client fetch
  server/fetch-exchange-rate.ts        # SERVER-ONLY provider call
```

## Routes

- API: `/api/exchange-rate`

## Rules & gotchas

- No DB table — rates fetched on demand. Provider call is server-only.
- Consumers: transaction create (source vs ledger currency), and the AI
  `get_exchange_rate` tool (offline/local model path).

## Cross-module deps

- **transactions**: converts `sourceAmount`/`sourceCurrency` → `amount` at `exchangeRate`.
- **ai**: `get_exchange_rate` tool.
- **settings**: user ledger currency is the conversion target.
