# Migration v1 → v2 (rulePack 2.0.1)

## Breaking changes

| v1 | v2 |
|----|-----|
| `dryRunImport` inline closure | `inspectBundle()` unified DC/PC/GC/IC |
| `buildReverseHints(chainId as trigger)` | `chain_trigger_map.json` semantic mapping |
| EpisodeBundle dryRun script-only | EpisodeBundle → `episodeToScriptBundle` full closure |
| FlowData in productionAgent/tools | `bundle/flowDataTypes.ts` shared type |

## Bundle fields

- Add `forwardTrace`, `linkageAudit`, `rulePackVersion: "2.0.1"`
- ScriptBundle v2 template: `data/fixtures/script-bundle-template-v2.json`

## API

- New: `POST /api/ruleEngine/inspectBundle` (no DB)
- Existing `dryRunImport` now delegates to `inspectBundle` internally

## Fixtures

Set `FIXTURES_ROOT` for portable-kit or custom fixture dirs.

## Skills

External Chat: use `design_flow.bundle.md` (generated). Internal: `design_flow.md` + validate/import APIs.
