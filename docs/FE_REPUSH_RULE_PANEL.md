# FE RulePanel Contract (Toonflow-web)

Out-of-repo implementation guide for `m4-fe-repush`.

**Ready-to-copy integration pack:** [toonflow-web/README.md](./toonflow-web/README.md)

## Data source

`POST /api/ruleEngine/inspectBundle` or `dryRunImport` response fields:

- `closureChecks.dc|pc|gc|ic` — grouped checklists
- `closureChecks.blocked` — banner fallback
- **`exportGate.exportAllowed`** — SSOT for block banner (prefer over soft WARN counts)
- **`exportGate.chatRepairText`** — full one-copy repair brief for Chat
- `exportGate.blocks` / `repairHints` / `missingFieldSummary`
- `repairHints[]` — `{ id, chatTemplate, ruleId }` (per-hint secondary copy)
- `rePushPlan[]` — `{ reverseTarget, preserveFields, presentationFork, status }`

## UI priority

1. Red banner when `exportAllowed === false` (or `blocked === true`)
2. Primary CTA **「复制闭环修复清单」** → clipboard `chatRepairText`
3. Tab per dimension (DC/PC/GC/IC) with failed BLOCK items first
4. Repair hint cards with copy-to-chat for single `chatTemplate` (secondary)
5. Re-push buttons = **jump only** (label clearly); never imply data was fixed

## Sync note

Copy `docs/toonflow-web/*` into the Toonflow-web repo after each contract change. Do not patch `data/web*` hashed assets in Toonflow-app.

See [MULTI_END_CLOSURE_API.md](./MULTI_END_CLOSURE_API.md).
