# Browser Chat 设计流程指南 v2.0.1

## 概述

Browser Chat 外部执行轨与内部 RuleEngine **同 ruleId、同 schema、import 合流**。

| 文档 | 读者 | 路径 |
|------|------|------|
| LLM bundle | AI | `data/skills/browser_full_flow.bundle.md` |
| **分步教程** | 人类 | [`docs/BROWSER_CHAT_TUTORIAL.md`](./BROWSER_CHAT_TUTORIAL.md) |
| 多文件套件 | 开发 | `data/skills/browser_chat/` |

- 规则源：`主流程.txt` + `规则层.json` → `yarn extract:rule-checklists`

## 三档交付

| 档位 | 出口 | 禁止 |
|------|------|------|
| T1 | ScriptBundle + preDesignPack | image/video/audioPrompt |
| T2 | EpisodeBundle-lite + EN 草案 | — |
| T3 | EpisodeBundle-full + MD×4 | 跳过 modalityAudit |

## 质量走廊

W3 → designBrief → GB → SB → EN → MD。每阶段 SPEC/LINK/SD/SF。

## §15 四模态触达

IMG / VID / AUD / FX 平行闭环：BaseSpec + Agnes VendorPack（默认）→ Touch L0 → dryRun PC-09~14。

Fixtures：`modality_touch_matrix.json`、`video_audio_policy.json`、`agnes_vendor_gates.json`

## 导入

1. T1：`POST importScript` — 有 `preDesignPack.shots` 则 **skip autoDesign SB**
2. `dryRunImport` 运行 `production_closure_checklist.json` PC-01~14 + `design_closure_checklist.json` DC-01~15（G64/G71/G100）
3. validate → RulePanel

## 脚本

```bash
yarn extract:rule-checklists
yarn extract:rule-flow-unified
yarn audit:rule-application
yarn bundle:browser-full-flow
yarn test:bundle-roundtrip
yarn test:production-closure-golden   # G72–G85 四模态 golden
yarn test:unified-closure-golden      # G86–G115 七维统一闭环
yarn test:design-closure-golden       # DC-01~15
yarn test:forward-trace               # G86/G96 trace
yarn test:reverse-route               # PR-CAM-01 路由
yarn test:multiterm-closure           # EXT/INT/Agent/FE
```

## 设计七维统一闭环（§16–§17）

七维 + 四模态经 `unified_closure_matrix.json` 合流；import `dryRunImport` 输出 `closureChecks`（dc/pc/gc/ic）。

| 测试 | 覆盖 |
|------|------|
| `test:unified-closure-golden` | forwardTrace、DC、IC、PR-CAM-01、十链矩阵 |
| `test:production-closure-golden` | PC-01~14 + 四模态 golden + G82/G85 |
| import dryRun | G64/G71 与 Chat T3 共用 `productionClosureDryRun` |

## 迁移

`design_flow.bundle.md` v1.1 已 redirect 至 `browser_full_flow.bundle.md`。
