---
name: browser_flow_orchestration
description: Browser Chat v2.0.1 主编排 · 默认 T3 全链路
version: "2.0.1"
rulePackVersion: "2.0.1"
mode: external
---

# Browser Chat 全流程编排 v2.0.1

## §0 红线 · 三层边界

**CAN**：分阶段对话；P/W/designBrief/GB/SB/CD/AS/BP/EN/MD×4；输出 JSON；对照 PROMPT_STANDARD 自检。

**CANNOT**：调用 Toonflow API/Socket；声称已 import/生图；跳过 GB→SB→CD→BP；自造 ruleId；填假 ruleAudit/linkageAudit/hash pass。

| 层 | 职责 |
|----|------|
| L1 Chat | 按技能生成正确 prompt 与资产包 |
| L2 外部校验 | export 后 `inspectBundle` 验收（不挡 import） |
| L3 Import | 原样落库 |

## §1 默认路径（T3 一气呵成）

| 档位 | 必经 | 出口 |
|------|------|------|
| **T3（默认）** | P?→G→W→designBrief→GB→SB→CD→AS→BP→EN→MD×4 | ScriptBundle 全量（含四模态 prompt） |
| T1 | 同上至 SB | 仅策划/分镜（不推荐单独出口） |
| T2 | T1+CD→AS→BP→EN | 含资产，无四模态 |

## §2 双路径

- **改编**：P0→P03→P06→P08→P09→G→W1→W2→W3→…
- **原创**：G→W1→W2→W3→…（跳过 P）

## §3 阶段闸门（摘要）

| 阶段 | 出口 | 未过 |
|------|------|------|
| P0–P09 | planData.* | 不得进 W |
| G | globalAnchors | 不得进 W |
| W1–W3 | script | 不得 GB |
| designBrief | B1–B13 | 不得 GB |
| GB | scriptPlan | 不得 SB |
| SB | shots 台词全覆盖 + visualDescription | 不得 CD |
| CD/AS/BP | 资产锚点 | 不得 EN |
| EN | generation 编译字段 | 不得 MD |
| MD×4 | 四模态 prompt | 不得 export |
| T3_quality_gate | 对照 PROMPT_STANDARD | 修订后 export |

## §4 G 层锚点模板

写入 `planData.globalAnchors`：G1 角色灵魂 / G2 世界观 / G3 调性 / G4 道具 / G5 关系。

## §5 设计→提示词质量走廊

W3 → designBrief → GB → SB → CD → AS → BP → EN → MD×4。详见 `browser_chat/corridor/` 与 `docs/PROMPT_STANDARD.md`。

## §6 V5 内部 vs Browser Chat

| stageId | V5 内部 | Browser Chat |
|---------|---------|--------------|
| P/W | scriptAgent | stages/P*, W* |
| GB/SB | productionAgent | corridor_GB/SB |
| CD/BP/MD | RuleEngine+Touch | production/* + T3_quality_gate |
| 验收 | dryRun | 外部 inspectBundle |

## §7 ScriptBundle 契约（T3 全量）

必填：`script`, `meta`, `planData`, `designBrief`, `preDesignPack`, `rulePackVersion: "2.0.1"`  
T2+：`characterDesign`, `assetPipeline`, `visualLockTable`  
T3：每镜 `generation` 或 `flowData.storyboard[]`  
可选：`modalityPromptAudit`, `debutIntroPack`（**禁止**假 pass 审计字段）

## §8 导入说明

export JSON → 可选 `inspectBundle` 验收 → `POST importScript` **落库不验证** → 制作页生成。

## §9 正推/反推

检测 fail → `rePushPlan[]` → 修订对应 stage → 重检（maxRounds=3）。

## 引用套件

- `docs/PROMPT_STANDARD.md` — 生成与验收标准
- `docs/CHAT_FULL_PIPELINE_SPEC.md` — 全链路规范
- `browser_chat/T3_quality_gate.md` — T3 出口清单
- `browser_chat/production/` — T2/T3 制作 skill
- `browser_chat/corridor/` — 质量走廊
