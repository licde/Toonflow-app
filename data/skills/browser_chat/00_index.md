---
name: browser_chat_index
description: Browser Chat 多文件套件 TOC · 对齐编排 §6 bundle 分区
version: "2.0.1"
rulePackVersion: "2.0.1"
---

# Browser Chat 套件索引（00_index）

`data/skills/browser_chat/` 多文件套件目录。对齐 `browser_flow_orchestration.md` **§6 双轨映射** 与 **§7 ScriptBundle 契约**。

## 版本

| 项 | 值 |
|----|-----|
| 套件版本 | v2.0.1 |
| rulePackVersion | `2.0.1` |
| 主编排 | `../browser_flow_orchestration.md` |
| 合流点 | import → validate（INT 权威） |

## §6 双轨 stage 映射

| stageId | V5 内部 | Browser Chat Skill |
|---------|---------|-------------------|
| P0–P09 | scriptAgent | `stages/P0_precheck.md` … `P09_reinforce.md` |
| G | o_projectBlueprint | `stages/G_anchors.md` |
| W1–W3 | scriptAgent | `stages/W1_skeleton.md` … `W3_script.md` |
| B | designBrief | `stages/design_brief.md` |
| GB/SB | productionAgent | `corridor/corridor_GB.md`, `corridor_SB.md` |
| EN | RuleEngine | `corridor/corridor_EN.md` |
| CD/AS/BP | extract+blueprint | `production/CD_*.md`, `AS_*.md`, `BP_*.md` |
| MD | Touch | `production/MD_*.md` |
| SD-S | supervision | `supervision_review.md` |
| SF | autoFix | `stages/smart_fix.md` |
| T1 | importScript | `T1_quality_gate.md` |
| RP | rePush | `corridor/corridor_repush.md` |

## 改编路径（双路径之一）

```
P0 → P03 → P06 → P08 → [P09] → G → W1 → W2 → W3
```

## 原创路径

```
G → W1 → W2 → W3
```

## 设计走廊（T1 必经）

```
W3 → design_brief → corridor_GB → corridor_SB → T1_quality_gate
```

## T2/T3 扩展

```
T1 → CD → AS → BP → corridor_EN → [MD×4] → 生成
```

## 制作审计（§14 闭环 · G56–G72）

| Skill | 用途 |
|-------|------|
| production_identity_audit | 跨模态 IMG/VID/AUD（G56/G65） |
| production_fx_feasibility | F0–F5 特效可实现性（G57/G70） |
| production_debut_intro | 首次出场 establishing（G61/G62） |
| production_reasonableness_PR | PR-01–PR-16 分镜合理性（G59/G66–G69） |
| linkage_continuity | 六链 + continuity 写回 |
| appendix/O_production_closure | §6 总览 + §14.11 + dryRun（G71） |
| appendix/P_modality_touch_four | §15 四模态触达 Base+Agnes（G73–G85） |

## §15 四模态（T3）

| Skill | 模态 |
|-------|------|
| MD_modality_IMG | 图片 cref/identity |
| MD_modality_VID | 视频 singleImage + nativeAudio |
| MD_modality_AUD | 音频 native/TTS |
| MD_modality_FX | 特效 F matrix |
| smart_detection_modality | SD-IMG/VID/AUD/FX |

## §16 设计七维（T1）

| Skill | 维度 |
|-------|------|
| design_dialogue | 台词 R2/H3 |
| design_scene | 场景 B6/sceneName |
| design_story_push | 故事 B5/markers |
| design_camera_transition | 运镜 PR-CAM-01 |
| design_av | 视听 B4/emotion |
| design_brief B12/B13 | 节奏区/空间锚 |

## §17 统一闭环

| 文档 | 用途 |
|------|------|
| appendix/T_unified_closure | DC+PC+GC+IC 四级 dryRun |
| appendix/V_intelligent_repair | QP/W93 智能修复 |
| appendix/W_multiterm_closure | EXT/INT/V5/FE 多端 |

Fixtures：`unified_closure_matrix.json`、`design_closure_checklist.json`、`multi_end_closure_matrix.json`

## §7 ScriptBundle 字段对照

| 字段 | 产出 Skill |
|------|------------|
| script | W3_script |
| planData | P*/G/W* |
| designBrief | design_brief |
| preDesignPack | corridor_GB + corridor_SB |
| linkageAudit | linkage_continuity |
| fixPlan | smart_fix |
| rePushPlan | corridor_repush |
| visualLockTable | BP_blueprint |
| modalityAudit | MD_modality_overview |
| identityAudit / fxFeasibilityAudit / narrativeCausalityGraph / debutIntroPack / productionReasonableness | §14 制作闭环 |
| forwardTrace | forwardTrace.ts / import enrich |
| smartDesignProposals | W93 智能提案（IC-02） |

## 四支柱挂载

每阶段：**SPEC**（规范 BLOCK）· **LINK**（linkage_continuity）· **SD**（supervision_review）· **SF**（smart_fix）

## 引用 fixtures

- `data/fixtures/linkage_chains.json`
- `data/fixtures/fx_feasibility_matrix.json`
- `data/fixtures/debut_intro_templates.json`
- `data/fixtures/rule_flow_unified.json`
- `data/skills/_generated/rule_cards.json`
- `data/fixtures/unified_closure_matrix.json`
- `data/fixtures/design_closure_checklist.json`
- `data/skills/_generated/fix_templates.json`
