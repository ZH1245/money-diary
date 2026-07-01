# Module context files

One file per feature under `src/features/`. Each holds: purpose, annotated file tree,
data model, routes, module rules/gotchas, and cross-module dependencies.

**Read the relevant file before editing that feature.** Global rules and stack live in
[`AGENTS.md`](../../AGENTS.md); entity semantics in [`domain-knowledge.md`](../domain-knowledge.md).

Each `src/features/<name>/CLAUDE.md` is a thin stub that points here — Claude Code
auto-loads it when you edit that directory.

## Index

- [transactions](transactions.md) — money in/out + self-transfers
- [savings](savings.md) — savings ledger (deposit/withdrawal)
- [goals](goals.md) — financial targets + progress
- [wishlist](wishlist.md) — things to buy
- [payment-accounts](payment-accounts.md) — cards/wallets/cash + balances
- [categories](categories.md) — transaction classification
- [recurring](recurring.md) — recurring rules + cron
- [ai](ai.md) — NL finance assistant
- [analytics](analytics.md) — transaction-based metrics
- [dashboard](dashboard.md) — home snapshot
- [auth](auth.md) — sign-in/up, recovery, security profile
- [admin](admin.md) — users, bans, global settings, tickets
- [feedback](feedback.md) — support tickets
- [settings](settings.md) — user AI + currency prefs
- [exchange-rates](exchange-rates.md) — FX fetch/convert
- [legal](legal.md) — privacy policy + ToS
- [privacy](privacy.md) — privacy (blur) mode
- [landing](landing.md) — marketing page
- [shared](shared.md) — cross-feature utils
