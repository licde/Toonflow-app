# FE RulePanel Contract (Toonflow-web)

Out-of-repo implementation guide for `m4-fe-repush`.

**Ready-to-copy integration pack:** [toonflow-web/README.md](./toonflow-web/README.md)

## Data source

`POST /api/ruleEngine/inspectBundle` or `dryRunImport` response fields:

- `closureChecks.dc|pc|gc|ic` — grouped checklists
- `closureChecks.blocked` — banner
- `repairHints[]` — `{ id, chatTemplate, ruleId }`
- `rePushPlan[]` — `{ reverseTarget, preserveFields, presentationFork, status }`

## UI priority

1. Red banner when `blocked === true`
2. Tab per dimension (DC/PC/GC/IC) with failed BLOCK items first
3. Repair hint cards with copy-to-chat for `chatTemplate`
4. Re-push action buttons from `rePushPlan`

See [MULTI_END_CLOSURE_API.md](./MULTI_END_CLOSURE_API.md).
