# closure-selfheal

> **PACKAGE_ID:** `closure-selfheal`  
> **HOST:** Toonflow-app  
> **用途:** 导入假绿防护自动化测试 + SelfHeal 自愈 / FE 自集成实施说明  
> **移植:** 可整夹拷贝本目录；命令与路径表见下文，落地代码仍在宿主仓库。

本包不替代通用规则引擎 UI 指南，只覆盖「导入资产质量闭环」与「可自修复编排」两条线。

**金样要点（43ce74）：** 无 `L6.stateVariants` 时 `derivatives=0` 为诚实零，不可点修伪造；SelfHeal 仅暴露 `skipped.derivatives`。FE `ruleEngine.ts` 必须单次解包（见 [02](./02-selfheal-integration.md)「FE 解包陷阱」）。

## 目录

| 文件 | 读谁 | 内容 |
|------|------|------|
| [README.md](./README.md) | 所有人 | 包标识、依赖、快速命令 |
| [01-import-automation-tests.md](./01-import-automation-tests.md) | QA / 写金样 | 假绿定义、yarn 命令、断言表、加测规则 |
| [02-selfheal-integration.md](./02-selfheal-integration.md) | 后端 / FE | SelfHeal API、StillRunner、自动 heal、integrate |

## Portable 标识

```text
PACKAGE_ID:        closure-selfheal
HOST_REPO:         Toonflow-app
SCRIPT_PREFIXES:   test:import-* | test:self-heal-* | test:asset-* | test:identity-* | test:polish-* | test:batch-video-* | test:agnes-*
SUITE_GATE:        yarn test:closure-suite
FE_INTEGRATE:      RUN_WEB_INTEGRATE=1 yarn build:integrate
API_SELF_HEAL:     POST /api/ruleEngine/selfHeal
```

## 宿主依赖（相对仓库根）

| 类别 | 路径 |
|------|------|
| 金样 | `data/fixtures/golden/`（如 `deepseek-20260716-43ce74.json`） |
| 反推表 | `data/fixtures/reverse_route_table.json` |
| 导入核 | `src/ruleEngine/bundle/normalizePreDesignPack.ts`、`assetSeedFromBundle.ts`、`assetClosureGate.ts`、`importAdapter.ts` |
| 自愈核 | `src/ruleEngine/design/selfHealOrchestrator.ts`、`patchApplicator.ts`、`assetStillRunner.ts`、`rePushRunner.ts` |
| 身份闸 | `src/ruleEngine/compilers/identityAssetGate.ts` |
| 厂商能力 | `src/ruleEngine/compilers/vendorCapabilityMap.ts`、`data/vendor/agnesai.ts` |
| 测试脚本 | `scripts/test-import-*.ts`、`scripts/test-self-heal-orchestrator.ts`、… |
| FE 源（sibling） | `../Toonflow-web`（相对 `new/Toonflow-app` 为 `../../Toonflow-web`；常用绝对：`I:/toonflow/Toonflow-web`） |
| 伺服 FE | `data/web`（真源；`build:integrate` 写入） |

## 快速命令

```bash
# 导入资产质量（无 DB）
yarn test:import-asset-quality
yarn test:import-fidelity-normalize

# 自愈编排
yarn test:self-heal-orchestrator
yarn test:asset-still-runner

# FE 合同 + 集成进 data/web
yarn test:fe-integration-contract
RUN_WEB_INTEGRATE=1 yarn build:integrate

# 总闸（含本包相关测项）
yarn test:closure-suite
```

## 与其它文档的关系

- UI 入门 / 登录 / 导入 JSON 操作：见仓库 `docs/RULE_ENGINE_TEST_GUIDE.md`（仅一行指针回本包）  
- 改字段 SSOT 口诀：见 `data/skills/browser_chat/closure_field_change_guide.md`  
- Portable inspect CLI：见 `docs/PORTABLE_QUICKSTART.md`（本包不重复）
