# Source Traceability

Rule source → runtime mapping for rulePack 2.0.1.

## Columns

| Column | Source |
|--------|--------|
| ruleId | rule_cards.json / rule-packs |
| layer | P/G/W/B/H/V/Y |
| implLevel | L0/L1/L2/L3 (manifest) |
| runtimeHandler | ClosureRegistry / tier0 / dryRun |
| checklistId | DC/PC/GC/IC-* |

## Generate report

```bash
yarn audit:source-traceability
```

Output: `data/fixtures/source_traceability.csv`

## Coverage targets

- 257+ rules in 规则层.json (source of truth)
- 313 entries in rule_cards.json (P/G/W + 规则层 extract merge)
- 22+ fix_templates from autoFixLibrary + runtime triggers
- 8 tier-0 proven in INT validate
- GC/IC via ClosureRegistry JSON severity

## CI gate

Fails when rule_cards entry missing `implLevel`.
