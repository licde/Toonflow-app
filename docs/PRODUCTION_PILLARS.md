# Production Pillars — 制片三柱纪律（SSOT）

行业规范落地入口。改身份 / 时长 / 表情 / 成片记分前先读本文。

## 三柱

| 柱 | 行业纪律 | 仓库 SSOT |
|----|----------|-----------|
| **Identity** | Casting sheet + 定妆参考 | `characterDesign.assets` + `charCodes` + `--cref CHAR-*`；描写禁止造名 |
| **Duration** | Audio-ready：镜长 ≥ 口型预算 | `duration_norms.json` ↔ `resolveRequiredDuration` + NAR-14；`meta.pillarsDurationV2` 迁移开关 |
| **Expression** | 表演与身份分离 | `shotDesign.performance.microExpression` + `lipSyncPolicy`；禁止合成万能嘴型 |
| **Umbrella** | 成片质量记分 | `short_video_quality_scorecard` → 烧片 `scoreShortVideo`（≠ 设计时 `adaptScorecard`） |

## 铁律

1. **有正式源才进 prompt**（CD / lip 预算 / performance 字段）
2. **描写只匹配，不发明**（禁止 NER 造角色）
3. **双闸**：`designExitGate`（设计）≠ `exportGate` / LIP-01 / scorecard（成片）
4. **双轨**：must-edit vs auto-adapt（见 `semantic_gate_dual_track_matrix.json`）
5. **金标矩阵**：每柱对等用例，禁止只修个案

## 柱归属（闸）

| 柱 | 设计闸 | 成片闸 | Auto-adapt 例 | Must-edit 例 |
|----|--------|--------|---------------|--------------|
| Identity | DEX-CAST-CODES, DC-16 | IMG-CREF-CHAR | OS speaker 归一 | 缺 CD / 假名无法映射 |
| Duration | NAR-14/15, DEX-LIP-SPLIT | LIP-01 | 物理分句、silent raise | 无标点超长、缺 reaction |
| Expression | GEN-01 | stillMouthVideoHandoff | emotionNorm 默认带出 | 高强度 speak 缺 performance |

## 禁止清单

- 从 `visualDescription` regex 发明角色名（如「沈清漪咬帕」→「沈清漪咬」）
- `NAME:` 无 CHAR code 当作第二张脸硬拦却不给 RH-DC-16
- 用 `referenceUrlCount>=2`（角色+场景 URL）写「严格锁定多参考身份」——场景 URL 不是第二张脸
- 通用「嘴部自然微张」覆盖已有 `mouthDetail` / 描写嘴部动作
- 设计 `adaptScorecard` 与成片 `scoreShortVideo` 混用假绿
- 脏静照静默作为视频首帧（须可反推重出静照）

## 迁移

- `meta.pillarsDurationV2: true` 或新包默认启用 `duration_norms` cps=4.5；历史包未开旗保持旧 speechSpeed=4，避免全量抬时长。

## FE / Agent

- 出站：`POST` designExitGate / `setStepStatus` 已返回 `designExitGate`
- 反推：`reverse_route_table.json` trigger → RH 模板 → Chat 站

## 相关代码

- Identity: `castingSheet.ts`, `stillIdentityCoverage.ts`, `hydrateComposeStillContext.ts`
- Identity 配方子 SSOT: `still_recipe_policy.json` ↔ `stillRecipePolicy.ts`（`pickIdentityLockLines` / `healStillRecipePolicy`）；多参考文案**仅**按 `CHAR-*` 数，禁止用 `referenceUrlCount`；扩规则改 JSON 的 `egressForbiddenPatterns`，compose 与 `stillPromptPipeline` 双挂自愈，`reason.recipeHeals` 可反推
- VisBeat 拍点 SSOT: `visual_beat_vocab.json` ↔ `visualBeatPolicy.ts`（L0 tags×景别矩阵）；Suggestor 只提案；`pillarsVisBeatV2`: off|shadow|enforce；DEX-VIS-* 见 design_exit_checklist
- VisBeat 闭环: `expanderRegistry`（weapon→visual→cluster）+ `/api/scriptAgent/visBeatOps` + `test:visual-beat-loop`；FE 契约见 `docs/toonflow-web/VISBEAT_OPS_CONTRACT.md`
- VisBeat RH/晋升: `docs/VISBEAT_RH_AND_PROMOTE.md`；CI `yarn test:visual-beat`
- Duration: `duration_norms.json`, `resolveRequiredDuration.ts`, `dialogueMetrics.ts`
- Expression: `emotionNorm.ts`, `composeStillPrompt.ts`, `videoNativeCompiler.ts`, `stillMouthVideoHandoff.ts`
- Scorecard: `shortVideoQuality.ts`
