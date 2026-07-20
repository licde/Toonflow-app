# precheck-loop

> **PACKAGE_ID:** `precheck-loop`  
> **HOST:** Toonflow-app  
> **用途:** 预检 Diagnose → Route → Repair → Verify 可移植闭环；DC-01 为首个 Adapter  
> **移植:** 可整夹拷贝 `src/ruleEngine/precheckLoop/` + 本目录 + 相关 fixtures；Host Port 重接即可

## Portable 标识

```text
PACKAGE_ID:      precheck-loop
HOST_REPO:       Toonflow-app
CORE_PATH:       src/ruleEngine/precheckLoop/
DOCS_PATH:       docs/precheck-loop/
SUITE_GATE:      yarn test:precheck-loop
DIAG_CLI:        yarn precheck:diag -- --fixture golden/dialogue-break-block.json
API:             POST /api/ruleEngine/precheckLoop
OBS:             optional ObservabilityPort（src/ruleEngine/host/obsPrecheckPort.ts）
```

## Core / Host 边界

| 层 | 路径 | 依赖 |
|----|------|------|
| Core | `src/ruleEngine/precheckLoop/` | ScriptBundle 形状、fixtures；**无** Express/Knex/`@obs/*` |
| Host HTTP | `src/routes/ruleEngine/precheckLoop.ts` | DB apply、obs port |
| Host Obs | `src/ruleEngine/host/obsPrecheckPort.ts` | 可关；`PRECHECK_OBS=1` 打日志 |
| Policy SSOT | `data/fixtures/precheck_repair_decision.json` | soft_patch / human |
| Registry | `data/fixtures/closure_detection_registry.json` | DC-01.`repairHintId`=RH-QP-03 |

## 闭环

```text
diagnose(Adapter) → decide(policy fixture) → soft_patch|suggest|human → verify(re-diagnose) → exhaust?
```

## 快速命令

```bash
yarn test:precheck-loop
yarn precheck:diag -- --fixture golden/dialogue-break-block.json
yarn precheck:diag -- --fixture golden/dialogue-break-block.json --apply
```

## 文档

| 文件 | 读者 |
|------|------|
| [01-adapter-cookbook.md](./01-adapter-cookbook.md) | 加新 check |
| [02-golden-contract.md](./02-golden-contract.md) | QA / CI |

## 宿主依赖

| 类别 | 路径 |
|------|------|
| 覆盖率 SSOT | `src/ruleEngine/design/dialogueCoverage.ts` |
| DryRun 接入 | `src/ruleEngine/bundle/designClosureDryRun.ts` |
| 预检接入 | `src/ruleEngine/detection/preflightProduction.ts` |
| RH 文案 | `data/fixtures/repair_hint_catalog.json` |
| 金样 | `data/fixtures/golden/dialogue-break-block.json`、`precheck-loop-dc01-heal.json` |
