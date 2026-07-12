# Multi-End Closure API

Unified response for EXT Chat, INT validate, Agent, FE, Electron.

## POST /api/ruleEngine/inspectBundle

**Request**

```json
{
  "bundle": { "bundleType": "script", "script": "..." },
  "tier": "T1",
  "genError": "optional generation feedback string",
  "sfRound": 0
}
```

**Response** (`UnifiedClosureResponse`)

| Field | Type | Description |
|-------|------|-------------|
| `tier` | T1\|T2\|T3 | Inferred or explicit closure tier |
| `blocked` | boolean | Any BLOCK-severity check failed |
| `rulePackVersion` | string | e.g. `"2.0.1"` |
| `closureChecks.dc` | Check[] | Design closure |
| `closureChecks.pc` | Check[] | Production closure |
| `closureChecks.gc` | Check[] | Generation closure |
| `closureChecks.ic` | Check[] | Intelligent closure |
| `closureChecks.blocked` | boolean | Same as top-level blocked |
| `forwardTrace` | object | Forward trace with `traces[]` |
| `reverseHints` | object[] | Per-chain reverse targets |
| `repairHints` | object[] | Chat templates from repair catalog |
| `rePushPlan` | object[] | Auto re-push plan items |
| `warnings` | string[] | Non-blocking notices |
| `endpoint` | ext\|int | Caller channel |

**Check shape**

```json
{ "id": "DC-01", "passed": true, "message": "...", "severity": "BLOCK" }
```

## dryRunImport (with DB)

Same closure fields plus import metadata:

- `willCreateScript`, `willOverwriteLayers`, `storyboardCount`, `mergeStrategy`

## FE contract (RulePanel)

Display priority:

1. `closureChecks.blocked` banner
2. Failed BLOCK checks by dimension (dc/pc/gc/ic)
3. `repairHints` with `chatTemplate`
4. `rePushPlan` actions

Toonflow-web implementation is out-of-repo; this document is the API contract.
