---
name: preview_vs_import_guide
description: 预览更新 vs 落库 · Chat 修复操作说明（设计硬闸双路径）
version: "2.0.1"
---

# 预览 vs 落库 · Chat 修复操作说明

## 核心原则

> **设计硬闸优先**：exportGate 是服务端权威。Chat 修复的目标是「改正 JSON 字段」，而非「修改 ruleAudit 自报」。

### 修复后再验证（必做）

1. 复制 `chatRepairText`（含 RH-DC-16 等）→ 按项改正 JSON  
2. **必须再点「预览更新」/ 再调 exportGate**，直到 `exportAllowed === true`  
3. **import stub ≠ PASS**：`ensureCdSpeakerStubs` 打出的 `L0.stub` 仍会被 DC-16 BLOCK，须补真实 `L0.identity`

| 常见 BLOCK | 修复 |
|------------|------|
| DC-16 / DG-CD-COVERAGE | 说话人/上镜码入 CD：code+name+L0.identity |
| DG-SCENE-KEY | sceneColorLock 中文 key → SCENE-* |
| DG-FALSE-GREEN-FX | 空 FX 声明 F0 或写真实 fxPrompt |

## 三层 ingest 闭环（Salvage → Schema → Normalize → Gate）

| 层级 | 时机 | 职责 |
|------|------|------|
| **L1 Shape** | Zod 前 | object→string 等已知形态 salvage；`shapeSalvageLog` 可追溯 |
| **L2 Normalize** | Zod 后 | sceneCode、dialoguePlan 镜像、CD stub、FX/duration 对齐 |
| **L3 Gate** | 导入前 | `exportGate` 语义硬闸（NAR、linkage、modality 假绿） |

`SCHEMA_SHAPE_BLOCK`（如 visualEffect object）时 API 返回 `repairHints` + `chatRepairText`，与 exportGate BLOCK 同一复制格式。

`chatRepairText` **分层**（语义双轨）：

| 层 | 含义 | 示例 |
|----|------|------|
| 【须手改 · Chat 契约】 | 导入不会编造 | NAR-15、**NAR-14 残句**、DC-16、SPEAKER-BARE、真缺 F0/散文 |
| 【导入将自动适配 · 可不手改】 | dryRun/落库会修 | DFW-DURATION、空 prompt 种子、中文 sceneKey、形态 salvage；NAR-14 仅 A 拆净或 **已 B 绑 hint** |
| 【二次修复】 | 改字段后再入编排 | `forwardReentry` / SB setStep heal；残句 fork 见 `nar14_residual` |

勿把整段 `chatRepairText` 粘在 JSON 前再导入——应只贴纯 JSON；服务器也会剥离清单前缀兜底。

---

## 一、双路径区分

| 操作 | 入口 | 写库？ | 权威来源 |
|------|------|--------|----------|
| **预览更新** | UI「预览更新」按钮 → `dryRunImport` | 否 | server `prepareBundleForInspect` + `runExportGate` |
| **导入落库** | UI「导入」按钮 → `importScriptBundle` | 是 | 同上 + `blockOnQualityGate=true`（T3 默认拦截） |

### 关键：两个路径使用同一个 `prepareBundleForInspect`

`dryRunImport` 与 `importScriptBundle` 均调用 `prepareBundleForInspect` 做规范化（中文 sceneCode→SCENE-*、说话人 hash、preDesignPack normalize），因此**预览看到的错误与落库实际行为一致**。

---

## 二、Chat 修复操作步骤

```
┌─────────────────────────────────────────────────┐
│  1. 点「预览更新」→ 查看 RulePanel（红色 BLOCK）  │
│  2. 点「复制全部修复话术」→ 粘贴到 Chat           │
│  3. Chat 修改 JSON 字段（不得只改 ruleAudit）     │
│  4. @更新后的 JSON → 再点「预览更新」             │
│  5. RulePanel 全绿 → 点「导入」落库               │
└─────────────────────────────────────────────────┘
```

### 禁止行为

- ❌ 直接把 `ruleAudit.passed = true` / `narrativeSelfcheck.passed = true` 写进 JSON
- ❌ 跳过预览直接导入（T3 会被 `blockOnQualityGate` 拦截）
- ❌ 修改 `linkageAudit.status = "passed"` 而不修正实际 chain 字段

---

## 三、常见 BLOCK 与修复定向

| BLOCK ID | 含义 | 修复方向 |
|----------|------|----------|
| `DG-SCENE-KEY` | 中文 sceneCode（如「祠堂」） | 改为 `SCENE-001` 格式英文编码 |
| `DG-NAR-SELFCHECK` | narrativeSelfcheck 自报 passed 但服务器重算不一致 | 修正 NAR-14/15 对应字段值，重新走 W3 |
| `DG-LINKAGE-FALSE-GREEN` | linkageAudit 自报 passed 但 chain 字段缺失 | 补全 `linkageChain` / `emotionArc` 字段 |
| `DG-CD-COVERAGE` | characterDesign 说话人缺失 | 在 `characterDesign.assets` 补充对应角色 |
| `DG-MODALITY-MISMATCH` | modality 自报不一致 | 修正 `modality` 字段或重跑 modality closure |
| `SCHEMA_SHAPE_BLOCK` | Zod 形态错误（如 visualEffect object / B12.beats 叙事串） | 改为 canonical；查看 `shapeSalvageLog` / `shapeSalvageSummary`；失败时 `repairHints` 含 RH-B12-BEATS / RH-SPATIAL-OBJ |
| `LIP-01` | preDesignPack shot 缺 lipSync 字段 | 补充 `generation.lipSync` 或确认无台词场景 |

---

## 四、assetDiagnostics 说明（落库后 Toast）

导入成功后 Toast 显示：

```
✓ 资产链接：新增 N 条，复用 M 条，清理过期 P 条
```

若出现 `ASSET_CLOSURE_BLOCK` 错误，修复话术已在错误详情中提供，可直接复制到 Chat。

---

## 五、exportGate vs inspectBundle 区别

| API | 用途 | 是否规范化 |
|-----|------|------------|
| `POST /api/ruleEngine/exportGate` | T3 出口硬闸，聚合 designPhaseGates + integrityAudit + closure | 是（prepareBundleForInspect） |
| `POST /api/ruleEngine/inspectBundle` | 通用 closure 检查（T1/T2/T3） | 否（依赖调用方传标准化 bundle） |

**结论**：Chat 流程中应优先调用 `exportGate`，它是服务器权威，`inspectBundle` 为辅助诊断工具。
