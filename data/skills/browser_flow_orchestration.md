---
name: browser_flow_orchestration
description: Browser Chat v2.0.1 主编排 · 双路径+三档+质量走廊+统一闭环
version: "2.0.1"
rulePackVersion: "2.0.1"
mode: external
---

# Browser Chat 全流程编排 v2.0.1

## §0 红线 · 三层边界

**CAN**：分阶段对话；P/W/designBrief/GB/SB；T2/T3 分镜与 prompt；输出 JSON；L2 ruleAudit 自检。

**CANNOT**：调用 Toonflow API/Socket；声称已 import/validate/生图；T1 输出 image/video/audioPrompt；跳过 BLOCK；跳过 GB→SB；自造 ruleId。

| 层 | 职责 |
|----|------|
| L1 Runner | 对话产品，Skill 不变 |
| L2 Skill | 标准唯一，rule_cards 对齐 |
| L3 validate | import 后 RuleEngine 权威 |

## §1 三档路径

| 档位 | 必经 | 出口 | 内部 |
|------|------|------|------|
| **T1** | P?→G→W→designBrief→**GB→SB** | ScriptBundle+preDesignPack | importScript；有 shots 则 skip SB |
| **T2** | T1+CD→AS→BP→EN | EpisodeBundle-lite | importBundle |
| **T3** | T2+MD×4 | EpisodeBundle-full | importBundle→生成 |

## §2 双路径

- **改编**：P0→P03→P06→P08→P09→G→W1→W2→W3→…
- **原创**：G→W1→W2→W3→…（跳过 P）

## §3 阶段闸门（摘要）

| 阶段 | 出口 | BLOCK 未过 |
|------|------|------------|
| P0–P09 | planData.* | 不得进 W |
| G | globalAnchors | 不得进 W |
| W1–W3 | script | 不得 SD-S |
| SD-S | supervisionReport | C/D 不得下一阶段 |
| designBrief | 11 字段 | 不得 GB |
| GB | scriptPlan | 不得 SB |
| SB | shots[].dialogue.lines | 不得 SF 终检 |
| SF | fixPlan 修订 | 不得 output T1 |
| T1 | preDesignQuality≥B | — |

## §4 G 层锚点模板

写入 `planData.globalAnchors`：G1 角色灵魂 / G2 世界观 / G3 调性 / G4 道具 / G5 关系。

## §5 设计→提示词质量走廊

W3 → designBrief → GB → SB → EN → MD。每阶段挂载 SPEC/LINK/SD/SF。

详见 `browser_chat/corridor/` 与附录 K。

## §6 V5 内部 vs Browser Chat 双轨

| stageId | V5 内部 | Browser Chat |
|---------|---------|--------------|
| P/W | scriptAgent | stages/P*, W* |
| GB/SB | productionAgent | corridor_GB/SB |
| EN/MD | RuleEngine+Touch | T2/T3 production/* |
| validate | INT ~8→扩展 | EXT L2 + import 合流 |

共享：`rule_flow_unified.json`、`reverse_route_table.json`、`fix_templates.json`。

## §7 ScriptBundle 契约（T1）

必填：`script`, `meta`, `planData`, `designBrief`, `preDesignPack`, `ruleAudit`, `rulePackVersion: "2.0.1"`。

可选：`smartDetection`, `fixPlan`, `linkageAudit`, `rePushPlan`, `qualityDiagnostics`, `identityAudit`, `fxFeasibilityAudit`, `narrativeCausalityGraph`, `debutIntroPack`。

## §8 导入说明

T1 → `#/production?import=1` → POST importScript → validate → productionAgent。

T2/T3 → POST importBundle。

## §9 正推/反推

检测 fail → `rePushPlan[]` → reverseTarget stage → 修订 → 重检（maxRounds=3）。

## 引用套件

- `browser_chat/manifest.json` — 文件索引
- `browser_chat/stages/` — 分阶段 skill
- `browser_chat/production/` — T2/T3 制作 skill
- `browser_chat/corridor/` — 质量走廊
