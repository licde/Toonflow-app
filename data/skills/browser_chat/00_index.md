---
name: browser_chat_index
description: Browser Chat 多文件套件 TOC · 对齐编排 §6 bundle 分区
version: "2.1.0"
rulePackVersion: "2.1.0"
---

# Browser Chat 套件索引（00_index）

`data/skills/browser_chat/` 多文件套件目录。对齐 `browser_flow_orchestration.md` **§6 双轨映射** 与 **§7 ScriptBundle 契约**。

## 版本

| 项 | 值 |
|----|-----|
| 套件版本 | v2.0.1 |
| rulePackVersion | `2.1.0` |
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

## Chat 多轮会话协议（narrativeBrief 持久）

1. **每轮 export 片段**须含当前完整 `planData.narrativeBrief`（累积，禁止只输出增量丢失字段）
2. **@引用**：用户 `@narrativeBrief` / `@sceneMeta` 时须展开对应 JSON 摘要后再写剧本
3. **阶段边界**：改编路径 P0→P03 须保留 `recommendedMatrixDraft[]`；P03 确认后 `userConfirmed: true`
4. **自检回流**：export 前对照 `modality_closure_checklist` + `closureReport` 模板（missing/optimize）自修
5. **契约对齐**：`adaptationMatrixStructured` 与 API `confirmMatrixChoices` Zod 同构
6. **设计拆分闭环（v2.1 design-gate）**：决策树见 `W3_script` / `corridor_SB`；Confirm=`designSplitOps`；残句=`nar14_residual`（重设计∪导入B）；反推修好后必须 `forwardReentry`；深链见 chatRepairText
6b. **换公式**：`DEX-LITERARY-STALE` → 按新规范重设计（或 `acknowledgeKeepLegacy`）；Chat 写权威，导入只补充
7. **静帧 Identity 闭环**：casting 裸名权威 + multiFace 谓词 + egress 同谓词首帧闸；DEX-STILL-* 设计强契约 BLOCK（导入 demote）；含 **CU×cast** `still_cu_cast`；反推 `still_firstframe_*` / `still_onebeat_multi` / `img_still_weak` 同源；禁只 regen；Chat/Exit/IRD/Compose 同核
8. **QP-02 可拍描写闭环**：设计 DEX-QP-02 ≡ export QP-02；CHAT-SB 同核；导入仅溯源补写；深链 SB；minChars 为防空壳底线
8b. **文学结构槽 / 道具连续**：DEX-LIT-*（含 CONTACT-XOR）/ DEX-PROP-CONT 设计强契约；IRD `confirm_enhance` / `hand_edit_vd` / `confirm_split`；增强白名单 Confirm/autoMin+复检（flag）；导入结构软填+demote（`importOk≠designExitPass`）
8c. **视频设计 IRD（VIRD）**：DEX-VID-*（伪台词/voice/beatDuration/Motion 动词/intent map/运镜调解）；`videoIntentOps` Confirm；烧片 soleAuthor+scrub 同源；导入/touch `softHealVideoHomology` until-clear；`designExitPass≠videoPromptReady`；SVQ 未测 → `human_review`（skip≠pass）
9. **冻结**：禁止静默发明 splitHint/reactionAction；B 须真实反应镜才绑 hint；静帧禁只 regen 假闭环；禁发明 visualDescription 占位
10. **DEX-CAM-FIT 硬约束**：plan 可写 reactionAction（NAR-15）；shots **禁止**单镜口播+反应；须已拆说话镜+反应镜；服务器愈仅兜底，Chat 下次仍须权威形；禁假绿

## §7 ScriptBundle 字段对照

| 字段 | 产出 Skill |
|------|------------|
| script | W3_script |
| planData.narrativeBrief | P0/P03/P06/G/W1/W2/W3 累积 |
| planData.sceneMeta | W3_script sidecar |
| planData | P*/G/W* |
| preDesignPack | corridor_GB + corridor_SB（**Bundle 根**，禁仅 planData 内） |
| characterDesign | CD（**Bundle 根**） |
| designBrief | design_brief（**Bundle 根**） |
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
## 导入与修复操作指南

| 文档 | 用途 |
|------|------|
| `preview_vs_import_guide.md` | 预览更新 vs 落库、Chat 修复后再验证、DC-16 配角入册 |
| `closure_field_change_guide.md` | 字段闭环变更范围说明 |
| `design_compliance_gate.md` | T3 设计合规闸（exportGate 强制调用） |
| `T3_quality_gate.md` | T3 出口硬闸 + DC-16/RH + **静帧→视频质量闭环**（CAST/EMPTY/EXPR/CREF/NO-LIP/SFX/mouth） |
| `stages/W3_narrative_selfcheck.md` | W3 叙事自检（NAR-14/15 服务器重验） |
| `production/CD_character_design.md` | CD L0–L6；DC-16 最小骨架 code+name+L0.identity |
| `docs/image-quality-chain.md` | A→B→C 三层闭环（设计/定妆/生成） |
| `docs/quality-loop/README.md` | exportGate / stub≠PASS / soft_patch 边界 |
| `data/fixtures/still_video_quality_doctrine.json` | 静帧→视频质量 doctrine（DEX stages + failDimTriggers） |
| `data/fixtures/reverse_route_table.json` | 反推 trigger→舞台（含 asset_cref / no_lip_dialogue / sfx_unbacked） |
| `data/fixtures/repair_hint_catalog.json` | RH chatTemplate + 深链 |

- `data/fixtures/debut_intro_templates.json`
- `data/fixtures/rule_flow_unified.json`
- `data/skills/_generated/rule_cards.json`
- `data/fixtures/unified_closure_matrix.json`
- `data/fixtures/design_closure_checklist.json`
- `data/skills/_generated/fix_templates.json`
