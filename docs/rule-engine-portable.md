# @toonflow/rule-engine — Portable Index

Central documentation for modular rule closure (v2.0.1).

## Getting started

- [PORTABLE_QUICKSTART.md](./PORTABLE_QUICKSTART.md) — 15 min, scenarios A/B/C/D
- [PORTABLE_KIT.md](./PORTABLE_KIT.md) — sync script & file manifest
- [MIGRATION_v1_to_v2.md](./MIGRATION_v1_to_v2.md) — upgrade notes

## Architecture

- [ARCHITECTURE.md](./ARCHITECTURE.md) — five layers + module boundaries
- [MULTI_END_CLOSURE_API.md](./MULTI_END_CLOSURE_API.md) — API response contract
- [FE_REPUSH_RULE_PANEL.md](./FE_REPUSH_RULE_PANEL.md) — Toonflow-web RulePanel (out-of-repo)
- [SOURCE_TRACEABILITY.md](./SOURCE_TRACEABILITY.md) — rule → runtime map
- [ADAPTER_GUIDE.md](./ADAPTER_GUIDE.md) — HostHooks for custom hosts

## Testing

```bash
yarn test:inspect-bundle
yarn test:unified-closure-golden
yarn audit:source-traceability
yarn audit:full-chain-closure
node scripts/sync-portable-kit.mjs
```

## Core API

```typescript
import { inspectBundle } from "@/ruleEngine/portable";
```

Zero Knex. Parses ScriptBundle or EpisodeBundle, runs DC/PC/GC/IC, returns reverse hints and rePush plan.

## Legacy

- [DESIGN_FLOW_GUIDE.md](./DESIGN_FLOW_GUIDE.md)
- [RULE_ENGINE_TEST_GUIDE.md](./RULE_ENGINE_TEST_GUIDE.md)
- [EXTERNAL_REVISION_GUIDE.md](./EXTERNAL_REVISION_GUIDE.md)

Core module path: `src/ruleEngine/`. Optional npm extract (M3): `packages/rule-engine-core/`.
