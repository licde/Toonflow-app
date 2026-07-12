# Portable Quickstart (15 min)

Three scenarios for rule closure without full Toonflow.

## A — Headless CLI (0 hooks)

```bash
yarn inspect:bundle data/fixtures/script-bundle-template-v2.json
yarn inspect:bundle data/fixtures/golden/dialogue-break-block.json
```

Output: JSON with `closureChecks`, `forwardTrace`, `reverseHints`, `repairHints`, `rePushPlan`.

## B — In-process (portable-kit / fork)

```typescript
import { inspectBundle } from "./src/ruleEngine/portable";
const result = inspectBundle(bundleJson, { tier: "T1" });
console.log(result.blocked, result.closureChecks);
```

Set `FIXTURES_ROOT` when fixtures are outside cwd.

## C — HTTP (Toonflow host)

```bash
POST /api/ruleEngine/inspectBundle
{ "bundle": { ... }, "tier": "T1" }
```

No DB required. Same shape as `InspectBundleResult`.

## D — Import with host (Knex)

```typescript
import { createToonflowHostHooks } from "@/ruleEngine/portable/ToonflowHostHooks";
const hooks = createToonflowHostHooks(db);
await hooks.dryRunImport(bundle, { projectId: 1, validateOnly: true });
```

## Golden verification

```bash
yarn test:inspect-bundle
yarn test:unified-closure-golden
node scripts/sync-portable-kit.mjs && node portable-kit/run.mjs
```

## Next steps

- [ARCHITECTURE.md](./ARCHITECTURE.md) — five-layer model
- [MIGRATION_v1_to_v2.md](./MIGRATION_v1_to_v2.md) — rulePack 2.0.1
- [MULTI_END_CLOSURE_API.md](./MULTI_END_CLOSURE_API.md) — response fields
- [FORK_STANDALONE_REPO.md](./FORK_STANDALONE_REPO.md) — fork portable-kit 独立仓库
- [toonflow-web/README.md](./toonflow-web/README.md) — RulePanel 集成包
