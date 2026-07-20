---
name: browser_full_flow_bundle
description: Browser Chat v2.0.1 全流程单文件 bundle（yarn bundle:browser-full-flow 生成）
version: "2.0.1"
rulePackVersion: "2.0.1"
mode: external
generated: true
supersedes: design_flow.bundle.md v1.1
---

# Browser Chat 全流程 · 优化版 v2.0.1

> 生成时间：2026-07-20T15:44:01.928Z · rulePack 2.0.1 · tier T3 · 勿手改，改源 skill 后重跑 `yarn bundle:browser-full-flow`

## §0 用法·红线

# Browser Chat 全流程编排 v2.0.1

## §0 红线 · 三层边界

**CAN**：分阶段对话；P/W/designBrief/GB/SB/CD/AS/BP/EN/MD×4；输出 JSON；对照 PROMPT_STANDARD 自检。

**CANNOT**：调用 Toonflow API/Socket；声称已 import/生图；跳过 GB→SB→CD→BP；自造 ruleId；填假 ruleAudit/linkageAudit/hash pass。

| 层 | 职责 |
|----|------|
| L1 Chat | 按技能生成正确 prompt 与资产包 |
| L2 外部校验 | export 前 `exportGate` / `inspectBundle` 服务器验收 |
| L3 Import | 仅接收已过 export gate 的 bundle |

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
| W1–W2 | storySkeleton / adaptationStrategy | 不得 W3 |
| W3 | script + narrativeSelfcheck | 不得 designBrief |
| designBrief | B1–B23 | 不得 GB |
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

### planData.narrativeBrief（累积 handoff）

各阶段写入并传递，W3 步骤 0 强制读取：

- `adaptationConstraints[]` — P03 matrix choice + reason
- `deepAdaptation` — D01–D04 子对象
- `storyKernel` / `mustResolveIssues[]` — P06
- `reconstructionTrace[]` — P06→W3 可追溯链
- `empathyPlan` / `densityBudget` — P0/G/W2
- `retentionBeats` / `infoDeliveryPlan[]` / `dialogueRules`
- `implementationPlan[]` — W3→SB→EN→MD 正推锚点
- `seriesContinuity` — W1 ep2+ carryInfo

### planData.sceneMeta[]

W3 每场 sidecar：`avCausality`, `fxIntent`, `densityScore`, `opening5sHook`

### 闸门

W3 未过 `W3_narrative_selfcheck` → **禁止** designBrief / export。

## §8 导入说明

export JSON → **必须** `POST /api/ruleEngine/exportGate` 验收 → `POST importScript` 落库。  
T3 默认 `blockOnQualityGate=true`；若 `exportGate.exportAllowed !== true`，不得 import。

## §9 正推/反推

检测 fail → `rePushPlan[]` → 修订对应 stage → 重检（maxRounds=3）。

## 引用套件

- `docs/PROMPT_STANDARD.md` — 生成与验收标准
- `docs/CHAT_FULL_PIPELINE_SPEC.md` — 全链路规范
- `browser_chat/T3_quality_gate.md` — T3 出口清单
- `browser_chat/production/` — T2/T3 制作 skill
- `browser_chat/corridor/` — 质量走廊

---

## §1 输入契约

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

## Chat 多轮会话协议（narrativeBrief 持久）

1. **每轮 export 片段**须含当前完整 `planData.narrativeBrief`（累积，禁止只输出增量丢失字段）
2. **@引用**：用户 `@narrativeBrief` / `@sceneMeta` 时须展开对应 JSON 摘要后再写剧本
3. **阶段边界**：改编路径 P0→P03 须保留 `recommendedMatrixDraft[]`；P03 确认后 `userConfirmed: true`
4. **自检回流**：export 前对照 `modality_closure_checklist` + `closureReport` 模板（missing/optimize）自修
5. **契约对齐**：`adaptationMatrixStructured` 与 API `confirmMatrixChoices` Zod 同构

## §7 ScriptBundle 字段对照

| 字段 | 产出 Skill |
|------|------------|
| script | W3_script |
| planData.narrativeBrief | P0/P03/P06/G/W1/W2/W3 累积 |
| planData.sceneMeta | W3_script sidecar |
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
## 导入与修复操作指南

| 文档 | 用途 |
|------|------|
| `preview_vs_import_guide.md` | 预览更新 vs 落库、Chat 修复后再验证、DC-16 配角入册 |
| `closure_field_change_guide.md` | 字段闭环变更范围说明 |
| `design_compliance_gate.md` | T3 设计合规闸（exportGate 强制调用） |
| `T3_quality_gate.md` | T3 出口硬闸 + DC-16/RH-DC-16 |
| `stages/W3_narrative_selfcheck.md` | W3 叙事自检（NAR-14/15 服务器重验） |
| `production/CD_character_design.md` | CD L0–L6；DC-16 最小骨架 code+name+L0.identity |
| `docs/image-quality-chain.md` | A→B→C 三层闭环（设计/定妆/生成） |
| `docs/quality-loop/README.md` | exportGate / stub≠PASS / soft_patch 边界 |

- `data/fixtures/debut_intro_templates.json`
- `data/fixtures/rule_flow_unified.json`
- `data/skills/_generated/rule_cards.json`
- `data/fixtures/unified_closure_matrix.json`
- `data/fixtures/design_closure_checklist.json`
- `data/skills/_generated/fix_templates.json`

# §6 制作实现闭环总览

## 五问对照

| # | 关切 | 机制 | Skill |
|---|------|------|-------|
| Q1 | 设计男/图视音女不一致 | identityAudit 跨 IMG/VID/AUD BLOCK | production_identity_audit |
| Q2 | 特效→prompt→AI 无法实现 | fxFeasibilityAudit F0–F5 + degradeFixPlan | production_fx_feasibility |
| Q3 | 分镜不合理反推 | PR-01~16 + rePushPlan | production_reasonableness_PR |
| Q4 | 故事因果正反向 | narrativeCausalityGraph | linkage_continuity + W3 |
| Q5 | 首次出场标准 | debutIntroPack + establishing | production_debut_intro |

## 合流（轨3）

设计走廊 → import → production_closure_checklist dryRun → validate INT → QualityGate → 生成 → generationFeedback → rePushPlan

## 验收 G56–G65

| # | 验收 |
|---|------|
| G56 | identityAudit：design male 时 IMG/VID/AUD 无 female 冲突 |
| G57 | fxFeasibility F5 镜不得 T3 未降级 export |
| G58 | F2 特效输出 degradeFixPlan + 用户确认流 |
| G59 | PR-01~08 BLOCK 触发 rePushPlan（非仅 fixPlan） |
| G60 | narrativeCausalityGraph 无 broken 或均有 reverseHints |
| G61 | 每主角色/主场景有 debutIntroPack 条目 |
| G62 | 首次出场镜 shotSize 含 establishing 类 |
| G63 | generationFeedback identity_mismatch → EN/BP |
| G64 | 内外 identityAudit schema 一致（Chat T3 = import dryRun） |
| G65 | golden「男设计/女 prompt」反例必 BLOCK |

---

# §14.11 扩展验证域（PR-09~16）

| ID | 域 | rePush |
|----|-----|--------|
| PR-09 | 唇形/时长与 lip 词 | SB / EN-VID |
| PR-10 | 画外音 OS | SB / EN-AUD |
| PR-11 | 道具状态链 | SB / BP |
| PR-12 | 空间关系跨模态 | SB / EN |
| PR-13 | 同场时空/色温 | SB / brief |
| PR-14 | 表情可实现 QF-EXPR | SB / EN |
| PR-15 | Vendor FX F5 | EN / SB / W3 |
| PR-16 | SUB 与 no-subtitles 冲突 | EN-MD / SB |

## T3 dryRun 十四项（G71/G73–G85）

见 `data/fixtures/production_closure_checklist.json` — Chat export 与 import dryRun **共用**。

PC-01~08：§14 制作闭环（identity/fx/PR/graph/debut/modality/hash/linkage）  
PC-09~14：§15 四模态触达（VID/AUD/IMG/FX slot + 跨模态 identity）

**§17 统一闭环**：`unified_closure_matrix.json` 合流 DC+PC+GC+IC；见 `appendix/T_unified_closure.md` 与 `yarn test:unified-closure-golden`（G86–G115）。

1. identityAudit 全镜 PASS  
2. fxFeasibilityAudit 无未处理 F5  
3. productionReasonableness PR 无 BLOCK  
4. narrativeCausalityGraph broken 为空或有 reverseHints  
5. debutIntroPack 主角色/主场景齐全（WARN 可记录）  
6. modalityPromptAudit T3 slot 合规  
7. externalHashCheck.match + linkageAudit 无 broken 链  
8. **PC-09** VID 首帧/时长/运镜  
9. **PC-10** AUD native/voice  
10. **PC-11** IMG cref/identity  
11. **PC-12** FX F4/F5  
12. **PC-13** 四 slot 齐全  
13. **PC-14** 跨模态 identity  

## 验收 G66–G85

| # | 验收 |
|---|------|
| G66 | PR-09：长台词 duration 与 lip 一致 |
| G67 | PR-10：OS 镜 AUD profile 正确 |
| G68 | PR-11/12 道具与 spatial 跨模态一致 |
| G69 | PR-14：emotion≥6 + duration&lt;4s BLOCK |
| G70 | PR-15：vendor F5 不得 silent pass |
| G71 | dryRun PC-01~14 全 PASS 才允许 export |
| G72 | golden 反例 dryRun 均 BLOCK |
| G73–G85 | 四模态触达见 appendix/P_modality_touch_four.md |

---

## §2 改编路径 P

# P0 源材料预检

Browser Chat 改编路径**第一步**。本 Skill 包装 `adaptation_execution_precheck`，对小说/梗概做六维度评分，输出问题清单与改造方向。BLOCK 未过不得进入 P03。

## 入口条件

- 用户提供源材料（全文或章节范围）
- 改编路径已确认（非原创直跳 G）
- `rulePackVersion: "2.0.1"` 对齐 `rule_cards.json`

## 执行步骤

1. 通读源材料，标注情绪高点、反转节点、冲突维度
2. 按 P1–P6 六维度各打 1–10 分，附段落定位与量化依据
3. 汇总 P7 综合等级：优≥8 / 良≥6 / 中≥4 / 差<4
4. 输出问题清单 P-001 递增（类型/描述/改造建议）
5. 给出 **3 个**改编方向，每个对应 ≥2 个诊断问题
6. 预填 `adaptationProfile` 推荐；产出 `recommendedMatrixDraft[]`（读 `adaptation_recommendation_map.json`）；初始化 `planData.narrativeBrief.mustResolveIssues` + `empathyPlan` 草稿

## 六维度评分表

| 维度 | ruleId | 量化参考 |
|------|--------|----------|
| P1 情绪支撑度 | P1 | 情绪高点数、峰值间隔 |
| P2 反转密度 | P2 | 有效反转数 / 章节数 |
| P3 信息密度 | P3 | 核心信息释放节奏 |
| P4 冲突强度 | P4 | 不可调和冲突维度数 |
| P5 人物弧光 | P5 | 主角状态变化节点 |
| P6 台词质量 | P6 | 可拍摄对白比例 |

## 输出契约

写入 `planData.preCheck`：

```xml
<preCheck rulePackVersion="2.0.1">
  <dimensions>
    <dim id="P1" name="情绪支撑度" score="7" reason="..." />
  </dimensions>
  <qualityGrade>良</qualityGrade>
  <issues><issue id="P-001" type="情绪" desc="..." fix="..." /></issues>
  <directions><dir id="1" resolves="P-001,P-002">...</dir></directions>
</preCheck>
```

## BLOCK 闸门

| 项 | 条件 |
|----|------|
| 六维度 | 均有分且附理由 |
| P7 | 有综合等级 |
| 问题清单 | ≥1 条或明确「无重大问题」 |
| 改造方向 | 恰好 3 个，因果链完整 |

## ruleAudit

```json
{ "stage": "P0", "rulePackVersion": "2.0.1", "block": ["P1-P6", "P7", "P8-P12", "P13-P18"], "pass": true }
```

未通过 → 停留在 P0，不得调用 P03_matrix。

# P0.3 改编矩阵

基于 P0 预检与用户选定方向，填写 **12 维改编矩阵** 与诊断-方案映射。为 G 层锚点与 W 阶段预留字段。

## 入口条件

- `planData.preCheck` ruleAudit.pass = true
- 读取 `data/fixtures/adaptation_matrix_catalog.json` + 项目 `adaptationProfile.lockedChoices`
- **须** `userConfirmed: true`（API `confirmMatrixChoices`）后才可进 P06
- rulePackVersion `2.0.1`

## 12 维矩阵

| 维度 | 选项 | 须标注 |
|------|------|--------|
| 性别结构 | 保持/调整/对调/群像 | 解决的 P 问题 ID |
| 场景结构 | 线性/插叙/双线/浓缩 | 同上 |
| 人物锚点 | 内核/矛盾/金手指边界 | 同上 |
| 关系网络 | 三角/多角/对立/师徒 | 同上 |
| 情感逻辑 | 虐/甜/爽/混合 | 同上 |
| 冲突设计 | 人vs人/人vs己/人vs环境 | 同上 |
| 视觉风格 | art_skills 前缀 | 同上 |
| 叙事结构 | 三幕/四段/单元剧 | 同上 |
| 核心道具 | 保留/强化/替换 | 同上 |
| 台词策略 | 保真/口语化/压缩 | 同上 |
| 音乐氛围 | designBrief 预留 | 同上 |
| 节奏规划 | 快/中/慢+留白 | 同上 |

## 执行步骤

1. 读取 `preCheck.issues` 与 catalog + `adaptation_profiles.json`
2. 12 维 + D/V/R/C/DLG/O 系列全部 choice；深度维 choice≠keep 时填 `deepAdaptation.*`

### 出口形状族（Shape contract）

- **可选 string**：无内容必须**省略 key**；禁止输出 JSON `null`
- **`nameMap` / `relationMap` / `substitutions`**：仅允许 `[{ "from": "原", "to": "新" }]`；禁止 `"原→新"` 作 object key，禁止无冒号伪对象
- **`designBrief.B16`**：由 nameMap 编译的 `{ "原": "新" }` record 镜像

正例：

```json
"deepAdaptation": {
  "nameMap": [{ "from": "温如瓷", "to": "沈清瓷" }],
  "relationMap": [{ "from": "温家", "to": "沈家" }],
  "substitutions": [{ "from": "系统", "to": "天命书" }],
  "settingProfile": { "era": "架空大邺" }
}
```

3. 产出 **并列** `planData.adaptationMatrixStructured` + 累积 `planData.narrativeBrief.adaptationConstraints[]`
4. 从 P0 `recommendedMatrixDraft` 生成 `recommendedConfig`（摘要 + 机器可读 matrix 引用）
5. 等待用户确认 / `confirmMatrixChoices` 后 `userConfirmed: true`

## 输出

```xml
<adaptationMatrix rulePackVersion="2.0.1">
  <mapping>
    <link issue="P-001" dim="冲突设计" choice="B" reason="..." />
  </mapping>
  <matrix dim="性别结构" choice="B" resolves="P-002,P-005" reason="..." />
  <recommendedConfig>...</recommendedConfig>
</adaptationMatrix>
```

## BLOCK 闸门

- 12 维均有 choice + reason
- 映射表覆盖 preCheck 主要问题（≥80%）
- 每维 resolves 字段非空

## ruleAudit

stage `P03`；未通过不得进 P06_story_core。

# P0.6 故事核心

基于源材料 + 改编矩阵，构建**新叙事内核**与事件序列。W1 骨架须引用本产出。

## 入口条件

- `planData.adaptationMatrixStructured.userConfirmed` = true（P03 + confirmMatrixChoices）
- 源材料摘要可用

## 产出字段

| 字段 | 说明 | ruleId 关联 |
|------|------|-------------|
| narrativeKernel | 一句话故事核心 | W1 故事核 |
| characterAnchors | 角色/矛盾/初态/终态 | G1 预留 |
| relationships | 关系表或简述 | G5 预留 |
| eventSequence | 阶段/集数/事件/旧问题解决 | P0 问题闭环 |
| changeLog | 改动项/旧/新/原因 | P09 可追溯 |

## 执行步骤

1. 从 `adaptationMatrixStructured` + `adaptationProfile` 提取改编约束（含 deepAdaptation）
2. 写 narrativeKernel（≤50 字，含心理级爽点类型）
3. 立 characterAnchors，人物 ≤4（大三角原则）
4. 排 eventSequence ≥3 行，标注解决的 P-00x
5. 逐条记录 changeLog（必填 `matrixDim` + `densityImpact`）；写入 `narrativeBrief.reconstructionTrace[]` + `storyKernel` / `mustResolveIssues[]`

## 边界条件

- 新故事须解决 P0 中 ≥80% 识别问题
- 人物 ≤4，为 W1 人物小传奠基
- 金手指须有约束，非同质化（市面 >10 次须升级）

## 输出

```xml
<storyCore rulePackVersion="2.0.1">
  <narrativeKernel>...</narrativeKernel>
  <characterAnchors>...</characterAnchors>
  <relationships>...</relationships>
  <eventSequence>
    <event phase="铺垫" episode="1-3" desc="..." resolves="P-001" />
  </eventSequence>
  <changeLog>...</changeLog>
</storyCore>
```

## BLOCK 闸门

- narrativeKernel 非空
- eventSequence ≥3 行
- changeLog ≥1 条
- 问题解决率 ≥80%

## ruleAudit

stage `P06`；未通过不得进 P08_postcheck。

---
name: P08_postcheck
description: P0.8 改编后剧本后检与六维度再评分
stageId: P08
outputTag: postCheck
rulePackVersion: "2.0.1"
---

# P0.8 改编后检

对 P0.6 故事框架做**改编前后对比**与六维度再评分，决定进入加固或 W 阶段。

## 入口条件

- `planData.storyCore` 已完成
- `planData.preCheck` 作为旧评分基准

## 执行区块

| 区块 | 内容 |
|------|------|
| comparison | 旧问题 / 是否解决 / 说明 |
| dimensions | 维度 / 新分 / 旧分 / 变化 |
| residualIssues | 问题 / 描述 / 加固方向 |
| conclusion | 通过 / 需加固 / 需重新改编 |

## 再评分标准

沿用 P1–P6 六维度，对比 preCheck 基线：

- **通过**：六维度均 ≥5，且无未解决严重问题
- **需加固**：任一维度 <5 或残留问题可局部修复
- **需重新改编**：≥3 维度 <4 或核心矛盾未解决

## 执行步骤

1. 逐条对照 preCheck.issues 与 storyCore.eventSequence
2. 六维度再评分，记录 delta（新分 - 旧分）
3. 残留问题标注加固方向（指向 P09 或 W 阶段 ruleId）
4. 输出 conclusion

## 输出

```xml
<postCheck rulePackVersion="2.0.1">
  <comparison>...</comparison>
  <dimensions>
    <dim id="P1" old="6" new="7" delta="+1" />
  </dimensions>
  <residualIssues>...</residualIssues>
  <conclusion>通过|需加固|需重新改编</conclusion>
</postCheck>
```

## BLOCK 闸门

- 六维度均有新旧分
- conclusion 非空
- conclusion=通过 → 六维度均 ≥5
- conclusion=需加固 → 残留问题均有加固方向

## 路由

| conclusion | 下一 stage |
|------------|------------|
| 通过 | G_anchors |
| 需加固 | P09_reinforce |
| 需重新改编 | P03_matrix |

<!-- missing: browser_chat/stages/P09_reinforcement.md -->


{
  "version": "2.0.1",
  "baseDimensions": [
    { "dimId": "gender_structure", "name": "性别结构", "choices": ["keep", "adjust", "swap", "ensemble"], "group": "base" },
    { "dimId": "scene_structure", "name": "场景结构", "choices": ["linear", "flashback", "dual_line", "condense"], "group": "base" },
    { "dimId": "character_anchor", "name": "人物锚点", "choices": ["keep_core", "reshape", "merge", "split"], "group": "base" },
    { "dimId": "relation_network", "name": "关系网络", "choices": ["triangle", "multi", "opposition", "mentor"], "group": "base" },
    { "dimId": "emotion_logic", "name": "情感逻辑", "choices": ["angst", "sweet", "power", "blend"], "group": "base" },
    { "dimId": "conflict_design", "name": "冲突设计", "choices": ["pvp", "pvs", "pve", "layered"], "group": "base" },
    { "dimId": "visual_style", "name": "视觉风格", "choices": ["ancient_real", "modern_clean", "cinematic", "stylized"], "group": "base" },
    { "dimId": "narrative_structure", "name": "叙事结构", "choices": ["three_act", "four_beat", "episodic"], "group": "base" },
    { "dimId": "core_prop", "name": "核心道具", "choices": ["keep", "amplify", "replace"], "group": "base" },
    { "dimId": "dialogue_strategy", "name": "台词策略", "choices": ["faithful", "colloquial", "compress"], "group": "base" },
    { "dimId": "music_mood", "name": "音乐氛围", "choices": ["warm", "tense", "epic", "minimal"], "group": "base" },
    { "dimId": "rhythm_plan", "name": "节奏规划", "choices": ["fast", "medium", "slow_with_breath"], "group": "base" }
  ],
  "deepDimensions": [
    { "dimId": "D01_nameMap", "name": "姓名改编", "choices": ["keep", "modernize", "localize", "full_rename"], "structuredField": "deepAdaptation.nameMap", "group": "deep" },
    { "dimId": "D02_relationMap", "name": "关系改编", "choices": ["keep", "simplify", "invert", "expand"], "structuredField": "deepAdaptation.relationMap", "group": "deep" },
    { "dimId": "D03_substitutions", "name": "元素平替", "choices": ["keep", "partial", "full"], "structuredField": "deepAdaptation.substitutions", "group": "deep" },
    { "dimId": "D04_settingProfile", "name": "背景迁移", "choices": ["keep", "era_shift", "world_shift"], "structuredField": "deepAdaptation.settingProfile", "group": "deep" }
  ],
  "viralDimensions": [
    { "dimId": "V01_openingCard", "name": "开篇一卡", "choices": ["strict_3ep", "micro_compress", "standard"], "group": "viral" },
    { "dimId": "V02_clipDensity", "name": "30秒投流爆点", "choices": ["high", "medium", "profile"], "group": "viral" },
    { "dimId": "V03_paypointLayout", "name": "付费卡点", "choices": ["standard_5", "front_load", "custom"], "group": "viral" },
    { "dimId": "V04_episodeRhythm", "name": "单集节奏", "choices": ["strict_31545", "relaxed"], "group": "viral" },
    { "dimId": "V05_genreFramework", "name": "类型节奏", "choices": ["甜宠", "虐恋", "战神", "重生", "萌宝"], "group": "viral" },
    { "dimId": "V06_conflictLadder", "name": "矛盾阶梯", "choices": ["level_3", "level_4", "escalate_fast"], "group": "viral" }
  ],
  "retentionDimensions": [
    { "dimId": "R01_ep1_opening5s", "name": "第一集前5秒钩子", "choices": ["crisis", "identity_contrast", "emotion_hit", "combo"], "group": "retention" },
    { "dimId": "R02_ep1_first30s", "name": "第一集前30秒", "choices": ["audience_knows", "character_knows", "partial_both", "strict_31545"], "group": "retention" },
    { "dimId": "R03_ep1_endHook", "name": "第一集集末钩", "choices": ["prop", "emotion_rebound", "camera_mismatch"], "group": "retention" },
    { "dimId": "R04_epN_retention", "name": "后续集留人", "choices": ["spring_tension", "one_reversal_per_ep", "genre_frame"], "group": "retention" }
  ],
  "causalityDimensions": [
    { "dimId": "C01_eventCausality", "name": "事件因果密度", "choices": ["strict", "standard", "relaxed"], "group": "causality" },
    { "dimId": "C02_infoGapStrategy", "name": "信息差策略", "choices": ["audience_knows", "character_knows", "alternate", "none"], "group": "causality" },
    { "dimId": "C03_dialogueDensity", "name": "台词密度", "choices": ["short_drama_high", "standard", "action_heavy"], "group": "causality" },
    { "dimId": "C04_showDontTell", "name": "展示不要告诉", "choices": ["strict", "standard"], "group": "causality" }
  ],
  "dialogueDimensions": [
    { "dimId": "DLG01_subtextStyle", "name": "潜台词风格", "choices": ["efficient", "standard"], "group": "dialogue" },
    { "dimId": "DLG02_lineFunction", "name": "台词功能要求", "choices": ["all_tagged", "key_only"], "group": "dialogue" },
    { "dimId": "DLG03_avDialogueOrder", "name": "声画因果", "choices": ["action_first", "sync"], "group": "dialogue" }
  ],
  "openingDimensions": [
    { "dimId": "O01_openingProfile", "name": "开场3-10s方案", "choices": ["O1_crisis_first", "O2_contrast_reveal", "O3_conflict_tableau", "O4_emotion_av_peak", "O5_debut_intro_merged"], "group": "opening" }
  ]
}

---

## §3 G 层锚点

# G 层全局锚点（G1–G5）

项目级锚点，写入 `planData.globalAnchors`（import 落库 `o_projectBlueprint`）。W1–W3、GB、BP 均须引用，防漂移。

## 入口条件

- 改编路径：P09 或 P08 通过
- 原创路径：直接进入本阶段
- storyCore 或用户口述核心可用

## G1–G5 模板

| 锚点 | 字段 | 内容要求 | 下游引用 |
|------|------|----------|----------|
| **G1** 角色灵魂 | `characterSoul[]` | 每角：内核矛盾、说话风格、记忆点、金手指边界 | W3 台词、CD L0-L6 |
| **G2** 世界观 | `worldRules` | 3–5 条铁律 + 渐进披露顺序 | GB 场备注、W3 OS/VO |
| **G3** 调性 | `toneProfile` | 情绪基调占比、禁忌、类型标签 | designBrief B3 |
| **G4** 道具 | `anchorProps[]` | 名称/CODE 预留/significance/出场节点 | BP anchorProps |
| **G5** 关系 | `relationshipGraph` | 核心关系对 + 张力类型 + 变化节点 | W3 冲突、SB 情绪 |

## 执行步骤

1. 从 storyCore.characterAnchors 提炼 G1（≤4 角色）
2. 写 G2 世界观铁律，禁止大段旁白灌输
3. G3 锁定情绪基调占比（如甜60%+虐30%+惊喜10%）
4. G4 列核心道具，标注 significance（情感/权力/线索）
5. G5 画关系图，标注张力变化集数
6. 初始化 `planData.narrativeBrief.empathyPlan` 草稿（rootFor/rootAgainst 来自 G1 主角与对立面）

## 输出

```json
{
  "globalAnchors": {
    "G1": { "characterSoul": [{ "name": "...", "coreConflict": "...", "voiceStyle": "..." }] },
    "G2": { "worldRules": ["..."] },
    "G3": { "toneProfile": { "genre": "甜宠", "ratio": { "sweet": 60, "bitter": 30 } } },
    "G4": { "anchorProps": [{ "name": "...", "significance": "情感", "episodes": [1, 5] }] },
    "G5": { "relationshipGraph": [{ "pair": ["A", "B"], "tension": "对立→和解", "ep": 8 }] }
  },
  "rulePackVersion": "2.0.1"
}
```

## BLOCK 闸门

- G1–G5 五块均非空
- G1 角色数 ≤4
- G4 每个道具有 significance
- 与 adaptationMatrix 视觉风格一致

## ruleAudit

stage `G`；未通过不得进 W1_skeleton。

---

## §3.5 编剧爆款思维

---
name: viral_screenwriter_craft
description: Browser Chat 编剧爆款思维（从 script_execution 抽取的可执行教学法）
stageId: craft
rulePackVersion: "2.0.1"
---

# 编剧爆款思维 · Browser Chat 可执行版

> **必读**：进入 W 阶段前通读本节。W3 写剧本时对照 `planData.narrativeBrief` 逐条兑现，禁止只填 JSON 字段不落地正文。

## 1. 有用信息 vs 猜谜式悬念

**禁止**（对照 `narrative_drive_spec.json` forbiddenSuspense）：

- `opaque_mystery`：大家都不知道、观众也看不懂在猜什么
- `exposition_dump`：开会/旁白一口气交代背景
- `self_reveal_dialogue`：角色自己念设定说明书

**必须**：每条信息写进 `informationLedger`，标注 `emotionTarget`（替谁捏汗/替观众爽）与 `payoffBy`（何时兑现）。

| 废稿 | 报款 |
|------|------|
| △ 豪华别墅内，阳光洒落。女主打量四周。 | △ 巴掌脆响！女主脸侧红肿，箱子砸地。 |
| 旁白：她是被抱错的真千金…… | 假千金（冷笑）：这房子，从来就不是你的。 |

## 2. 信息差三配置

| 类型 | 观众 | 角色 | 情绪效果 |
|------|------|------|----------|
| audience_knows_character_not | 知 | 不知 | 替主角捏汗 |
| character_knows_audience_not | 不知 | 知 | 期待打脸 |
| partial_both | 部分 | 部分 | 心疼又着急 |

ep1 前 30s **最多 1 条**核心 info 释放；禁止连续猜谜。

## 3. 动作是因，对话是果

- 每句对白前必须有 △ 动作
- `dialoguePlan` 每行须 `causedByActionId`（A1/A2…）+ ≥1 `function`
- ep1 前 30s：至少 1 句 `emotion_hit` + 1 句 `conflict_escalate`
- 单句 >20 字须标 `splitHint: reaction_shot` + 听者反应 △

## 4. 节奏 3-15-45 与可拍 △

| 秒级 | 剧本要求 | retention 字段 |
|------|----------|----------------|
| 0–3s | 强视觉冲突（非写景/开会） | opening5sHook |
| 3–15s | 第一次剧情变化 | opening3to10s |
| 15–45s | 强期待 + 主角抉择空间 | rhythm31545 |
| 集末 | 反转钩子 | endHook |

**废稿**：缓推全景写景 + 旁白介绍世界观  
**报款**：特写巴掌 + 骤停 BGM + 一句宣战对白

## 5. 三大密度（每场自评）

写入 `narrativeBrief.densityBudget` 与每场 `sceneMeta.densityScore`：

- **情绪**：ep1 前 3s 峰值；禁止三场连续 low
- **信息**：ep1 前 30s ≤1 核心 info；每集 ≤3 新 info
- **情节**：15s 内第一次变化；每集 ≥1 反转

## 6. 共情三拍（ep1 前 30s 至少完成前两拍）

1. **困境**：主角被压到谷底（被羞辱/被误解）
2. **无门**：看似无解（权力/信息/关系封锁）
3. **微反击**：一个小动作暗示反击可能（攥拳/眼神/藏证据）

`empathyPlan.rootFor` / `rootAgainst` 须在 ledger 的 `emotionTarget` 中体现。

## 7. 改编 ≠ 缩写

- P06 `changeLog` 每条链 `matrixDim` + `densityImpact`
- `reconstructionTrace` 中 ≥80% P-issue 须在 ep1 剧本可指出对应 △/对白
- 删留须写「替代爆点」，禁止只删不补

## 8. AI 可实现边界（衔接 MD×4）

- ep1 Opening `fxIntent.level` ≤ F2；F3+ 须 `degradeHint`
- 禁「大楼坍塌」类 F5 → 改「人群惊逃+烟尘」
- 有台词场须写 `voiceIntent`（音色/语速/情绪）供 AUD 编译

## 9. 自检口诀（export 前）

1. 首场首 △ 是冲突不是写景？
2. 每条 ledger 有 emotionTarget 且已兑现？
3. changeLog / reconstructionTrace 80% 可追踪？
4. 长台词有 splitHint + 反应 △？
5. ep1 首场 `sceneMeta.avCausality` 非空？

未过 → 跑 `W3_narrative_selfcheck.md`，不得进 designBrief。

---

## §4 W 阶段

# W1 故事骨架

基于 G 层锚点与 storyCore（改编）或用户口述（原创），产出 `<storySkeleton>` XML。W2 策略与 W3 剧本均引用本产出。

## 入口条件

- `planData.globalAnchors` G1–G5 已通过
- 【项目配置】集数、单集时长、章节范围已确认

## 骨架必含区块

| 区块 | 要点 |
|------|------|
| 故事核 | ≤50 字 + 心理级爽点 + 金手指约束 |
| 隐线 | 主角弧光轨迹 |
| 人物小传 | 大三角 ≤4 人，五要素齐全 |
| 三幕结构 | 功能/核心问题/幕末转折 |
| 分集决策 | 模式A(≤20集) 或 模式B(>20集) |
| 付费卡点 | ≈10%/30%/50%/70%/90% |
| 股价级反转登记表 | 全剧 ≈3 个 |

## 执行步骤

1. 读取 globalAnchors + storyCore（如有）
2. 阐述思路 200–300 字（核心吸引力、三幕、分集策略）
3. 按 XML 模板一次性完整输出 `<storySkeleton>...</storySkeleton>`
4. 分集表增 `carryInfoIds[]` / `newInfoIds[]` / `empathyShift`；人物小传增 `voiceProfile.speakingStyle`
5. 写入 `planData.storySkeleton` + `narrativeBrief.retentionBeats` / `seriesContinuity` 草稿

## 关键约束

- 压缩比 ≤40%；人物 ≤4
- 前10集 ≈10 个可剪 30 秒投流爆点
- 矛盾达高级/升级级别（两个好人不同选择）
- 金手指非同质化（市面 >10 次须升级）

## 输出标签

```xml
<storySkeleton rulePackVersion="2.0.1">
  <!-- 故事核 / 隐线 / 人物小传 / 三幕 / 分集 / 删减 / 付费卡点 / 反转登记表 -->
</storySkeleton>
```

## BLOCK 闸门

- XML 一次性完整输出
- 分集数 = 项目配置 N
- 股价级反转 ≈3 且预埋集 < 揭晓集
- 每集有集末钩子

## 下游

通过 → W2_strategy；可选触发 supervision_review（骨架审核）。

# W2 改编策略

基于 W1 骨架制定改编策略，输出 `<adaptationStrategy>` XML。原创项目可简化为「载体适配策略」。

## 入口条件

- `planData.storySkeleton` 已通过 W1 BLOCK
- `planData.adaptationMatrixStructured.userConfirmed` = true
- globalAnchors G1–G5 可用

## 策略必含区块

| 区块 | 内容 |
|------|------|
| 核心改编原则 | 3–5 条，含优先级、正面指导、负面边界 |
| 主要删除决策 | 被删/压缩内容、原因、主线影响 |
| 世界观呈现策略 | 出场节奏、解释度、角色态度锚点 |
| 三大密度保障 | 情绪/信息/情节密度删留标尺 |
| 股价级反转来源 | 与骨架登记表一一对应 |

## 8 大核心要点（必覆盖）

1. 强画面感  2. 台词精简  3. 节奏极致快  4. 只沿主线
5. 降低理解成本  6. 情绪大于一切  7. 开篇给足期待感  8. 展示不要告诉

## 执行步骤

1. 读取 storySkeleton 删减记录与反转登记表
2. 读取 `adaptationMatrixStructured` + `adaptationProfile`（含 deepAdaptation / V/R/C 维）
3. 写 3–5 条核心原则，每条服务故事核
3. 列删除决策表格（列：**三密度影响** + **替代爆点**）；写入 `narrativeBrief.densityBudget`
4. 写世界观渐进披露方案（对话/OS/VO，禁大段旁白）
5. 核对 ≈3 个反转与骨架登记表一致

## 输出

```xml
<adaptationStrategy rulePackVersion="2.0.1">
  <principles>
    <p priority="1" do="..." dont="..." />
  </principles>
  <deletions>...</deletions>
  <worldviewStrategy>...</worldviewStrategy>
  <densityPolicy>...</densityPolicy>
</adaptationStrategy>
```

## BLOCK 闸门

- 原则 3–5 条
- 删除决策与骨架删减记录一致
- 8 大要点均有体现
- 反转来源与骨架登记表无冲突

## 下游

通过 → W3_script；可选 supervision_review（策略审核）。

# W3 文学剧本

基于骨架与策略编写单集文学剧本，包裹在 `<scriptItem>` 中。**严禁**输出分镜、景别、compiled prompt。

## 入口条件

- W1 骨架 + W2 策略已通过
- 明确当前编写集数 EP{NN}

## W3 BLOCK 自检清单

### R2 台词保真预备

- 所有对白以 `{角色名}：{台词}` 格式
- OS/VO/V.S 单独标注，不混入 △
- 台词 hash 可计算（无多余空格/标点变异）
- 单句 ≤20 字，单次 ≤50 字

### W12 冲突驱动

- 每场有明确冲突升级或反转
- 黄金单集公式：承接+升级+价值转变+下集勾连
- 节奏 3-15-45：3 秒情绪冲击 / 15 秒变化 / 45 秒强期待

### ep1 专章（RET + NAR）

- 并列产出 `informationLedger` / `dialoguePlan` / `viralAdaptation.retentionPlan`
- 第一场 `sceneMeta`：opening5sHook、rhythm31545、infoGapType、clip30sCandidate
- 第一场禁止 >2 句解释性台词；禁止纯环境描写开场
- ep2+ 每场标 `retentionRole`（carry/escalate/hook）；集末 `endCardPack.preview`

### W13 画面可拍

- △ 描写「人怎么干」：动作、表情、环境、光线
- 禁镜头技术括注（如「全景·缓推·6秒」）
- 禁小说化描写与冗长心理独白
- 竖屏适配：人物居中，无横向全景

## 执行步骤

**步骤 0（强制）**：读取并打印 `planData.narrativeBrief` 摘要；写每场前标注本场兑现的 `retentionBeat` / `infoId` / `reconstructionTrace` 条目。  
T3：同步写 `narrativeBrief.implementationPlan[]`（每场 `sceneRef` + `fxIntent` 含 **F0** + `avCausality`）；长句 >20 字必须 `dialoguePlan.lines[].splitHint`。  
**场镜基数 MUST**：`implementationPlan`/`sceneMeta` 条数 = 剧本「场N」数；「接场/同地点续拍」要么换独立场景名（下游 SB `sceneName` 必须不同），要么合并为一场并删除多余 sceneRef。禁止留下无镜可映射的 F1 plan 项。

1. 从骨架提取**当前集**信息（忽略其他集）
2. 阐述思路 200–300 字
3. 输出完整 `<scriptItem name="{作品名} EP{NN}：{标题}">` … `</scriptItem>`
4. 内部跑 R2/W12/W13 清单
5. 返回简短确认，禁止复述正文

## 格式要点

```
1-1 场景名 日/内
人物：A B
△环境+动作描写
A：台词
---
```

## BLOCK 闸门

| ruleId | 条件 |
|--------|------|
| R2 | 台词格式规范，hash 稳定 |
| W12 | 每场推进冲突，集末有钩子 |
| W13 | △ 可拍，无技术括注 |
| L06 | ScriptReadyGate：正文 1000 字内，密度合格 |

## 严禁产出

分镜表、景别、运镜、imagePrompt、videoPrompt、audioPrompt。

## 下游

全集完成 → design_brief → corridor_GB。

# W3 叙事质性 BLOCK 自检

W3 文学剧本完成后、**进入 designBrief 前**必须逐项自检。任一 BLOCK 项失败须回改 W3/P06，不得 export。

## 入口

- 已产出 `<scriptItem>` + sidecar JSON（ledger/dialoguePlan/retentionPlan/sceneMeta）
- 已读取完整 `planData.narrativeBrief`

## BLOCK 清单

| ID | 检查 | 失败则 |
|----|------|--------|
| NAR-empathy | 每条 informationLedger 有 emotionTarget + payoffBy 且 ep1 可指出兑现 | 补写/改剧本 |
| NAR-01 | ep1 第一场首 △ 强视觉冲突（非写景/开会） | 重写首场 |
| NAR-02 | ep1 前 30s 解释性台词 >2 且无 infoDelivery | 拆镜/改动作 |
| NAR-03 | 每条 dialoguePlan line 有 causedByActionId + ≥1 function | 补标注 |
| NAR-04 | retentionPlan.opening5s 在剧本首场可指出 | 对齐重写 |
| NAR-05 | changeLog 中 ≥80% P-issue 在剧本可追踪 | 回改 P06/W3 |
| NAR-06 | reconstructionTrace ≥80% 在 ep1 可指出 △/对白 | 回改 W3 |
| NAR-07 | ep1 无 forbiddenSuspense 模式 | 改信息交付 |
| NAR-14 | 长台词 >20 字有 **splitHint**（如 `reaction_shot`）+ 反应 △ | 拆句/补 `dialoguePlan.lines[].splitHint` |
| NAR-15 | emotion_hit 台词有 **reactionAction** | 补 `dialoguePlan.lines[].reactionAction` |
| RET-01 | ep1 首场 sceneMeta.avCausality 非空 | 补声画峰值 |
| RET-02 | opening3to10s / rhythm31545 与正文时间轴一致；SB 镜可标 rhythm31545 | 对齐 retentionPlan |

**禁止假绿：** 不得在缺 splitHint/reactionAction 时写 `narrativeSelfcheck.passed=true`。

## 输出

```json
{
  "narrativeSelfcheck": {
    "passed": true,
    "failedIds": [],
    "checkedAt": "ISO8601"
  }
}
```

## 闸门

`narrativeSelfcheck.passed !== true` → **禁止** designBrief / export。  
此外，export 前服务器 `exportGate` 会复核 `NAR-14` / `NAR-15`；若 bundle 自报 passed 但服务器失败，将判定为 `SELF_REPORT_MISMATCH` 并阻断出口。

# 走廊 · W3 剧本

## SPEC · 严禁越界

- **CAN**：文学剧本、场标、对白、动作描写
- **CANNOT**：景别、切镜、BGM、色温、prompt、分镜表

## LINK · 输入输出

| 输入 | 输出 |
|------|------|
| W1 storySkeleton 本集行 | script 正文 |
| W2 adaptationStrategy | designBrief（W3 末） |
| G globalAnchors | ruleAudit.W3 |

## SD-W · 智能检测

挂载 `smart_detection.md` 模块 **SD-W**：密度/钩子/台词/时长。

BLOCK → fixPlan → 修订 script，不得进 designBrief。

## SF · 修复

| 问题 | fixPlan 动作 |
|------|-------------|
| R2 台词不保真 | 恢复源材料引号内原文 |
| W12 缺开篇钩 | 补第一场视觉+情感悬念 |
| W13 缺集末钩 | 补未解问题 |

## 出口闸门

- ruleAudit.W3.passed = true
- 随后 **designBrief**（B1–B11 + H1），再 GB

---

## §5.0 质量走廊

# 走廊 GB · 导演规划

质量走廊第一阶段：script → scriptPlan。**只写分场/情绪/过渡**，严禁光影设计、切镜指令（C3 边界）。

## 入口条件

- W3 script + designBrief 11 字段已通过
- corridor 上游 W3 BLOCK 合格

## 必产出

| 字段 | 内容 | 严禁 |
|------|------|------|
| scriptPlan | 分场汇总表 + 逐场注意事项 + 场间过渡 | 光影/色温/布光 |
| episodeBeat | emotionCurve + scenes + markers + rhythmZones | 景别/运镜/切镜 |

## scriptPlan 最低结构

```markdown
## 分场汇总
| 场 | 场景 | 台词条数 | 情绪(0-10) | 基调 |
| Sc1 | 寝殿 | 3 | 4 | 苏醒、茫然 |

## 逐场注意事项
### Sc1 寝殿
- 情绪从茫然→警觉，信息前置主角身份

## 场间过渡
| 从 | 到 | 过渡类型 | 说明 |
| Sc1 | Sc2 | 切 | 时间紧接 |
```

## 执行步骤

1. 从 script 拆场，统计每场景台词数
2. 为每场标 emotion(0-10) 与基调关键词
3. 写场间过渡（切/淡入/叠化），不写具体光影
4. 同步构造 episodeBeat.emotionCurve + rhythmZones（对齐 B12）
5. 对照 designBrief.B4 情绪弧线一致性；B12 每场至少一区
6. 从 `planData.narrativeBrief` 抄入 **sceneCausalBeats**（每场 infoIds + avPeak）与 **infoIds[]**（对齐 informationLedger）

## narrativeBrief → GB 抄入规则

| narrativeBrief 字段 | GB 字段 |
|---------------------|---------|
| infoDeliveryPlan[].infoId | 逐场注意事项 + sceneCausalBeats |
| retentionBeats.opening5s | Sc1 情绪峰值说明 |
| reconstructionTrace[].newBeat | 对应场 beat 备注 |
| empathyPlan.squeezeMoments | 场级情绪挤压窗口 |

## BLOCK 闸门（rollbackLayer GB）

| ruleId | 条件 |
|--------|------|
| L09 | scriptPlan 可被 SB Parser 读取 |
| L10 | emotionCurve 与 B4 偏差 ≤2 |
| C3 | 无光影/切镜/景别描述 |

## 严禁产出

shotSize、cameraMovement、lightingSetup、compiledPrompt。

## 下游

通过 → corridor_SB；情绪不符 → rePush designBrief 或 W3。

# 走廊 SB · 分镜表

质量走廊第二阶段：scriptPlan → shots[]。**每句台词映射 dialogue.lines**，严禁 compiled prompt。

## 入口条件

- corridor_GB scriptPlan 已通过
- script 全文可用

## 每镜必填字段

| 字段 | 说明 | ruleId |
|------|------|--------|
| id | shot-1 递增 | — |
| narrative.type | CHAR-SCENE / CHAR-PROP 等 | V4 |
| narrative.sceneName | 场景名（后续映射 SCENE-CODE） | V5 |
| narrative.dialogue.lines | **每句台词原文**，含角色名与引号 | R2, H3 |
| narrative.emotionIntensity | 0-10，对齐 GB 场情绪 | L10 |
| narrative.shotSize | 景别（特写/中景/全景） | S4 |
| narrative.duration | 预估秒数 | — |
| narrative.transitionType | 切/淡入/叠化 | PR-CAM-01 |
| narrative.rhythmZone | 起/承/转/合（引用 B12） | DC-05 |
| narrative.markers | 伏笔/揭晓/钩子标记；可含 infoId/causeId/effectId | PR-09, DC-06 |
| narrative.spatialRelation | 轴线/站位（引用 B13） | PR-06, PR-14 |
| retentionTier | ep1: 0-2s / 2-5s / 5-30s / body / endHook | RET |
| shotDesign | T2+ 构图/表演/锚点（高情绪≥4 必填 performance） | GEN |
| lines[].lineId/functions/causedByActionId | 台词功能链，对齐 dialoguePlan | NAR |
| clip30sCandidate / rhythm31545 | 投流与 3-15-45 标注 | VIR |
| audioCue | W3 sceneMeta.avCausality.audioBeat（**string**；禁止 `{beat,type}` object） |
| visualEffect / fxLevel | W3 fxIntent（**visualEffect 为 string** `"F1: 描述"`；fxLevel 可选 `"F1"`） |

无 AV 意图时**省略**上述可选字段；禁止写 `null`。

## 台词映射铁律（R2）

1. 剧本每句 `{角色}：{台词}` 须在 shots 中可追溯
2. **100% 覆盖**：可合并多句入一镜，**禁止删改字词、禁止丢句**
3. OS/VO/系统音单独标注 type
4. 出口前人工核对台词数 ≥ 剧本可枚举句数

## 每镜必填 visualDescription

| 字段 | 说明 |
|------|------|
| visualDescription | 画面主体与动作（供 EN subject / MD-IMG） |

## 执行步骤

1. 按 scriptPlan 分场拆镜
2. 为每句台词创建 shot，填入 dialogue.lines
3. 标 shotSize + emotionIntensity + duration + rhythmZone
4. 为每镜填 **visualDescription**（必填）
5. 标 shotSize + emotionIntensity + duration + rhythmZone
6. 为信息镜填 markers；标 spatialRelation 对齐 B13
7. 写入 preDesignPack.shots[]

## BLOCK 闸门

| 项 | 条件 |
|----|------|
| R2 | 台词 100% 覆盖，零丢句 |
| visualDescription | 每镜非空 |
| 禁越界 | SB 阶段不写四模态 prompt（属 MD） |

## 严禁产出

compiled prompt、API 参数、vendor 字段、Touch 配置。

## 下游

通过 → CD（T2）→ EN → MD；台词问题 → rePush W3 或 SB 补镜。

# 走廊 EN · Y 映射编译

质量走廊第三阶段（T2）：shots[] → storyboard[] EN 面板，执行 **Y 映射 compile**。保护 G/BP 锚点不漂移。

## 入口条件

- T1 preDesignPack.shots[] 已通过
- T2 档位：CD/AS/BP 已完成，visualLockTable 可用

## Y 映射五域

| 域 | 输入 | 输出字段 | 锚点保护 |
|----|------|----------|----------|
| subject | shot + CHAR-CODE | compiled.image.part1 | G1 + L0-L6 |
| spatial | shotSize + scene | spatialRelation | SCENE-CODE |
| performance | emotionIntensity | performance | QF-EXPR-01 |
| lighting | GB 情绪（非光影细节） | lightQuality | sceneColorLock |
| refs | BP visualLockTable | refs[] | anchorProps |

## 锚点保护规则

1. CHAR-CODE 必须存在于 visualLockTable.characterAssets
2. SCENE-CODE 必须存在于 sceneColorLock
3. PROP-CODE 必须存在于 anchorProps（V5）
4. compile 不得改写 narrative.dialogue.lines（R2 只读）
5. compiledHash 含 rulePackVersion + modelId + artStyle

## 执行步骤

1. 逐 shot 读取 narrative + visualLockTable + `narrativeBrief.implementationPlan`（若有）
2. 按 Y 映射生成 generation 字段；**优先**用 `buildPromptIR(shotDesign + promptAnchors)` 草稿，MD 技能润色
3. 校验 refs 全部 resolve 到 BP CODE
4. 计算 compiledHash per shot
5. 写入 **ScriptBundle** `preDesignPack.shots[].generation` 与/或 `flowData.storyboard[]`

## BLOCK 闸门

| ruleId | 条件 |
|--------|------|
| V4-V6 | CODE 引用合法 |
| V12-V15 | 锚点未漂移 |
| R2 | lines 字段未被 compile 修改 |
| B11 | 首位帧模式 Agnes 链完整 |

## 严禁

直接调用生成 API；绕过 visualLockTable 用 sceneName 代替 CODE。

## 下游

通过 → MD_modality_overview（T3）；锚点漂移 → rePush BP 或 EN。

---

## §5.1 台词链

# 十链联动与连贯性（linkageAudit）

T1 修订后的**十链**全闭环。每阶段挂载 LINK 审计，Pipeline 结束写回 continuity。

## 十链定义

| 链 | T1 要求 | 关键字段 | stage |
|----|---------|----------|-------|
| 台词 dialogue | shots.lines + hash | dialogue.lines, externalHashCheck | SB |
| 资产 asset | extract + hint | assetHints, CHAR/SCENE/PROP-CODE | AS/BP |
| 连贯 continuity | continuity JSON | continuityIn/Out, resolveContext | B |
| 视听 av | 结构化情绪 | B4, emotionCurve, emotionIntensity | GB/SB |
| 故事 story | infoLinkageChain | markers, B5 伏笔/揭晓 | B/SB |
| 场景 scene | 场表一致 | B6.scenes, sceneName, BP.sceneColorLock | B/GB/SB |
| 运镜 camera | 景别/过渡/运镜 | B12, shotSize, transitionType, EN.motion | SB/EN |
| 改编 adaptation | 矩阵→策略→剧本 | P03, W2, W3, designBrief | P/W |
| 模态编译 modality_compile | EN→MD×4 | modalityPromptAudit, four slots | EN/MD |
| 生成 generation | 生成反馈 | generationFeedback, MediaProbe | Vendor |
| 修复 repair | SF + linkageRepairPlan | fixPlan, rePushPlan | SF |

## linkageAudit 结构

```json
{
  "linkageAudit": {
    "rulePackVersion": "2.0.1",
    "chains": [
      {
        "chainId": "台词",
        "status": "pass",
        "nodes": [
          { "stage": "W3", "field": "script", "ruleId": "R2" },
          { "stage": "SB", "field": "shots[].dialogue.lines", "ruleId": "H3" }
        ]
      }
    ],
    "blockExport": false
  }
}
```

## 执行步骤

1. 对照 `linkage_chains.json` 逐链检查节点
2. 验证相邻节点字段一致性（如 B4 → GB emotionCurve）
3. 断裂链标注 breakPoint + 建议 repair
4. 任一链 BLOCK → blockExport = true
5. Pipeline 完成 → 写回 continuity JSON

## continuity 写回

```json
{
  "continuity": {
    "episodeKey": "ep-01",
    "characterStates": { "女主": "得知真相，愤怒" },
    "plotThreads": [{ "thread": "玉佩线索", "status": "未揭晓" }],
    "lastScene": "宴会厅",
    "writtenAt": "pipeline-end"
  }
}
```

## BLOCK 闸门（G20–G24）

- 十链均有 status 判定
- 台词链 externalHashCheck.match = true
- 视听链偏差 ≤2（B4 vs emotionCurve）
- 故事链 B5：`payoffEp` 仅未来集号（number）；本集收用 `payoffLabel: "本集收"`
- blockExport = false 方可 T1 出口

## 与 linkageRepairPlan

单链断裂 → linkageRepairPlan（smart_fix 子结构）；多链 → rePushPlan。

---

## §5.5 设计联动 designBrief

# designBrief（B 层 11 字段）

连接 W3 剧本与设计走廊（GB→SB）的**联动层**。只写结构化字段，**严禁**镜级描述与 prompt。

## 入口条件

- W3 script 当前集已完成
- globalAnchors G1–G5 可用

## B11 联动字段

| # | 字段 | 说明 | 引用 |
|---|------|------|------|
| B1 | episodeKey | 稳定业务键 `ep-01` | import 匹配 |
| B2 | episodeTitle | 显示标题 | scriptMeta |
| B3 | toneLock | 情绪基调锁定（引用 G3） | GB 场基调 |
| B4 | emotionArc | 本集情绪弧线 [起,峰,落] | GB emotionCurve |
| B5 | infoLinkageChain | 信息链节点（伏笔/揭晓） | shots.markers |
| B6 | assetHints | 角色/场景/道具提取 hint | AS extract |
| B7 | continuityIn | 上集衔接状态 | resolveContext |
| B8 | continuityOut | 本集末状态 | 跨集写回 |
| B9 | audioMood | 音乐氛围关键词 | AUD 模态 |
| B10 | platformSpec | 平台规格（竖屏等） | SB 构图 |
| B11 | linkageTargets | 十链目标 stage 列表 | linkageAudit |
| B12 | rhythmZoneOutline | 场级节奏区（起/承/转/合） | SB rhythmZone |
| B13 | spatialAnchors | 空间锚点（轴线/站位） | SB spatialRelation |

## 执行步骤

1. 从 script 提取角色、场景、道具 → B6 assetHints
2. 从 G3 toneProfile 锁定 B3
3. 标 B5 信息链：本集埋/收哪些伏笔
4. 写 B7/B8 跨集状态（有上集则读 continuity）
5. 填 B11 linkageTargets = `["台词","资产","连贯","视听","故事","场景","运镜","改编","模态编译","修复"]`
6. 按 GB 分场标 B12 rhythmZoneOutline（每场起承转合）
7. 标 B13 spatialAnchors：主轴线与关键站位，供 SB spatialRelation 引用

## 输出

```json
{
  "designBrief": {
    "B1": "ep-01", "B2": "第1集：...", "B3": { "genre": "甜宠", "ratio": {...} },
    "B4": [3, 7, 5],
    "B5": [
      { "type": "伏笔", "desc": "...", "payoffEp": 5 },
      { "type": "钩子", "desc": "...", "payoffLabel": "本集收" }
    ],
    "B6": { "characters": ["..."], "scenes": ["..."], "props": ["..."] },
    "B7": "...", "B8": "...", "B9": "轻快钢琴", "B10": "竖屏9:16",
    "B11": ["台词","资产","连贯","视听","故事","场景","运镜","改编","模态编译","修复"],
    "B12": [{ "scene": "Sc1", "zone": "起", "beats": 2 }],
    "B13": [{ "scene": "Sc1", "axis": "女主-男主", "anchors": ["女主左", "男主右"] }]
  },
  "rulePackVersion": "2.0.1"
}
```

## BLOCK 闸门

- 11 字段全非空（B12/B13 有场则必填）
- 无镜级/prompt 内容
- B6 与 script 角色场景一致
- B5 每条：`payoffEp` 仅未来集号（number）；本集收/当集兑现用 `payoffLabel: "本集收"`，**禁止**把语义串写进 `payoffEp`

## 下游

通过 → corridor_GB（scriptPlan 分场）。

## B14–B23 扩展（W3 sidecar → GB/SB 映射）

| # | 字段 | W3 来源 | GB/SB 目标 |
|---|------|---------|------------|
| B14 | paypointMarkers | W1 付费卡点 | GB 场表 paypoint 标注 |
| B15 | clipHooks | viralAdaptation.clipPoints30s | SB clip30sCandidate |
| B16 | adaptationDeepRef | deepAdaptation.nameMap → `{from:to}` record | designBrief.B16 镜像（勿另造 B16_adaptationDeepRef；maps 仅 [{from,to}]） |
| B17 | retentionScenes | retentionPlan.ep1 | GB 场级 retention 窗口 |
| B18 | opening5sAV | sceneMeta.avCausality | SB retentionTier 0-2s |
| B19 | first30sAV | rhythm31545 + infoGap | SB markers infoId |
| B20 | infoLedgerRefs | informationLedger.infoId | SB markers |
| B21 | dialoguePlanRef | dialoguePlan | SB lines functions |
| B22 | causalityGraphRef | narrativeCausalityGraph | SB cause/effect markers |
| B23 | retentionInfoDelivery | infoDeliveryPlan | GB 每场 info 交付清单 |

### B20 / B23 权威形状（禁止对象数组直接当 B20）

```json
"B20": ["INF-01", "INF-02", "INF-03"],
"B23": {
  "retentionInfoDelivery": ["INF-01", "INF-02", "INF-03"],
  "items": [
    { "infoId": "INF-01", "scene": "场1", "delivery": "沈母翻账册动作 + 台词" }
  ]
}
```

- **B20**：只能是 infoId `string[]`，不要写成 `[{ "infoId", "delivery" }]`。
- **B23**：必须是 **record**；最少含 `retentionInfoDelivery: string[]`；明细可放 `items` 数组。
- 导入侧会对错误形态做 SH-B20 / SH-B23  salvage，但导出 JSON 应直接写权威形。

每场 GB 须从 `narrativeBrief.infoDeliveryPlan` 抄 infoIds；B18/B19 须与 W3 `sceneMeta.avCausality` 一致。

# design_compliance_gate（对齐 qualityGate）

出口前必须调用 **同一内核**：

1. `POST /api/ruleEngine/exportGate`（或本地 `runExportGate`）→ 读取 `exportAllowed` / `closureSnapshot` / `qualityGate` / `chatPromptGaps`
2. 对照 `data/fixtures/quality_matrix.json` 的 id
3. **禁止** 自报 `linkageAudit: pass` / `modalityPromptAudit.passRate=100` / `FX=pass` / `ruleAudit.passed=true` 当权威

## 必检（matrix 引用）

- 台词：`DC-01` / `LANG-01`（源语言，禁英译进 VID）
- 画面：`QP-02`（禁空泛）
- 运镜/转场：`PR-CAM-01` / `DC-09`（白名单）
- 特效：`FX-GRADE-01`（无特效须声明 **F0**；有特效才写 `fxPrompt`；F4/F5 硬拦）
- 假绿：`FX-FALSE-GREEN`（禁止空 FX 仍写 modalityPromptAudit.FX=pass）
- 叙事辅字段：`NAR-14`（长台词 >20 字须 `splitHint`）/ `NAR-15`（emotion_hit 须 `reactionAction`）
- 爆款/留存：`VIR-01` / `RET-01` / `VIR-04`（WARN→T3 ep1 可升）

## Track A 作者权（Chat 必须写）

| 字段 | 阶段 | 规则 |
|------|------|------|
| `dialoguePlan.splitHint` | W3 | 单句 >20 字 |
| `dialoguePlan.reactionAction` | W3 | `functions` 含 emotion_hit |
| `sceneMeta.fxIntent` / F0–F5 | W3 | 无特效写 F0 |
| `generation.fxPrompt` | MD-FX | 仅 F1+ / visualEffect |
| `modalityPromptAudit.FX` | MD | 须与真实字段一致，禁止假绿 |
| `rhythm31545` 镜标 | SB | 对齐 retentionPlan |

## Track B 制作安全网（可声明自愈）

- 空 FX → soft_patch 声明 F0（不发明特效文案）
- 运镜/转场白名单 clamp
- LANG 源语言回填

## 失败处理

`repair_hint_catalog`：`RH-LANG-01` / `RH-FX-01` / `RH-NAR-14` / `RH-NAR-15` / `RH-QP-02` / `RH-QP-14` / `RH-QP-03`；或 `POST /api/ruleEngine/precheckLoop`。

若 `exportAllowed !== true`：必须按 `repairHints` 回改 JSON 字段，重跑 `exportGate`，不得直接 import。

---

## §6 规则自检 P+G+W

# P+G+W 规则自检

rulePackVersion: 2.0.1

## P0

- [ ] **P1** 六维度评分 P1 — 对源材料维度 P1 评分 1-10 并附理由
- [ ] **P2** 六维度评分 P2 — 对源材料维度 P2 评分 1-10 并附理由
- [ ] **P3** 六维度评分 P3 — 对源材料维度 P3 评分 1-10 并附理由
- [ ] **P4** 六维度评分 P4 — 对源材料维度 P4 评分 1-10 并附理由
- [ ] **P5** 六维度评分 P5 — 对源材料维度 P5 评分 1-10 并附理由
- [ ] **P6** 六维度评分 P6 — 对源材料维度 P6 评分 1-10 并附理由
- [ ] **P7** P层规则 P7 — 检查 P7 合规
- [ ] **P8** P层规则 P8 — 检查 P8 合规
- [ ] **P9** P层规则 P9 — 检查 P9 合规
- [ ] **P10** P层规则 P10 — 检查 P10 合规
- [ ] **P11** P层规则 P11 — 检查 P11 合规
- [ ] **P12** P层规则 P12 — 检查 P12 合规
- [ ] **P16** P层规则 P16 — 检查 P16 合规
- [ ] **P17** P层规则 P17 — 检查 P17 合规
- [ ] **P18** P层规则 P18 — 检查 P18 合规

## P03

- [ ] **P13** P层规则 P13 — 检查 P13 合规
- [ ] **P14** P层规则 P14 — 检查 P14 合规
- [ ] **P15** P层规则 P15 — 检查 P15 合规

## G

- [ ] **G1** 全局锚点 G1 — G1 锚点已写入 planData.globalAnchors
- [ ] **G2** 全局锚点 G2 — G2 锚点已写入 planData.globalAnchors
- [ ] **G3** 全局锚点 G3 — G3 锚点已写入 planData.globalAnchors
- [ ] **G4** 全局锚点 G4 — G4 锚点已写入 planData.globalAnchors
- [ ] **G5** 全局锚点 G5 — G5 锚点已写入 planData.globalAnchors

## W1

- [ ] **W1** 编剧规则 W1 — W1 自检
- [ ] **W2** 编剧规则 W2 — W2 自检
- [ ] **W3** 编剧规则 W3 — W3 自检
- [ ] **W4** 编剧规则 W4 — W4 自检
- [ ] **W5** 编剧规则 W5 — W5 自检

## W2

- [ ] **W6** 编剧规则 W6 — W6 自检
- [ ] **W7** 编剧规则 W7 — W7 自检
- [ ] **W8** 编剧规则 W8 — W8 自检
- [ ] **W9** 编剧规则 W9 — W9 自检
- [ ] **W10** 编剧规则 W10 — W10 自检
- [ ] **W11** 编剧规则 W11 — W11 自检
- [ ] **W12** 编剧规则 W12 — W12 自检
- [ ] **W13** 编剧规则 W13 — W13 自检
- [ ] **W14** 编剧规则 W14 — W14 自检
- [ ] **W15** 编剧规则 W15 — W15 自检

## W3

- [ ] **W16** 编剧规则 W16 — W16 自检
- [ ] **W17** 编剧规则 W17 — W17 自检
- [ ] **W18** 编剧规则 W18 — W18 自检
- [ ] **W19** 编剧规则 W19 — W19 自检
- [ ] **W20** 编剧规则 W20 — W20 自检
- [ ] **W21** 编剧规则 W21 — W21 自检
- [ ] **W22** 编剧规则 W22 — W22 自检
- [ ] **W23** 编剧规则 W23 — W23 自检
- [ ] **W24** 编剧规则 W24 — W24 自检
- [ ] **W25** 编剧规则 W25 — W25 自检
- [ ] **W26** 编剧规则 W26 — W26 自检
- [ ] **W27** 编剧规则 W27 — W27 自检
- [ ] **W28** 编剧规则 W28 — W28 自检
- [ ] **W29** 编剧规则 W29 — W29 自检
- [ ] **W30** 编剧规则 W30 — W30 自检
- [ ] **W31** 编剧规则 W31 — W31 自检
- [ ] **W32** 编剧规则 W32 — W32 自检
- [ ] **W33** 编剧规则 W33 — W33 自检
- [ ] **W34** 编剧规则 W34 — W34 自检
- [ ] **W35** 编剧规则 W35 — W35 自检
- [ ] **W36** 编剧规则 W36 — W36 自检
- [ ] **W37** 编剧规则 W37 — W37 自检
- [ ] **W38** 编剧规则 W38 — W38 自检
- [ ] **W39** 编剧规则 W39 — W39 自检
- [ ] **W40** 编剧规则 W40 — W40 自检
- [ ] **W41** 编剧规则 W41 — W41 自检
- [ ] **W42** 编剧规则 W42 — W42 自检
- [ ] **W43** 编剧规则 W43 — W43 自检
- [ ] **W44** 编剧规则 W44 — W44 自检
- [ ] **W45** 编剧规则 W45 — W45 自检
- [ ] **W46** 编剧规则 W46 — W46 自检

---

## §7 T1 ScriptBundle schema

{
  "_comment": "ScriptBundle v2.0.1 T3 正例 — 改编/留存/叙事/包装/生成落地链",
  "bundleVersion": "browser-chat-optimized",
  "rulePackVersion": "2.0.1",
  "bundleType": "script",
  "meta": { "episodeKey": "ep-01", "episodeName": "第1集", "episodeIndex": 1, "provenance": { "source": "external-chat" } },
  "continuity": { "recapHint": "本集开篇：裴青梧苏醒" },
  "script": "裴青梧传 EP01：苏醒\n\n场1 寝殿 日 内\n人物：裴青梧 婢女\n△烛火摇曳。婢女俯身，轻声唤醒。\n婢女：殿下醒了。\n△裴青梧睁眼，烛火映面，眼神由迷茫转认命。\n裴青梧：我知道。\n△她攥紧被角，指节发白。",
  "planData": {
    "narrativeBrief": {
      "storyKernel": "示例故事核",
      "implementationPlan": [{ "sceneRef": 1, "promptAnchors": { "img": ["示例"] } }]
    },
    "sceneMeta": [{ "sceneRef": 1, "avCausality": { "visualPeak": "示例", "audioBeat": "骤停" } }],
    "globalAnchors": { "G1": "裴青梧：认命 vs 觉醒", "G3": "古言虐恋 70% / 爽 30%" },
    "adaptationProfile": { "genrePreset": "古言虐恋", "lockedChoices": { "D01_nameMap": "keep" } },
    "adaptationMatrixStructured": {
      "userConfirmed": true,
      "matrix": [
        { "dimId": "gender_structure", "choice": "keep" },
        { "dimId": "scene_structure", "choice": "linear" },
        { "dimId": "character_anchor", "choice": "keep_core" },
        { "dimId": "relation_network", "choice": "triangle" },
        { "dimId": "emotion_logic", "choice": "angst" },
        { "dimId": "conflict_design", "choice": "layered" },
        { "dimId": "visual_style", "choice": "ancient_real" },
        { "dimId": "narrative_structure", "choice": "three_act" },
        { "dimId": "core_prop", "choice": "keep" },
        { "dimId": "dialogue_strategy", "choice": "compress" },
        { "dimId": "music_mood", "choice": "tense" },
        { "dimId": "rhythm_plan", "choice": "fast" },
        { "dimId": "D01_nameMap", "choice": "keep" },
        { "dimId": "V05_genreFramework", "choice": "虐恋" },
        { "dimId": "R01_ep1_opening5s", "choice": "identity_contrast" },
        { "dimId": "O01_openingProfile", "choice": "O3_conflict_tableau" }
      ],
      "deepAdaptation": { "nameMap": [], "relationMap": [], "substitutions": [], "settingProfile": { "era": "架空唐宋" } }
    },
    "adaptationStrategy": "保持姓名；强化寝殿空间压迫感；nameMap 已对齐 adaptationMatrix",
    "viralAdaptation": {
      "genreFramework": "虐恋",
      "openingCardPlan": { "ep1": ["困境", "反差", "目标", "动机"] },
      "clipPoints30s": [{ "ep": 1, "scene": "1-1", "hook": "苏醒", "clipable": true }],
      "paypointSchedule": [{ "ep": 2, "ratio": 0.1, "type": "身份差", "clip30s": "认亲" }],
      "retentionPlan": {
        "ep1": {
          "opening5s": { "hookType": "identity_contrast", "visualBeat": "烛火映面", "audioBeat": "骤停" },
          "opening3to10s": { "profileId": "O3_conflict_tableau", "emotionAV": { "visualPeak": "苏醒特写", "fxLevel": "F0" } },
          "first30s": {
            "infoGap": "audience_knows",
            "rhythm31545": { "impact3s": "婢女唤醒", "change15s": "裴青梧应答", "expect45s": "认命眼神" },
            "clip30sCandidate": true
          },
          "episodeEndHook": { "type": "emotion_rebound", "desc": "眼神由认命转警觉" }
        },
        "epN": { "retentionPattern": "spring_tension", "minReversalPerEp": 1 }
      }
    },
    "informationLedger": [
      {
        "infoId": "INF-ep01-sc1-01",
        "fact": "殿下已苏醒但尚未表态",
        "audienceKnows": true,
        "characterKnows": { "裴青梧": true, "婢女": true },
        "emotionTarget": "替观众捏汗",
        "payoffBy": "sc1-end"
      }
    ],
    "dialoguePlan": {
      "lines": [
        {
          "lineId": "L-01",
          "speaker": "婢女",
          "text": "殿下醒了。",
          "functions": ["deliver_info", "emotion_hit"],
          "causedByActionId": "A1",
          "subtext": "试探"
        },
        {
          "lineId": "L-02",
          "speaker": "裴青梧",
          "text": "我知道。",
          "functions": ["character_voice", "conflict_escalate"],
          "causedByActionId": "A2",
          "subtext": "早已清醒"
        }
      ]
    },
    "endCardPack": {
      "preview": { "enabled": true, "overlayText": "下集：身份暗涌", "clipHookIds": ["CLIP-ep02-sc1"], "previewShots": ["shot-2"] }
    }
  },
  "designBrief": {
    "B1": "ep-01",
    "B4": [4, 5, 6],
    "B5": ["钩子：苏醒", "承接：认命"],
    "B14": [{ "position": "ep2-10%", "type": "身份差" }],
    "B15": [{ "clipHookId": "CLIP-ep01-sc1", "hook": "苏醒" }],
    "B20": ["INF-ep01-sc1-01"],
    "B21": { "ref": "dialoguePlan" },
    "B22": { "ref": "narrativeCausalityGraph" },
    "B18": { "opening5sAV": { "shotSize": "MS", "audioBeat": "骤停" } },
    "B19": { "first30sAV": { "rhythm31545": true } },
    "B23": { "retentionInfoDelivery": ["INF-ep01-sc1-01"] },
    "paypointMarkers": [{ "position": "ep2-10%", "type": "身份差" }]
  },
  "narrativeCausalityGraph": {
    "nodes": [
      { "id": "E1", "type": "event", "label": "婢女唤醒" },
      { "id": "E2", "type": "event", "label": "裴青梧应答" },
      { "id": "A1", "type": "visual", "label": "俯身" },
      { "id": "L1", "type": "dialogue", "label": "殿下醒了" }
    ],
    "edges": [{ "from": "A1", "to": "L1", "relation": "cause" }, { "from": "E1", "to": "E2", "relation": "cause" }],
    "broken": [],
    "reverseHints": []
  },
  "debutIntroPack": {
    "items": [
      {
        "entityType": "character",
        "code": "CHAR-PEIQINGWU",
        "copyHint": "裴青梧睁眼，烛火映面",
        "establishingPattern": "特写→中景",
        "subOptional": { "enabled": true, "text": "裴青梧 · 真千金" },
        "fxLevel": "F0"
      }
    ]
  },
  "preDesignPack": {
    "scriptPlan": "# 导演规划\n\n## 场1：寝殿\n- 情绪：5\n",
    "shots": [
      {
        "shotIndex": 1,
        "type": "CHAR-SCENE",
        "sceneName": "寝殿",
        "duration": 2,
        "shotSize": "MS",
        "retentionTier": "0-2s",
        "clip30sCandidate": true,
        "visualDescription": "婢女俯身唤醒殿下",
        "charCodes": ["CHAR-MAID"],
        "shotDesign": {
          "composition": { "foreground": "婢女俯身", "background": "寝殿烛火" },
          "performance": { "microExpression": { "eyes": "soft", "mouthDetail": "neutral_closed" } },
          "cameraAnchor": { "shotSize": "MS", "bgBlur": false },
          "lipSyncPolicy": "subtle_natural"
        },
        "narrative": {
          "dialogue": { "lines": [{ "speaker": "婢女", "text": "殿下醒了。", "lineId": "L-01", "functions": ["deliver_info"], "causedByActionId": "A1" }] },
          "markers": [{ "type": "钩子", "desc": "苏醒", "infoId": "INF-ep01-sc1-01" }],
          "emotionIntensity": 5
        },
        "generation": {
          "imagePrompt": "婢女俯身, 寝殿烛火暖光, 中景半身, 侧光4500K, 古言写实, --cref CHAR-MAID --ar 16:9",
          "videoPrompt": "中景 static, duration 2s, subtle lip sync, natural mouth movement, motion-from-frame",
          "audioPrompt": "婢女, 轻柔女声, 关切"
        }
      },
      {
        "shotIndex": 2,
        "type": "CHAR-SCENE",
        "sceneName": "寝殿",
        "duration": 2,
        "shotSize": "CU",
        "retentionTier": "5-30s",
        "clip30sCandidate": true,
        "rhythm31545": { "change15s": "应答", "expect45s": "眼神" },
        "visualDescription": "裴青梧苏醒，烛火映面",
        "charCodes": ["CHAR-PEIQINGWU"],
        "shotDesign": {
          "composition": { "foreground": "裴青梧睁眼", "background": "烛火暖光" },
          "performance": { "microExpression": { "eyes": "alert", "mouthDetail": "neutral_closed" } },
          "lipSyncPolicy": "subtle_natural"
        },
        "narrative": {
          "dialogue": { "lines": [{ "speaker": "裴青梧", "text": "我知道。", "lineId": "L-02", "functions": ["character_voice"], "causedByActionId": "A2" }] },
          "markers": [{ "type": "承接", "desc": "认命" }],
          "emotionIntensity": 6
        },
        "generation": {
          "imagePrompt": "裴青梧, 寝殿内景, 特写面部 alert eyes mouth neutral_closed, 烛火暖光, --cref CHAR-PEIQINGWU --ar 16:9",
          "videoPrompt": "特写 static, duration 2s, subtle lip sync, natural mouth movement, motion-from-frame",
          "audioPrompt": "裴青梧, 清冷女声, 认命"
        }
      }
    ]
  },
  "characterDesign": {
    "assets": [
      { "code": "CHAR-MAID", "name": "婢女", "L0": { "identity": "侍女", "gender": "女" }, "L3": { "costume": "浅色素衣" } },
      { "code": "CHAR-PEIQINGWU", "name": "裴青梧", "L0": { "identity": "真千金", "gender": "女" }, "L3": { "costume": "白色寝衣" }, "voiceProfile": { "speakingStyle": "清冷简短" } }
    ]
  },
  "visualLockTable": {
    "characterAssets": { "CHAR-MAID": "婢女", "CHAR-PEIQINGWU": "裴青梧" },
    "sceneColorLock": { "寝殿": "4500K暖光" }
  }
}

### §7.1 编剧正例（必读）

{
  "_comment": "Golden ep1 编剧+叙事+模态正例 — 对照 §7.1a/7.1b",
  "bundleVersion": "browser-chat-optimized",
  "rulePackVersion": "2.0.1",
  "bundleType": "script",
  "meta": { "episodeKey": "ep-01", "episodeName": "第1集", "episodeIndex": 1, "provenance": { "source": "external-chat" } },
  "script": "裴青梧传 EP01：苏醒\n\n场1 寝殿 日 内\n人物：裴青梧 婢女\n△烛火摇曳。婢女俯身，轻声唤醒。\n婢女：殿下醒了。\n△裴青梧睁眼，烛火映面，眼神由迷茫转认命。\n裴青梧：我知道。\n△她攥紧被角，指节发白。",
  "planData": {
    "narrativeBrief": {
      "adaptationConstraints": [{ "dimId": "emotion_logic", "choice": "angst", "reason": "古言虐恋基调" }],
      "storyKernel": "真千金苏醒认命 vs 即将觉醒",
      "mustResolveIssues": ["P-001"],
      "reconstructionTrace": [{ "issueId": "P-001", "matrixDim": "emotion_logic", "choice": "angst", "newBeat": "苏醒认命眼神", "densityDecision": "emotion:high" }],
      "empathyPlan": { "rootFor": "CHAR-PEIQINGWU", "ep1EmotionArc": "迷茫→认命", "squeezeMoments": [{ "window": "0-30s", "emotion": "替主角捏汗", "infoId": "INF-ep01-sc1-01" }] },
      "densityBudget": { "emotion": { "ep1_opening": "high" }, "information": { "ep1_first30s_max": 1 }, "plot": { "minReversalPerEp": 1 } },
      "retentionBeats": { "opening5s": "苏醒特写", "opening3to10s": "婢女唤醒", "first30s": "认命眼神" },
      "infoDeliveryPlan": [{ "infoId": "INF-ep01-sc1-01", "delivery": "对白+动作", "forbidden": "opaque_mystery" }],
      "dialogueRules": { "maxExpositionLinesEp1First30s": 2, "requireCausedByAction": true },
      "implementationPlan": [{
        "sceneRef": 1,
        "avCausality": { "visualPeak": "苏醒特写", "audioBeat": "骤停" },
        "fxIntent": { "level": "F0" },
        "voiceIntent": { "speaker": "婢女", "tone": "轻柔" },
        "targetChains": ["av", "generation_apply", "modality_compile"],
        "promptAnchors": { "img": ["烛火", "苏醒"], "vid": ["static", "motion-from-frame"], "aud": ["轻柔女声"] }
      }]
    },
    "sceneMeta": [{
      "sceneRef": 1,
      "opening5sHook": "identity_contrast",
      "avCausality": { "visualPeak": "苏醒特写", "audioBeat": "骤停", "emotionAV": "声画对位" },
      "fxIntent": { "level": "F0" },
      "densityScore": { "emotion": "high", "info": "medium", "plot": "medium" }
    }],
    "globalAnchors": { "G1": "裴青梧：认命 vs 觉醒", "G3": "古言虐恋 70% / 爽 30%" },
    "adaptationProfile": { "genrePreset": "古言虐恋", "lockedChoices": { "D01_nameMap": "keep" } },
    "adaptationMatrixStructured": {
      "userConfirmed": true,
      "matrix": [
        { "dimId": "gender_structure", "choice": "keep" },
        { "dimId": "scene_structure", "choice": "linear" },
        { "dimId": "character_anchor", "choice": "keep_core" },
        { "dimId": "relation_network", "choice": "triangle" },
        { "dimId": "emotion_logic", "choice": "angst" },
        { "dimId": "conflict_design", "choice": "layered" },
        { "dimId": "visual_style", "choice": "ancient_real" },
        { "dimId": "narrative_structure", "choice": "three_act" },
        { "dimId": "core_prop", "choice": "keep" },
        { "dimId": "dialogue_strategy", "choice": "compress" },
        { "dimId": "music_mood", "choice": "tense" },
        { "dimId": "rhythm_plan", "choice": "fast" },
        { "dimId": "D01_nameMap", "choice": "keep" },
        { "dimId": "V05_genreFramework", "choice": "虐恋" },
        { "dimId": "R01_ep1_opening5s", "choice": "identity_contrast" },
        { "dimId": "O01_openingProfile", "choice": "O3_conflict_tableau" }
      ],
      "deepAdaptation": { "nameMap": [], "relationMap": [], "substitutions": [], "settingProfile": { "era": "架空唐宋" } }
    },
    "adaptationStrategy": "保持姓名；强化寝殿空间压迫感；nameMap 已对齐 adaptationMatrix",
    "viralAdaptation": {
      "genreFramework": "虐恋",
      "openingCardPlan": { "ep1": ["困境", "反差", "目标", "动机"] },
      "clipPoints30s": [{ "ep": 1, "scene": "1-1", "hook": "苏醒", "clipable": true }],
      "paypointSchedule": [{ "ep": 2, "ratio": 0.1, "type": "身份差", "clip30s": "认亲" }],
      "retentionPlan": {
        "ep1": {
          "opening5s": { "hookType": "identity_contrast", "visualBeat": "烛火映面", "audioBeat": "骤停" },
          "opening3to10s": { "profileId": "O3_conflict_tableau", "emotionAV": { "visualPeak": "苏醒特写", "fxLevel": "F0" } },
          "first30s": {
            "infoGap": "audience_knows",
            "rhythm31545": { "impact3s": "婢女唤醒", "change15s": "裴青梧应答", "expect45s": "认命眼神" },
            "clip30sCandidate": true
          },
          "episodeEndHook": { "type": "emotion_rebound", "desc": "眼神由认命转警觉" }
        },
        "epN": { "retentionPattern": "spring_tension", "minReversalPerEp": 1 }
      }
    },
    "informationLedger": [
      {
        "infoId": "INF-ep01-sc1-01",
        "fact": "殿下已苏醒但尚未表态",
        "audienceKnows": true,
        "characterKnows": { "裴青梧": true, "婢女": true },
        "emotionTarget": "替观众捏汗",
        "payoffBy": "sc1-end"
      }
    ],
    "dialoguePlan": {
      "lines": [
        {
          "lineId": "L-01",
          "speaker": "婢女",
          "text": "殿下醒了。",
          "functions": ["deliver_info", "emotion_hit"],
          "causedByActionId": "A1",
          "subtext": "试探"
        },
        {
          "lineId": "L-02",
          "speaker": "裴青梧",
          "text": "我知道。",
          "functions": ["character_voice", "conflict_escalate"],
          "causedByActionId": "A2",
          "subtext": "早已清醒"
        }
      ]
    },
    "endCardPack": {
      "preview": { "enabled": true, "overlayText": "下集：身份暗涌", "clipHookIds": ["CLIP-ep02-sc1"], "previewShots": ["shot-2"] }
    }
  },
  "designBrief": {
    "B1": "ep-01",
    "B4": [4, 5, 6],
    "B5": ["钩子：苏醒", "承接：认命"],
    "B14": [{ "position": "ep2-10%", "type": "身份差" }],
    "B15": [{ "clipHookId": "CLIP-ep01-sc1", "hook": "苏醒" }],
    "B20": ["INF-ep01-sc1-01"],
    "B21": { "ref": "dialoguePlan" },
    "B22": { "ref": "narrativeCausalityGraph" },
    "B18": { "opening5sAV": { "shotSize": "MS", "audioBeat": "骤停" } },
    "B19": { "first30sAV": { "rhythm31545": true } },
    "B23": { "retentionInfoDelivery": ["INF-ep01-sc1-01"] },
    "paypointMarkers": [{ "position": "ep2-10%", "type": "身份差" }]
  },
  "narrativeCausalityGraph": {
    "nodes": [
      { "id": "E1", "type": "event", "label": "婢女唤醒" },
      { "id": "E2", "type": "event", "label": "裴青梧应答" },
      { "id": "A1", "type": "visual", "label": "俯身" },
      { "id": "L1", "type": "dialogue", "label": "殿下醒了" }
    ],
    "edges": [{ "from": "A1", "to": "L1", "relation": "cause" }, { "from": "E1", "to": "E2", "relation": "cause" }],
    "broken": [],
    "reverseHints": []
  },
  "debutIntroPack": {
    "items": [
      {
        "entityType": "character",
        "code": "CHAR-PEIQINGWU",
        "copyHint": "裴青梧睁眼，烛火映面",
        "establishingPattern": "特写→中景",
        "subOptional": { "enabled": true, "text": "裴青梧 · 真千金" },
        "fxLevel": "F0"
      }
    ]
  },
  "preDesignPack": {
    "scriptPlan": "# 导演规划\n\n## 场1：寝殿\n- 情绪：5\n",
    "shots": [
      {
        "shotIndex": 1,
        "type": "CHAR-SCENE",
        "sceneName": "寝殿",
        "duration": 2,
        "shotSize": "MS",
        "retentionTier": "0-2s",
        "clip30sCandidate": true,
        "visualDescription": "婢女俯身唤醒殿下",
        "charCodes": ["CHAR-MAID"],
        "shotDesign": {
          "composition": { "foreground": "婢女俯身", "background": "寝殿烛火" },
          "performance": { "microExpression": { "eyes": "soft", "mouthDetail": "neutral_closed" } },
          "cameraAnchor": { "shotSize": "MS", "bgBlur": false },
          "lipSyncPolicy": "subtle_natural"
        },
        "narrative": {
          "dialogue": { "lines": [{ "speaker": "婢女", "text": "殿下醒了。", "lineId": "L-01", "functions": ["deliver_info"], "causedByActionId": "A1" }] },
          "markers": [{ "type": "钩子", "desc": "苏醒", "infoId": "INF-ep01-sc1-01" }],
          "emotionIntensity": 5
        },
        "generation": {
          "imagePrompt": "婢女俯身, 寝殿烛火暖光, 中景半身, 侧光4500K, 古言写实, --cref CHAR-MAID --ar 16:9",
          "videoPrompt": "中景 static, duration 2s, subtle lip sync, natural mouth movement, motion-from-frame",
          "audioPrompt": "婢女, 轻柔女声, 关切"
        }
      },
      {
        "shotIndex": 2,
        "type": "CHAR-SCENE",
        "sceneName": "寝殿",
        "duration": 2,
        "shotSize": "CU",
        "retentionTier": "5-30s",
        "clip30sCandidate": true,
        "rhythm31545": { "change15s": "应答", "expect45s": "眼神" },
        "visualDescription": "裴青梧苏醒，烛火映面",
        "charCodes": ["CHAR-PEIQINGWU"],
        "shotDesign": {
          "composition": { "foreground": "裴青梧睁眼", "background": "烛火暖光" },
          "performance": { "microExpression": { "eyes": "alert", "mouthDetail": "neutral_closed" } },
          "lipSyncPolicy": "subtle_natural"
        },
        "narrative": {
          "dialogue": { "lines": [{ "speaker": "裴青梧", "text": "我知道。", "lineId": "L-02", "functions": ["character_voice"], "causedByActionId": "A2" }] },
          "markers": [{ "type": "承接", "desc": "认命" }],
          "emotionIntensity": 6
        },
        "generation": {
          "imagePrompt": "裴青梧, 寝殿内景, 特写面部 alert eyes mouth neutral_closed, 烛火暖光, --cref CHAR-PEIQINGWU --ar 16:9",
          "videoPrompt": "特写 static, duration 2s, subtle lip sync, natural mouth movement, motion-from-frame",
          "audioPrompt": "裴青梧, 清冷女声, 认命"
        }
      }
    ]
  },
  "characterDesign": {
    "assets": [
      { "code": "CHAR-MAID", "name": "婢女", "L0": { "identity": "侍女", "gender": "女" }, "L3": { "costume": "浅色素衣" } },
      { "code": "CHAR-PEIQINGWU", "name": "裴青梧", "L0": { "identity": "真千金", "gender": "女" }, "L3": { "costume": "白色寝衣" }, "voiceProfile": { "speakingStyle": "清冷简短" } }
    ]
  },
  "visualLockTable": {
    "characterAssets": { "CHAR-MAID": "婢女", "CHAR-PEIQINGWU": "裴青梧" },
    "sceneColorLock": { "寝殿": "4500K暖光" }
  },
  "modalityPromptAudit": { "IMG": "pass", "VID": "pass", "AUD": "pass", "FX": "pass" },
  "fxFeasibilityAudit": { "items": [{ "shotIndex": 1, "level": "F0", "feasible": true }] }
}

---

## §8 多集 continuity

# 十链联动与连贯性（linkageAudit）

T1 修订后的**十链**全闭环。每阶段挂载 LINK 审计，Pipeline 结束写回 continuity。

## 十链定义

| 链 | T1 要求 | 关键字段 | stage |
|----|---------|----------|-------|
| 台词 dialogue | shots.lines + hash | dialogue.lines, externalHashCheck | SB |
| 资产 asset | extract + hint | assetHints, CHAR/SCENE/PROP-CODE | AS/BP |
| 连贯 continuity | continuity JSON | continuityIn/Out, resolveContext | B |
| 视听 av | 结构化情绪 | B4, emotionCurve, emotionIntensity | GB/SB |
| 故事 story | infoLinkageChain | markers, B5 伏笔/揭晓 | B/SB |
| 场景 scene | 场表一致 | B6.scenes, sceneName, BP.sceneColorLock | B/GB/SB |
| 运镜 camera | 景别/过渡/运镜 | B12, shotSize, transitionType, EN.motion | SB/EN |
| 改编 adaptation | 矩阵→策略→剧本 | P03, W2, W3, designBrief | P/W |
| 模态编译 modality_compile | EN→MD×4 | modalityPromptAudit, four slots | EN/MD |
| 生成 generation | 生成反馈 | generationFeedback, MediaProbe | Vendor |
| 修复 repair | SF + linkageRepairPlan | fixPlan, rePushPlan | SF |

## linkageAudit 结构

```json
{
  "linkageAudit": {
    "rulePackVersion": "2.0.1",
    "chains": [
      {
        "chainId": "台词",
        "status": "pass",
        "nodes": [
          { "stage": "W3", "field": "script", "ruleId": "R2" },
          { "stage": "SB", "field": "shots[].dialogue.lines", "ruleId": "H3" }
        ]
      }
    ],
    "blockExport": false
  }
}
```

## 执行步骤

1. 对照 `linkage_chains.json` 逐链检查节点
2. 验证相邻节点字段一致性（如 B4 → GB emotionCurve）
3. 断裂链标注 breakPoint + 建议 repair
4. 任一链 BLOCK → blockExport = true
5. Pipeline 完成 → 写回 continuity JSON

## continuity 写回

```json
{
  "continuity": {
    "episodeKey": "ep-01",
    "characterStates": { "女主": "得知真相，愤怒" },
    "plotThreads": [{ "thread": "玉佩线索", "status": "未揭晓" }],
    "lastScene": "宴会厅",
    "writtenAt": "pipeline-end"
  }
}
```

## BLOCK 闸门（G20–G24）

- 十链均有 status 判定
- 台词链 externalHashCheck.match = true
- 视听链偏差 ≤2（B4 vs emotionCurve）
- 故事链 B5：`payoffEp` 仅未来集号（number）；本集收用 `payoffLabel: "本集收"`
- blockExport = false 方可 T1 出口

## 与 linkageRepairPlan

单链断裂 → linkageRepairPlan（smart_fix 子结构）；多链 → rePushPlan。

---

## §9 导入 Toonflow

# Browser Chat 全流程编排 v2.0.1

## §0 红线 · 三层边界

**CAN**：分阶段对话；P/W/designBrief/GB/SB/CD/AS/BP/EN/MD×4；输出 JSON；对照 PROMPT_STANDARD 自检。

**CANNOT**：调用 Toonflow API/Socket；声称已 import/生图；跳过 GB→SB→CD→BP；自造 ruleId；填假 ruleAudit/linkageAudit/hash pass。

| 层 | 职责 |
|----|------|
| L1 Chat | 按技能生成正确 prompt 与资产包 |
| L2 外部校验 | export 前 `exportGate` / `inspectBundle` 服务器验收 |
| L3 Import | 仅接收已过 export gate 的 bundle |

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
| W1–W2 | storySkeleton / adaptationStrategy | 不得 W3 |
| W3 | script + narrativeSelfcheck | 不得 designBrief |
| designBrief | B1–B23 | 不得 GB |
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

### planData.narrativeBrief（累积 handoff）

各阶段写入并传递，W3 步骤 0 强制读取：

- `adaptationConstraints[]` — P03 matrix choice + reason
- `deepAdaptation` — D01–D04 子对象
- `storyKernel` / `mustResolveIssues[]` — P06
- `reconstructionTrace[]` — P06→W3 可追溯链
- `empathyPlan` / `densityBudget` — P0/G/W2
- `retentionBeats` / `infoDeliveryPlan[]` / `dialogueRules`
- `implementationPlan[]` — W3→SB→EN→MD 正推锚点
- `seriesContinuity` — W1 ep2+ carryInfo

### planData.sceneMeta[]

W3 每场 sidecar：`avCausality`, `fxIntent`, `densityScore`, `opening5sHook`

### 闸门

W3 未过 `W3_narrative_selfcheck` → **禁止** designBrief / export。

## §8 导入说明

export JSON → **必须** `POST /api/ruleEngine/exportGate` 验收 → `POST importScript` 落库。  
T3 默认 `blockOnQualityGate=true`；若 `exportGate.exportAllowed !== true`，不得 import。

## §9 正推/反推

检测 fail → `rePushPlan[]` → 修订对应 stage → 重检（maxRounds=3）。

## 引用套件

- `docs/PROMPT_STANDARD.md` — 生成与验收标准
- `docs/CHAT_FULL_PIPELINE_SPEC.md` — 全链路规范
- `browser_chat/T3_quality_gate.md` — T3 出口清单
- `browser_chat/production/` — T2/T3 制作 skill
- `browser_chat/corridor/` — 质量走廊

---

## §10 智能检测 SD

# 智能检测 SD

每阶段末产出 `smartDetection.[stageId]`，supervision 汇总为 A/B/C/D。

## SD-P · 改编预检

| 项 | 检测 | BLOCK |
|----|------|-------|
| 六维度 | P1–P6 有分有理由 | 任缺 |
| 质量等级 | P7 | 差 |
| 方向 | P13–P18 共 3 条 | <3 |

写入 `smartDetection.P0` / `P03` / `P06` / `P08` / `P09`。

## SD-M · 改编矩阵

12 维均有 choice；映射覆盖 preCheck 主问题。

## SD-W · 剧本

| 项 | 规则 | BLOCK |
|----|------|-------|
| 台词保真 | R2 | hash 不一致 |
| 开篇/集末钩 | W12/W13 | 缺 |
| 密度 | W-DEN-1 | 三项均低 |
| 时长 | W-TIME | 超项目预算 |

## SD-S · 监督总检

汇总 P/G/W/designBrief/GB/SB，输出 `supervisionReport`：

| 等级 | 含义 | 动作 |
|------|------|------|
| A | 可直接 T1 出口 | — |
| B | 小修 | fixPlan 可选 |
| C | 需 SF | fixPlan 必做 |
| D | 反推 | rePushPlan |

## SD-R · 规则覆盖

对照 `ruleAudit.stages` 与 rule_cards stage 过滤，输出 `ruleApplicationReport` 摘要（附录 E）。

## SD-D · 设计七维（T1）

| 维 | 检测 | BLOCK |
|----|------|-------|
| 台词 dialogue | R2/H3 lines 覆盖率 | hash 不一致 |
| 场景 scene | B6 ↔ sceneName | 场名漂移 |
| 故事 story | B5 ↔ markers | 伏笔无 payoff |
| 运镜 camera | shotSize/transition 白名单 | PR-CAM-01 |
| 视听 av | B4 ↔ emotionCurve 偏差 | >2 |
| 改编 adaptation | P03→W2→W3 链 | 矩阵未落地 |
| 视听 compile | EN 四 slot（T3） | PC-13 |

写入 `smartDetection.B` / `GB` / `SB` / `LINK`；与 DC-01~15 dryRun 对齐。

## Schema

```json
{
  "smartDetection": {
    "W3": { "grade": "B", "issues": [{ "id": "R2", "severity": "BLOCK", "msg": "..." }] },
    "supervision": { "overall": "B", "blockers": [] }
  }
}
```

---
name: supervision_review
description: SD-S 监督审核 A/B/C/D 评级与闸门
stageId: SD-S
outputTag: supervisionReport
rulePackVersion: "2.0.1"
---

# SD-S 监督审核

Browser Chat 监督层，对 W1 骨架、W2 策略、T1 终稿等产出评级。**只提问题与建议，不做修改决策。**

## 审核对象映射

| 关键词 | 审核对象 | 对照 Skill |
|--------|----------|------------|
| 骨架/故事骨架 | storySkeleton | W1_skeleton |
| 策略/改编策略 | adaptationStrategy | W2_strategy |
| 剧本/T1 | script + preDesignPack | W3 + corridor |

## 评级标准（A/B/C/D）

| 评级 | 严重问题 | 中等问题 | 闸门 |
|------|----------|----------|------|
| **A** 可直接使用 | 0 | ≤2 | 放行 |
| **B** 小修后可用 | 0 | ≤5 | 放行（附建议） |
| **C** 需较大修改 | 1–2 | 不限 | **BLOCK 下一阶段** |
| **D** 建议重做 | ≥3 | 不限 | **BLOCK 下一阶段** |

## 报告结构

```markdown
# 审核报告：{对象}
## 总评
- **评分**：B
- **概要**：...
## 问题清单
| # | 严重程度 | 审核项 | 问题 | 建议方案 |
## 需要您决定（仅 C/D）
```

## 短剧通用红线（违反即严重）

1. 连续 3 集无情绪爆点  2. 多线并行  3. 第 1 集无强冲突
4. 现实官职称谓  5. 大段旁白灌输  6. 金手指同质化
7. 反转空降硬凹  8. 开篇三天坑  9. 只堆吵架无真矛盾

## T1 专项（R2 台词忠实）

- 剧本 hash ↔ preDesignPack.shots.lines hash 一致
- 每句台词映射到 `narrative.dialogue.lines`
- externalHashCheck.match = true

## 执行步骤

1. 识别审核对象，读取对应 planData 字段
2. 对照 Skills 红线逐项检查
3. 合并同类轻微问题
4. 输出评级 + 问题清单
5. 写入 `supervisionReport`

## 输出

```json
{
  "supervisionReport": {
    "target": "storySkeleton",
    "grade": "B",
    "rulePackVersion": "2.0.1",
    "issues": [{ "severity": "medium", "item": "付费点分布", "desc": "...", "fix": "..." }],
    "blockNext": false
  }
}
```

C/D 级 → 触发 smart_fix 或 corridor_repush，不得进入下一阶段。

---

## §11 正推反推

# 走廊反推 · rePushPlan

检测 fail 或 supervision C/D 时，产出 `rePushPlan[]`，从上游 stage **正向重跑**（非单字段 patch）。maxRounds = 3。

## 触发来源

- supervision_review grade C/D
- T1_quality_gate BLOCK
- identityAudit / fxFeasibilityAudit / PR 检出
- linkageAudit 多链断裂
- GenerationFeedback 回流

## rePushPlan schema

```json
{
  "rePushPlan": [
    {
      "id": "RP-{episodeKey}-r1",
      "rulePackVersion": "2.0.1",
      "round": 1,
      "maxRounds": 3,
      "symptom": "情绪不符",
      "qpId": "QP-08",
      "reverseTarget": "designBrief",
      "affectedStages": ["B", "GB", "SB"],
      "forwardRerun": ["design_brief", "corridor_GB", "corridor_SB"],
      "preserveFields": ["script", "globalAnchors"],
      "reason": "SB 情绪强度与 B4 弧线偏差>3",
      "status": "pending|in_progress|completed|exhausted"
    }
  ]
}
```

## reverse_route_table 摘要

| 症状域 | reverseTarget | forwardRerun |
|--------|---------------|--------------|
| 台词不符 | SB 或 W3 | corridor_SB / W3_script |
| 情绪不符 | designBrief / GB | design_brief → corridor_GB |
| 构图难表达 | presentationFork | W3 △ 或 SB spatialRelation |
| 故事断链 | W3 / W2 / W1 | 按断裂深度上游 |
| prompt 不合规 | EN / MD | corridor_EN → MD_prompt_compliance |
| 身份不一致 | BP / EN | BP_blueprint → corridor_EN |

## presentationFork

当「构图难表达」时，二选一：

- **fork-A**：改 W3 △ 描述（叙事层）
- **fork-B**：改 SB spatialRelation（镜级）

须在 rePushPlan 中显式标注 fork 选择。

## 执行步骤

1. 读取症状 + qpId（如有）
2. 查 reverse_route_table 确定 reverseTarget
3. 列出 affectedStages + forwardRerun 顺序
4. 标注 preserveFields（锚点/剧本通常保留）
5. round++ ，超限设 status=exhausted

## 产品契约（质量优先）

- **rePush / 回推按钮 = 仅跳转设计台，不改 JSON 数据**。
- 真正修复：复制 `chatRepairText`（exportGate / import 400 / burn 失败）→ Chat 改字段 → 再 dryRun/exportGate → 再导入/烧片。
- 路由表须含 `cam_whitelist`、`img_cref_missing`、`narrative_split_hint`、`pr_lip_duration`、`modality_fx_missing`；禁止落到 INFRA 死路由。

## BLOCK

round > 3 → 停止自动重推，上报用户决策。

---

## §12 质量问题 QP

{
  "version": "2.0.1",
  "items": [
    { "id": "QP-01", "label": "场数过少", "severity": "BLOCK", "reverseTarget": "W3", "chain": "story" },
    { "id": "QP-02", "label": "画面描述空泛", "severity": "BLOCK", "reverseTarget": "SB", "chain": "av" },
    { "id": "QP-03", "label": "台词与源不一致", "severity": "BLOCK", "reverseTarget": "W3", "chain": "dialogue" },
    { "id": "QP-04", "label": "对白密度异常", "severity": "WARN", "reverseTarget": "SB", "chain": "dialogue" },
    { "id": "QP-05", "label": "角色称谓混乱", "severity": "BLOCK", "reverseTarget": "W3", "chain": "dialogue" },
    { "id": "QP-06", "label": "情绪单调", "severity": "WARN", "reverseTarget": "GB", "chain": "av" },
    { "id": "QP-07", "label": "钩子不足", "severity": "WARN", "reverseTarget": "W1", "chain": "story" },
    { "id": "QP-08", "label": "张力不足", "severity": "WARN", "reverseTarget": "W2", "chain": "story" },
    { "id": "QP-09", "label": "吸引力弱", "severity": "WARN", "reverseTarget": "W3", "chain": "story" },
    { "id": "QP-10", "label": "信息链断裂", "severity": "BLOCK", "reverseTarget": "designBrief", "chain": "story" },
    { "id": "QP-11", "label": "资产引用缺失", "severity": "BLOCK", "reverseTarget": "AS", "chain": "asset" },
    { "id": "QP-12", "label": "cref 未绑定", "severity": "BLOCK", "reverseTarget": "EN", "chain": "asset" },
    { "id": "QP-13", "label": "跨镜色温跳变", "severity": "WARN", "reverseTarget": "SB", "chain": "av" },
    { "id": "QP-14", "label": "运镜不可执行", "severity": "BLOCK", "reverseTarget": "EN", "chain": "camera", "ruleId": "PR-CAM-01" },
    { "id": "QP-15", "label": "时长与台词不匹配", "severity": "BLOCK", "reverseTarget": "SB", "chain": "dialogue" },
    { "id": "QP-16", "label": "模态 slot 缺失", "severity": "BLOCK", "reverseTarget": "EN", "chain": "av" },
    { "id": "QP-17", "label": "FX 词不可实现", "severity": "BLOCK", "reverseTarget": "SB", "chain": "av" },
    { "id": "QP-18", "label": "identity 冲突", "severity": "BLOCK", "reverseTarget": "EN", "chain": "asset" },
    { "id": "QP-19", "label": "debut 缺 establishing", "severity": "WARN", "reverseTarget": "SB", "chain": "story" },
    { "id": "QP-20", "label": "跨集衔接弱", "severity": "WARN", "reverseTarget": "W3", "chain": "continuity" }
  ]
}

---

## §13 统一闭环

{
  "version": "2.0.1",
  "rulePackVersion": "2.0.1",
  "stages": [
    {
      "stageId": "P0",
      "track": "both",
      "tier": "T1",
      "name": "预检",
      "ruleIds": [
        "P1",
        "P2",
        "P3",
        "P4",
        "P5",
        "P6",
        "P7",
        "P8",
        "P9",
        "P10",
        "P11",
        "P12",
        "P16",
        "P17",
        "P18"
      ]
    },
    {
      "stageId": "GB",
      "track": "both",
      "tier": "T1",
      "name": "导演规划",
      "ruleIds": []
    },
    {
      "stageId": "SB",
      "track": "both",
      "tier": "T1",
      "name": "分镜表",
      "ruleIds": [
        "V1",
        "V2",
        "V3",
        "V4",
        "V5",
        "V6",
        "V7",
        "V8",
        "V9",
        "V10",
        "V11",
        "V12",
        "V13",
        "V14",
        "V15",
        "V16",
        "V17",
        "V18",
        "V19",
        "V20",
        "V21",
        "V22",
        "V23",
        "V24",
        "V25",
        "V26",
        "V27",
        "V28",
        "V29",
        "V30",
        "V31",
        "V32",
        "V33",
        "V34",
        "V35",
        "V36",
        "V37",
        "V38",
        "V39",
        "V40",
        "V41",
        "V42",
        "V43",
        "V44",
        "V45",
        "V46",
        "V47",
        "V48",
        "V49",
        "V50",
        "V51",
        "V52",
        "V53",
        "V54",
        "V55",
        "V56",
        "V57",
        "V58",
        "V59",
        "V60",
        "V61",
        "V62",
        "V63",
        "V64",
        "V65",
        "V66",
        "V67",
        "V68",
        "V69",
        "V70",
        "V71",
        "V72",
        "V73",
        "V74",
        "V75",
        "V76",
        "V77",
        "V78",
        "V79",
        "V80",
        "V81",
        "V82",
        "V83",
        "V84",
        "V85",
        "V86",
        "V87",
        "V88",
        "V89",
        "V90",
        "V91",
        "V92",
        "V93",
        "V94",
        "V95",
        "V96",
        "V97",
        "V98",
        "I1",
        "I2",
        "I3",
        "I4",
        "I5",
        "I6",
        "I7",
        "I8",
        "I9",
        "I10",
        "I11",
        "I12",
        "I13",
        "I14",
        "I15",
        "I16",
        "X1",
        "X2",
        "X3",
        "X4",
        "X5",
        "X6",
        "X7",
        "X8",
        "X9",
        "X10",
        "X11",
        "X12",
        "X13",
        "X14",
        "X15",
        "X16",
        "X17",
        "X18",
        "X19",
        "X20",
        "X21",
        "Z1",
        "Z2",
        "Z3",
        "Z4",
        "Z5",
        "Z6",
        "Z7",
        "Z8",
        "Z9",
        "Z10",
        "Z11",
        "Z12",
        "Z13",
        "Z14",
        "Z15",
        "Z16",
        "Z17",
        "D1",
        "D2",
        "D3",
        "D4",
        "D5",
        "D6",
        "D7",
        "D8",
        "D9",
        "D10",
        "D11",
        "D12",
        "D13",
        "D14",
        "D15",
        "D16",
        "D17",
        "D18",
        "D19",
        "D20",
        "D21",
        "D22"
      ]
    },
    {
      "stageId": "EN",
      "track": "both",
      "tier": "T1",
      "name": "分镜面板",
      "ruleIds": [
        "M1",
        "M2",
        "M3",
        "M4",
        "M5",
        "M6",
        "M7",
        "M8",
        "M9",
        "M10",
        "M11",
        "M12",
        "M13",
        "M14",
        "M15",
        "M16",
        "S1",
        "S2",
        "S3",
        "S4",
        "S5",
        "S6",
        "S7",
        "S8",
        "S9",
        "S10",
        "S11",
        "S12",
        "S13",
        "S14",
        "S15",
        "S16",
        "S17",
        "S18",
        "S19",
        "S20",
        "S21",
        "S22",
        "S23",
        "Y1",
        "Y2",
        "Y3",
        "Y4",
        "Y5",
        "Y6",
        "Y7",
        "Y8",
        "Y9",
        "Y10"
      ]
    },
    {
      "stageId": "MD",
      "track": "both",
      "tier": "T3",
      "name": "模态编译",
      "ruleIds": []
    },
    {
      "stageId": "GEN",
      "track": "both",
      "tier": "T3",
      "name": "生成反馈",
      "ruleIds": []
    },
    {
      "stageId": "validate",
      "track": "internal",
      "tier": "all",
      "name": "RuleEngine validate",
      "ruleIds": [
        "H1",
        "H2",
        "H3",
        "H4",
        "H5",
        "H6",
        "H7",
        "H8",
        "H9",
        "H10"
      ]
    }
  ],
  "internalGaps": [
    {
      "id": "I1",
      "gap": "INT validate ~8 rules",
      "owner": "INT",
      "wave": "INT-1"
    },
    {
      "id": "I2",
      "gap": "o_storyboard missing fields",
      "owner": "合流",
      "wave": "P1"
    },
    {
      "id": "I3",
      "gap": "BP not wired",
      "owner": "Chat+INT",
      "wave": "P1"
    },
    {
      "id": "I4",
      "gap": "autoFix 3 hardcoded",
      "owner": "合流",
      "wave": "P1"
    },
    {
      "id": "I5",
      "gap": "GenerationFeedback weak",
      "owner": "合流",
      "wave": "P1"
    },
    {
      "id": "I6",
      "gap": "videoDesc free text",
      "owner": "INT",
      "wave": "P1"
    },
    {
      "id": "I7",
      "gap": "generation failure no回流",
      "owner": "INT",
      "wave": "P1"
    },
    {
      "id": "I8",
      "gap": "continuityTracking writeback",
      "owner": "INT",
      "wave": "P2"
    },
    {
      "id": "I9",
      "gap": "H3 causality validator",
      "owner": "合流",
      "wave": "INT-1"
    },
    {
      "id": "I10",
      "gap": "autoDesign heuristic only",
      "owner": "合流",
      "wave": "P1"
    }
  ],
  "confluencePipeline": [
    "importScript|importBundle",
    "resolveContext",
    "merge preDesignPack.shots",
    "autoDesign skip SB if shots",
    "validate INT + QP",
    "dryRun modalityPromptAudit",
    "QualityGate",
    "ModalityOrchestrator",
    "generationFeedback",
    "continuity writeback"
  ]
}

---

## §14 制作实现闭环

---
name: production_identity_audit
description: identityAudit 跨模态 IMG/VID/AUD 一致性 BLOCK
stageId: PI
outputTag: identityAudit
rulePackVersion: "2.0.1"
---

# 制作身份审计（identityAudit）

解决「设计男/图视音女」等多端不一致。跨 IMG/VID/AUD 三模态 BLOCK 校验，失败触发 rePush EN/BP。

## 触发时机

- T2 EN compile 完成后
- T3 MD prompt 生成前
- GenerationFeedback 报告角色漂移

## 审计维度

| 模态 | 检查字段 | 对照源 |
|------|----------|--------|
| IMG | refs.CHAR-CODE, L0-L6 外貌 | visualLockTable |
| VID | subject 描述, 性别/发型/服装 | BP + G1 |
| AUD | voice.speed, timbre, gender | BP voiceLock |
| 跨模态 | 同一角色三模态 gender/age/发型 | identityMatrix |

## identityAudit 结构

```json
{
  "identityAudit": {
    "rulePackVersion": "2.0.1",
    "episodeKey": "ep-01",
    "characters": [
      {
        "charCode": "CHAR-001",
        "name": "女主",
        "modalities": {
          "IMG": { "gender": "女", "hair": "黑长直", "pass": true },
          "VID": { "gender": "女", "hair": "黑长直", "pass": true },
          "AUD": { "gender": "女", "timbre": "清冷", "pass": false }
        },
        "overallPass": false,
        "driftDetail": "AUD timbre 与 G1 voiceStyle 不符"
      }
    ],
    "blockGenerate": true,
    "rePushTarget": "BP"
  }
}
```

## 执行步骤

1. 从 visualLockTable 读取 L0 identity + voice
2. 逐角色提取 IMG/VID/AUD 描述
3. 比对 gender/age/发型/服装/音色五元组
4. 标记 driftDetail + overallPass
5. 任一角色 fail → blockGenerate=true

## BLOCK 闸门

- 所有主角 + 当集出场角色 overallPass=true
- CHAR-CODE 三模态均有记录
- fail 时须附 rePushTarget（BP 或 EN）

## 修复路由

| 漂移类型 | rePush |
|----------|--------|
| 外貌 | BP → CD L0-L6 |
| 视频主体 | EN subject 重 compile |
| 音色 | BP voiceLock → AUD |

# 特效可实现性审计（F0–F5）

特效设计 → prompt → AI 生成链路的前置闸门。对照 `fx_feasibility_matrix.json`。

## 审计等级 F0–F5

| 等级 | 含义 | 处理 |
|------|------|------|
| **F0** | 纯实拍，无特效 | 直接通过 |
| **F1** | 轻后期（调色/模糊） | 标准 prompt |
| **F2** | 粒子/光效（模型擅长） | 附参考词表 |
| **F3** | 中等特效（变形/融合） | 需 degrade 备选 |
| **F4** | 高难度（大规模破坏） | degradeFixPlan 必须 |
| **F5** | 当前模型不可实现 | BLOCK + 改 W3 △ 或 SB |

## fxFeasibilityAudit 结构

```json
{
  "fxFeasibilityAudit": {
    "rulePackVersion": "2.0.1",
    "items": [
      {
        "shotId": "shot-5",
        "fxDesc": "手掌发出金色光芒",
        "level": "F2",
        "modelCapable": true,
        "promptHint": "soft golden glow, hand close-up"
      }
    ],
    "blockCount": 0,
    "overallPass": true
  }
}
```

## degradeFixPlan（F4+）

```json
{
  "degradeFixPlan": {
    "original": "大楼爆炸坍塌",
    "degraded": "远处烟雾+人群惊逃反应",
    "targetStage": "W3",
    "ruleId": "F4-DEG"
  }
}
```

## 执行步骤

1. 从 shots 提取 △ 中含特效描述的镜
2. 对照 matrix 判定 F0–F5
3. F4+ 必须写 degradeFixPlan
4. F5 → blockCount++，附 GenerationFeedback
5. overallPass = blockCount === 0

## BLOCK 闸门

- F5 项须降级或 rePush 上游
- F4 须有 degradeFixPlan
- 与 debutIntroPack 特效介绍镜协调

## 反馈合流

生成失败 → GenerationFeedback → rePushPlan（见 corridor_repush）。

---
name: production_debut_intro
description: debutIntroPack 首次出场标准介绍镜
stageId: PD
outputTag: debutIntroPack
rulePackVersion: "2.0.1"
---

# 首次出场介绍（debutIntroPack）

角色/场景/道具**首次出场**时，产出标准 establishing 镜 + copyHint，可选 SUB 字幕。

## 触发条件

- 角色/场景/道具在剧集中首次出现
- BP visualLockTable 有对应 CODE 定义
- 对照 `debut_intro_templates.json`

## debutIntroPack 结构

```json
{
  "debutIntroPack": {
    "rulePackVersion": "2.0.1",
    "items": [
      {
        "entityType": "character",
        "code": "CHAR-002",
        "name": "反派",
        "firstAppearanceShot": "shot-3",
        "establishingPattern": "局部特写→拉远全身",
        "copyHint": "神秘男子缓步走入，气场压迫",
        "subOptional": { "enabled": true, "text": "陆霆 · 陆家继承人" },
        "fxLevel": "F0",
        "linkedG1": "characterSoul[1]"
      }
    ]
  }
}
```

## establishing 镜模板

| 实体 | 推荐模式 | 时长 |
|------|----------|------|
| 主角 | 出场七技之一 + 记忆点道具 | 3–5s |
| 反派 | 背影/剪影→正面 reveal | 2–4s |
| 场景 | 远景建立→推进关键锚点 | 3–5s |
| 道具 | 特写→功能展示 | 2–3s |

## 执行步骤

1. 扫描本集 script + shots，标记首次出场实体
2. 为每个实体选 establishingPattern
3. 写 copyHint（可拍 △ 级描述，非 prompt）
4. 重要角色附 subOptional
5. 插入或标注对应 shot，不破坏 R2 台词链

## BLOCK 闸门

- 本集新出场主角/反派均有 item
- establishingShot 已映射到 shots[].id
- copyHint 无 prompt/vendor 语法
- 与 fxFeasibilityAudit F 等级一致

## 与 SB/EN 关系

- SB 阶段：标注 debut 镜 type=ESTABLISHING
- EN 阶段：refs 锁定 BP CODE，compile 保护锚点

---
name: production_reasonableness_PR
description: 分镜合理性 PR-01 至 PR-16 审计
stageId: PR
outputTag: reasonablenessAudit
rulePackVersion: "2.0.1"
---

# 分镜合理性审计（PR-01–PR-16）

分镜不合理时**反推重设计**，走 rePushPlan（非单字段 fix）。

## PR 规则清单

| ID | 检查项 | 严重度 | 典型反推 |
|----|--------|--------|----------|
| PR-01 | 景别与情绪不匹配 | WARN | SB shotSize |
| PR-02 | 单镜时长超平台阈值 | WARN | SB duration |
| PR-03 | 同场景重复构图 >3 | BLOCK | SB 拆镜 |
| PR-04 | 台词镜无人物 | BLOCK | SB 补 CHAR |
| PR-05 | 情绪跳变无铺垫 | BLOCK | GB/W3 |
| PR-06 | 空间关系矛盾 | BLOCK | SB spatialRelation |
| PR-07 | 竖屏横向全景 | BLOCK | SB shotSize |
| PR-08 | 因果断裂（动作无因） | BLOCK | W3 △ |
| PR-09 | 信息镜缺 markers | WARN | shots.markers |
| PR-10 | 钩子镜缺失 | BLOCK | SB 末镜 |
| PR-11 | 群戏人数与资产不符 | WARN | AS extract |
| PR-12 | 跨场跳切无过渡 | WARN | GB 过渡表 |
| PR-13 | OS/VO 镜标 type 错误 | BLOCK | SB dialogue.type |
| PR-14 | 正反打轴线混乱 | WARN | SB spatialRelation |
| PR-15 | 特效镜无 F 等级 | BLOCK | fxFeasibilityAudit |
| PR-16 | 首次出场无 establishing | BLOCK | debutIntroPack |
| PR-CAM-01 | 运镜/过渡不可执行 | BLOCK | EN / SB transition |

> **PR-CAM-01** 专责运镜白名单与 transitionType；情绪跳变仍走 **PR-05** → GB/W3。

## 输出结构

```json
{
  "reasonablenessAudit": {
    "rulePackVersion": "2.0.1",
    "items": [
      { "ruleId": "PR-05", "shotId": "shot-7", "severity": "BLOCK", "desc": "情绪从2跳到9无铺垫" }
    ],
    "blockCount": 1,
    "rePushPlanRef": "RP-ep-01-r1"
  }
}
```

## 执行步骤

1. 逐 shot 跑 PR-01–PR-16
2. BLOCK 项计数 blockCount
3. blockCount > 0 → 生成 rePushPlan（非 fixPlan）
4. 按断裂深度选 reverseTarget：SB < GB < W3
5. 与 narrativeCausalityGraph 交叉验证

## BLOCK 闸门

- blockCount = 0 方可进 EN/生成
- PR-08 断裂须附因果图断点 ID
- 反推须走 corridor_repush schema

## 与 QP 映射

| 用户话术 | QP | PR |
|----------|-----|-----|
| 太单调 | QP-06 | PR-03 |
| 没张力 | QP-08 | PR-05 |
| 场太少 | QP-02 | PR-12 |
| 运镜不行 | QP-14 | PR-CAM-01 |

---
name: modality_closure_checklist
description: 模态可实现性闭环清单（W3→SB→MD×4 正推 + missing/optimize）
stageId: modality_closure
rulePackVersion: "2.0.1"
---

# 模态闭环清单（§14.5）

T3 export 前，逐镜 walk **implementationPlan → SB → generation 四槽**。

## 步骤

1. 读取 `planData.narrativeBrief.implementationPlan[]`
2. 对照 `preDesignPack.shots[]` 与 `generation.{image,video,audio,fx}Prompt`
3. 对照 `fxFeasibilityAudit` / `modalityPromptAudit`
4. 输出表格并自修

## 表格模板

| shotIndex | chain | status | gapId | repairHint |
|-----------|-------|--------|-------|------------|
| 1 | av | OK/MISSING/OPTIMIZE | MOD-03 | RH-MOD-AUD |

## MISSING vs OPTIMIZE

| 类型 | 定义 | 示例 |
|------|------|------|
| MISSING | 上游有意图，下游字段空 | W3 audioBeat 有、无 audioPrompt |
| OPTIMIZE | 链存在但质量弱 | GEN-05 VD 与 imagePrompt 不一致 |

## MOD 检查（MOD-01~07）

- MOD-01: fxIntent 有但 SB 无 visualEffect
- MOD-02: visualEffect 有但无 fxPrompt
- MOD-03: audioBeat 有但台词镜无 audioPrompt
- MOD-04: voiceProfile 与 audioPrompt 冲突
- MOD-05: retentionTier 0-2s 镜 VID 无 static/motion-from-frame
- MOD-06: debutIntroPack.fxLevel > F2 且无 degrade
- MOD-07: modalityPromptAudit 某 slot 空

## export 前三步

1. narrative selfcheck（§5）
2. 本清单 → 列出 missing / optimize
3. 自修后对照 `closureReport` 模板再 export

---

## §15 四模态触达走廊

# §15 四模态触达走廊（Base + Agnes 默认）

Layer0 **BaseSpec**（主流公用）+ Layer1 **Agnes VendorPack**（默认）+ **Touch L0** 触达前闸门。

## 架构

```
设计走廊(T1-T2) → EN compile → MD 四模态(IMG/VID/AUD/FX) → VendorPack → 审计 → import dryRun → 生成 → generationFeedback
```

## 边界矩阵 CAN / CANNOT

| 模态 | CAN | CANNOT |
|------|-----|--------|
| IMG | MD 写 imagePrompt；BP 写 L0 gender | SB 写 prompt；MD 改 lines |
| VID | EN compile motion；MD 写 videoPrompt | EN 调 API；singleImage 改面部 |
| AUD | MD 写 audioPrompt；SB 写 lines | MD 改 lines 文本 |
| FX | MD 写 fxPrompt；F4 仅基底 | F5 未降级 export |
| 跨模态 | T3 四 slot 齐全 | T1 写四模态 prompt |

## Agnes VendorPack 默认

| 模态 | 叠加 |
|------|------|
| IMG | tag-stack-zh；无 negative 通道 |
| VID | singleImage + motion-from-frame + generate_audio |
| AUD | dialogue-native（台词镜） |
| FX | F≤3 默认可出；F4/F5 降级 |

## AG-GATE 摘要

| ID | 检查 |
|----|------|
| AG-GATE-01 | singleImage 须 referenceImage / 分镜图 |
| AG-GATE-02 | motion 白名单；禁面部重写 QF-EXPR-06 |
| AG-GATE-03 | duration 1–30s |
| AG-GATE-04 | 剥离 @图N / negative 通道 |

## videoAudioPolicy

| 值 | 说明 |
|----|------|
| native | 台词镜 generate_audio=true + dialogue-native（Agnes 默认） |
| post | Vendor 不支持 native → TTS-dubbing / post-bgm |

见 `data/fixtures/video_audio_policy.json`。

## 正推链（每模态）

| 模态 | 正推 |
|------|------|
| IMG | CD→BP→SB→EN→MD-IMG |
| VID | SB→EN→MD-VID→首帧图→singleImage |
| AUD | W3→SB lines→EN→MD-AUD→native/TTS |
| FX | W3→SB visualEffect→EN→MD-FX |

## 反推链 + rePush 优先级

| 优先级 | 域 | 触发 | 先修 | 再修 | 最后 |
|--------|-----|------|------|------|------|
| P0 | VID | 缺首帧/时长/运镜 | MD-VID/EN | IMG | SB |
| P0 | IMG | cref/identity/PURE | MD-IMG/EN | BP | SB |
| P1 | AUD | native/lines/voice 冲突 | MD-AUD/EN | BP L6 | SB |
| P1 | FX | F5/F4 未处理 | MD-FX/SB | W3 | — |
| P2 | 跨模态 | identityAudit 失败 | EN 全模态 | BP/CD | — |
| P3 | 叙事 | PR/graph/linkage | SB/W3 | designBrief | W1 |

见 `data/fixtures/reverse_route_table.json` + `modality_touch_matrix.json`。

## dryRun PC-09~14

| ID | 域 | 规则 |
|----|-----|------|
| PC-09 | VID | 首帧/时长/运镜（Agnes singleImage） |
| PC-10 | AUD | native 或 TTS 路径 + voiceProfile |
| PC-11 | IMG | cref/identity/PURE 词 |
| PC-12 | FX | 无 F5；F4 有 postProductionOnly |
| PC-13 | 跨模态 | T3 四 slot 齐全 |
| PC-14 | 跨模态 | identityAudit IMG/VID/AUD 一致 |

与 PC-01~08（§14）合流，exportGate 见 `production_closure_checklist.json`。

## SD / SF 挂载

| SD | 域 |
|----|-----|
| SD-IMG-01~02 | cref、PURE 词 |
| SD-VID-01~04 | 首帧、运镜、时长、lipSync |
| SD-AUD-01~04 | lines hash、voice、路径、OS/VO |
| SD-FX-01~03 | F 等级、与 VID 复杂度 |

见 `stages/smart_detection_modality.md`。

## Vendor 切换（§15.7）

切换 kling/wan 等：**仅换 VendorPack**，Base 规则 ID（V1–V10、QF-EXPR、PR-*）不变。Chat export 标注 `defaultVendor`。

## MediaProbe 预留（§15.8）

生成后 ffprobe 检 duration/audio 轨 → generationFeedback 二次路由。接口：`MediaProbePort`（`probeDuration` / `probeHasAudio`）。

## §15.9 七维 × 四模态合流

设计七维正推在 T1 止于 SB；T2/T3 经 EN 编译进入四模态。反推时**先模态后设计**：

| 七维 | IMG | VID | AUD | FX |
|------|-----|-----|-----|-----|
| 台词 | — | lipSync | lines hash | — |
| 场景 | scene lock | 首帧场景 | 环境音 | 场景基底 |
| 故事 | markers 视觉化 | 钩子镜 | VO/OS | F 等级 |
| 运镜 | — | motion 白名单 | — | — |
| 视听 | emotion tag | expr/motion | emotion BGM | 氛围 |
| 改编 | — | — | — | — |
| 编译 | imagePrompt | videoPrompt | audioPrompt | fxPrompt |

合流 dryRun：`unified_closure_matrix.json`（DC+PC+GC+IC）。见附录 T/U/V/W。

## 验收 G73–G85

见 `docs/BROWSER_CHAT_TUTORIAL.md` §9 与 `yarn test:production-closure-golden`。

# MD 图像模态（IMG）

T3 产出每镜 `imagePrompt`，trace 回 SB/BP 字段。

## slots

subject, scene, composition, lighting, style, negative, cref, identity

## CAN / CANNOT

| CAN | CANNOT |
|-----|--------|
| 从 EN Y.subject 编译 prompt | 修改 SB lines |
| 写入 --cref CHAR-CODE | 漂移锚点 token |
| PURE-SCENE 前置 no people | T1 档位写 imagePrompt |

## BaseSpec 规则

- V1–V4：type / cref / negative 位置 / --ar
- CHAR-SCENE 须 `--cref CHAR-CODE`
- PURE-SCENE 前 10 词含 `no people, no characters`
- identity 与 BP L0.gender 一致（identityAudit）

## Agnes VendorPack

- tag-stack-zh 模板
- 无独立 negative 通道 → AG-GATE-04 剥离 @图N
- cref 引用分镜图或角色资产

## 正推

```
BP L0 → SB charCodes/type → EN subject → MD-IMG imagePrompt
```

## 反推

| 问题 | 目标 |
|------|------|
| cref 无法解析 | EN → BP |
| identity 与 VID/AUD 冲突 | EN 全模态重 compile |
| PURE 词缺失 | EN 前置 negative |

## SD / SF

| ID | 检查 | SF |
|----|------|-----|
| SD-IMG-01 | cref 存在且可解析 | V4 auto |
| SD-IMG-02 | PURE 类型 negative 位置 | V2/V3 |

## 输出

```json
{
  "generation": { "imagePrompt": "..." },
  "modalityPromptAudit": {
    "items": [{ "modality": "IMG", "ruleId": "V4", "severity": "PASS" }]
  }
}
```

**Bundle 路径**：`preDesignPack.shots[].generation.imagePrompt` 或 `flowData.storyboard[].prompt`。标准见 `docs/PROMPT_STANDARD.md` §2。

# MD 视频模态（VID · Agnes 默认）

## slots

motion, camera, duration, lipSync, identity, fx

## CAN / CANNOT

| CAN | CANNOT |
|-----|--------|
| EN compile motion/camera | EN 直接调生成 API |
| singleImage 引用首帧 | 重写面部表情 QF-EXPR-06 |
| generate_audio 与 lines 对齐 | duration 脱离 SB |

## BaseSpec

- V9 duration 与 SB 一致（1–30s）
- QF-VIEW / QF-DUR 运镜词
- 有对白须 lipSync 关键词
- fx 同镜 ≤F3（PR-07）

## Agnes VendorPack

| 项 | 规则 |
|----|------|
| 首位帧 | AG-GATE-01：referenceImage 或分镜图 |
| 运动 | motion-from-frame 白名单 |
| 原生语音 | generate_audio=true + dialogue-native |
| 表情 | QF-EXPR-06 禁改面部 |

## videoAudioPolicy

- `native`（默认）：台词镜 generate_audio=true
- `post`：TTS-dubbing 分离路径

## 正推

```
SB duration/type → EN compile → 分镜图 → MD-VID videoPrompt → singleImage
```

## 反推

| 触发 | 目标 | 优先级 |
|------|------|--------|
| video_first_frame_missing | MD → EN | P0 |
| motion_overflow | EN | P0 |
| native_audio_mismatch | EN | P1 |
| duration_clamp | SB | P0 WARN |

## SD / SF

| ID | 检查 | SF |
|----|------|-----|
| SD-VID-01 | 首帧/referenceImage | MODE-AGNES |
| SD-VID-02 | 运镜白名单 | QF-EXPR |
| SD-VID-03 | duration 1–30 | — |
| SD-VID-04 | lipSync + lines | PR-09 |

## dryRun

PC-09：首帧/时长/运镜 BLOCK。

## 输出

`generation.videoPrompt` + `modalityPromptAudit.VID` + `videoAudioPolicy`

**Bundle 路径**：`preDesignPack.shots[].generation.videoPrompt` 或 `flowData.storyboard[].videoDesc`。标准见 `docs/PROMPT_STANDARD.md` §3。

## 质量链（实现）

编译/烧片走五层：`buildPromptIR` → `sanitizeVideoPrompt` → `applyModeDialect` → `applyVendorPromptPack` → burn gate（BLOCK 带 RH+rePushPlan）。详见 `docs/video-quality-chain.md`。对白源语言进 `[Audio]`；stub videoPrompt 强制 IR 重编译；`motion-from-frame` 全文至多一次。

# MD 音频模态（AUD）

## slots

lines, voiceProfile, emotion, deliveryType, identity

## CAN / CANNOT

| CAN | CANNOT |
|-----|--------|
| 从 SB lines 复制到 AUD slot | 修改 lines 文本 |
| voiceProfile 对齐 BP L6 | OS/VO 混用同一 profile |
| 标注 deliveryType OS/VO | T1 写 audioPrompt |

## BaseSpec

- R2/H3：lines hash 与 W3/SB 一致
- V74 台词字数约束
- PR-10：OS 镜须画外音 profile

## 路径选择（video_audio_policy）

| 路径 | 条件 |
|------|------|
| dialogue-native | Agnes + 台词镜 + generate_audio |
| TTS-dubbing | vendor 不支持 native 或 videoAudioPolicy=post |
| post-bgm | 无台词镜 BGM |

## 正推

```
W3 → SB lines → EN → MD-AUD audioPrompt → audioRoute
```

## 反推

| 触发 | 目标 |
|------|------|
| dialogue_hash_mismatch | SB / W3 |
| identity_mismatch (voice) | EN → BP L6 |
| native_audio_mismatch | EN |
| pr_os_voice | SB |

## SD / SF

| ID | 检查 | SF |
|----|------|-----|
| SD-AUD-01 | lines hash | R2 |
| SD-AUD-02 | voiceProfile vs BP | Y8 |
| SD-AUD-03 | native/post 路径 | — |
| SD-AUD-04 | OS/VO 分型 | PR-10 |

## dryRun

PC-10：台词镜 native/TTS 一致 + voiceProfile BLOCK。

## 输出

`generation.audioPrompt` + `audioRoute` + `modalityPromptAudit.AUD`

# MD 特效模态（FX）

## slots

type, intensity, feasibilityLevel, degradeHint

## CAN / CANNOT

| CAN | CANNOT |
|-----|--------|
| 从 SB visualEffect 编译 FX 段 | F5 未降级 export |
| F4 标注 postProductionOnly | F3+ 与 VID 同镜无 degrade |
| degradeFixPlan 写回 SB | 跳过 fxFeasibilityAudit |

## BaseSpec

- V77 特效词表
- fx_feasibility_matrix F0–F5
- PR-07/PR-15 与 VID 复杂度

## Agnes 默认

- F≤3 默认可出 prompt
- F4 postProductionOnly：仅基底 prompt，无动态 FX 词
- F5 必须 degrade 或拆镜

## 正推

```
W3 描写 → SB visualEffect → EN FX 段 → MD-FX fxPrompt
```

**F0 / F1+ 政策（双轨 MUST）：**
- 无特效镜：写 `fxFeasibility: F0` **且** `fxFeasibilityAudit.items` 含该镜 `level:F0`；**不要**写 `fxPrompt`；**不要**顶层 `modalityPromptAudit.FX=pass` 却留空镜
- 有特效（F1+ / visualEffect）：**必须**写可执行散文到 `generation.fxPrompt`；禁止字母占位 `F1`/`F2`
- F4/F5：必须降级或拆镜；禁止「需拆镜/不可行」占位文案当可执行 FX
- 空 FX + 未声明 = **BLOCK**（export）；import heal 可 soft_patch 声明 F0，不可发明 FX 散文
- MD 出口：F0 xor 散文，二选一；`fxFeasibilityAudit` 须覆盖全部镜头
- **场镜对齐**：`implementationPlan` 条数 = 唯一 `sceneName` 数；无映射镜的 sceneRef **禁止** F1+（孤儿场须降 F0 / 删 plan / 独立命名）

## 反推

| 触发 | 目标 |
|------|------|
| fx_infeasible / F5 | W3 / SB |
| modality_fx_missing / MOD-02 | W3 → SB → MD-FX |
| pr_vendor_fx | EN → SB |
| 与 VID 过载 | 拆镜 rePush |

## SD / SF

| ID | 检查 | SF |
|----|------|-----|
| SD-FX-01 | F 等级预检 | fx_degrade |
| SD-FX-02 | F5 silent pass | degradeFixPlan |
| SD-FX-03 | 同镜 VID 复杂度 | PR-07 |

## dryRun

PC-12：无未处理 F5；F4 有 postProductionOnly。

## 输出

FX 段 + `shots[].generation.fxPrompt`（F1+）+ `fxFeasibilityAudit.items` + `modalityPromptAudit.FX`

# SD 四模态子检（smart_detection_modality）

挂载于 MD 阶段与 T3 export 前；结果写入 `smartDetection.modalityChecks`。

## SD-IMG

| ID | 检查 | severity |
|----|------|----------|
| SD-IMG-01 | cref 可解析 | BLOCK |
| SD-IMG-02 | PURE 类型 negative 前置 | BLOCK |

## SD-VID

| ID | 检查 | severity |
|----|------|----------|
| SD-VID-01 | referenceImage / 分镜图（Agnes） | BLOCK |
| SD-VID-02 | motion 白名单 | BLOCK |
| SD-VID-03 | duration 1–30 | WARN |
| SD-VID-04 | lipSync 与 lines 镜数 | WARN |

## SD-AUD

| ID | 检查 | severity |
|----|------|----------|
| SD-AUD-01 | lines hash vs SB | BLOCK |
| SD-AUD-02 | voiceProfile vs BP L6 | BLOCK |
| SD-AUD-03 | videoAudioPolicy 路径 | BLOCK |
| SD-AUD-04 | OS/VO deliveryType | WARN |

## SD-FX

| ID | 检查 | severity |
|----|------|----------|
| SD-FX-01 | feasibilityLevel 已标注 | BLOCK |
| SD-FX-02 | F5 有 degrade 或拆镜 | BLOCK |
| SD-FX-03 | F3+ 同镜 VID 复杂度 | WARN |

## schema 片段

```json
{
  "smartDetection": {
    "modalityChecks": [
      { "id": "SD-VID-01", "modality": "VID", "passed": false, "severity": "BLOCK", "fix": "生成首位帧分镜图" }
    ]
  }
}
```

## 下游

FAIL → smart_fix（SF）→ rePushPlan → corridor_repush。

---

## §16 设计七维闭环

# 台词设计（dialogue 链）

## 正推

W3.script → dialoguePlan → SB.narrative.dialogue.lines（lineId/functions/causedByActionId）→ EN.AUD → VID.lipSync

## 台词功能链

- 每句须标 `functions` + `causedByActionId`（动作是因、对话是果）
- `dialoguePlan` 与 SB lines **lineId 对齐**（NAR-09）
- 禁止解释性自爆台词 >2 句（ep1 前 30s）

## 反推

| 触发 | 目标 | QP |
|------|------|-----|
| hash 不一致 | W3/SB | QP-03 |
| OS/VO 混用 | SB | PR-10 |
| 密度异常 | SB | QP-04 |

## CAN/CANNOT

| CAN | CANNOT |
|-----|--------|
| W3 写台词原文 | SB 改字词 |
| OS/VO 分型标注 | T3 在 MD 改 lines |

## SD-DLG

SD-DLG-01 lines 覆盖率；SD-DLG-02 linesHash

## dryRun DC-01/DC-02

# 场景设计（scene + asset 链）

## 正推

B6.scenes → GB 场表 → SB.sceneName → BP.sceneColorLock → EN.cref → IMG.scene

**MUST**：唯一 `SB.sceneName` 数 = `implementationPlan`/`sceneMeta` 条数。接场同地点须用不同 sceneName（如「卧房·后」），或合并 plan 删除多余 sceneRef。禁止孤儿场（plan 有 F1、无映射镜）。

## 反推

| 触发 | 目标 |
|------|------|
| 场景名不一致 | GB/SB |
| 场镜基数 / 孤儿场 | W3 plan 或 SB sceneName |
| cref 缺失 | EN/BP |

## SD-SCN

SD-SCN-01 B6↔SB.sceneName；SD-SCN-02 sceneColorLock；SD-SCN-03 plan↔唯一 sceneName 基数

## dryRun DC-06/DC-08 / DG-SCENE-CARDINALITY

# 故事推进（story 链）

## 正推

W1 → informationLedger → B20 → GB.infoIds → SB.markers.infoId
W3 dialoguePlan → B21 → SB.lines.functions
narrativeCausalityGraph（六类 event/visual/dialogue）→ B22 → SB causeId/effectId

## 六类因果

event / motivation / information / emotion / visual / dialogue — 边须可追踪，broken[] 出口为空

## 反推

| 触发 | 目标 |
|------|------|
| marker 缺失 | W3/SB |
| graph broken | W3 |
| F5 未降级 | W3/SB |

## SD-STP

SD-STP-01 B5↔markers；SD-STP-02 graph edges

## dryRun DC-03/DC-07/DC-15

---
name: design_camera_transition
description: 运镜/场景切换 · SB→VID
stageId: CAM
rulePackVersion: "2.0.1"
---

# 运镜与场景切换（camera 链）

## 正推

B12 rhythmDesign → B13 transitionPolicy → SB.shotSize/transitionType/rhythmZone → EN.motion → MD-VID.camera

## 反推

| 触发 | 目标 | 规则 |
|------|------|------|
| 运镜非法 | EN/MD | PR-CAM-01, QP-14 |
| 情绪跳变 | GB/W3 | PR-05 |
| 跨场跳切 | SB | PR-12 |

## CAN/CANNOT

GB 禁切镜指令；SB 写抽象字段；T3 MD 写运镜白名单。

## dryRun DC-09

# 视听设计（av 链）

## 正推

B4 emotionArc → GB.emotionCurve → SB.emotionIntensity → EN.Y9
retentionPlan → B18/B19 → SB.retentionTier + rhythm31545
动作镜 visualAction → 台词镜 causedByActionId（视听因果）
W3 `sceneMeta.avCausality` → designBrief B18/B19 → SB `audioCue` + retentionTier

## W3→SB 承接

| W3 sceneMeta | SB 字段 |
|--------------|---------|
| avCausality.audioBeat | audioCue（可选：无则省略 key，禁止 null） |
| avCausality.visualPeak | visualDescription 峰值词 |
| fxIntent.level | `visualEffect` **string** + 可选 `fxLevel` string（如 `"F1: 描述"` / `"F1"`；禁止 object） |

## 留存视听专章（ep1）

| 窗口 | SB 字段 |
|------|---------|
| 0–2s | retentionTier=0-2s，强视觉冲突镜 |
| 2–10s | opening3to10s 情绪峰值 |
| 5–30s | rhythm31545 + infoId markers |

## 反推

| 触发 | 目标 |
|------|------|
| B4 偏差>2 | designBrief/GB |
| B9 无 AUD 槽 | EN |
| 色温跳变 | SB |

## SD-AV

SD-AV-01 B4↔SB.emotion；SD-AV-02 B9→audioMood

## dryRun DC-04/DC-10

---

## §17 统一闭环总纲

---
name: appendix_T_unified_closure
description: §17 十链+四级dryRun+边界矩阵总纲
rulePackVersion: "2.0.1"
---

# §17 统一闭环总纲

十链：dialogue/asset/continuity/av/story/scene/camera/modality_compile/generation/repair/adaptation

四级 dryRun：DC（设计 T1）/ PC（制作 T3）/ GC（生成后）/ IC（智能 QP+W93）

合流：import → unifiedDryRun → validate → generate → feedback → rePush

见 `unified_closure_matrix.json`、`multi_end_closure_matrix.json`。

{
  "version": "2.0.1",
  "description": "十链+七维+四模态+边界+优先级 单一扩展入口",
  "repairPriorityOrder": ["VID", "IMG", "AUD", "FX", "MD", "EN", "SB", "BP", "designBrief", "W3", "W2", "P03"],
  "boundaries": {
    "T1": { "CAN": ["script", "shots", "lines", "emotion", "transition abstract"], "CANNOT": ["imagePrompt", "videoPrompt", "audioPrompt", "fxPrompt", "API"] },
    "T2": { "CAN": ["CD", "BP", "EN draft", "IMG subject"], "CANNOT": ["full MD×4", "generate"] },
    "T3": { "CAN": ["MD×4", "Vendor", "audit", "generate after L0"], "CANNOT": ["skip modalityAudit"] },
    "EN": { "CAN": ["compile Y"], "CANNOT": ["change lines", "call API"] },
    "MD": { "CAN": ["prompt slots"], "CANNOT": ["change SB narrative"] }
  },
  "dimensions": {
    "adaptation": { "chain": "adaptation", "stages": ["P03", "W2", "W3"], "dryRunId": "DC-15" },
    "dialogue": { "chain": "dialogue", "dryRunId": "DC-01" },
    "scene": { "chain": "scene", "dryRunId": "DC-06" },
    "story": { "chain": "story", "dryRunId": "DC-03" },
    "camera": { "chain": "camera", "dryRunId": "DC-09" },
    "av": { "chain": "av", "dryRunId": "DC-04" },
    "IMG": { "modality": true, "dryRunId": "PC-11" },
    "VID": { "modality": true, "dryRunId": "PC-09" },
    "AUD": { "modality": true, "dryRunId": "PC-10" },
    "FX": { "modality": true, "dryRunId": "PC-12" }
  },
  "preservePairs": [
    { "forward": "W3.script", "preserveOnRePush": true, "rePushPreserve": "script" },
    { "forward": "globalAnchors", "preserveOnRePush": true, "rePushPreserve": "globalAnchors" },
    { "forward": "designBrief.B4", "preserveOnRePush": false, "rePushPreserve": null }
  ],
  "tracks": {
    "ext": { "dryRunLevels": ["DC", "PC", "GC", "IC"], "authority": "export" },
    "int": { "dryRunLevels": ["DC", "PC", "GC", "IC"], "authority": "validate" }
  },
  "qpIndex": {
    "QP-03": { "chain": "dialogue", "repairHintId": "RH-QP-03", "reverseTarget": "W3" },
    "QP-14": { "chain": "camera", "repairHintId": "RH-QP-14", "reverseTarget": "EN" }
  },
  "chains": {
    "dialogue": { "rePushTarget": "SB" },
    "scene": { "rePushTarget": "SB" },
    "camera": { "rePushTarget": "EN" },
    "story": { "rePushTarget": "W3" },
    "continuity": { "rePushTarget": "W3" },
    "av": { "rePushTarget": "GB" },
    "adaptation": { "rePushTarget": "W2" },
    "adaptation_deep": { "rePushTarget": "P03" },
    "retention": { "rePushTarget": "W3" },
    "narrative_drive": { "rePushTarget": "W3" },
    "packaging": { "rePushTarget": "SB" },
    "generation_apply": { "rePushTarget": "SB" },
    "viral_clip": { "rePushTarget": "W1" },
    "modality_compile": { "rePushTarget": "EN" },
    "modality_feasibility": { "rePushTarget": "W3" },
    "generation": { "rePushTarget": "MD" },
    "repair": { "rePushTarget": "SF" }
  },
  "smartBoundaries": {
    "CAN": ["fixPlan from *Gaps", "linkageRepairPlan single chain", "rePushPlan multi chain round<=3", "smartProposalApplier with userConfirmed"],
    "CANNOT": ["change W3 dialogue text R2", "fake linkageAudit/ruleAudit pass", "import overwrite Chat prompts", "T1 require full MD×4"]
  },
  "gapDomains": ["adaptationGaps", "retentionGaps", "narrativeDriveGaps", "packagingGaps", "generationApplyGaps", "designSpecGaps", "scriptViralGaps", "modalityGaps", "chatPromptGaps"]
}

{
  "version": "2.0.1",
  "description": "T1 设计走廊 dryRun",
  "checks": [
    { "id": "DC-01", "field": "dialogue", "rule": "R2 lines 覆盖率 100%", "severity": "BLOCK" },
    { "id": "DC-02", "field": "dialogue", "rule": "linesHash match", "severity": "BLOCK" },
    { "id": "DC-03", "field": "story", "rule": "B5 markers ↔ SB.markers", "severity": "BLOCK" },
    { "id": "DC-04", "field": "av", "rule": "B4 与 SB.emotion 偏差 ≤2", "severity": "BLOCK" },
    { "id": "DC-05", "field": "continuity", "rule": "B7/B8 多集非空", "severity": "WARN" },
    { "id": "DC-06", "field": "scene", "rule": "B6.scenes ↔ SB.sceneName", "severity": "BLOCK" },
    { "id": "DC-07", "field": "story_fx", "rule": "markers payoff 或 FX 等级", "severity": "WARN" },
    { "id": "DC-08", "field": "asset", "rule": "charCodes ↔ script 角色", "severity": "BLOCK" },
    { "id": "DC-09", "field": "camera", "rule": "transition/rhythm 白名单", "severity": "BLOCK" },
    { "id": "DC-10", "field": "av_modality", "rule": "B9 或 T3 AUD 标注", "severity": "WARN" },
    { "id": "DC-11", "field": "debut", "rule": "debutIntroPack", "severity": "WARN" },
    { "id": "DC-12", "field": "compile", "rule": "T3 前 EN 草案", "severity": "INFO" },
    { "id": "DC-13", "field": "linkage", "rule": "十链无 broken", "severity": "BLOCK" },
    { "id": "DC-14", "field": "forwardTrace", "rule": "≥5 trace dialogue+av+scene", "severity": "WARN" },
    { "id": "DC-15", "field": "adaptation", "rule": "W2 策略与 P03 矩阵一致", "severity": "WARN" },
    { "id": "DC-16", "field": "cast", "rule": "说话人∪上镜码 ⊆ CD+VLT（非 stub，须 L0.identity）", "severity": "BLOCK" }
  ]
}

{
  "version": "2.0.1",
  "checks": [
    { "id": "GC-01", "rule": "feedback 路由合法 target", "severity": "BLOCK" },
    { "id": "GC-02", "rule": "VID 首帧失败 rePush MD", "severity": "BLOCK" },
    { "id": "GC-03", "rule": "AUD native 失败 EN 优先", "severity": "BLOCK" },
    { "id": "GC-04", "rule": "IMG cref 失败 EN/BP", "severity": "BLOCK" },
    { "id": "GC-05", "rule": "FX 失败 SB/W3", "severity": "BLOCK" },
    { "id": "GC-06", "rule": "MediaProbe duration ±1s", "severity": "WARN" },
    { "id": "GC-07", "rule": "MediaProbe hasAudio vs policy", "severity": "WARN" },
    { "id": "GC-08", "rule": "SF 3轮后 rePushPlan", "severity": "WARN" }
  ]
}

{
  "version": "2.0.1",
  "checks": [
    { "id": "IC-01", "rule": "QP 触发有 repairHint", "severity": "WARN" },
    { "id": "IC-02", "rule": "W93 未确认不 merge", "severity": "BLOCK" },
    { "id": "IC-03", "rule": "supervision C/D blockNext", "severity": "BLOCK" },
    { "id": "IC-04", "rule": "autoApplicable confidence≥0.8", "severity": "WARN" },
    { "id": "IC-05", "rule": "forwardTrace/reverseHints 成对", "severity": "WARN" },
    { "id": "IC-06", "rule": "单链 repair 多链 rePush", "severity": "INFO" }
  ]
}

---

## 附录 A T2

# CD 角色智能设计（L0–L6）

T2 档位：从 G1 + script 提取角色，产出 L0–L6 结构化描述，对齐 art_skills 前缀。

## 入口条件

- T1 已通过或并行 T2 启动
- globalAnchors.G1.characterSoul 可用
- art_skills 前缀已选（如 realpeople_urban_modern）

## L0–L6 层级

| 层 | 字段 | 说明 |
|----|------|------|
| L0 | identity, age, gender | 身份与基础属性 |
| L1 | face, skin, expression | 面部特征 |
| L2 | hair, bodyType | 发型体态 |
| L3 | costume, accessories | 服装配饰 |
| L4 | posture, gesture | 姿态习惯 |
| L5 | voice.speed, timbre, accent | 音色（AUD 用） |
| L6 | arcVisual, stateVariants | 弧光视觉变化 |

**键名规范（权威短键）**：输出 `L0`…`L6`，不要用 `L0_identity` / `L6_arcVisual` 长键。`stateVariants` 用数组 `[{ "name", "visual" }]` 或 record（导入会归一）。

## 执行步骤

1. 从 designBrief.B6 + script 提取角色列表
2. 读取 G1.characterSoul 锁定内核与 voiceStyle
3. 按 art_skills 前缀填 L0–L6
4. 分配 CHAR-CODE（CHAR-001 递增）
5. 写入 visualLockTable.characterAssets（供 BP）

## 输出

写入 bundle 顶层 `characterDesign`（import 落库 blueprint）。详见 `docs/PROMPT_STANDARD.md` §6。

```json
{
  "characterDesign": {
    "rulePackVersion": "2.0.1",
    "assets": [
      {
        "code": "CHAR-001",
        "name": "女主",
        "L0": { "identity": "真千金", "age": "22", "gender": "女" },
        "L1": { "face": "鹅蛋脸", "skin": "白皙" },
        "L2": { "hair": "黑长直及腰" },
        "L3": { "costume": "白色连衣裙" },
        "L4": { "posture": "背挺直" },
        "L5": { "speed": "正常", "timbre": "清冷" },
        "L6": { "arcVisual": "隐忍→锋芒" }
      }
    ]
  }
}
```

## BLOCK 闸门

- 剧本出场主角/反派均有 CHAR-CODE（canonical `CHAR-NNN`，见 `docs/ASSET_CODE_CONTRACT.md`）
- **凡 `preDesignPack.shots[].charCodes` 或 imagePrompt `--cref` 出现的码，必须写入 `characterDesign.assets` 与 `visualLockTable.characterAssets`**（禁止只引用不收录，如 CHAR-005）
- **DC-16 / DG-CD-COVERAGE**：对白 `speaker` ∪ B6.characters ∪ 上镜码必须入 CD；禁止仅 `L0.stub` 过闸；最小骨架为 `code` + `name` + `L0.identity`（一句身份关系）。L1–L3 视觉可后置由资产 AI 补全，但导出前不得缺人设壳
- 修复话术：按 exportGate `chatRepairText` 中 RH-DC-16 补真实 CD → **再点预览/exportGate** 直至 `exportAllowed`
- 码别名（`CHAR005` / `CHAR 005`）导出前归一为 `CHAR-005`
- L0–L3 必填（设计完整态）；L5 主角必填；键名用短键 `L0`…`L6`（勿只输出 `L0_identity` 长键）
- 与 G1 说话风格/记忆点一致
- 禁止自由文本替代 L 层结构

## 下游

→ AS_asset_pipeline → BP_blueprint。资产层可对弱视觉做 AI 补全出精图；**不得**用 import stub 代替本阶段入册。

---
name: AS_asset_pipeline
description: AS 资产流水线 extract 与 assetGapReport
stageId: AS
outputTag: assetPipeline
rulePackVersion: "2.0.1"
---

# AS 资产流水线

T2 档位：从 designBrief + script + CD 产出场景/道具资产，生成 assetGapReport。

## 入口条件

- CD characterDesign 已完成
- designBrief.B6 assetHints 可用

## 流水线阶段

| 步 | 动作 | 产出 |
|----|------|------|
| AS-1 | extract 角色 | CHAR-CODE（CD 已有则校验） |
| AS-2 | extract 场景 | SCENE-CODE + sceneColorLock 草案 |
| AS-3 | extract 道具 | PROP-CODE + significance |
| AS-4 | 衍生资产 | 换装/状态变体（L6 stateVariants） |
| AS-5 | gap 检测 | assetGapReport |

## assetGapReport 结构

```json
{
  "assetGapReport": {
    "rulePackVersion": "2.0.1",
    "gaps": [
      {
        "type": "scene",
        "name": "宴会厅",
        "referencedIn": ["shot-4", "shot-5"],
        "status": "missing",
        "action": "创建 SCENE-003"
      }
    ],
    "coverage": 85,
    "blockBP": false
  }
}
```

## 执行步骤

1. 扫描 shots + script 引用场景/道具名
2. 与已有 assets 列表比对
3. 缺失项写入 gaps，标 referencedIn
4. 计算 coverage = 已覆盖引用 / 总引用 × 100
5. coverage < 80 → blockBP = true

## 场景色温草案

每个 SCENE-CODE 预填：

```json
{ "colorTemp": "暖", "dominantHue": "金黄", "anchorElements": ["吊灯", "红毯"] }
```

## BLOCK 闸门

- coverage ≥ 80%
- 每场戏有 SCENE-CODE 或明确占位
- G4 anchorProps 中道具均有 PROP-CODE
- gaps 均有 action

## 下游

→ BP_blueprint（visualLockTable 汇总）。

---
name: BP_blueprint
description: BP 资产蓝图 visualLockTable 汇总
stageId: BP
outputTag: visualLockTable
rulePackVersion: "2.0.1"
---

# BP 资产蓝图（visualLockTable）

T2 核心产出：汇总 CD + AS 为 `visualLockTable`，落库 `o_projectBlueprint`。EN compile 与生成触达的权威锚点源。

## 入口条件

- CD L0-L6 完成
- AS assetGapReport.coverage ≥ 80%

## visualLockTable 结构

```json
{
  "visualLockTable": {
    "rulePackVersion": "2.0.1",
    "characterAssets": {
      "CHAR-001": { "L0": {}, "L1": {}, "L2": {}, "L3": {}, "L4": {}, "L5": {}, "L6": {} }
    },
    "sceneColorLock": {
      "SCENE-001": { "name": "寝殿", "colorTemp": "暖", "dominantHue": "米黄", "anchorElements": ["纱帐"] }
    },
    "anchorProps": {
      "PROP-001": { "name": "玉佩", "significance": "情感", "appearanceSchedule": [1, 8] }
    }
  }
}
```

## 执行步骤

1. 合并 CD.characterDesign.assets → characterAssets
2. 合并 AS 场景色温 → sceneColorLock
3. 从 G4.anchorProps 补 significance + appearanceSchedule
4. 校验所有 shots refs 可 resolve 到 CODE
5. 写入 ScriptBundle / EpisodeBundle

## 锚点铁律

| ruleId | 规则 |
|--------|------|
| V4 | CHAR-CODE 必须存在于 characterAssets |
| V5 | PROP-CODE 必须存在于 anchorProps |
| V12 | SCENE 核心锚点描述非空 |
| V15 | anchorProps.significance 必填 |

## BLOCK 闸门

- characterAssets 覆盖本集所有出场角色
- sceneColorLock 覆盖本集所有场景
- 禁止 SB 用 sceneName 绕过 SCENE-CODE（P0-B）
- import 时 bootstrap BP 若缺失则阻断 T2

## 下游

→ corridor_EN（refs 锁定）→ identityAudit 对照源。

---

## 附录 B T3 MD

# MD 四模态总览（T3）

T3 档位：在 EN compile 基础上，为每 shot 生成 IMG/VID/AUD/FX 四模态 prompt 槽位。

## 入口条件

- T2 corridor_EN 已通过
- visualLockTable 可用
- ModalityOrchestrator 路由表对齐 rulePack 2.0.1

## 四模态职责

| 模态 | 槽位 | 输入 | Touch 级别 |
|------|------|------|------------|
| IMG | imagePrompt | Y.subject + refs | L0 Gate |
| VID | videoPrompt | Y.spatial + performance | L0 Gate |
| AUD | audioPrompt | dialogue + voiceLock | L0 Gate |
| FX | fxPrompt | fxFeasibility F 等级 + visualEffect | **双轨 MUST**：F0 声明 **或** 散文 fxPrompt |

## modalityAudit 结构

```json
{
  "modalityAudit": {
    "rulePackVersion": "2.0.1",
    "shots": [
      {
        "shotId": "shot-1",
        "modalities": {
          "IMG": { "status": "ready", "slotCount": 3 },
          "VID": { "status": "ready", "slotCount": 2 },
          "AUD": { "status": "ready", "slotCount": 1 },
          "FX": { "status": "skip", "level": "F0" }
        },
        "overallReady": true
      }
    ],
    "blockGenerate": false
  }
}
```

## 执行步骤

1. 逐 shot 读取 EN generation + visualLockTable
2. 按模态路由表填充 prompt 槽位
3. FX 模态对照 fxFeasibilityAudit F 等级
4. 跑 MD_prompt_compliance 预检
5. 汇总 modalityAudit

## cache key

`hash(shotFields + rulePackVersion + modelId + artStyle) → compiledPrompt`

## BLOCK 闸门

- 每镜 IMG + VID 至少 ready
- 有台词镜 AUD 必须 ready
- **FX 双轨**：每镜要么 `fxFeasibility/fxLevel: F0`（无特效），要么非空散文 `generation.fxPrompt`（禁字母 `F1`–`F5`）
- F4+ FX 须有 degrade 或 skip 说明
- blockGenerate=false 方可触达生成

## 严禁

跳过 Touch L0 Gate 直接声称已生成。
假写 `modalityPromptAudit.FX=pass` 而槽空或仅字母等级。

## 下游

→ MD_prompt_compliance → 生成 → GenerationFeedback。

# MD Prompt 合规审计（modalityPromptAudit）

T3 出口闸门：检查四模态 prompt 完整性、合规性与锚点一致性。对应用户话术「prompt 不齐/不合规」（QP-modality）。

**Slot SSOT**：必填槽位定义以 `data/fixtures/modality_prompt_slots.json` 为准；本技能与 `corridor_EN` / `promptIR` 须与其一致。

## 审计维度

| 维度 | 检查 | ruleId |
|------|------|--------|
| 完整性 | 每模态必填槽位非空 | M1 |
| 锚点 | CHAR/SCENE/PROP-CODE 在 prompt 中可解析 | V4-V6 |
| 合规 | 无违禁词、无 vendor 密钥 | M2 |
| 一致 | IMG/VID 同一角色描述一致 | identityAudit |
| 表达式 | emotionIntensity≤5 用微表情词表 | QF-EXPR-01 |
| 长度 | 各 vendor 上限内 | M3 |

## modalityPromptAudit 结构

```json
{
  "modalityPromptAudit": {
    "rulePackVersion": "2.0.1",
    "items": [
      {
        "shotId": "shot-2",
        "modality": "VID",
        "ruleId": "QF-EXPR-01",
        "severity": "BLOCK",
        "issue": "emotionIntensity=4 却使用「怒吼」",
        "fix": "改为「眉头紧蹙、唇线绷紧」"
      }
    ],
    "passRate": 92,
    "blockGenerate": false
  }
}
```

## 执行步骤

1. 读取 MD 四模态 prompt 全文
2. 逐镜逐模态跑合规规则
3. BLOCK 项写入 items
4. 计算 passRate = 通过项 / 总项
5. passRate < 90 → blockGenerate = true

## QF-EXPR-01 细则

- emotionIntensity ≤5：仅微表情词表（蹙眉/抿唇/目光闪躲）
- 6–7：生理反应词（泪/颤/汗），禁「怒吼/狰狞/扭曲」
- ≥8：允许强烈表演词，须与 GB 情绪一致

## BLOCK 闸门

- blockGenerate = false
- passRate ≥ 90%
- 无未修复 BLOCK 项
- identityAudit 交叉通过

## 修复路由

| 问题 | 反推 |
|------|------|
| 锚点缺失 | BP → EN 重 compile |
| 表情过激 | EN performance 重映射 |
| 模态缺失 | MD_modality_overview 补槽 |

## 合流

importBundle → validate（INT 权威）→ Touch L0 → 生成。

# MD 图像模态

T3 阶段产出每镜 `imagePrompt`。须 trace 回 SB 字段。

## slots（modality_prompt_slots.json）

subject, scene, composition, lighting, style, negative, cref, identity

## 规则

- CHAR-SCENE 须 `--cref CHAR-CODE`
- PURE-SCENE 前 10 词含 `no people, no characters`
- identity 与 BP L0.gender 一致（identityAudit）
- 锚点 token 不可被 polish 漂移

## 输出

`shots[].generation.imagePrompt` + modalityPromptAudit.IMG

# MD 视频模态

## slots

motion, camera, duration, lipSync, identity, fx

## 规则

- duration 与 SB duration 一致
- 有对白须 lipSync 关键词
- fx 须 fxFeasibilityAudit 级别 ≤F3
- singleImage 模式禁止重写面部表情（QF-EXPR-06）

## 输出

`videoPrompt` / `videoDesc` + modalityPromptAudit.VID

# MD 音频模态

## slots

lines, voiceProfile, emotion, deliveryType, identity

## 规则

- lines 与 SB narrative.dialogue.lines hash 一致（R2/H3）
- voiceProfile 对齐 BP L6.voice.gender
- OS 镜须标注画外音 profile

## 输出

`audioPrompt` + modalityPromptAudit.AUD

# MD 特效模态

## slots

type, intensity, feasibilityLevel, degradeHint

## 规则

- 查 fx_feasibility_matrix F0-F5
- F2+ 须 degradeFixPlan 或 rePush
- F4 postProductionOnly 仅基底 prompt
- F5 禁止 T3 未降级 export

## 输出

FX 段 + fxFeasibilityAudit.items

{
  "_comment": "EpisodeBundle v2.0.1 · T2 lite / T3 full",
  "bundleVersion": "browser-chat-optimized",
  "rulePackVersion": "2.0.1",
  "meta": {
    "episodeKey": "ep-01",
    "episodeName": "第1集",
    "episodeIndex": 1,
    "projectId": 0,
    "scriptId": 0
  },
  "flowData": {
    "script": "场1 寝殿 日\n\n婢女：\"殿下醒了。\"",
    "scriptPlan": "# 导演规划\n\n## 场1：寝殿\n- 情绪：5",
    "storyboardTable": "| 镜 | 类型 | 场景 | 台词 | 时长 |\n| 1 | CHAR-SCENE | 寝殿 | 婢女：\"殿下醒了。\" | 4s |",
    "assets": [],
    "storyboard": [
      {
        "clientId": "sb-1",
        "duration": 4,
        "prompt": "裴青梧，寝殿，苏醒",
        "videoDesc": "MS static, 4s",
        "shouldGenerateImage": 1,
        "state": "未生成",
        "index": 0
      }
    ],
    "workbench": { "videoList": [] }
  },
  "modalityAudit": {
    "perShot": [{ "shotIndex": 1, "IMG": "PASS", "VID": "PASS", "AUD": "PASS", "FX": "N/A" }]
  }
}

---

## 附录 C 审计

# 附录 C · 审计字段

## ruleAudit

```json
{
  "ruleAudit": {
    "rulePackVersion": "2.0.1",
    "stages": {
      "W3": { "passed": true, "blockCount": 0, "checkedRuleIds": ["R2","W12"], "warnings": [] }
    }
  }
}
```

## smartDetection

见 `stages/smart_detection.md`。

## modalityAudit（T3）

```json
{
  "modalityAudit": {
    "perShot": [{ "shotIndex": 1, "IMG": "PASS", "VID": "PASS", "AUD": "PASS", "FX": "WARN" }]
  }
}
```

## modalityPromptAudit

对照 `modality_prompt_slots.json` 逐 slot 检测。

---

## 附录 D 回滚

# 附录 D · H 回滚层

| ruleId | rollbackLayer | 说明 |
|--------|---------------|------|
| H2 | GB | 导演规划与 brief 不一致 |
| H3 | SB | 台词/分镜链断裂 |
| H4 | EN | 编译字段缺失 |
| H5 | EN/MD | prompt 漂移/锚点丢失 |
| H9 | EN | 自动追加 --ar 1:1 等 |
| V1–V10 | SB | 分镜字段 |
| MODE-AGNES | MD | 生图开关 |

与 `reverse_route_table.json` 共用；Chat rePushPlan 与 internal applyAutoFix 同表。

import 后 validate BLOCK → 展示 rollbackLayer → 用户修订 JSON 再 import。

---

## 附录 E 规则应用

# 附录 E · 规则应用矩阵

由 `yarn audit:rule-application` 生成 `data/fixtures/rule_application_matrix.json`。

## 五维

| 维 | 含义 |
|----|------|
| spec | 规范是否挂载 |
| link | 联动链是否追溯 |
| sd | 是否 SD 检测 |
| sf | 是否 SF 可修 |
| trace | ruleAudit 是否记录 |

## ruleApplicationReport（T3 可选）

```json
{
  "ruleApplicationReport": {
    "coverage": 0.85,
    "uncheckedBlockRules": ["V7"],
    "stageSummary": { "W3": { "checked": 12, "passed": 12 } }
  }
}
```

ScriptBundle 出口可附摘要；import 写入 episode meta 日志。

{
  "version": "2.0.1",
  "rules": [
    {
      "ruleId": "P1",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P2",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P3",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P4",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P5",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P6",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P7",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P8",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P9",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P10",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P11",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P12",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P13",
      "layer": "P",
      "stage": "P03",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P14",
      "layer": "P",
      "stage": "P03",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P15",
      "layer": "P",
      "stage": "P03",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P16",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P17",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "P18",
      "layer": "P",
      "stage": "P0",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "G1",
      "layer": "G",
      "stage": "G",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "G2",
      "layer": "G",
      "stage": "G",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "G3",
      "layer": "G",
      "stage": "G",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "G4",
      "layer": "G",
      "stage": "G",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "G5",
      "layer": "G",
      "stage": "G",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W1",
      "layer": "W",
      "stage": "W1",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W2",
      "layer": "W",
      "stage": "W1",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W3",
      "layer": "W",
      "stage": "W1",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W4",
      "layer": "W",
      "stage": "W1",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W5",
      "layer": "W",
      "stage": "W1",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W6",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W7",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W8",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W9",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W10",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W11",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W12",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W13",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W14",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W15",
      "layer": "W",
      "stage": "W2",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W16",
      "layer": "W",
      "stage": "W3",
      "implLevel": "structured",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W17",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W18",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W19",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W20",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W21",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W22",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W23",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W24",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W25",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W26",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W27",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W28",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W29",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W30",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W31",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W32",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W33",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W34",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W35",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W36",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W37",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W38",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W39",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W40",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W41",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W42",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W43",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W44",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W45",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "W46",
      "layer": "W",
      "stage": "W3",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "V1",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V2",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V3",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V4",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V5",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V6",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V7",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V8",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V9",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V10",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V11",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V12",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V13",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V14",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V15",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V16",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V17",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V18",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V19",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V20",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V21",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V22",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V23",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V24",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V25",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V26",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V27",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V28",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V29",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V30",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V31",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V32",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V33",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V34",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V35",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V36",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V37",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V38",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V39",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V40",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V41",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V42",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V43",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V44",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V45",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V46",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V47",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V48",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V49",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V50",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V51",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V52",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V53",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V54",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V55",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V56",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V57",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V58",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V59",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V60",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V61",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V62",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V63",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V64",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V65",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V66",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V67",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V68",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V69",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V70",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V71",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V72",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V73",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V74",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V75",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V76",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V77",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V78",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V79",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V80",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V81",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V82",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V83",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V84",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V85",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V86",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V87",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V88",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V89",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V90",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V91",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V92",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V93",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V94",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V95",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V96",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V97",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "V98",
      "layer": "V",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "INT-1"
    },
    {
      "ruleId": "M1",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M2",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M3",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M4",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M5",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M6",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M7",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M8",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M9",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M10",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M11",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M12",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M13",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M14",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M15",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "M16",
      "layer": "M",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S1",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S2",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S3",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S4",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S5",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S6",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S7",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S8",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S9",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S10",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S11",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S12",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S13",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S14",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S15",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S16",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S17",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S18",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S19",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S20",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S21",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S22",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "S23",
      "layer": "S",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I1",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I2",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I3",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I4",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I5",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I6",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I7",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I8",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I9",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I10",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I11",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I12",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I13",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I14",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I15",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "I16",
      "layer": "I",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X1",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X2",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X3",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X4",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X5",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X6",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X7",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X8",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X9",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X10",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X11",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X12",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X13",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X14",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X15",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X16",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X17",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X18",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X19",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X20",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "X21",
      "layer": "X",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Y1",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y2",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y3",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y4",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y5",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y6",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y7",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y8",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y9",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Y10",
      "layer": "Y",
      "stage": "EN",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "Z1",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z2",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z3",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z4",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z5",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z6",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z7",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z8",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z9",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z10",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z11",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z12",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z13",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z14",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z15",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z16",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "Z17",
      "layer": "Z",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B1",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B2",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B3",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B4",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B5",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B6",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B7",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B8",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B9",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B10",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "B11",
      "layer": "B",
      "stage": "designBrief",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "EXT L2",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D1",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D2",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D3",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D4",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D5",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D6",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D7",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D8",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D9",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D10",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D11",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D12",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D13",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D14",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D15",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D16",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D17",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D18",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D19",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D20",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D21",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "D22",
      "layer": "D",
      "stage": "SB",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": false,
        "sd": false,
        "sf": false,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "planned",
      "wave": "P0"
    },
    {
      "ruleId": "H1",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H2",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H3",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H4",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H5",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H6",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H7",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H8",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H9",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    },
    {
      "ruleId": "H10",
      "layer": "H",
      "stage": "validate",
      "implLevel": "checklist",
      "runtimeHandler": null,
      "dimensions": {
        "spec": true,
        "link": true,
        "sd": true,
        "sf": true,
        "trace": true
      },
      "browserTrack": "T2/T3",
      "internalTrack": "INT validate",
      "wave": "P0"
    }
  ]
}

---

## 附录 F fixPlan

[
  {
    "ruleId": "V1",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "type字段值为'[错误值]'，非法。建议修改为CHAR-SCENE/PURE-SCENE/PURE-PROP/CHAR-PROP之一"
    },
    "rePushTarget": "SB",
    "patchKeys": [
      "type"
    ],
    "description": "type字段值为'[错误值]'，非法。建议修改为CHAR-SCENE/PURE-SCENE/PURE-PROP/CHAR-PROP之一"
  },
  {
    "ruleId": "V2",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "PURE-SCENE未包含'no people, no characters'。建议在imagePrompt开头追加'no people, no characters, '"
    },
    "rePushTarget": "EN",
    "patchKeys": [
      "prefix"
    ],
    "description": "PURE-SCENE未包含'no people, no characters'。建议在imagePrompt开头追加'no people, no characters, '"
  },
  {
    "ruleId": "V3",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "PURE-PROP未包含'--ar 1:1'或'no hands, no person'。建议在imagePrompt末尾追加'--ar 1:1'，在开头追加'no hands, no person, '"
    },
    "rePushTarget": "SB",
    "patchKeys": [
      "append"
    ],
    "description": "PURE-PROP未包含'--ar 1:1'或'no hands, no person'。建议在imagePrompt末尾追加'--ar 1:1'，在开头追加'no hands, no person, '"
  },
  {
    "ruleId": "V4",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "CHAR-CODE '[代码]'在characterAssets中未定义。建议检查拼写或在characterAssets中补充该角色定义"
    },
    "rePushTarget": "AS",
    "description": "CHAR-CODE '[代码]'在characterAssets中未定义。建议检查拼写或在characterAssets中补充该角色定义"
  },
  {
    "ruleId": "V5",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "PROP-CODE '[代码]'在anchorProps中未定义。建议检查拼写或在visualLockTable.anchorProps中补充该道具定义"
    },
    "rePushTarget": "SB",
    "description": "PROP-CODE '[代码]'在anchorProps中未定义。建议检查拼写或在visualLockTable.anchorProps中补充该道具定义"
  },
  {
    "ruleId": "V6",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "sceneName '[名称]'对应的SCENE-CODE未在sceneColorLock中定义。建议在productionSpec.sceneColorLock中补充该场景的色温定义"
    },
    "rePushTarget": "SB",
    "description": "sceneName '[名称]'对应的SCENE-CODE未在sceneColorLock中定义。建议在productionSpec.sceneColorLock中补充该场景的色温定义"
  },
  {
    "ruleId": "V10",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "台词'[内容]'字数[X]超出限制。建议精简至[上限]字以内"
    },
    "rePushTarget": "SB",
    "patchKeys": [
      "trim"
    ],
    "description": "台词'[内容]'字数[X]超出限制。建议精简至[上限]字以内"
  },
  {
    "ruleId": "V13",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "女性角色'[角色名]'缺少耳饰或发饰。建议在L5-accessories中补充描述"
    },
    "rePushTarget": "SB",
    "description": "女性角色'[角色名]'缺少耳饰或发饰。建议在L5-accessories中补充描述"
  },
  {
    "ruleId": "V14",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "男性角色'[角色名]'缺少发型分界或腰部装饰。建议在L2-hairstyle中补充分界描述，或在L4/L5中补充腰部装饰"
    },
    "rePushTarget": "SB",
    "description": "男性角色'[角色名]'缺少发型分界或腰部装饰。建议在L2-hairstyle中补充分界描述，或在L4/L5中补充腰部装饰"
  },
  {
    "ruleId": "V16",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "场景'[场景名]'复杂度[X]超出范围[范围]。建议增加/减少可见元素描述"
    },
    "rePushTarget": "SB",
    "description": "场景'[场景名]'复杂度[X]超出范围[范围]。建议增加/减少可见元素描述"
  },
  {
    "ruleId": "V18",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "本集付费点数量为[X]，少于1个。建议在情绪高点增加付费点标记"
    },
    "rePushTarget": "SB",
    "description": "本集付费点数量为[X]，少于1个。建议在情绪高点增加付费点标记"
  },
  {
    "ruleId": "V25",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "emotionIntensity=[X]≥4但缺少microExpression或physiological子字段。建议补充完整microExpression（flush/eyes/pupil/mouthDetail）和physiological（sweat/breathVisible/pallor/swallow/tremor）"
    },
    "rePushTarget": "SB",
    "description": "emotionIntensity=[X]≥4但缺少microExpression或physiological子字段。建议补充完整microExpression（flush/eyes/pupil/mouthDetail）和physiological（sweat/breathVisible/pallor/swallow/tremor）"
  },
  {
    "ruleId": "V28",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "连续[X]个[景别]镜头（镜号[列表]），超过3镜限制。建议在第[X]镜处插入不同景别"
    },
    "rePushTarget": "SB",
    "description": "连续[X]个[景别]镜头（镜号[列表]），超过3镜限制。建议在第[X]镜处插入不同景别"
  },
  {
    "ruleId": "V44",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "相邻镜[镜号A]([时长A]s)与[镜号B]([时长B]s)时长比值[比值]＞2。建议调整时长使比值≤2"
    },
    "rePushTarget": "SB",
    "description": "相邻镜[镜号A]([时长A]s)与[镜号B]([时长B]s)时长比值[比值]＞2。建议调整时长使比值≤2"
  },
  {
    "ruleId": "V52",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "弹幕诱导点在镜[镜号A]和镜[镜号B]之间仅间隔[X]镜，<3。建议移除或调整诱导点位置"
    },
    "rePushTarget": "SB",
    "description": "弹幕诱导点在镜[镜号A]和镜[镜号B]之间仅间隔[X]镜，<3。建议移除或调整诱导点位置"
  },
  {
    "ruleId": "V79",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "冲突场景'[场景名]'（镜号[列表]）未落在快节奏区。建议调整rhythmZone为fast，并增加切镜频率"
    },
    "rePushTarget": "SB",
    "description": "冲突场景'[场景名]'（镜号[列表]）未落在快节奏区。建议调整rhythmZone为fast，并增加切镜频率"
  },
  {
    "ruleId": "V98",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "镜号[列表]在15s窗口内台词量占比[X]%＞50%。建议将部分台词分散至前后3-5个镜头"
    },
    "rePushTarget": "SB",
    "description": "镜号[列表]在15s窗口内台词量占比[X]%＞50%。建议将部分台词分散至前后3-5个镜头"
  },
  {
    "ruleId": "D21",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "场景'[SCENE-CODE]'锚点复用率仅为[X]%（<80%）。建议在以下镜号中增加核心锚点描述：[列表]"
    },
    "rePushTarget": "SB",
    "description": "场景'[SCENE-CODE]'锚点复用率仅为[X]%（<80%）。建议在以下镜号中增加核心锚点描述：[列表]"
  },
  {
    "ruleId": "D22",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "关键道具'[道具名]'在节点[集数]未出现。建议在该集关键冲突/情感节点加入道具镜头"
    },
    "rePushTarget": "W3",
    "description": "关键道具'[道具名]'在节点[集数]未出现。建议在该集关键冲突/情感节点加入道具镜头"
  },
  {
    "ruleId": "W1",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "第[幕]幕emotionIntensity最大值[X]＞上限[上限]。建议将部分高情绪镜头移至下一幕"
    },
    "rePushTarget": "W1",
    "description": "第[幕]幕emotionIntensity最大值[X]＞上限[上限]。建议将部分高情绪镜头移至下一幕"
  },
  {
    "ruleId": "B3",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise",
      "hint": "台词'[内容]'换给其他角色'[角色名]'后仍成立，风格化不足。建议增加角色专属标记词或口头禅"
    },
    "rePushTarget": "SB",
    "description": "台词'[内容]'换给其他角色'[角色名]'后仍成立，风格化不足。建议增加角色专属标记词或口头禅"
  },
  {
    "ruleId": "QP-01",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "SB",
    "description": "Runtime trigger template for QP-01"
  },
  {
    "ruleId": "QP-02",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "SB",
    "description": "Runtime trigger template for QP-02"
  },
  {
    "ruleId": "PR-01",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "SB",
    "description": "Runtime trigger template for PR-01"
  },
  {
    "ruleId": "PR-04",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "SB",
    "description": "Runtime trigger template for PR-04"
  },
  {
    "ruleId": "identity_mismatch",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "CD",
    "description": "Runtime trigger template for identity_mismatch"
  },
  {
    "ruleId": "fx_degrade",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "SB",
    "description": "Runtime trigger template for fx_degrade"
  },
  {
    "ruleId": "AG-GATE-01",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "MD",
    "description": "Runtime trigger template for AG-GATE-01"
  },
  {
    "ruleId": "AG-GATE-02",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "EN",
    "description": "Runtime trigger template for AG-GATE-02"
  },
  {
    "ruleId": "video_first_frame_missing",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "MD",
    "description": "Runtime trigger template for video_first_frame_missing"
  },
  {
    "ruleId": "motion_overflow",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "EN",
    "description": "Runtime trigger template for motion_overflow"
  },
  {
    "ruleId": "native_audio_mismatch",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "EN",
    "description": "Runtime trigger template for native_audio_mismatch"
  },
  {
    "ruleId": "img_cref_missing",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "EN",
    "description": "Runtime trigger template for img_cref_missing"
  },
  {
    "ruleId": "aud_voice_mismatch",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "BP",
    "description": "Runtime trigger template for aud_voice_mismatch"
  },
  {
    "ruleId": "PR-CAM-01",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "auto",
      "action": "revise"
    },
    "rePushTarget": "EN",
    "description": "Runtime trigger template for PR-CAM-01"
  },
  {
    "ruleId": "NAR-14",
    "confidence": 0.9,
    "patchTemplate": {
      "field": "dialoguePlan",
      "action": "add_splitHint",
      "hint": "长台词标注 splitHint: reaction_shot"
    },
    "rePushTarget": "W3",
    "description": "长台词无 splitHint"
  },
  {
    "ruleId": "NAR-15",
    "confidence": 0.9,
    "patchTemplate": {
      "field": "script",
      "action": "add_reaction",
      "hint": "高情绪对白后补反应 △"
    },
    "rePushTarget": "W3",
    "description": "高情绪对白无反应镜"
  },
  {
    "ruleId": "RET-01",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "sceneMeta.avCausality",
      "action": "fill",
      "hint": "补 ep1 首场声画峰值"
    },
    "rePushTarget": "W3",
    "description": "retention 首场 avCausality 空"
  },
  {
    "ruleId": "MOD-01",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "visualEffect",
      "action": "mirror_fxIntent",
      "hint": "W3 fxIntent → SB visualEffect"
    },
    "rePushTarget": "SB",
    "description": "fxIntent 未进 SB"
  },
  {
    "ruleId": "MOD-03",
    "confidence": 0.85,
    "patchTemplate": {
      "field": "generation.audioPrompt",
      "action": "compile",
      "hint": "audioBeat → AUD slot"
    },
    "rePushTarget": "MD",
    "description": "台词镜缺 audioPrompt"
  }
]

---

## 附录 G W93-W100

# 附录 G · 智能设计 W93–W100

用户话术触发 **SF-4 smartDesignProposals**，确认后 merge。

| ID | 触发话术示例 | 提案内容 | merge 落点 |
|----|--------------|----------|------------|
| W93 | 爆点不够/不够爽 | 增情绪峰值场/镜 | W3 或 SB |
| W94 | 太拖/节奏慢 | 删场/压缩台词 | W3 |
| W95 | 反转不够 | 补误导+揭晓 | W1 登记表 / W3 |
| W96 | 人物 flat | 补 arcStage 推进 | designBrief.arcToneMap |
| W97 | 钩子弱 | 补 W12/W13 | W3 首尾场 |
| W98 | 信息太密 | 拆 infoLinkage | designBrief |
| W99 | 同质化 | 换桥段/金手指边界 | W2 策略 |
| W100 | 付费点弱 | 补 paypointMarkers | designBrief |

## 输出结构

```json
{
  "smartDesignProposals": [{
    "ruleId": "W93",
    "trigger": "爆点不够",
    "proposal": "场2 增对峙升级",
    "targetStage": "W3",
    "status": "pending_user_confirm"
  }]
}
```

用户确认 → 写入 fixPlan / rePushPlan → 重跑对应阶段。

---

## 附录 H 图锚点

# 附录 H · 图锚点三层

T2 BP 产出 `visualLockTable`，EN/MD 编译时保护锚点 token。

## 三层

| 层 | 内容 | 字段 |
|----|------|------|
| L0 身份 | gender/age/服色 | characterAssets.L0 |
| L1 构图 | 景别偏好/站位 | BP.spatialDefaults |
| L2 风格 | prefix/suffix | art_skills prefix |

## cref / sref

- `--cref CHAR-CODE` 绑定角色
- `--sref SCENE-CODE` 绑定场景
- H5-4：polish 后 hash 锚点段，漂移则回退 compiled

## visualLockTable schema

```json
{
  "visualLockTable": {
    "characters": [{ "code": "CHAR-X", "cref": "...", "lockTokens": ["black hair"] }],
    "scenes": [{ "code": "SCENE-Y", "colorTemp": 4500 }],
    "anchorProps": [{ "code": "PROP-Z", "state": "closed" }]
  }
}
```

import → o_projectBlueprint（合流 P1）。

---

## 附录 I 六链

{
  "version": "2.0.1",
  "chains": [
    { "id": "dialogue", "nodes": ["W3.script", "SB.narrative.dialogue.lines", "EN.AUD", "VID.lipSync", "MD-AUD.lines"], "rollback": ["W3", "SB", "EN", "MD"] },
    { "id": "asset", "nodes": ["CD.L0", "BP.visualLockTable", "SB.charCodes", "EN.cref", "IMG.cref"], "rollback": ["CD", "BP", "SB", "EN", "MD"] },
    { "id": "continuity", "nodes": ["continuity.prevEpisodeSummary", "GB前情", "W3 W-CONT", "Pipeline写回"], "rollback": ["W3", "continuity"] },
    { "id": "av", "nodes": ["designBrief.B4", "GB.emotionCurve", "SB.emotion", "EN.Y9", "MD-AUD.emotion", "MD-VID.expr"], "rollback": ["designBrief", "GB", "SB", "EN"] },
    { "id": "story", "nodes": ["W1", "designBrief.B5", "SB.markers", "narrativeCausalityGraph", "FX.feasibility"], "rollback": ["W1", "W3", "SB"] },
    { "id": "scene", "nodes": ["designBrief.B6", "GB场表", "SB.sceneName", "BP.sceneColorLock", "IMG.scene"], "rollback": ["B", "GB", "SB", "BP", "EN"] },
    { "id": "camera", "nodes": ["designBrief.B12", "SB.shotSize", "SB.transitionType", "EN.motion", "MD-VID.camera"], "rollback": ["brief", "SB", "EN", "MD"] },
    { "id": "adaptation", "nodes": ["P03.matrix", "W2.adaptationStrategy", "W3.script", "designBrief"], "rollback": ["P03", "W2", "W3"] },
    { "id": "modality_compile", "nodes": ["EN.compile", "MD-IMG", "MD-VID", "MD-AUD", "MD-FX", "modalityPromptAudit"], "rollback": ["EN", "MD"] },
    { "id": "generation_apply", "nodes": ["SB.shotDesign", "SB.visualDescription", "EN.Y", "MD.prompts", "modalityPromptAudit"], "rollback": ["SB", "EN", "MD"] },
    { "id": "retention", "nodes": ["P03.R/O", "retentionPlan", "W3.sceneMeta", "designBrief.B18", "SB.retentionTier"], "rollback": ["W3", "B", "GB", "SB"] },
    { "id": "narrative_drive", "nodes": ["informationLedger", "dialoguePlan", "designBrief.B20", "SB.lines", "narrativeCausalityGraph"], "rollback": ["W3", "B", "SB"] },
    { "id": "packaging", "nodes": ["opening3to10s", "debutIntroPack", "SB.establishing", "endCardPack"], "rollback": ["W3", "SB"] },
    { "id": "adaptation_deep", "nodes": ["P03.D/V", "adaptationMatrixStructured", "W2", "W3", "designBrief.B16"], "rollback": ["P03", "W2", "W3", "B"] },
    { "id": "viral_clip", "nodes": ["viralAdaptation", "W1.paypoint", "GB.paypointScenes", "SB.clip30sCandidate"], "rollback": ["W1", "W2", "W3", "GB", "SB"] },
    { "id": "modality_feasibility", "nodes": ["W3.sceneMeta", "narrativeBrief.implementationPlan", "SB.visualEffect", "fxFeasibilityAudit", "MD-FX", "MD-AUD"], "rollback": ["W3", "SB", "EN", "MD"] },
    { "id": "repair", "nodes": ["SD", "fixPlan", "linkageRepairPlan", "rePushPlan"], "rollback": "reverse_route_table" }
  ]
}

{
  "version": "2.0.1",
  "description": "linkageRepairPlan 六链修复契约",
  "itemSchema": {
    "chain": "dialogue|asset|continuity|av|story|repair",
    "brokenAt": "string",
    "repairAction": "string",
    "targetStage": "string",
    "ruleIds": ["string"]
  },
  "example": {
    "linkageRepairPlan": [{
      "chain": "dialogue",
      "brokenAt": "shot-3.lines hash",
      "repairAction": "恢复 R2 原文",
      "targetStage": "SB",
      "ruleIds": ["R2", "H3"]
    }]
  }
}

---

## 附录 J 出口闸门

---
name: T1_quality_gate
description: T1 PreDesignPack 出口自检（非 JSON 假闸）
stageId: T1
outputTag: preDesignQuality
rulePackVersion: "2.0.1"
---

# T1 质量自检（PreDesignPack）

T1 为 T3 路径中的 **分镜检查点**，不是最终出口。最终出口见 `T3_quality_gate.md`。

## T1 必填产物

| 字段 | 来源 stage | 说明 |
|------|------------|------|
| script | W3 | 文学剧本全文 |
| planData | P/G/W | 预检/锚点/骨架/策略 |
| designBrief | B | B1–B13 联动字段 |
| preDesignPack.scriptPlan | GB | 分场/情绪/过渡 |
| preDesignPack.shots[] | SB | 台词映射 + visualDescription |
| rulePackVersion | — | `"2.0.1"` |

## preDesignPack.shots 结构

```json
{
  "shotIndex": 1,
  "type": "CHAR-SCENE",
  "sceneName": "寝殿",
  "visualDescription": "婢女俯身",
  "duration": 2,
  "narrative": {
    "dialogue": {
      "lines": [{ "speaker": "婢女", "text": "殿下醒了。" }]
    }
  }
}
```

## 出口前自检（创作清单，不写假 JSON）

1. **台词链**：剧本每句台词在 shots 中可追溯，100% 覆盖（可合并，不可丢）
2. **视听链**：designBrief.B4 → GB emotionCurve → SB emotionIntensity
3. **visualDescription**：每镜非空
4. **监督**：supervisionReport.grade ≥ B（若有）

## T1 阶段不写

`imagePrompt` / `videoPrompt` / `audioPrompt` / `fxPrompt`（属 T3 MD，见 `T3_quality_gate.md`）

## 禁止写入 bundle

- `externalHashCheck.match: true` 占位
- `linkageAudit` 假 pass
- `ruleAudit.passed: true` 无实测

## import 说明

有完整 shots → `POST importScript` 落库；**缺 T3 prompt 由外部 inspect 报告**，不在 Chat 填假通过。

# T3 质量闸门（全链路出口）

T3 为 **默认出口**。export 前对照 `docs/PROMPT_STANDARD.md` 自检，且**必须调用** `POST /api/ruleEngine/exportGate`。

## T3 必填产物

| 字段 | 来源 | 说明 |
|------|------|------|
| T1 全套 | GB/SB | script + preDesignPack + 台词 100% + visualDescription |
| characterDesign | CD | L0–L6 + CHAR-CODE |
| assetPipeline | AS | 场景/道具 |
| visualLockTable | BP | cref 可解析 |
| generation×4 | MD | 每镜 image/video/audio/fx |
| rulePackVersion | — | `"2.0.1"` |

## 每镜 generation 结构

```json
{
  "shotIndex": 1,
  "visualDescription": "婢女俯身唤醒",
  "visualEffect": "烛火摇曳，微光闪烁",
  "fxLevel": "F1",
  "charCodes": ["CHAR-MAID"],
  "generation": {
    "imagePrompt": "婢女, 寝殿烛火, 中景, 暖光, 古言写实, no text, --cref CHAR-MAID --ar 16:9",
    "videoPrompt": "中景 static, slow push, duration 2s, motion-from-frame, subtle mouth speaking",
    "audioPrompt": "婢女, 轻柔女声, 正常语速, 关切",
    "fxPrompt": "candlelight flicker, subtle warm glow, no CGI particles"
  }
}
```

无特效镜示例（F0 轨）：`"fxLevel": "F0"`，**省略** `fxPrompt` 或留空且 audit 声明 F0——禁止假 `modalityPromptAudit.FX=pass`。

或写入 `flowData.storyboard[]`：`prompt` / `videoDesc` / `duration`。

Slot 定义 SSOT：`data/fixtures/modality_prompt_slots.json`（skills / compiler / audit 均引用此文件）。

## 出口前自检（对照 PROMPT_STANDARD §8）

0. 跑 `W3_narrative_selfcheck` + `modality_closure_checklist` → 列出 missing/optimize
0b. T3：`planData.narrativeBrief.implementationPlan[]` 非空，每场含 `fxIntent`（含 F0）
0c. **场镜基数**：唯一 `preDesignPack.shots[].sceneName` 数 = `implementationPlan` 条数 = `sceneMeta` 条数；接场不得共用 sceneName 却多留 sceneRef F1（孤儿场 → 导入永卡）
0d. 禁假绿：不得 `modalityPromptAudit.FX=pass` / `narrativeSelfcheck.passed=true` 而字段仍缺
1. 台词覆盖率 100%（可合并，不可丢）
2. 每镜 visualDescription 非空
3. characterDesign 覆盖主角/反派
4. visualLockTable 解析全部 charCodes
5. 每镜 imagePrompt + videoPrompt 非空；**禁止**仅 `中景 static, duration Ns` 无峰值/口型的 stub 作为最终出口（须 peak 或 lip 关键词，或注明 F0 空镜）
6. 台词镜 audioPrompt 非空
7. **FX 双轨**：F0 声明 **或** 非空散文 `fxPrompt`（禁字母等级当散文）；`fxFeasibilityAudit.items` 覆盖全部镜号
8. **无映射镜的 sceneRef 禁止 F1+**（孤儿场：删 plan 或降 F0 或独立 sceneName）
8. 禁假 `ruleAudit` / `linkageAudit` / `modalityPromptAudit` pass

## 出口形状族（EXPORT_SHAPE_RULES / PDSR Prevent）

- 可选 string：无内容**省略 key**，禁止 JSON `null`
- `deepAdaptation.nameMap|relationMap|substitutions` 仅 `[{ "from", "to" }]`；禁止 arrow-key 伪对象
- `designBrief.B5` / `infoLinkageChain`：`payoffEp` 仅 number（未来集号）；本集收 → `payoffLabel: "本集收"`
- 勿发明 `B16_adaptationDeepRef` 替代 `designBrief.B16` record
- **SB 镜级 string 字段**（T3 Browser 出口；object 仅服务器 salvage，Chat 勿写）：
  - `visualEffect`: `"F1: 烛火摇曳，微光闪烁"`（可选同镜 `fxLevel: "F1"`）
  - `audioCue`: `"茶盏碎裂声骤停"`（来自 W3 avCausality.audioBeat）
  - 禁止 `"visualEffect": { "level", "desc" }`（V62 制作路径 legacy，非 T3 export）
- **导出前自检（阻断）**：扫描全部 `preDesignPack.shots[].visualEffect` / `audioCue`；若为 object → **不得导出**，按 RH-MOD-01 改成 string 后再跑 `exportGate`。服务器 import salvage 仅兜底，Chat 输出仍以 string 为规范。

## 禁止写入 bundle

- `ruleAudit: { passed: true }` 假通过
- `linkageAudit` 假六链 pass
- `externalHashCheck: { match: true }` demo 值

## 下游

export JSON → `POST /api/ruleEngine/exportGate` → `exportAllowed=true` 且附 `closureSnapshot` → `POST importScript` 落库。  
禁止仅靠 `ruleAudit` / `linkageAudit` / `modalityPromptAudit` 自报通过。

**配角入册（DC-16）**：`chatRepairText` 含 RH-DC-16 时，补真实 `characterDesign`（code/name/`L0.identity`，禁仅 stub）后须**再预览**直至 `exportAllowed`。详见 `preview_vs_import_guide.md` 与 `docs/image-quality-chain.md`。

{
  "version": "2.0.1",
  "profiles": {
    "古言虐恋": {
      "genrePreset": "古言虐恋",
      "lockedChoices": {
        "emotion_logic": "angst",
        "V05_genreFramework": "虐恋",
        "R01_ep1_opening5s": "identity_contrast",
        "R02_ep1_first30s": "audience_knows",
        "C02_infoGapStrategy": "audience_knows",
        "O01_openingProfile": "O3_conflict_tableau"
      },
      "deepDefaults": {
        "D04_settingProfile": { "era": "架空唐宋", "socialLayer": "豪门/宫廷" }
      }
    },
    "都市甜宠": {
      "genrePreset": "都市甜宠",
      "lockedChoices": {
        "emotion_logic": "sweet",
        "V05_genreFramework": "甜宠",
        "R01_ep1_opening5s": "emotion_hit",
        "V04_episodeRhythm": "strict_31545",
        "C03_dialogueDensity": "short_drama_high",
        "O01_openingProfile": "O2_contrast_reveal"
      },
      "deepDefaults": {
        "D01_nameMap": "modernize",
        "D04_settingProfile": { "era": "当代都市" }
      }
    }
  }
}

{
  "version": "2.0.1",
  "description": "P0 preCheck issue → adaptation matrix dim 推荐映射（Browser Chat 可读）",
  "mappings": [
    { "issueTypes": ["情绪", "P1"], "dims": [{ "dimId": "emotion_logic", "suggestedChoice": "mixed", "confidence": 0.8 }] },
    { "issueTypes": ["反转", "P2"], "dims": [{ "dimId": "narrative_structure", "suggestedChoice": "compressed", "confidence": 0.75 }] },
    { "issueTypes": ["信息", "P3"], "dims": [{ "dimId": "C02_infoGapStrategy", "suggestedChoice": "front_load", "confidence": 0.85 }] },
    { "issueTypes": ["冲突", "P4"], "dims": [{ "dimId": "conflict_design", "suggestedChoice": "person_vs_person", "confidence": 0.8 }] },
    { "issueTypes": ["人物", "P5"], "dims": [{ "dimId": "character_anchor", "suggestedChoice": "core_triad", "confidence": 0.7 }] },
    { "issueTypes": ["台词", "P6"], "dims": [{ "dimId": "dialogue_strategy", "suggestedChoice": "oral_compress", "confidence": 0.75 }] },
    { "issueTypes": ["节奏", "P3", "P2"], "dims": [{ "dimId": "R01_retentionTier", "suggestedChoice": "ep1_opening_crisis", "confidence": 0.9 }] },
    { "issueTypes": ["开场", "P1"], "dims": [{ "dimId": "O01_openingPattern", "suggestedChoice": "crisis_first", "confidence": 0.9 }] }
  ],
  "genrePresetRules": [
    { "when": { "minScore": { "P1": 7 }, "tags": ["古言", "虐"] }, "preset": "古言虐恋" },
    { "when": { "minScore": { "P1": 6 }, "tags": ["都市", "甜"] }, "preset": "都市甜宠" }
  ],
  "proposeMatrixSchema": {
    "recommendedMatrixDraft": [
      { "dimId": "string", "suggestedChoice": "string", "confidence": 0.0, "issueIds": ["P-001"], "reason": "string" }
    ]
  }
}

{
  "version": "2.0.1",
  "infoGapTypes": ["audience_knows_character_not", "character_knows_audience_not", "partial_both", "none"],
  "forbiddenSuspense": ["opaque_mystery", "exposition_dump", "self_reveal_dialogue"],
  "dialogueFunctions": ["advance_plot", "character_voice", "conflict_escalate", "deliver_info", "emotion_hit", "subtext"],
  "causalityTypes": ["event", "motivation", "information", "emotion", "visual", "dialogue"],
  "avBeatRule": "visualAction_is_cause_dialogue_is_effect",
  "densityBudget": {
    "emotion": { "ep1_opening": "high", "body": "spring" },
    "information": { "ep1_first30s_max": 1 },
    "plot": { "minReversalPerEp": 1 }
  },
  "tierRules": {
    "T1": { "requireLedger": false, "requireShotDesign": false },
    "T2": { "requireLedger": true, "requireShotDesign": false },
    "T3": { "requireLedger": true, "requireShotDesign": true, "requireFunctionTags": true }
  }
}

{
  "version": "2.0.1",
  "openingCard": { "ep1_3": ["性格", "困境", "目标", "动机"], "ep10Hook": "主线强钩子" },
  "clipPoints30s": { "openingEpCount": 10, "minClips": 1, "perPaypointMin": 1 },
  "paypoints": { "ratios": [0.1, 0.3, 0.5, 0.7, 0.9], "types": ["身份差", "感情错位", "命运巨变", "环境剧变"] },
  "episodeRhythm": { "impact3s": true, "change15s": true, "expect45s": true },
  "genreFrameworks": ["甜宠", "虐恋", "战神", "重生", "萌宝"]
}

---

## 附录 K 走廊

# 设计联动 B+H1

rulePackVersion: 2.0.1

## designBrief

- [ ] **B1** B1 — 检测方式：提取dialogue中的关键词，检查与emotionIntensity是否匹配
- [ ] **B2** B2 — 见V90
- [ ] **B3** B3 — 在B3检查中，对每句台词进行'换角色测试'，若换给其他角色后仍然自然成立，则判定为该台词风格化不足（未绑定角色）。检测方式：人工标记或使用角色背景匹配度检查
- [ ] **B4** B4 — 检查performance.hands/bodyWeight是否与dialogue情绪一致
- [ ] **B5** B5 — 见B11
- [ ] **B6** B6 — 见V92
- [ ] **B7** B7 — 检查情绪转折点是否有dialogue变化或performance变化
- [ ] **B8** B8 — 检查信息揭示点的visualFocus层级
- [ ] **B9** B9 — 检测emotion上升段与rhythmZone变化的同步性
- [ ] **B10** B10 — 检查sceneName与emotionIntensity的匹配
- [ ] **B11** B11 — 每镜emotionIntensity必须同时满足：①actStructure中该幕的emotionCap上限；②sceneColorLock中该场景的B10范围。检测方式：逐镜比对两个条件的交集

## validate

- [ ] **H1** H1 — 检测方式：对每层的关键字段，检查上一层是否有对应的设计依据

---

## 附录 L rePush

{
  "version": "2.0.1",
  "routes": [
    {
      "trigger": "dialogue_hash_mismatch",
      "ruleIds": [
        "R2",
        "H3"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ],
      "presentationFork": [
        "P1改剧本",
        "P2改分镜"
      ]
    },
    {
      "trigger": "emotion_composition",
      "ruleIds": [
        "B2",
        "QP-06"
      ],
      "reverseTarget": "GB",
      "forwardStages": [
        "GB",
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "shot_camera_invalid",
      "ruleIds": [
        "PR-CAM-01",
        "QP-14"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "cam_whitelist",
      "ruleIds": [
        "PR-CAM-01",
        "DC-09",
        "QP-14"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD",
        "SB"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "PR-CAM-01",
      "ruleIds": [
        "PR-CAM-01"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ]
    },
    {
      "trigger": "story_link_broken",
      "ruleIds": [
        "W41",
        "QP-10"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "designBrief",
        "GB",
        "SB"
      ]
    },
    {
      "trigger": "identity_mismatch",
      "ruleIds": [
        "Y8",
        "QP-18",
        "PC-14"
      ],
      "reverseTarget": "CD",
      "forwardStages": [
        "CD",
        "BP",
        "SB",
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "fx_infeasible",
      "ruleIds": [
        "V77",
        "QP-17",
        "FX-GRADE-01"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "MD-FX"
      ],
      "presentationFork": [
        "P1改剧本描写",
        "P2改分镜局部特效"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "generation_feedback",
      "ruleIds": [
        "H5"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ]
    },
    {
      "trigger": "H2",
      "ruleIds": [
        "H2"
      ],
      "reverseTarget": "GB",
      "forwardStages": [
        "GB",
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "H3",
      "ruleIds": [
        "H3"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "H4",
      "ruleIds": [
        "H4"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN"
      ]
    },
    {
      "trigger": "H5",
      "ruleIds": [
        "H5"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ]
    },
    {
      "trigger": "V1",
      "ruleIds": [
        "V1"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "V10",
      "ruleIds": [
        "V10"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB"
      ]
    },
    {
      "trigger": "MODE-AGNES",
      "ruleIds": [
        "MODE-AGNES"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD"
      ]
    },
    {
      "trigger": "narrative_graph_broken",
      "ruleIds": [
        "W41"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W1",
        "W3",
        "SB"
      ]
    },
    {
      "trigger": "debut_missing",
      "ruleIds": [
        "QP-19",
        "PR-16"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_lip_duration",
      "ruleIds": [
        "PR-09"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_os_voice",
      "ruleIds": [
        "PR-10"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_prop_state",
      "ruleIds": [
        "PR-11"
      ],
      "reverseTarget": "BP",
      "forwardStages": [
        "BP",
        "SB"
      ]
    },
    {
      "trigger": "pr_spatial",
      "ruleIds": [
        "PR-12"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_expr_feasibility",
      "ruleIds": [
        "PR-14",
        "QF-EXPR"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_vendor_fx",
      "ruleIds": [
        "PR-15"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "SB",
        "W3"
      ]
    },
    {
      "trigger": "video_first_frame_missing",
      "ruleIds": [
        "AG-GATE-01",
        "MODE-AGNES"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "motion_overflow",
      "ruleIds": [
        "AG-GATE-02",
        "QF-EXPR-06"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "duration_clamp",
      "ruleIds": [
        "AG-GATE-03",
        "V9"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "native_audio_mismatch",
      "ruleIds": [
        "PR-09",
        "PC-10"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD-AUD"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "img_cref_missing",
      "ruleIds": [
        "V4",
        "SD-IMG-01",
        "IMG-CREF"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD-IMG"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "missing_scene",
      "ruleIds": [
        "V4",
        "SB-SCENE-01"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "BP",
        "SB",
        "EN",
        "AS"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "img_pure_negative",
      "ruleIds": [
        "V2",
        "SD-IMG-02"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "aud_voice_mismatch",
      "ruleIds": [
        "Y8",
        "SD-AUD-02"
      ],
      "reverseTarget": "BP",
      "forwardStages": [
        "BP",
        "EN",
        "MD-AUD"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "fx_f5_unhandled",
      "ruleIds": [
        "V77",
        "SD-FX-02"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "MD-FX"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "modality_slot_missing",
      "ruleIds": [
        "M1",
        "PC-13"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "retention_opening_missing",
      "ruleIds": [
        "RET-01",
        "RET-02"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "B",
        "GB",
        "SB"
      ]
    },
    {
      "trigger": "narrative_info_gap",
      "ruleIds": [
        "NAR-01",
        "NAR-02"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "B",
        "SB"
      ]
    },
    {
      "trigger": "narrative_dialogue_function",
      "ruleIds": [
        "NAR-04",
        "NAR-05"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB"
      ]
    },
    {
      "trigger": "packaging_debut_missing",
      "ruleIds": [
        "PKG-03",
        "PKG-04"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "EN"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "packaging_end_preview",
      "ruleIds": [
        "PKG-06"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB"
      ]
    },
    {
      "trigger": "generation_design_drift",
      "ruleIds": [
        "GEN-05",
        "GEN-06"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN",
        "MD"
      ]
    },
    {
      "trigger": "adaptation_deep_empty",
      "ruleIds": [
        "ADP-D01",
        "ADP-D02"
      ],
      "reverseTarget": "P03",
      "forwardStages": [
        "P03",
        "W2",
        "W3"
      ]
    },
    {
      "trigger": "design_spec_upstream",
      "ruleIds": [
        "DSG-B14"
      ],
      "reverseTarget": "GB",
      "forwardStages": [
        "B",
        "GB",
        "SB"
      ]
    },
    {
      "trigger": "viral_clip_shortfall",
      "ruleIds": [
        "VIR-01",
        "VIR-03"
      ],
      "reverseTarget": "W1",
      "forwardStages": [
        "W1",
        "W3",
        "GB",
        "SB"
      ]
    },
    {
      "trigger": "modality_fx_missing",
      "ruleIds": [
        "MOD-01",
        "MOD-02"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "MD-FX"
      ]
    },
    {
      "trigger": "modality_aud_missing",
      "ruleIds": [
        "MOD-03",
        "MOD-04"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "W3",
        "SB",
        "MD-AUD"
      ]
    },
    {
      "trigger": "narrative_split_hint",
      "ruleIds": [
        "NAR-14",
        "NAR-15"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB"
      ]
    },
    {
      "trigger": "mode_rules_mismatch",
      "ruleIds": [
        "MODE-RULES-01"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "prompt_gen_media_missing",
      "ruleIds": [
        "PROMPT-GEN-MEDIA",
        "QP-11"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "SB",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "derive_parent_ref_missing",
      "ruleIds": [
        "DRV-PARENT-REF"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "derive_prompt_empty",
      "ruleIds": [
        "DRV-PROMPT"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "CD"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "image_mode_ref_mismatch",
      "ruleIds": [
        "IMG-MODE-REF"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "vendor_passthrough",
      "ruleIds": [
        "VENDOR-QUEUE"
      ],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "repairPriority": "P0"
    },
    {
      "trigger": "tls_socket",
      "ruleIds": [
        "TLS-SOCKET",
        "tls_socket",
        "ECONNRESET"
      ],
      "patterns": [
        "Client network socket disconnected before secure TLS connection was established",
        "socket disconnected before secure TLS",
        "ECONNRESET",
        "ETIMEDOUT",
        "network socket disconnected",
        "TLS connection"
      ],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "repairPriority": "P0"
    },
    {
      "trigger": "missing_reference_upload",
      "ruleIds": [
        "GEN-REF-UPLOAD",
        "GEN-OSSURL"
      ],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "repairPriority": "P0"
    },
    {
      "trigger": "wrong_character_ref",
      "ruleIds": [
        "PC-14",
        "Y8"
      ],
      "reverseTarget": "CD",
      "forwardStages": [
        "CD",
        "BP",
        "SB",
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "cref_unbound",
      "ruleIds": [
        "V4",
        "AS-CREF"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "SB",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "PR-10",
      "ruleIds": [
        "PR-10"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "PR-11",
      "ruleIds": [
        "PR-11"
      ],
      "reverseTarget": "BP",
      "forwardStages": [
        "BP",
        "SB"
      ]
    },
    {
      "trigger": "PR-12",
      "ruleIds": [
        "PR-12"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "content_policy",
      "ruleIds": [
        "POLICY-01"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "content_policy_rewrite",
      "ruleIds": [
        "POLICY-01",
        "POLICY-REWRITE"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "lang_aud_mismatch",
      "ruleIds": [
        "LANG-AUD-01"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD-AUD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "lang_vid_mismatch",
      "ruleIds": [
        "LANG-01"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD-VID"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "vp_conflict",
      "ruleIds": [
        "VP-CONFLICT"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD",
        "EN"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "fx_empty",
      "ruleIds": [
        "FX-GRADE-01"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "MD-FX"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "cam_speak",
      "ruleIds": [
        "CAM-SPEAK"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "SB"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "cam_variety",
      "ruleIds": [
        "CAM-VARIETY"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "oss_ref_missing",
      "ruleIds": [
        "GEN-OSSURL",
        "GEN-REF-UPLOAD"
      ],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "repairPriority": "P0"
    },
    {
      "trigger": "audio_force_mismatch",
      "ruleIds": [
        "AG-GATE-AUD"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "scene_break",
      "ruleIds": [
        "V6",
        "DC-SCENE"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "orphan_stub_no_image",
      "ruleIds": [
        "orphan_stub_no_image",
        "ASSET_STUB_QUALITY"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "CD",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "cd_cast_gap",
      "ruleIds": [
        "DC-16",
        "DG-CD-COVERAGE",
        "INT-CHAR-ORPHAN",
        "complete_failed",
        "cd_cast_gap"
      ],
      "reverseTarget": "CD",
      "forwardStages": [
        "CD",
        "SB",
        "EN",
        "AS"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "polish_failed",
      "ruleIds": [
        "polish_failed"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "media_probe_mute",
      "ruleIds": [
        "media_probe_mute",
        "GC-07"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    }
  ],
  "maxRounds": 3
}

---

## 附录 M QP+模态

{
  "version": "2.0.1",
  "slots": {
    "IMG": ["subject", "scene", "composition", "lighting", "style", "negative", "cref", "identity"],
    "VID": ["motion", "camera", "duration", "lipSync", "identity", "fx"],
    "AUD": ["lines", "voiceProfile", "emotion", "deliveryType", "identity"],
    "FX": ["type", "intensity", "feasibilityLevel", "degradeHint"],
    "SUB": ["copyHint", "subtitleCard", "debutIntro"]
  },
  "requiredPerTier": {
    "T1": [],
    "T2": ["IMG.subject", "IMG.scene"],
    "T3": ["IMG", "VID", "AUD", "FX"]
  }
}

---

## 附录 N 统一闭环

# 附录 N · V5×Chat 统一闭环

## 三轨

1. **轨1 内部**：scriptAgent → productionAgent → RuleEngine INT → Touch
2. **轨2 Chat**：browser_full_flow.bundle → SD/SF/QP → ScriptBundle
3. **轨3 合流**：import → validate → generate → feedback

## 铁律

- 同一 ruleId、rollbackLayer、schema
- Chat EXT L2 不替代 INT validate
- import 为唯一落库口

## I1–I20 缺口（摘要）

| ID | 缺口 | wave |
|----|------|------|
| I1 | INT ~8 validators | INT-1 |
| I2 | o_storyboard 字段 | P1 |
| I4 | autoFix 硬编码 | P1 ✓ fix_templates |
| I7 | 生成失败回流 | P1 |
| I10 | autoDesign heuristic | P1 ✓ designBrief/preDesignPack |

完整表见 `data/fixtures/rule_flow_unified.json` → `internalGaps`。

## 合流 Pipeline

```
importScript → resolveContext → preDesignPack? skip SB
→ validate + dryRun production_closure_checklist
→ QualityGate → ModalityOrchestrator → generationFeedback → rePushPlan
```

---

## 附录 O 制作闭环 dryRun

# §6 制作实现闭环总览

## 五问对照

| # | 关切 | 机制 | Skill |
|---|------|------|-------|
| Q1 | 设计男/图视音女不一致 | identityAudit 跨 IMG/VID/AUD BLOCK | production_identity_audit |
| Q2 | 特效→prompt→AI 无法实现 | fxFeasibilityAudit F0–F5 + degradeFixPlan | production_fx_feasibility |
| Q3 | 分镜不合理反推 | PR-01~16 + rePushPlan | production_reasonableness_PR |
| Q4 | 故事因果正反向 | narrativeCausalityGraph | linkage_continuity + W3 |
| Q5 | 首次出场标准 | debutIntroPack + establishing | production_debut_intro |

## 合流（轨3）

设计走廊 → import → production_closure_checklist dryRun → validate INT → QualityGate → 生成 → generationFeedback → rePushPlan

## 验收 G56–G65

| # | 验收 |
|---|------|
| G56 | identityAudit：design male 时 IMG/VID/AUD 无 female 冲突 |
| G57 | fxFeasibility F5 镜不得 T3 未降级 export |
| G58 | F2 特效输出 degradeFixPlan + 用户确认流 |
| G59 | PR-01~08 BLOCK 触发 rePushPlan（非仅 fixPlan） |
| G60 | narrativeCausalityGraph 无 broken 或均有 reverseHints |
| G61 | 每主角色/主场景有 debutIntroPack 条目 |
| G62 | 首次出场镜 shotSize 含 establishing 类 |
| G63 | generationFeedback identity_mismatch → EN/BP |
| G64 | 内外 identityAudit schema 一致（Chat T3 = import dryRun） |
| G65 | golden「男设计/女 prompt」反例必 BLOCK |

---

# §14.11 扩展验证域（PR-09~16）

| ID | 域 | rePush |
|----|-----|--------|
| PR-09 | 唇形/时长与 lip 词 | SB / EN-VID |
| PR-10 | 画外音 OS | SB / EN-AUD |
| PR-11 | 道具状态链 | SB / BP |
| PR-12 | 空间关系跨模态 | SB / EN |
| PR-13 | 同场时空/色温 | SB / brief |
| PR-14 | 表情可实现 QF-EXPR | SB / EN |
| PR-15 | Vendor FX F5 | EN / SB / W3 |
| PR-16 | SUB 与 no-subtitles 冲突 | EN-MD / SB |

## T3 dryRun 十四项（G71/G73–G85）

见 `data/fixtures/production_closure_checklist.json` — Chat export 与 import dryRun **共用**。

PC-01~08：§14 制作闭环（identity/fx/PR/graph/debut/modality/hash/linkage）  
PC-09~14：§15 四模态触达（VID/AUD/IMG/FX slot + 跨模态 identity）

**§17 统一闭环**：`unified_closure_matrix.json` 合流 DC+PC+GC+IC；见 `appendix/T_unified_closure.md` 与 `yarn test:unified-closure-golden`（G86–G115）。

1. identityAudit 全镜 PASS  
2. fxFeasibilityAudit 无未处理 F5  
3. productionReasonableness PR 无 BLOCK  
4. narrativeCausalityGraph broken 为空或有 reverseHints  
5. debutIntroPack 主角色/主场景齐全（WARN 可记录）  
6. modalityPromptAudit T3 slot 合规  
7. externalHashCheck.match + linkageAudit 无 broken 链  
8. **PC-09** VID 首帧/时长/运镜  
9. **PC-10** AUD native/voice  
10. **PC-11** IMG cref/identity  
11. **PC-12** FX F4/F5  
12. **PC-13** 四 slot 齐全  
13. **PC-14** 跨模态 identity  

## 验收 G66–G85

| # | 验收 |
|---|------|
| G66 | PR-09：长台词 duration 与 lip 一致 |
| G67 | PR-10：OS 镜 AUD profile 正确 |
| G68 | PR-11/12 道具与 spatial 跨模态一致 |
| G69 | PR-14：emotion≥6 + duration&lt;4s BLOCK |
| G70 | PR-15：vendor F5 不得 silent pass |
| G71 | dryRun PC-01~14 全 PASS 才允许 export |
| G72 | golden 反例 dryRun 均 BLOCK |
| G73–G85 | 四模态触达见 appendix/P_modality_touch_four.md |

{
  "version": "2.0.1",
  "description": "T3 export / import dryRun 共用清单（G64/G71/G73-G85）",
  "checks": [
    { "id": "PC-01", "field": "identityAudit", "rule": "全镜 PASS", "severity": "BLOCK", "acceptance": "G56,G64,G65" },
    { "id": "PC-02", "field": "fxFeasibilityAudit", "rule": "无未处理 F5", "severity": "BLOCK", "acceptance": "G57,G70,G81" },
    { "id": "PC-03", "field": "productionReasonableness", "rule": "PR-01~16 无 BLOCK", "severity": "BLOCK", "acceptance": "G59,G66-G69" },
    { "id": "PC-04", "field": "narrativeCausalityGraph", "rule": "broken 为空或有 reverseHints", "severity": "BLOCK", "acceptance": "G60" },
    { "id": "PC-05", "field": "debutIntroPack", "rule": "主角色/主场景齐全", "severity": "WARN", "acceptance": "G61,G62" },
    { "id": "PC-06", "field": "modalityPromptAudit", "rule": "T3 四模态 slot 合规", "severity": "BLOCK", "acceptance": "G71" },
    { "id": "PC-07", "field": "externalHashCheck", "rule": "T1 match=true", "severity": "BLOCK", "acceptance": "G71" },
    { "id": "PC-08", "field": "linkageAudit", "rule": "六链无 broken", "severity": "BLOCK", "acceptance": "G71" },
    { "id": "PC-09", "field": "modalityPromptAudit.VID", "rule": "首帧/时长/运镜（Agnes singleImage）", "severity": "BLOCK", "acceptance": "G74,G78" },
    { "id": "PC-10", "field": "modalityPromptAudit.AUD", "rule": "native 或 TTS 路径 + voiceProfile", "severity": "BLOCK", "acceptance": "G73,G75,G80" },
    { "id": "PC-11", "field": "modalityPromptAudit.IMG", "rule": "cref/identity/PURE 词合规", "severity": "BLOCK", "acceptance": "G79" },
    { "id": "PC-12", "field": "fxFeasibilityAudit", "rule": "无 F5；F4 有 postProductionOnly", "severity": "BLOCK", "acceptance": "G81" },
    { "id": "PC-13", "field": "modalityPromptAudit", "rule": "T3 四 slot 齐全", "severity": "BLOCK", "acceptance": "G71,G84" },
    { "id": "PC-14", "field": "identityAudit", "rule": "IMG/VID/AUD 跨模态一致", "severity": "BLOCK", "acceptance": "G65,G72" }
  ],
  "exportGate": {
    "description": "G71：全部 BLOCK 级 PC 项 PASS 才允许 T3 export",
    "requiredIds": ["PC-01", "PC-02", "PC-03", "PC-04", "PC-06", "PC-07", "PC-08", "PC-09", "PC-10", "PC-11", "PC-12", "PC-13", "PC-14"]
  },
  "t2Subset": ["PC-01", "PC-02", "PC-03", "PC-04", "PC-05"]
}

---

## 附录 P 四模态触达

{
  "version": "2.0.1",
  "description": "四模态 × Base/Vendor × tier × rePushTarget",
  "modalities": {
    "IMG": {
      "baseRules": ["V1", "V2", "V3", "V4"],
      "designSourceFields": ["sceneName", "charCodes", "visualDescription", "emotion"],
      "vendorRules": ["AG-GATE-04"],
      "slots": ["subject", "scene", "composition", "lighting", "style", "negative", "cref", "identity"],
      "tiers": { "T1": "skip", "T2": ["subject", "scene"], "T3": "all" },
      "rePushTargets": {
        "cref_missing": "EN",
        "identity_mismatch": "EN",
        "pure_negative": "EN"
      },
      "dryRunId": "PC-11"
    },
    "VID": {
      "baseRules": ["V9", "QF-VIEW", "QF-DUR", "QF-EXPR-06", "PR-07"],
      "designSourceFields": ["shotSize", "transitionType", "duration", "emotion"],
      "vendorRules": ["AG-GATE-01", "AG-GATE-02", "AG-GATE-03", "MODE-AGNES"],
      "slots": ["motion", "camera", "duration", "lipSync", "identity", "fx"],
      "tiers": { "T1": "skip", "T2": "skip", "T3": "all" },
      "rePushTargets": {
        "video_first_frame_missing": "MD",
        "motion_overflow": "EN",
        "duration_clamp": "SB",
        "native_audio_mismatch": "EN"
      },
      "dryRunId": "PC-09",
      "repairPriority": "P0"
    },
    "AUD": {
      "baseRules": ["R2", "H3", "V74", "PR-10"],
      "designSourceFields": ["narrative.dialogue.lines", "emotion", "audioMood"],
      "vendorRules": ["dialogue-native"],
      "slots": ["lines", "voiceProfile", "emotion", "deliveryType", "identity"],
      "tiers": { "T1": "skip", "T2": "skip", "T3": "all" },
      "rePushTargets": {
        "dialogue_hash_mismatch": "SB",
        "identity_mismatch": "EN",
        "native_audio_mismatch": "EN",
        "pr_os_voice": "SB"
      },
      "dryRunId": "PC-10",
      "repairPriority": "P1"
    },
    "FX": {
      "baseRules": ["V77", "PR-07", "PR-15"],
      "designSourceFields": ["visualEffect", "markers", "narrative.markers"],
      "vendorRules": ["F-clamp-3"],
      "slots": ["type", "intensity", "feasibilityLevel", "degradeHint"],
      "tiers": { "T1": "skip", "T2": "skip", "T3": "all" },
      "rePushTargets": {
        "fx_infeasible": "SB",
        "pr_vendor_fx": "EN",
        "F5_unhandled": "W3"
      },
      "dryRunId": "PC-12",
      "repairPriority": "P1"
    }
  },
  "crossModal": {
    "identityAudit": { "modalities": ["IMG", "VID", "AUD"], "dryRunId": "PC-14" },
    "modalityPromptAudit": { "requiredT3": ["IMG", "VID", "AUD", "FX"], "dryRunId": "PC-13" },
    "linkageAudit": { "dryRunId": "PC-08" }
  },
  "repairPriorityOrder": ["VID", "IMG", "AUD", "FX", "EN", "SB", "W3"]
}

{
  "version": "2.0.1",
  "defaultVendor": "agnesai",
  "defaultPolicy": "native",
  "policies": {
    "native": {
      "description": "台词镜 generate_audio=true + dialogue-native prompt",
      "requiresLines": true,
      "generateAudio": true,
      "audioRoute": "dialogue-native"
    },
    "post": {
      "description": "Vendor 不支持 native → TTS-dubbing 或 post-bgm",
      "generateAudio": false,
      "audioRoute": "TTS-dubbing",
      "fallback": "post-bgm"
    }
  },
  "dialogueShotRules": {
    "oneLineOneShot": true,
    "maxLinesPerShot": 1,
    "lipSyncRequired": true
  },
  "vendorDefaults": {
    "agnesai": { "policy": "native", "singleImage": true, "requiresFirstFrame": true },
    "kling": { "policy": "post", "singleImage": false },
    "wan": { "policy": "post", "singleImage": false }
  }
}

{
  "version": "2.0.1",
  "vendor": "agnesai",
  "gates": [
    { "id": "AG-GATE-01", "rule": "singleImage 须 referenceImage 或分镜图", "severity": "BLOCK", "rePushTarget": "MD" },
    { "id": "AG-GATE-02", "rule": "motion 白名单；禁面部重写", "severity": "BLOCK", "rePushTarget": "EN", "related": ["QF-EXPR-06"] },
    { "id": "AG-GATE-03", "rule": "duration 1-30s", "severity": "BLOCK", "rePushTarget": "SB" },
    { "id": "AG-GATE-04", "rule": "剥离 @图N / negative 通道", "severity": "WARN", "rePushTarget": "MD" }
  ],
  "motionWhitelist": ["static", "slow pan", "slow zoom", "gentle push", "subtle drift"],
  "motionForbidden": ["rapid zoom", "face morph", "expression change", "camera roll"],
  "qfExpr": {
    "QF-EXPR-01": { "maxIntensityForMicro": 5, "forbiddenWords": ["怒吼", "狰狞", "扭曲"] },
    "QF-EXPR-06": { "singleImageForbidden": ["change expression", "smile to frown", "face rewrite"] }
  },
  "imageTemplate": "tag-stack-zh",
  "videoTemplate": "motion-from-frame"
}

---

## 附录 Q 四模态反推

{
  "version": "2.0.1",
  "routes": [
    {
      "trigger": "dialogue_hash_mismatch",
      "ruleIds": [
        "R2",
        "H3"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ],
      "presentationFork": [
        "P1改剧本",
        "P2改分镜"
      ]
    },
    {
      "trigger": "emotion_composition",
      "ruleIds": [
        "B2",
        "QP-06"
      ],
      "reverseTarget": "GB",
      "forwardStages": [
        "GB",
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "shot_camera_invalid",
      "ruleIds": [
        "PR-CAM-01",
        "QP-14"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "cam_whitelist",
      "ruleIds": [
        "PR-CAM-01",
        "DC-09",
        "QP-14"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD",
        "SB"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "PR-CAM-01",
      "ruleIds": [
        "PR-CAM-01"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ]
    },
    {
      "trigger": "story_link_broken",
      "ruleIds": [
        "W41",
        "QP-10"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "designBrief",
        "GB",
        "SB"
      ]
    },
    {
      "trigger": "identity_mismatch",
      "ruleIds": [
        "Y8",
        "QP-18",
        "PC-14"
      ],
      "reverseTarget": "CD",
      "forwardStages": [
        "CD",
        "BP",
        "SB",
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "fx_infeasible",
      "ruleIds": [
        "V77",
        "QP-17",
        "FX-GRADE-01"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "MD-FX"
      ],
      "presentationFork": [
        "P1改剧本描写",
        "P2改分镜局部特效"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "generation_feedback",
      "ruleIds": [
        "H5"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ]
    },
    {
      "trigger": "H2",
      "ruleIds": [
        "H2"
      ],
      "reverseTarget": "GB",
      "forwardStages": [
        "GB",
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "H3",
      "ruleIds": [
        "H3"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "H4",
      "ruleIds": [
        "H4"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN"
      ]
    },
    {
      "trigger": "H5",
      "ruleIds": [
        "H5"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ]
    },
    {
      "trigger": "V1",
      "ruleIds": [
        "V1"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "V10",
      "ruleIds": [
        "V10"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB"
      ]
    },
    {
      "trigger": "MODE-AGNES",
      "ruleIds": [
        "MODE-AGNES"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD"
      ]
    },
    {
      "trigger": "narrative_graph_broken",
      "ruleIds": [
        "W41"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W1",
        "W3",
        "SB"
      ]
    },
    {
      "trigger": "debut_missing",
      "ruleIds": [
        "QP-19",
        "PR-16"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_lip_duration",
      "ruleIds": [
        "PR-09"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_os_voice",
      "ruleIds": [
        "PR-10"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_prop_state",
      "ruleIds": [
        "PR-11"
      ],
      "reverseTarget": "BP",
      "forwardStages": [
        "BP",
        "SB"
      ]
    },
    {
      "trigger": "pr_spatial",
      "ruleIds": [
        "PR-12"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_expr_feasibility",
      "ruleIds": [
        "PR-14",
        "QF-EXPR"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "pr_vendor_fx",
      "ruleIds": [
        "PR-15"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "SB",
        "W3"
      ]
    },
    {
      "trigger": "video_first_frame_missing",
      "ruleIds": [
        "AG-GATE-01",
        "MODE-AGNES"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "motion_overflow",
      "ruleIds": [
        "AG-GATE-02",
        "QF-EXPR-06"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "duration_clamp",
      "ruleIds": [
        "AG-GATE-03",
        "V9"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "native_audio_mismatch",
      "ruleIds": [
        "PR-09",
        "PC-10"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD-AUD"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "img_cref_missing",
      "ruleIds": [
        "V4",
        "SD-IMG-01",
        "IMG-CREF"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD-IMG"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "missing_scene",
      "ruleIds": [
        "V4",
        "SB-SCENE-01"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "BP",
        "SB",
        "EN",
        "AS"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "img_pure_negative",
      "ruleIds": [
        "V2",
        "SD-IMG-02"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "aud_voice_mismatch",
      "ruleIds": [
        "Y8",
        "SD-AUD-02"
      ],
      "reverseTarget": "BP",
      "forwardStages": [
        "BP",
        "EN",
        "MD-AUD"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "fx_f5_unhandled",
      "ruleIds": [
        "V77",
        "SD-FX-02"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "MD-FX"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "modality_slot_missing",
      "ruleIds": [
        "M1",
        "PC-13"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "retention_opening_missing",
      "ruleIds": [
        "RET-01",
        "RET-02"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "B",
        "GB",
        "SB"
      ]
    },
    {
      "trigger": "narrative_info_gap",
      "ruleIds": [
        "NAR-01",
        "NAR-02"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "B",
        "SB"
      ]
    },
    {
      "trigger": "narrative_dialogue_function",
      "ruleIds": [
        "NAR-04",
        "NAR-05"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB"
      ]
    },
    {
      "trigger": "packaging_debut_missing",
      "ruleIds": [
        "PKG-03",
        "PKG-04"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "EN"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "packaging_end_preview",
      "ruleIds": [
        "PKG-06"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB"
      ]
    },
    {
      "trigger": "generation_design_drift",
      "ruleIds": [
        "GEN-05",
        "GEN-06"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN",
        "MD"
      ]
    },
    {
      "trigger": "adaptation_deep_empty",
      "ruleIds": [
        "ADP-D01",
        "ADP-D02"
      ],
      "reverseTarget": "P03",
      "forwardStages": [
        "P03",
        "W2",
        "W3"
      ]
    },
    {
      "trigger": "design_spec_upstream",
      "ruleIds": [
        "DSG-B14"
      ],
      "reverseTarget": "GB",
      "forwardStages": [
        "B",
        "GB",
        "SB"
      ]
    },
    {
      "trigger": "viral_clip_shortfall",
      "ruleIds": [
        "VIR-01",
        "VIR-03"
      ],
      "reverseTarget": "W1",
      "forwardStages": [
        "W1",
        "W3",
        "GB",
        "SB"
      ]
    },
    {
      "trigger": "modality_fx_missing",
      "ruleIds": [
        "MOD-01",
        "MOD-02"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB",
        "MD-FX"
      ]
    },
    {
      "trigger": "modality_aud_missing",
      "ruleIds": [
        "MOD-03",
        "MOD-04"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "W3",
        "SB",
        "MD-AUD"
      ]
    },
    {
      "trigger": "narrative_split_hint",
      "ruleIds": [
        "NAR-14",
        "NAR-15"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB"
      ]
    },
    {
      "trigger": "mode_rules_mismatch",
      "ruleIds": [
        "MODE-RULES-01"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "prompt_gen_media_missing",
      "ruleIds": [
        "PROMPT-GEN-MEDIA",
        "QP-11"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "SB",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "derive_parent_ref_missing",
      "ruleIds": [
        "DRV-PARENT-REF"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "derive_prompt_empty",
      "ruleIds": [
        "DRV-PROMPT"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "CD"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "image_mode_ref_mismatch",
      "ruleIds": [
        "IMG-MODE-REF"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "vendor_passthrough",
      "ruleIds": [
        "VENDOR-QUEUE"
      ],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "repairPriority": "P0"
    },
    {
      "trigger": "tls_socket",
      "ruleIds": [
        "TLS-SOCKET",
        "tls_socket",
        "ECONNRESET"
      ],
      "patterns": [
        "Client network socket disconnected before secure TLS connection was established",
        "socket disconnected before secure TLS",
        "ECONNRESET",
        "ETIMEDOUT",
        "network socket disconnected",
        "TLS connection"
      ],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "repairPriority": "P0"
    },
    {
      "trigger": "missing_reference_upload",
      "ruleIds": [
        "GEN-REF-UPLOAD",
        "GEN-OSSURL"
      ],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "repairPriority": "P0"
    },
    {
      "trigger": "wrong_character_ref",
      "ruleIds": [
        "PC-14",
        "Y8"
      ],
      "reverseTarget": "CD",
      "forwardStages": [
        "CD",
        "BP",
        "SB",
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "cref_unbound",
      "ruleIds": [
        "V4",
        "AS-CREF"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "SB",
        "EN"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "PR-10",
      "ruleIds": [
        "PR-10"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "PR-11",
      "ruleIds": [
        "PR-11"
      ],
      "reverseTarget": "BP",
      "forwardStages": [
        "BP",
        "SB"
      ]
    },
    {
      "trigger": "PR-12",
      "ruleIds": [
        "PR-12"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ]
    },
    {
      "trigger": "content_policy",
      "ruleIds": [
        "POLICY-01"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "content_policy_rewrite",
      "ruleIds": [
        "POLICY-01",
        "POLICY-REWRITE"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "lang_aud_mismatch",
      "ruleIds": [
        "LANG-AUD-01"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD-AUD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "lang_vid_mismatch",
      "ruleIds": [
        "LANG-01"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD-VID"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "vp_conflict",
      "ruleIds": [
        "VP-CONFLICT"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD",
        "EN"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "fx_empty",
      "ruleIds": [
        "FX-GRADE-01"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "MD-FX"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "cam_speak",
      "ruleIds": [
        "CAM-SPEAK"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "SB"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "cam_variety",
      "ruleIds": [
        "CAM-VARIETY"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "oss_ref_missing",
      "ruleIds": [
        "GEN-OSSURL",
        "GEN-REF-UPLOAD"
      ],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "repairPriority": "P0"
    },
    {
      "trigger": "audio_force_mismatch",
      "ruleIds": [
        "AG-GATE-AUD"
      ],
      "reverseTarget": "MD",
      "forwardStages": [
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "scene_break",
      "ruleIds": [
        "V6",
        "DC-SCENE"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "orphan_stub_no_image",
      "ruleIds": [
        "orphan_stub_no_image",
        "ASSET_STUB_QUALITY"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS",
        "CD",
        "MD"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "cd_cast_gap",
      "ruleIds": [
        "DC-16",
        "DG-CD-COVERAGE",
        "INT-CHAR-ORPHAN",
        "complete_failed",
        "cd_cast_gap"
      ],
      "reverseTarget": "CD",
      "forwardStages": [
        "CD",
        "SB",
        "EN",
        "AS"
      ],
      "repairPriority": "P0"
    },
    {
      "trigger": "polish_failed",
      "ruleIds": [
        "polish_failed"
      ],
      "reverseTarget": "AS",
      "forwardStages": [
        "AS"
      ],
      "repairPriority": "P1"
    },
    {
      "trigger": "media_probe_mute",
      "ruleIds": [
        "media_probe_mute",
        "GC-07"
      ],
      "reverseTarget": "EN",
      "forwardStages": [
        "EN",
        "MD"
      ],
      "repairPriority": "P0"
    }
  ],
  "maxRounds": 3
}

---

## 附录 T 十链矩阵

{
  "version": "2.0.1",
  "chains": [
    { "id": "dialogue", "nodes": ["W3.script", "SB.narrative.dialogue.lines", "EN.AUD", "VID.lipSync", "MD-AUD.lines"], "rollback": ["W3", "SB", "EN", "MD"] },
    { "id": "asset", "nodes": ["CD.L0", "BP.visualLockTable", "SB.charCodes", "EN.cref", "IMG.cref"], "rollback": ["CD", "BP", "SB", "EN", "MD"] },
    { "id": "continuity", "nodes": ["continuity.prevEpisodeSummary", "GB前情", "W3 W-CONT", "Pipeline写回"], "rollback": ["W3", "continuity"] },
    { "id": "av", "nodes": ["designBrief.B4", "GB.emotionCurve", "SB.emotion", "EN.Y9", "MD-AUD.emotion", "MD-VID.expr"], "rollback": ["designBrief", "GB", "SB", "EN"] },
    { "id": "story", "nodes": ["W1", "designBrief.B5", "SB.markers", "narrativeCausalityGraph", "FX.feasibility"], "rollback": ["W1", "W3", "SB"] },
    { "id": "scene", "nodes": ["designBrief.B6", "GB场表", "SB.sceneName", "BP.sceneColorLock", "IMG.scene"], "rollback": ["B", "GB", "SB", "BP", "EN"] },
    { "id": "camera", "nodes": ["designBrief.B12", "SB.shotSize", "SB.transitionType", "EN.motion", "MD-VID.camera"], "rollback": ["brief", "SB", "EN", "MD"] },
    { "id": "adaptation", "nodes": ["P03.matrix", "W2.adaptationStrategy", "W3.script", "designBrief"], "rollback": ["P03", "W2", "W3"] },
    { "id": "modality_compile", "nodes": ["EN.compile", "MD-IMG", "MD-VID", "MD-AUD", "MD-FX", "modalityPromptAudit"], "rollback": ["EN", "MD"] },
    { "id": "generation_apply", "nodes": ["SB.shotDesign", "SB.visualDescription", "EN.Y", "MD.prompts", "modalityPromptAudit"], "rollback": ["SB", "EN", "MD"] },
    { "id": "retention", "nodes": ["P03.R/O", "retentionPlan", "W3.sceneMeta", "designBrief.B18", "SB.retentionTier"], "rollback": ["W3", "B", "GB", "SB"] },
    { "id": "narrative_drive", "nodes": ["informationLedger", "dialoguePlan", "designBrief.B20", "SB.lines", "narrativeCausalityGraph"], "rollback": ["W3", "B", "SB"] },
    { "id": "packaging", "nodes": ["opening3to10s", "debutIntroPack", "SB.establishing", "endCardPack"], "rollback": ["W3", "SB"] },
    { "id": "adaptation_deep", "nodes": ["P03.D/V", "adaptationMatrixStructured", "W2", "W3", "designBrief.B16"], "rollback": ["P03", "W2", "W3", "B"] },
    { "id": "viral_clip", "nodes": ["viralAdaptation", "W1.paypoint", "GB.paypointScenes", "SB.clip30sCandidate"], "rollback": ["W1", "W2", "W3", "GB", "SB"] },
    { "id": "modality_feasibility", "nodes": ["W3.sceneMeta", "narrativeBrief.implementationPlan", "SB.visualEffect", "fxFeasibilityAudit", "MD-FX", "MD-AUD"], "rollback": ["W3", "SB", "EN", "MD"] },
    { "id": "repair", "nodes": ["SD", "fixPlan", "linkageRepairPlan", "rePushPlan"], "rollback": "reverse_route_table" }
  ]
}

{
  "version": "2.0.1",
  "dimensions": {
    "adaptation": { "stages": ["P03", "W2"], "chain": "adaptation", "rules": ["P13", "P14", "W6-W15", "W99"] },
    "script": { "stages": ["W1", "W3"], "chain": "story", "rules": ["W12", "W13", "W16-W46"] },
    "dialogue": { "stages": ["W3", "SB"], "chain": "dialogue", "rules": ["R2", "H3", "V74", "PR-10"] },
    "scene": { "stages": ["B", "AS", "BP", "SB"], "chain": "scene", "rules": ["V5", "sceneColorLock"] },
    "story_push": { "stages": ["B", "SB"], "chain": "story", "rules": ["B5", "W41", "PR-08"] },
    "camera": { "stages": ["B", "SB", "EN"], "chain": "camera", "rules": ["V83", "S4", "PR-CAM-01", "QP-14"] },
    "av": { "stages": ["B", "GB", "SB"], "chain": "av", "rules": ["B4", "B9", "Y9", "QP-06"] }
  }
}

{
  "$schema": "forward_trace.schema.json",
  "version": "2.0.1",
  "traceItem": {
    "dimension": "dialogue|scene|story|camera|av|adaptation|script|IMG|VID|AUD|FX",
    "chainId": "string",
    "sourceStage": "string",
    "sourceField": "string",
    "targetStage": "string",
    "targetField": "string",
    "derivation": "string",
    "preserveOnRePush": true,
    "modality": "IMG|VID|AUD|FX|null",
    "vendorGate": "string|null"
  },
  "reverseHintItem": {
    "chainId": "string",
    "symptom": "string",
    "reverseTarget": "string",
    "fixTemplateRef": "string",
    "qpId": "string|null"
  }
}

---

## 附录 U 统一反推决策

{
  "version": "2.0.1",
  "description": "十链+七维+四模态+边界+优先级 单一扩展入口",
  "repairPriorityOrder": ["VID", "IMG", "AUD", "FX", "MD", "EN", "SB", "BP", "designBrief", "W3", "W2", "P03"],
  "boundaries": {
    "T1": { "CAN": ["script", "shots", "lines", "emotion", "transition abstract"], "CANNOT": ["imagePrompt", "videoPrompt", "audioPrompt", "fxPrompt", "API"] },
    "T2": { "CAN": ["CD", "BP", "EN draft", "IMG subject"], "CANNOT": ["full MD×4", "generate"] },
    "T3": { "CAN": ["MD×4", "Vendor", "audit", "generate after L0"], "CANNOT": ["skip modalityAudit"] },
    "EN": { "CAN": ["compile Y"], "CANNOT": ["change lines", "call API"] },
    "MD": { "CAN": ["prompt slots"], "CANNOT": ["change SB narrative"] }
  },
  "dimensions": {
    "adaptation": { "chain": "adaptation", "stages": ["P03", "W2", "W3"], "dryRunId": "DC-15" },
    "dialogue": { "chain": "dialogue", "dryRunId": "DC-01" },
    "scene": { "chain": "scene", "dryRunId": "DC-06" },
    "story": { "chain": "story", "dryRunId": "DC-03" },
    "camera": { "chain": "camera", "dryRunId": "DC-09" },
    "av": { "chain": "av", "dryRunId": "DC-04" },
    "IMG": { "modality": true, "dryRunId": "PC-11" },
    "VID": { "modality": true, "dryRunId": "PC-09" },
    "AUD": { "modality": true, "dryRunId": "PC-10" },
    "FX": { "modality": true, "dryRunId": "PC-12" }
  },
  "preservePairs": [
    { "forward": "W3.script", "preserveOnRePush": true, "rePushPreserve": "script" },
    { "forward": "globalAnchors", "preserveOnRePush": true, "rePushPreserve": "globalAnchors" },
    { "forward": "designBrief.B4", "preserveOnRePush": false, "rePushPreserve": null }
  ],
  "tracks": {
    "ext": { "dryRunLevels": ["DC", "PC", "GC", "IC"], "authority": "export" },
    "int": { "dryRunLevels": ["DC", "PC", "GC", "IC"], "authority": "validate" }
  },
  "qpIndex": {
    "QP-03": { "chain": "dialogue", "repairHintId": "RH-QP-03", "reverseTarget": "W3" },
    "QP-14": { "chain": "camera", "repairHintId": "RH-QP-14", "reverseTarget": "EN" }
  },
  "chains": {
    "dialogue": { "rePushTarget": "SB" },
    "scene": { "rePushTarget": "SB" },
    "camera": { "rePushTarget": "EN" },
    "story": { "rePushTarget": "W3" },
    "continuity": { "rePushTarget": "W3" },
    "av": { "rePushTarget": "GB" },
    "adaptation": { "rePushTarget": "W2" },
    "adaptation_deep": { "rePushTarget": "P03" },
    "retention": { "rePushTarget": "W3" },
    "narrative_drive": { "rePushTarget": "W3" },
    "packaging": { "rePushTarget": "SB" },
    "generation_apply": { "rePushTarget": "SB" },
    "viral_clip": { "rePushTarget": "W1" },
    "modality_compile": { "rePushTarget": "EN" },
    "modality_feasibility": { "rePushTarget": "W3" },
    "generation": { "rePushTarget": "MD" },
    "repair": { "rePushTarget": "SF" }
  },
  "smartBoundaries": {
    "CAN": ["fixPlan from *Gaps", "linkageRepairPlan single chain", "rePushPlan multi chain round<=3", "smartProposalApplier with userConfirmed"],
    "CANNOT": ["change W3 dialogue text R2", "fake linkageAudit/ruleAudit pass", "import overwrite Chat prompts", "T1 require full MD×4"]
  },
  "gapDomains": ["adaptationGaps", "retentionGaps", "narrativeDriveGaps", "packagingGaps", "generationApplyGaps", "designSpecGaps", "scriptViralGaps", "modalityGaps", "chatPromptGaps"]
}

{
  "version": "2.0.1",
  "pairs": {
    "forwardTraceField": "reverseHint.symptom",
    "preserveOnRePush": "rePushPlan.preserveFields"
  }
}

---

## 附录 V 智能修复

---
name: appendix_V_intelligent_repair
description: QP+W93+SF+rePush 智能修复流程
rulePackVersion: "2.0.1"
---

# 智能提示与修复

1. 用户话术 QP-01~20 或 W93~W100
2. SD 检出 → repair_hint_catalog 文案
3. 单点 → fixPlan；增强 → smartDesignProposals（须用户确认）
4. autoApplicable + confidence≥0.8 → applicator
5. 3 轮失败 → rePushPlan；构图歧义 → presentationFork

IC dryRun：intelligent_closure_checklist.json

{
  "version": "2.0.1",
  "hints": [
    { "id": "RH-QP-01", "qpId": "QP-01", "symptom": "场数过少", "action": "在 W3 补场", "chatTemplate": "请增加场次，确保每集场数满足最低要求。" },
    { "id": "RH-QP-02", "qpId": "QP-02", "symptom": "画面描述空泛", "action": "重写 SB 画面描述", "chatTemplate": "请将分镜画面描述改为具体可拍的可视细节，避免抽象词。" },
    { "id": "RH-QP-03", "qpId": "QP-03", "ruleId": "R2", "checkIds": ["DC-01", "H3", "R2"], "symptom": "台词与源不一致", "action": "逐句对齐 W3 剧本到 SB.lines", "chatTemplate": "请对照剧本原文，修正分镜台词，禁止删改字词。" },
    { "id": "RH-LANG-01", "ruleId": "LANG-01", "checkIds": ["LANG-01", "LANG-AUD-01"], "symptom": "中文台词被英译进 VID/AUD", "action": "用 SB 源语言台词回填 videoPrompt [Audio] 段", "chatTemplate": "请将 videoPrompt/audioPrompt 中的英译对白改回剧本源语言原句，运镜壳可保留英文，台词禁止翻译。" },
    { "id": "RH-FX-01", "ruleId": "FX-GRADE-01", "checkIds": ["FX-GRADE-01", "DG-FALSE-GREEN-FX", "DG-MODALITY-MISMATCH", "INT-FX-EMPTY"], "symptom": "FX 空未声明或高难不可行", "action": "无特效镜声明 F0；有特效补 fxPrompt；F4/F5 降级或拆镜", "chatTemplate": "无特效镜头请在 fxFeasibilityAudit/镜级声明 level:F0，不要写 modalityPromptAudit.FX=pass 却留空 fxPrompt。有特效才写 fxPrompt；F4/F5 请降级或拆镜，禁止占位特效文案。" },
    { "id": "RH-QP-04", "qpId": "QP-04", "symptom": "对白密度异常", "action": "调整 SB 台词密度", "chatTemplate": "请调整对白密度：台词镜保持一句一镜，旁白镜减少对白。" },
    { "id": "RH-QP-05", "qpId": "QP-05", "symptom": "角色称谓混乱", "action": "统一 W3 角色称谓", "chatTemplate": "请统一剧本中的角色称谓，与 globalAnchors 一致。" },
    { "id": "RH-QP-06", "qpId": "QP-06", "symptom": "情绪单调", "action": "补 GB 情绪曲线", "chatTemplate": "请在全局 Brief 中补充情绪起伏与峰值场。" },
    { "id": "RH-QP-07", "qpId": "QP-07", "symptom": "钩子不足", "action": "强化 W1 开场钩子", "chatTemplate": "请加强开场 30 秒内的视觉或情感钩子。" },
    { "id": "RH-QP-08", "qpId": "QP-08", "symptom": "张力不足", "action": "升级 W2 冲突", "chatTemplate": "请在对峙场增加 stakes 升级与阻碍。" },
    { "id": "RH-QP-09", "qpId": "QP-09", "symptom": "吸引力弱", "action": "重写 W3 低吸引力场", "chatTemplate": "请重写吸引力不足的场次，增加悬念或情感峰值。" },
    { "id": "RH-QP-10", "qpId": "QP-10", "checkIds": ["DC-13"], "symptom": "信息链断裂", "action": "补 designBrief 信息链", "chatTemplate": "请在 designBrief 中补全因果链与伏笔承接；若为台词链断裂请对照剧本补全 SB 台词。" },
    { "id": "RH-QP-11", "qpId": "QP-11", "symptom": "资产引用缺失", "action": "补 AS 资产绑定", "chatTemplate": "请为角色/场景补全资产引用与 cref 绑定。" },
    { "id": "RH-QP-12", "qpId": "QP-12", "symptom": "cref 未绑定", "action": "绑定 EN cref", "chatTemplate": "请在 EN-IMG 中绑定角色 cref 与场景资产。" },
    { "id": "RH-QP-13", "qpId": "QP-13", "symptom": "跨镜色温跳变", "action": "统一 SB 色温", "chatTemplate": "请统一相邻镜头的色温与光线描述。" },
    { "id": "RH-QP-14", "qpId": "QP-14", "ruleId": "PR-CAM-01", "symptom": "运镜不可执行", "action": "改用运镜白名单重编译 EN-VID", "chatTemplate": "请将运镜改为 slow pan / gentle push 等白名单词。" },
    { "id": "RH-QP-15", "qpId": "QP-15", "symptom": "时长与台词不匹配", "action": "对齐 SB 时长与台词", "chatTemplate": "请调整镜时长或拆分台词，使口型时长可执行。" },
    { "id": "RH-PR-09", "ruleId": "LIP-01", "checkIds": ["LIP-01", "PR-09"], "symptom": "镜时长短于台词朗读", "action": "raise_duration 或拆镜", "chatTemplate": "请将该镜 duration 调至 required（口型+情绪留白），或拆分台词到多镜；导入一键完善可无感抬时。" },
    { "id": "RH-QP-16", "qpId": "QP-16", "symptom": "模态 slot 缺失", "action": "补 EN 模态 slot", "chatTemplate": "请补全 EN 四模态 slot（IMG/VID/AUD/FX）。" },
    { "id": "RH-QP-17", "qpId": "QP-17", "symptom": "FX 词不可实现", "action": "降级 SB FX 描述", "chatTemplate": "请将 FX 改为 F2 可执行描述或拆镜后期处理。" },
    { "id": "RH-QP-18", "qpId": "QP-18", "symptom": "identity 冲突", "action": "重编译 EN 身份词", "chatTemplate": "请统一 IMG/VID/AUD 性别与身份词，与 BP L0 一致。" },
    { "id": "RH-QP-19", "qpId": "QP-19", "symptom": "debut 缺 establishing", "action": "补 SB establishing 镜", "chatTemplate": "请为首登场角色/场景补 establishing 全景镜。" },
    { "id": "RH-QP-20", "qpId": "QP-20", "symptom": "跨集衔接弱", "action": "补 W3 集间衔接", "chatTemplate": "请在上集结尾与本集开场补 continuity 承接。" },
    { "id": "RH-W93", "ruleId": "W93", "symptom": "爆点不够", "action": "增情绪峰值场", "chatTemplate": "建议在 W3 或 SB 增加对峙升级场。" },
    { "id": "RH-AG-GATE-01", "ruleId": "AG-GATE-01", "symptom": "缺首位帧", "action": "生成首帧分镜图", "chatTemplate": "请先生成分镜参考图再写 MD-VID singleImage。" },
    { "id": "RH-identity", "ruleId": "identity_mismatch", "symptom": "跨模态性别冲突", "action": "重编译 EN 全模态", "chatTemplate": "请统一 IMG/VID/AUD 性别词与 BP L0。" },
    { "id": "RH-RET-01", "ruleId": "RET-01", "symptom": "ep1 缺开场钩子", "action": "补 W3 ep1 opening5s/opening3to10s", "chatTemplate": "请在 ep1 第一场结构化 opening5s 钩子（困境/反差/情感暴击三选一）。" },
    { "id": "RH-NAR-05", "ruleId": "NAR-05", "symptom": "台词无动作因果", "action": "补 causedByActionId", "chatTemplate": "请为台词标注 causedByActionId，遵循动作是因、对话是果。" },
    { "id": "RH-PKG-03", "ruleId": "PKG-03", "symptom": "debut 缺 copyHint", "action": "补 debutIntroPack", "chatTemplate": "请为首登场角色补 copyHint 与 establishingPattern。" },
    { "id": "RH-GEN-05", "ruleId": "GEN-05", "symptom": "设计未进 prompt", "action": "对齐 shotDesign 与 imagePrompt", "chatTemplate": "请将 shotDesign/visualDescription 编译进 imagePrompt。" },
    { "id": "RH-ADP-D01", "ruleId": "ADP-D01", "symptom": "深度改编未落地", "action": "补 nameMap", "chatTemplate": "请在 adaptationMatrixStructured.deepAdaptation 补全 nameMap，格式仅允许 [{ \"from\": \"原名\", \"to\": \"新名\" }]，禁止 null、禁止用「原→新」作 object key。" },
    { "id": "RH-DSG-B14", "ruleId": "DSG-B14", "symptom": "付费点未进设计", "action": "补 designBrief B14", "chatTemplate": "请将 paypointSchedule 镜像到 designBrief B14 paypointMarkers。" },
    { "id": "RH-VIR-01", "ruleId": "VIR-01", "symptom": "投流点不足", "action": "补 clipPoints30s", "chatTemplate": "请在前10集标注至少10个 clip30sCandidate 投流爆点。" },
    { "id": "RH-NAR-14", "ruleId": "NAR-14", "checkIds": ["NAR-14", "nar14_long_line"], "symptom": "长台词无 splitHint", "action": "双路径补 splitHint", "chatTemplate": "【NAR-14】>20 字台词须同时写：(1) planData.dialoguePlan.lines[i].splitHint=\"reaction_shot\"；(2) preDesignPack.shots[j].narrative.dialogue.lines[k].splitHint（同 lineId 对齐）。导入后须出现在 episode package 镜台词；禁止只改 narrativeSelfcheck.passed。烧片读 package，丢字段会再挡 nar14_long_line。" },
    { "id": "RH-NAR-15", "ruleId": "NAR-15", "checkIds": ["NAR-15"], "symptom": "高情绪对白无反应镜", "action": "补 reactionAction", "chatTemplate": "【NAR-15】emotion_hit 台词须写 reactionAction（听者反应），同时写在 dialoguePlan 与 shots[].narrative.dialogue.lines；导入后须进 package。禁止只改 audit 自报。" },
    { "id": "RH-MOD-01", "ruleId": "MOD-01", "symptom": "fxIntent 未进 SB", "action": "补 visualEffect", "chatTemplate": "请将 W3 sceneMeta.fxIntent 镜像到 SB：visualEffect 为 string（如 \"F1: 烛火摇曳\"），可选 fxLevel: \"F1\"；禁止 object {level,desc}。" },
    { "id": "RH-MOD-02", "ruleId": "MOD-02", "checkIds": ["MOD-02", "DG-SCENE-ORPHAN-FX"], "symptom": "缺 fxPrompt 或孤儿场", "action": "判型后补散文或降F0", "chatTemplate": "【先判型】若清单含「孤儿场」：不要补其他场的 fxPrompt。请改 planData.narrativeBrief.implementationPlan[sceneRef=N]：删除该项，或 fxIntent.level→F0，或给接场独立 sceneName 并挂镜+散文。若有映射镜缺散文：写 preDesignPack.shots[shotIndex=K].generation.fxPrompt 可执行散文（可从 visualEffect 去 F1: 前缀），禁止字母 F1；无特效则该场/该镜改为 F0。" },
    { "id": "RH-MOD-02-ORPHAN", "ruleId": "MOD-02", "checkIds": ["MOD-02", "DG-SCENE-ORPHAN-FX", "DG-SCENE-CARDINALITY"], "symptom": "孤儿场无映射镜", "action": "删plan或降F0或独立sceneName", "chatTemplate": "【孤儿场】implementationPlan 的 sceneRef 无对应唯一 sceneName 映射镜。禁止只给其他场补 fxPrompt。二选一：(1) 删除该 plan/sceneMeta 项或 fxIntent.level→\"F0\"；(2) 接场改用独立 sceneName（如「卧房·后」）并挂镜，有特效再写 generation.fxPrompt。" },
    { "id": "RH-SCENE-CARD", "ruleId": "DG-SCENE-CARDINALITY", "checkIds": ["DG-SCENE-CARDINALITY"], "symptom": "场镜基数不对齐", "action": "对齐 plan 与 sceneName", "chatTemplate": "【场镜基数】唯一 sceneName 数必须等于 implementationPlan/sceneMeta 条数。接场同地点：要么独立 sceneName，要么合并为一场并删除多余 sceneRef。禁止 script 写场N、SB 共用名、plan 仍留多余 F1。" },
    { "id": "RH-FX-F0", "ruleId": "FX-GRADE-01", "checkIds": ["FX-GRADE-01", "DG-FX-DUAL-TRACK"], "symptom": "空FX未声明F0", "action": "声明F0", "chatTemplate": "镜K 无特效：写 fxFeasibility/fxLevel=\"F0\"，并在 fxFeasibilityAudit.items 增加 {shotIndex:K,level:\"F0\",feasible:true,desc:\"无特效\"}；不要写 fxPrompt，不要只改 modalityPromptAudit.FX=pass。" },
    { "id": "RH-IMG-CREF", "ruleId": "IMG-CREF", "checkIds": ["IMG-CREF", "img_cref_missing"], "symptom": "定妆/cref 静照缺失", "action": "先 batch_still 再烧视频", "chatTemplate": "身份参考图/cref 缺失：请先在资产或分镜跑静照（batch_still），绑定 CHAR-*/SCENE-* 后再烧视频；禁止脏首帧硬烧 singleImage。" },
    { "id": "RH-MOD-03", "ruleId": "MOD-03", "symptom": "缺 audioPrompt", "action": "补 MD-AUD", "chatTemplate": "请将 W3 audioBeat 编译进台词镜 audioPrompt。" },
    { "id": "RH-MOD-04", "ruleId": "MOD-04", "symptom": "voiceProfile 冲突", "action": "对齐 AUD 音色词", "chatTemplate": "请统一 voiceProfile 与 audioPrompt 音色描述。" },
    { "id": "RH-MOD-05", "ruleId": "MOD-05", "symptom": "留存镜运镜不符", "action": "改 videoPrompt", "chatTemplate": "retentionTier 0-2s 镜请用 static + motion-from-frame。" },
    { "id": "RH-MOD-06", "ruleId": "MOD-06", "symptom": "开场 FX 过高", "action": "补 degradeFixPlan", "chatTemplate": "debutIntroPack fxLevel > F2 须写 degradeFixPlan 可拍替代。" },
    { "id": "RH-MOD-07", "ruleId": "MOD-07", "checkIds": ["MOD-07", "DG-MODALITY-MISMATCH"], "symptom": "模态 slot 空", "action": "补 modalityPromptAudit", "chatTemplate": "请补全 T3 四模态 slot（IMG/VID/AUD/FX）。" },
    { "id": "RH-DC-16", "ruleId": "DC-16", "checkIds": ["DC-16", "DG-CD-COVERAGE", "INT-CHAR-ORPHAN"], "symptom": "配角未入册或仅 stub", "action": "Chat 补真实 characterDesign", "chatTemplate": "以下说话人/上镜码未入 characterDesign（或缺 L0.identity / 仅为 L0.stub）：请为每人补 assets[]：code、name、L0.identity（一句身份关系）；并写入 designBrief.B6.characters 与 visualLockTable.characterAssets。禁止仅用 stub 壳过闸。修复后请重新点「预览更新」/exportGate 直至 exportAllowed。" },
    { "id": "RH-DG-SCENE", "ruleId": "DG-SCENE-KEY", "checkIds": ["DG-SCENE-KEY", "DC-06"], "symptom": "场景 key/映射", "action": "SCENE-* + SB.sceneName", "chatTemplate": "请将 visualLockTable.sceneColorLock 的中文 key 改为 SCENE-* code，并确保 designBrief.B6.scenes 与分镜 sceneName 对齐。" },
    { "id": "RH-DG-LINK", "ruleId": "DG-LINKAGE-FALSE-GREEN", "checkIds": ["DG-LINKAGE-FALSE-GREEN"], "symptom": "资产链假绿", "action": "先补 CD 再改 audit", "chatTemplate": "禁止自写 linkageAudit.资产=pass。请先按 RH-DC-16 补齐 characterDesign，再重新导出。" },
    { "id": "RH-DC-AV", "ruleId": "DC-04", "checkIds": ["DC-04", "DC-10"], "symptom": "视听情绪/AUD 标注", "action": "对齐 B4 与 audioCue", "chatTemplate": "请对齐 designBrief.B4 与分镜 emotion；高情绪镜建议补 audioCue / B9 或 T3 AUD 标注。" },
    { "id": "RH-DC-CAM", "ruleId": "DC-09", "checkIds": ["DC-09", "PR-CAM-01"], "symptom": "运镜/转场越白名单", "action": "改用白名单 transition", "chatTemplate": "请将 transitionType/rhythmZone 改为运镜白名单内取值（如 soft cut / slow pan）。" },
    { "id": "RH-ADP-D02", "ruleId": "ADP-D02", "symptom": "relationMap 空", "action": "补 deepAdaptation.relationMap", "chatTemplate": "请在 deepAdaptation 补全 relationMap，格式 [{ \"from\", \"to\" }]，禁止 null / arrow-key 伪对象。" },
    { "id": "RH-ADP-D03", "ruleId": "ADP-D03", "symptom": "substitutions 空", "action": "补 deepAdaptation.substitutions", "chatTemplate": "请在 deepAdaptation 补全 substitutions，格式 [{ \"from\", \"to\" }]，禁止 null / arrow-key 伪对象。" },
    { "id": "RH-ADP-D04", "ruleId": "ADP-D04", "symptom": "settingProfile 空", "action": "补 deepAdaptation.settingProfile", "chatTemplate": "请在 deepAdaptation 补全 settingProfile（object）；可选 string 字段无内容时省略 key，禁止写 null。" },
    { "id": "RH-MODE-RULES", "ruleId": "mode_rules_mismatch", "symptom": "mode 与模板不一致", "action": "按 mode 重载 modelPrompt", "chatTemplate": "请按当前文生/单图/首尾帧/多参模式选择正确模板后重生成提示词。" },
    { "id": "RH-PROMPT-GEN-MEDIA", "ruleId": "prompt_gen_media_missing", "symptom": "缺分镜或资产", "action": "补绑 AS/SB 后重跑", "chatTemplate": "请先关联分镜与资产信息列表，再生成视频提示词。" },
    { "id": "RH-DERIVE-PARENT", "ruleId": "derive_parent_ref_missing", "symptom": "衍生缺父图", "action": "先生成父资产图", "chatTemplate": "请先完成父级资产成图，再生成衍生态。" },
    { "id": "RH-IMG-MODE-REF", "ruleId": "image_mode_ref_mismatch", "symptom": "参考图数与模式不符", "action": "调整 ref 数", "chatTemplate": "文生图 0 张、单图 1 张、多参考 ≥2 张，请对齐后重试。" },
    { "id": "RH-VENDOR-PASS", "ruleId": "vendor_passthrough", "symptom": "上游队列/限流", "action": "稍后重试勿改词", "chatTemplate": "供应商繁忙（queue/rate limit），请稍后重试，不要改写提示词。" },
    { "id": "RH-QF-EXPR-01", "ruleId": "QF-EXPR-01", "checkIds": ["QF-EXPR-01"], "symptom": "提示词含改脸", "action": "剥离改脸词，微表情落静照", "chatTemplate": "【QF-EXPR】请删除改脸/换脸描述；角色脸以定妆为准，微表情写在分镜静照构图，不要在 VID 里重塑五官。" },
    { "id": "RH-IMG-STILL-QA", "ruleId": "IMG-STILL-QA", "checkIds": ["IMG-STILL-QA"], "symptom": "分镜静照弱图", "action": "hq_update 再生分镜首帧", "chatTemplate": "【IMG-STILL-QA】请用高质量模式更新分镜图（权力位/正脸/9:16 安全区），再烧视频。不要只改 VID 提示词。" }
  ]
}

---

## 附录 W 多端闭环

---
name: appendix_W_multiterm_closure
description: 多端 EXT/INT/Agent/FE 统一契约
rulePackVersion: "2.0.1"
---

# 多端统一闭环

| 端 | dryRun 级别 |
|----|-------------|
| EXT Chat | DC+PC+GC+IC 产出 |
| INT import | unifiedDryRun 执行 |
| Agent | browser_flow_orchestration |
| FE | closureChecks 展示 |

rulePackVersion 单一源 2.0.1。见 multi_end_closure_matrix.json。

{
  "version": "2.0.1",
  "ends": [
    { "id": "ext", "name": "Browser Chat", "dryRunLevels": ["DC", "PC", "GC", "IC"], "rulePackVersion": "2.0.1" },
    { "id": "int", "name": "RuleEngine INT", "dryRunLevels": ["DC", "PC", "GC", "IC"], "rulePackVersion": "2.0.1" },
    { "id": "agent", "name": "V5 Agents", "dryRunLevels": ["DC", "PC"], "orchestration": "browser_flow_orchestration.md" },
    { "id": "fe", "name": "Toonflow-web", "dryRunLevels": ["display"], "apiSurface": ["validate", "dryRunImport", "applyAutoFix"] },
    { "id": "electron", "name": "Electron", "dryRunLevels": [], "versionBanner": true }
  ],
  "unifiedResponseSchema": {
    "closureChecks": { "dc": [], "pc": [], "gc": [], "ic": [] },
    "rePushPlan": [],
    "forwardTrace": {},
    "repairHints": []
  }
}
