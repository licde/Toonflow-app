---
name: production_external_revision
description: 外部完整 EpisodeBundle 高级模式（含 GB→SB→EN）
version: "1.0.0"
mode: external
---

# 外部设计改版（高级 EpisodeBundle）

默认外部流程只产 **ScriptBundle**。仅当用户明确要求「外部分镜已完成」时使用本 Skill。

## 阶段

GB 导演规划 → SB 分镜表 → EN 分镜面板（细则同 `design_flow.bundle.md` 三阶段自检清单）。

## 输出

完整 **EpisodeBundle JSON**（`flowData` + `package`），格式见 `data/fixtures/flow-data-template.json` + `episode-package-template.json`。

导入 API：`POST /api/ruleEngine/importBundle`
