---
name: browser_full_flow_bundle
description: Browser Chat v2.1.0 全流程单文件 bundle（yarn bundle:browser-full-flow 生成）
version: "2.1.0"
rulePackVersion: "2.1.0"
mode: external
generated: true
supersedes: design_flow.bundle.md v1.1
---

# Browser Chat 全流程 · 优化版 v2.1.0

> 生成时间：2026-07-24T14:04:14.250Z · rulePack 2.1.0 · tier T3 · 勿手改，改源 skill 后重跑 `yarn bundle:browser-full-flow`
> 说明：**Chat bundle ≠ 后端 API**。改 skill/fixture 才需本命令；改 `src/ruleEngine` TS 需重启服务，不会体现在本文件。

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
- **原创**：G→W1→W2→W3→…（跳过 P；G 前补一次爆款公式确认）
- **爆款深度**：见 `viral_adaptation_playbook.md` — 设计期出站硬闸，禁止带病进下一站；import RH 仅兜底

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
7. **静帧 Identity 闭环**：casting 裸名权威 + multiFace 谓词 + egress 同谓词首帧闸；DEX-STILL-* WARN→chatRepair；反推 `still_firstframe_dirty`→SB→stale→MD-IMG；禁动词表白名单主修
8. **QP-02 可拍描写闭环**：设计 DEX-QP-02 ≡ export QP-02；CHAT-SB 同核；导入仅溯源补写；深链 SB；minChars 为防空壳底线
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

Browser Chat 改编路径**第一步**。六维度评分 + **可选爆款模板** + **智能抓取视听爆点/钩子**。BLOCK 未过不得进入 P03。

## 入口条件

- 用户提供源材料（全文或章节范围）
- 改编路径已确认（非原创直跳 G；原创见下方「原创旁路」）
- `rulePackVersion: "2.0.1"` 对齐 `rule_cards.json`

## 执行步骤

**步骤 0（强制）**：调用 `viralFormulaPicker`（可带 `sourceHint`）→ 展示推荐公式 + catalog **允许改选** → `setViralFormula`；读返回的 `viralWritingContext.stageBrief`（含时长规范）。

**换公式**：返回 `redesignRequired` 时 → **按新规范重设计**（推荐）；或显式 `acknowledgeKeepLegacy` 保留旧稿补洞。勿只改旧 NAR/DC 字段假闭环。

**步骤 0b（强制）**：对源材料调用 `extractPeakHook`（`persist:true`）→ 产出 `peakLedger` + `hookPlan`；向用户展示**爆点卡/钩子卡**（可改）；拒绝假爆点（别墅写景/开会交代等）。

1. 通读源材料，标注情绪高点、反转节点、冲突维度（与 peakLedger 对齐，勿把写景当高点）
2. 按 P1–P6 六维度各打 1–10 分，附段落定位与量化依据
3. 汇总 P7 综合等级：优≥8 / 良≥6 / 中≥4 / 差<4
4. 输出问题清单 P-001 递增（类型/描述/改造建议）
5. 给出 **3 个**改编方向，每个对应 ≥2 个诊断问题
6. 预填 `adaptationProfile` 推荐；产出 `recommendedMatrixDraft[]`；初始化 `narrativeBrief.mustResolveIssues` + `empathyPlan` 草稿
7. 问：「在基础公式上，本剧还要衍生什么爆点/钩子？」→ `viralDerivation`（合入 brief）

## 六维度评分表

| 维度 | ruleId | 量化参考 |
|------|--------|----------|
| P1 情绪支撑度 | P1 | 真视听爆点数、峰值间隔（对齐 peakLedger） |
| P2 反转密度 | P2 | 有效反转数 / 章节数 |
| P3 信息密度 | P3 | 核心信息释放节奏（ep1前30s≤1） |
| P4 冲突强度 | P4 | 不可调和冲突维度数 |
| P5 人物弧光 | P5 | 主角状态变化节点 |
| P6 台词质量 | P6 | 可拍摄对白比例 |

## 输出契约

写入 `planData.preCheck` + `planData.peakLedger` + `planData.hookPlan` + provisional `genreTemplate`。

## BLOCK 闸门

| 项 | 条件 |
|----|------|
| 六维度 | 均有分且附理由 |
| P7 | 有综合等级 |
| 问题清单 | ≥1 条或明确「无重大问题」 |
| 改造方向 | 恰好 3 个 |
| DEX-FORMULA-PICKER | 已选 packId |
| DEX-PEAK-LEDGER | 真爆点非空且含 avPayload |
| DEX-HOOK-PLAN | 开场钩有 visualBeat+时长+可拍△ |

## 原创旁路

跳过 P 进 G 前：仍须 `setViralFormula` + 对用户口述/梗概 `extractPeakHook`；出站 `G`：`DEX-FORMULA-PICKER`。

## ruleAudit

```json
{ "stage": "P0", "rulePackVersion": "2.0.1", "block": ["P1-P6", "P7", "DEX-FORMULA-PICKER", "DEX-PEAK-LEDGER", "DEX-HOOK-PLAN"], "pass": true }
```

# P0.3 改编矩阵

基于 P0 预检与用户选定方向，填写 **12 维改编矩阵** 与诊断-方案映射。为 G 层锚点与 W 阶段预留字段。

## 入口条件

- `planData.preCheck` ruleAudit.pass = true
- 读取 `data/fixtures/adaptation_matrix_catalog.json` + 项目 `adaptationProfile.lockedChoices`
- 读取当前 `genreTemplate.packId` 与 `viralWritingContext`（P0 已抓 peak/hook）
- V05 类型框架须与 packId 可仲裁（DEX-PACK-RECONCILE）
- **须** `userConfirmed: true`（API `confirmMatrixChoices`）后才可进 P06
- rulePackVersion `2.0.1`
- 深度维含 D05 故事内核平移、D06 内容平移（extensible 须 `viralDerivation` 补本剧特有爆点钩子）

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

# P0.6 故事核心（爆款重构主示范站）

基于源材料 + 改编矩阵 + **题材原→改示范**，构建新叙事内核。W1 骨架须引用本产出。

## 入口条件

- `planData.adaptationMatrixStructured.userConfirmed` = true
- 已选 `genreTemplate.packId`；建议已有 `peakLedger`/`hookPlan`（可调用 `extract_peak_hook`）

## 产出字段

| 字段 | 说明 |
|------|------|
| narrativeKernel | 一句话故事核 + 心理级爽点类型 |
| characterAnchors | 角色/矛盾/初态/终态 ≤4 |
| relationships | 关系表 |
| eventSequence | 兑现 peak + 开场微循环 + 集末钩 + 付费卡前拍 |
| changeLog | **假爆点→真视听钩** 必填 |

## 执行步骤

**步骤 0（强制）**：调用 `get_viral_writing_context(stageId=P06)`；**先向用户展示 1 条「原→改」示范**（来自 brief），再动手写。

1. 读取矩阵 + peakLedger/hookPlan；缺 peak 则 `extract_peak_hook`
2. 写 narrativeKernel（≤50 字，含情绪任务）
3. 立 characterAnchors ≤4
4. 排 `eventSequence` ≥3：每行标注 `peakIds` / `hookSlot` / `resolves`；ep1 须开场微循环 + 3-15-45
5. `changeLog` 每条须含：`from`(假/弱) → `to`(真视听钩) + `matrixDim` + `emotionTask` + `paypoint?`
6. 写入 `narrativeBrief.reconstructionTrace[]`；镜像 `hookPlan.paypointIntent`

## 边界

- 解决 P0 ≥80% 问题；禁只改人名不改情绪过山车
- 付费卡：高潮切断前一拍写进事件/钩子
- 景别秒数不进本 XML 正文（留给 W3 sidecar）

## BLOCK

- 步骤0 已展示原→改
- narrativeKernel / eventSequence≥3 / changeLog≥1 含假→真
- DEX-HOOK-PLAN / DEX-EMPATHY / DEX-PAYPOINT / DEX-RECON-EXAMPLE

## 下游

通过 → P08；W1 必须引用本 storyCore 的 peak 落点。

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
    { "dimId": "D01_nameMap", "name": "姓名改编", "choices": ["keep", "modernize", "localize", "full_rename"], "structuredField": "deepAdaptation.nameMap", "group": "deep", "defaultChoice": "keep", "userConfigurable": true, "recommendWeight": 0.8 },
    { "dimId": "D02_relationMap", "name": "关系改编", "choices": ["keep", "simplify", "invert", "expand"], "structuredField": "deepAdaptation.relationMap", "group": "deep", "defaultChoice": "keep", "userConfigurable": true, "recommendWeight": 0.7 },
    { "dimId": "D03_substitutions", "name": "元素平替", "choices": ["keep", "partial", "full"], "structuredField": "deepAdaptation.substitutions", "group": "deep", "defaultChoice": "partial", "userConfigurable": true, "recommendWeight": 0.75 },
    { "dimId": "D04_settingProfile", "name": "背景迁移", "choices": ["keep", "era_shift", "world_shift"], "structuredField": "deepAdaptation.settingProfile", "group": "deep", "defaultChoice": "keep", "userConfigurable": true, "recommendWeight": 0.7 },
    { "dimId": "D05_storyKernel", "name": "故事内核平移", "choices": ["keep", "shift", "translate_core"], "structuredField": "deepAdaptation.storyKernel", "group": "deep", "defaultChoice": "keep", "userConfigurable": true, "recommendWeight": 0.85, "requiredInDepth": "viral" },
    { "dimId": "D06_contentTranslate", "name": "故事内容平移", "choices": ["keep", "partial", "full", "extensible"], "structuredField": "deepAdaptation.contentTranslatePlan", "group": "deep", "defaultChoice": "partial", "userConfigurable": true, "recommendWeight": 0.8, "requiredInDepth": "viral", "extensibleRequiresDerivation": true }
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
name: viral_adaptation_playbook
description: 爆款系统性改编 Playbook — 对白主推/视听辅助/分集规范/五域修复/反推故事
stageId: playbook
rulePackVersion: "2.1.0"
---

# 爆款改编 Playbook（设计期主路径）

> **Forward gate > Reverse repair**。质量在本站出站维护；禁止带病进下一站。  
> 铁律：**台词/独白主推**；视听辅助不单调；直白给信息；硬规范主落 ep1；后集抓因果。

详见 `docs/VIRAL_ADAPTATION_METHOD.md` · 契约 `viral_rhythm_contract.json`。

## 细节层（必守）

| 层 | 字段 | 要点 |
|----|------|------|
| 主推对白 | dialogue / OS | 事件+情绪说清楚；禁「观众感到」 |
| 视听爆点 | `peakLedger[]` | 真形态+avPayload；禁假爆点 |
| 视听钩子 | `hookPlan` | 开场/中段/集末 + 付费卡 |
| 分镜意图 | `shotDesignIntent[]` | sidecar；SB 只执行 |
| 原→改 | changeLog / reconstructionTrace | **须已应用**，非仅 pack 有例 |
| 锁稿 | `literaryLocked` | W3 通过后禁改正文 |

## 工具

| 工具 | 用途 |
|------|------|
| `get_viral_writing_context` | brief + 铁律 |
| `extract_peak_hook` | 抓取 peak/hook |
| `repair_viral_design` | 五域智能修复 + changeDiff |
| `reconstruct_story_from_signals` | 反推故事（确认后提交） |
| `run_design_exit_gate` | 监督与执行同一套闸 |
| `unlock_literary_lock` | 人工解锁重开设计 |

## 阶段 SOP

### P0

1. 选 pack + audienceTaste + storyStyle + 平台  
2. `extract_peak_hook`  
3. 出站：公式 / peak / hook（viral 禁弱路径跳闸）

### P06

1. 展示原→改 → 写 storyCore + changeLog/trace  
2. 出站含 `DEX-RECON-APPLIED`  
3. 若反推重构：确认 → 级联作废 W1/W3

### W1–W3

1. 对白主推兑现；sidecar 挂意图  
2. 失败 → `repair_viral_design`；打满内核空洞 → 反推 P06  
3. W3 通过 → `literaryLocked`

### designBrief / SB

续读同一 `shotDesignIntent` / sfx；禁重发明爆点。

## 禁

- viral 下 `acknowledgeWeakPath` 跳闸  
- 锁稿后机器改台词  
- 用视听替代主信息  
- 每集通篇套 ep1 30s 清单（后集只检因果）

---
name: viral_screenwriter_craft
description: Browser Chat 编剧爆款思维（从 script_execution 抽取的可执行教学法）
stageId: craft
rulePackVersion: "2.0.1"
---

# 编剧爆款思维 · Browser Chat 可执行版

> **必读**：进入 W 阶段前通读本节，并通读 `viral_adaptation_playbook.md`。W3 对照 `viralWritingContext.stageBrief` + `peakLedger`/`hookPlan`/`shotDesignIntent` 兑现，禁止只填 JSON 不落地。

读取：`getPlanData.viralWritingContext` / `viralFormulaPicker` / `extractPeakHook`。

## 0. 视听爆点与钩子（先于文笔）

- **真爆点**：巴掌/下跪/掉马/背叛证据/泪目/告白等带声画载荷
- **假爆点禁标**：别墅写景、开会交代、纯环境
- **开场钩**：0–3s 第一强刺激；须可拍 △ + 建议秒数
- **共鸣**：题材三拍（如困境→无门→微反击）；`emotionTarget` 必填
- **时长**：对白≥口型；反应 0.8–2s；开场钩组前 3s 完成强刺激

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

## 10. 情绪规范 profile（emotionNorm）与视听 sidecar

项目锁定 `planData.emotionNorm.activeProfileId`（甜宠/虐恋/战神/悬疑/generic）。W3 **按当前档写正文**；导入后机器**不改措辞**，只自愈结构。

### 必写 sidecar（禁止塞进文学括注）

每场 `sceneMeta` / 镜级 sidecar：

| 字段 | 说明 |
|------|------|
| `activeProfileId` | 须与项目 `emotionNorm.activeProfileId` 一致 |
| `avStyle` | 与 profile 对齐：sweet / abuse_romance / war_god / suspense / generic |
| `emotionPhase` | suppress → signal → burst → release → hook |
| `intensity` | 0–10；驱动簇策略与景别偏置 |
| `beatRole` | speak \| reaction \| emphasize \| action（对白簇） |

**禁止**：在 `<scriptItem>` 正文用「（缓推特写）（BGM 骤停）」等技术括注。运镜/声画进 sidecar 与 SB，不进台词原文。

### 对白簇意图（D2）

- `emotion_hit` / `conflict_escalate` / 单句 >20 字：`splitHint: speak_react`（或 `reaction_shot`）
- Speak 镜口型 + **static**；React 镜可 gentle push；口型仅 speak

### 换档

创作中换 profile：继续按新风格写；已写正文不会被机器改写，需作者修订。制作台换档 → 结构 heal，对白不动。

---

## §4 W 阶段

# W1 故事骨架

基于 G 层锚点与 storyCore（改编）或用户口述（原创），产出 `<storySkeleton>` XML。W2 策略与 W3 剧本均引用本产出。

## 入口条件

- `planData.globalAnchors` G1–G5 已通过
- 【项目配置】集数、单集时长、章节范围已确认
- 已读 `getPlanData` → `viralWritingContext.stageBrief`（含 peakLedger/hookPlan/时长规范）

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
| **爆点落点** | 每条 peakLedger 标注落集/落场 |
| **钩子** | 对齐 hookPlan 开场/中段/集末 + 共鸣三拍 |
| **留存** | 3-15-45 与 opening5s 写进分集 |

## 执行步骤

**步骤 0（强制）**：调用工具 `get_viral_writing_context(stageId=W1)`；**先展示 1 条原→改**；按 narrative 必做排骨架；禁假爆点。

1. 读取 globalAnchors + storyCore + peakLedger/hookPlan（缺则 `extract_peak_hook`）
2. 阐述思路：如何兑现视听钩子、付费卡切断、3-15-45
3. 输出完整 `<storySkeleton>`
4. 分集表增 `peakIds[]` / `paypointCut` / `empathyShift`
5. 保留并镜像 `hookPlan.paypointIntent`

## 关键约束

- 压缩比 ≤40%；人物 ≤4
- 前10集 ≈10 个可剪 30 秒投流爆点（须来自真 peak，非写景）
- 矛盾达高级/升级级别
- 金手指非同质化

## BLOCK 闸门

- XML 一次性完整输出
- 分集数 = 项目配置 N
- DEX-STORY-HOOK / DEX-HOOK-PLAN / DEX-EMPATHY
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

**步骤 0**：读 `viralWritingContext.stageBrief`；冲突曲线峰值场必须对齐 `peakLedger`（禁假爆点）。

1. 读取 storySkeleton 删减记录与反转登记表 + peak/hook
2. 读取 `adaptationMatrixStructured` + `adaptationProfile`（含 deepAdaptation / V/R/C 维）
3. 写 3–5 条核心原则，每条服务故事核与真视听爆点
3. 列删除决策表格（列：**三密度影响** + **替代爆点 peakId**）；写入 `narrativeBrief.densityBudget`
4. 写世界观渐进披露方案（对话/OS/VO，禁大段旁白；遵守 infoGap）
5. 核对 ≈3 个反转与骨架登记表一致；标注 3-15-45 留存点

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
- 单句 ≤20 字，单次 ≤50 字；超预算按**决策树**：标点→A 物理拆行；**残句无标点仍超预算→must 重设计或 Confirm B**（非可不手改）；VisBeat→C；`emotion_hit` **必须**同写 `reactionAction`
- 设计拆分 Confirm：`designSplitOps` / tools `confirm_design_split`；反推修好后 `design_split_forward_reentry`
- **契约不符＝重设计**：禁止只改 `narrativeSelfcheck.passed`；残句深链 `nar14_residual` → W3
- 假绿禁：`narrativeSelfcheck.passed=true` 不得代替 `runDesignExitGate(W3)`；缺 `reactionAction` → NAR-15 BLOCK；服务器可补占位 RA，但 CAM/双镜与其它硬闸仍须同轮修完再 `setStepStatus`
- **W3 权威=plan**：本步验 `dialoguePlan` 的 NAR-14/15；无 shots 时 **跳过** DC-01-EXTRA（非 UNIMPLEMENTED）。镜覆盖/乱入在 SB 拦
- **DEX-SHOT-INTENT**：sidecar `shotDesignIntent[]` **必须非空**（含 `picture`/`durationSec`；钩子/爆点须 `peakId|hookId`）。可与 `peakLedger` 一一对应；**禁止空数组 + passed**。服务器可从 peak 高置信派生，无 peak 时须手写

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

**步骤 0（强制）**：调用 `get_viral_writing_context(stageId=W3)`；写每场前标注本场兑现的 `peakId` / `hookId` / `retentionBeat` / `infoId`。  
**步骤 0b**：按 brief **时长规范**估算对白镜；>20 字 `splitHint`；反应镜 0.8–2s。  
**步骤 0c（视听配方）**：若 brief 示范含 `weaponId`（如 five_cut_reveal / silence_scream / intimate_ots），sidecar `shotDesignIntent` 须挂 `weaponId`/`sceneRecipeId`/`sfxIntent`；**禁止**写入文学正文括注。  
T3：同步写 `narrativeBrief.implementationPlan[]`（每场 `sceneRef` + `fxIntent` 含 **F0** + `avCausality`）。  
**分镜设计意图（sidecar）**：

```
purpose / emotionGoal / picture / shotSizeIntent / cutIntent / audioIntent / durationSec / peakId|hookId / weaponId / sfxIntent[] / visualBeatTags
```

**VisBeat**：`purpose` 映射默认 tags（钩子→reveal）；多拍点须在 SB 拆镜或打齐 tags，禁止「露刃+浅笑」塞进单一脸特写。

**场镜基数 MUST**：`implementationPlan`/`sceneMeta` 条数 = 剧本「场N」数。

1. 从骨架提取**当前集**
2. 阐述思路（兑现开场钩、付费卡前拍、真爆点）
3. 输出 `<scriptItem>`
4. 共生产 tags + 口型 + fx + **shotDesignIntent**（供 designBrief/SB 续读，禁止下游重发明爆点）
5. 短确认，禁复述正文

## BLOCK 闸门

| ruleId | 条件 |
|--------|------|
| R2 | 台词格式规范，hash 稳定 |
| W12 | 每场推进冲突，集末有钩子；3-15-45 |
| W13 | △ 可拍，无技术括注 |
| DEX-SHOT-INTENT | shotDesignIntent 非空且爆点/钩子可回溯 |
| DEX-TEMPLATE-FILL | mustEmit 填满 |
| L06 | ScriptReadyGate |

## 严禁产出

分镜表、景别、运镜、imagePrompt、videoPrompt、audioPrompt **写入文学正文**。  
允许且必须：sidecar `shotDesignIntent`（给 designBrief/SB 执行，SB **不得重发明爆点**）。

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
| NAR-14 | 长台词：优先按标点拆成 ≤15 字分句写入多条 `lines`；整句保留时须有 **splitHint**（如 `reaction_shot`）+ 反应 △ | 标点拆句 / 补 `dialoguePlan.lines[].splitHint` |
| NAR-15 | emotion_hit 台词有 **reactionAction** | 补 `dialoguePlan.lines[].reactionAction` |
| RET-01 | ep1 首场 sceneMeta.avCausality 非空 | 补声画峰值 |
| RET-02 | opening3to10s / rhythm31545 与正文时间轴一致；SB 镜可标 rhythm31545 | 对齐 retentionPlan |
| DEX-AV-TAGS | 每场 `sceneAvTags`（或 sceneMeta.avTags）非空且为 **string[]** | 按当前公式打标 |
| DEX-FX-INTENT | 每场 `fxIntent.level`（含 F0）；≤ pack 天花板 | 补声明/降级 |
| DEX-SCENE-CARD | implementationPlan 条数与 sceneMeta/唯一 sceneName 对齐 | 删孤儿或独立场名 |
| DEX-ADAPT-SCORE | 设计期 adaptScore 过阈值 | 补维度兑现/打标/拆镜 |
| DEX-CAM-FIT | 口播+反应同镜未拆 | **须已写出双镜**：speak（无 reactionAction）+ reaction（VD≥minChars，禁「听者反应特写」） |

**NAR-15 × DEX-CAM-FIT：** plan 行可写 `reactionAction`；**shots 禁止**单镜同时 onCam 对白 + `reactionAction`。  
**禁止假绿：** 不得在缺 splitHint/reactionAction/**sceneAvTags**/`shotDesignIntent`、或仍有未拆同镜 DEX-CAM-FIT/NAR-14 时写 `narrativeSelfcheck.passed=true`。  
**服务器自动闭环：** `setStepStatus` / export 会对 NAR-15 补占位 RA、从 peak 补 `shotDesignIntent`、唯一名+已定妆图绑 CREF；修不完仍 BLOCK，须按清单同轮重写 JSON，禁止只改 `passed`。  
**形状：** `sceneAvTags` 必须数组；`seriesContinuity` 必须 record；`microExpression` 仅 `{eyes,mouthDetail}`（多角 `byName`）。  
**NAR-14 优先**：按 `，。！？；` 标点拆成多条 `dialoguePlan.lines`（每分句 ≤15 字）；服务器也会物理拆句兜底，但导出 JSON 应直接写权威形。整句无标点且超长时才用 `splitHint: reaction_shot`。  
出站以服务器 `POST /api/scriptAgent/designExitGate` + `setStepStatus` 硬闸为准（见 `viral_adaptation_playbook.md`）。

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
| narrative.spatialRelation | **站位 string**（由 B13 压串；禁止贴 `{axis,anchors}` 对象） | PR-06, PR-14 · DEX-SPATIAL-STR |
| retentionTier | ep1: 0-2s / 2-5s / 5-30s / body / endHook | RET |
| shotDesign | T2+ 构图/表演/锚点（高情绪≥4 必填 performance） | GEN |
| shotDesign.performance.microExpression | **仅** `{eyes, mouthDetail}`；多角色用 `byName`，**禁止**名键根对象（如 `{"沈父":{…}}`） | DEX-EXPR / SH-MICRO-EXPR |
| lines[].lineId/functions/causedByActionId | 台词功能链，对齐 dialoguePlan；**plan 全部 lineId 须落 shots（DC-01）** | NAR, DC-01 |
| lines[].reactionAction | emotion_hit 必填写在 **dialoguePlan**；**禁止**单镜同时 onCam 对白+reactionAction — 须已拆双镜 | NAR-15, DEX-CAM-FIT |
| speaker 裸名 | 禁 OS/VO 后缀；禁 APP/UI 作 speaker | DEX-SPEAKER-BARE |

## 形状契约（防 SCHEMA/假绿）

- `microExpression`：**禁止** `{"角色名":{eyes,mouthDetail}}` 名键根；权威形 `{eyes,mouthDetail}` 或 `{eyes,mouthDetail,byName:{…}}`
- `sceneAvTags` / `sceneMeta[].sceneAvTags`：必须是 **string[]**，禁止逗号散文串
- `planData.narrativeBrief.seriesContinuity`：必须是 **record** `{ep1Summary, carryInfoIds?}`，禁止整段散文 string
- **DEX-CAM-FIT 硬约束（Chat 必须写对）**：
  - `dialoguePlan.lines[].reactionAction` **可以且应当**存在（NAR-15）
  - **禁止**单条 `shots[]` 同时具备：出镜对白 + `lines[].reactionAction`（或 VD 含「开口/说道…反应/愣/侧目」）
  - 权威形 = **两镜**：speak（口播、**无** reactionAction）+ reaction（无口播或仅 OS；VD≥minChars）
  - **禁止**占位 VD「听者反应特写」
  - **反例**：一镜 `dialogue.lines[{text, reactionAction}]` + VD「开口道完，听者反应」→ 不合规
  - **正例**：镜A 说话近景（仅 text）；镜B 听者反应特写（无 onCam 台词）；plan 行仍可有 reactionAction

## 出站硬闸（SB）

- `runDesignExitGate(SB)`：**必须**过闸再 `setStepStatus` 完成；禁止自检假绿跳过
- **setStepStatus ≡ exportGate**：默认 **diagnose-only**（写 `meta.expandProvenance.mode=diagnose_only`）；仅显式 `forceExpand:true` 才 apply IRD/cam/oneBeat；高置信 auto-close 含 **可抬短镜抬时**（LIP/DFW 同靶+vendor snap），**不**静默同文唇拆；超 vendor/多句须 Confirm 语义拆后重跑 designExit
- 失败时：服务器会先高置信 auto-close（**LIP 抬时** / NAR-15 占位 RA / DC-01 mirror / 噪声 EXTRA / peak→shotDesignIntent / 唯一名→charCodes；有定妆图写 assetCrefPlan，无图则 stub+deferredStill）；仍红则按失败清单 **同轮重写 shots/JSON**，禁止只改 `passed`/自报绿
- **LIP**：可抬→设计退出前抬净；导入 raise 仅兜底；禁 DFW「导入可愈」与超限 LIP 互斥谎称；`importOk≠designExitPass`
- 不发明定妆 URL / 假 `--cref`；**无定妆图**时可设计期 **stub+assetCrefPlan 延期**（配角后期 AS 智能补图）；生成/compose 仍须真图
- 出脸镜须 `charCodes` 或可派生 speaker 入册；`DEX-ASSET-CREF` 在 SB 认 stub 绑，AS 要 imaged
- **导入**：已有 `preDesignPack.shots` 时默认 **diagnose-only**（禁 IRD/cam/oneBeat 静默再拆 16→170）；`forceExpand` 才 apply；dryRun 须展示 **postHeal 镜数**（作者→愈后）与**非法同文占比**
- **一镜一画面（语义强制）**：连续≥3 归一化同文 VD（**有对白也算**）→ `DEX-DUP-VD` BLOCK；禁止「同文口型复用」当设计；超 vendor/多句 → Confirm 语义拆（子镜须景别/运镜/`intent.picture` 相对父镜可区分）或改短，**禁止**指望导入静默拆成同文 N 镜
- **DEX-DUP-VD / DEX-DIRTY-STILL-PROMPT / DEX-HAND-LIP**：同文连镜、手+眼同帧、文学体裸 `--cref CHAR`/`--sref SCENE`、手镜 lip≠none → BLOCK；composed prompt **尾** IR 码除外
- **配方智能适配（≠改设计）**：分镜 VD/景别/intent 是 SSOT；compose 按镜型适配（手 CU/道具 CU/OS/空镜禁硬注正脸·全员必须出现·口型话术）；**禁止**把配方句回写 `visualDescription`。真脏手+脸 → Chat BLOCK + VisBeat Confirm 拆；导入与设计 **同核智能拆**；残留才 soft（`importOk≠designExitPass`），禁静默同文拆手脸
- **`importOk≠designExitPass`**：导入可进仓 ≠ 设计闭合；禁止只改 `modalityPromptAudit` / `narrativeSelfcheck.passed`
- composeStillPromptPreview `persist:true` 写库用 `result.composeMode`（禁裸变量 `mode` → `mode is not defined`）
- VLM 缺 Key：图已出、HQ 未过（≠ preview HTTP 400）
- NAR-14/15（plan 有 RA；shots 同 lineId；**speak 镜禁止塞 RA**）、DC-01（缺覆盖）、**DC-01-EXTRA（乱入）**、DEX-CAM-FIT（双镜形）、DEX-DC-ALIGN、DEX-SPEAKER-BARE、DC-16 预检
- **RA×CAM 双轨**：`emotion_hit` 的 RA 写在 **dialoguePlan**；镜侧权威=说话镜+反应镜；禁单镜 onCam+RA
- **质量同核（BLOCK）**：DEX-QP-02、DEX-CAST-ON-DESC、DEX-EMPTY-SHOT-CONSISTENCY、DEX-EXPR-SPEAK、**DEX-ASSET-CREF**、**DEX-SHOT-INTENT**
- 出站前 L2 `healShotQuality`（CAST/EMPTY 可置信则愈）；愈后 `cascadeForwardStale`；chatStrict 仅 propose
- **残句**：A 拆后仍 NAR-14 → 须重设计/显式 splitHint/`Confirm B`；导入 ingest **禁**静默 residual B / 同文唇拆（标 `lipConfirmRequired`）
- 拆行后须 `confirm_design_split` / Orchestrator（mirror+补缺 lineId），禁止只写 hint
- VisBeat 与 Orchestrator：先 expanders，再 clause-split，再残句 B（禁双拆打架）
- 修后强制 `forwardReentry`（防二次 DC-01/时长/NAR-15）
- 空镜描写禁止再叠正脸/权力位（compose egress 同核）；有脸须 CHAR + assetCrefPlan/定妆
- 分镜表列：镜/类型/场景/**画面描写/景别/表演**/台词/时长（parser 往返保留描写）
| clip30sCandidate / rhythm31545 | 投流与 3-15-45 标注 | VIR |
| audioCue | W3 sceneMeta.avCausality.audioBeat（**string**；禁止 `{beat,type}` object） |
| visualEffect / fxLevel | W3 fxIntent（**visualEffect 为 string** `"F1: 描述"`；fxLevel 可选 `"F1"`） |

| visualBeatTags | L0 拍点标签（reveal/prop_insert/reaction…）；与景别冲突见 DEX-VIS-* | DEX-VIS |
| suggestedVisualBeatTags | Suggestor 提案，**确认前不立法** | — |
| weaponId | 五刀等武器；升超 visual_multi | GEN |

无 AV 意图时**省略**上述可选字段；禁止写 `null`。

### VisBeat 自检（SB）

- purpose→tags：钩子→`reveal`+`prop_insert`；反应→`reaction`
- 揭示/道具插入 **不得** 与纯脸 `特写/CU` 同镜（须拆 insert→reaction 或显式 override）
- Suggestor 只提案；须 `setTags` / ConfirmBar 确认后才进 L0

### spatialRelation 压串公式（DEX-SPATIAL-STR · BLOCK）

B13 `{ "axis": "谢玄辞-沈清漪", "anchors": ["立于树影下", "从光亮处走来"] }` →

```text
axis=谢玄辞-沈清漪；anchors=立于树影下|从光亮处走来
```

- **正例**：`"spatialRelation": "axis=女主-男主；anchors=女主左|男主右"`（写在 `narrative.spatialRelation`）
- **反例（禁止）**：`"spatialRelation": { "axis": "女主-男主", "anchors": ["女主左","男主右"] }`
- 导入 salvage（SH-SHOT-SPATIAL）仅兜底；Chat **不得**依赖 salvage。

## 台词映射铁律（R2）

1. 剧本每句 `{角色}：{台词}` 须在 shots 中可追溯
2. **100% 覆盖**：可合并多句入一镜，**禁止删改字词、禁止丢句**
3. OS/VO/系统音单独标注 `type`（`os` / `vo`）— **禁止** `speaker: "沈清漪（OS）"`；speaker 只写本名，画外用 type
4. **禁止** `--cref SCENE-*`：角色用 `--cref CHAR-*`，场景用 `--sref SCENE-*`
5. **CastingSheet**：身份以 CD/`charCodes`/`--cref` 为准；描写点名**智能绑定**既有 CD/资产（唯一命中补码；歧义拒绑；无资产 stub+保留名）。**禁剥名**；`visualDescription` **禁止当作自由 NER 造名源**（见 `docs/PRODUCTION_PILLARS.md`）
6. **静帧 Identity（DEX-STILL-*）**：一镜一可静帧拍；人名裸名禁`（OS）`；禁「对白瞬间神态」填料；多拍 → **DEX-STILL-ONEBEAT BLOCK**（智能拆或 Confirm）
7. 出口前人工核对台词数 ≥ 剧本可枚举句数
8. **口型闸**：仅出镜对白强制 lip；`type:os|vo` 可 no lip；空 `lipSyncPolicy` ≠ silent 假阳

### speaker 正反例（DEX-SPEAKER-BARE）

- **正例**：`{ "speaker": "沈清漪", "type": "os", "text": "……" }`
- **反例（禁止）**：`{ "speaker": "沈清漪（OS）", "text": "……" }` — 导入会剥 OS，但 Chat 不得依赖 salvage；生产闸会把「名（OS）」当第二张脸

### visualDescription 正反例（DEX-STILL-ONEBEAT · **BLOCK**；DEX-QP-02 / QP-02 · BLOCK）

- **正例（一镜一拍）**：`{ "visualDescription": "中景。沈清漪咬帕止血，眉心微蹙。" }`（单拍、裸名、可拍≥minChars）
- **反例（多拍）**：一镜堆刺入+包扎+露出匕首+浅笑 → `DEX-STILL-ONEBEAT`（**BLOCK**）
- **正例（簪刺标准三镜 · 契约金样）**：
  1. `大特写。银簪尖端刺入锁骨下方皮肉，暗红色血珠自簪尖渗出。` · tags `prop_insert,reveal`
  2. `特写。沈清漪唇边勾起一抹浅笑，眼神决绝。` · tags `reaction,face_cu`
  3. `近景。梳妆台下方露出一柄匕首的冷光。` · tags `reveal,prop_insert`
  - VO/画外音进 AUD，**不**进 visualDescription
  - 金样：`data/fixtures/golden/still-onebeat-zan-ci.json`；高置信 exit **auto apply** splitPlan；低置信 Confirm
- **正例（跪地拔剑 · 题材扩样）**：①`特写。少年跪地落泪，目光决绝。` ②`近景。少年拔剑起身，剑尖指向对方。` · 金样 `still-onebeat-kneel-sword.json`
- **反例**：`沈清漪（OS）对白瞬间神态` → `DEX-STILL-OS-NAME` + `DEX-STILL-FILLER`
- **反例**：7 字空壳 / 纯「很美很有氛围」→ `DEX-QP-02` / `QP-02`（minChars 仅防空壳；正式标准=可拍物象）
- **反例**：`空镜无人物。沈清漪正脸特写` → `DEX-EMPTY-SHOT-CONSISTENCY`
- **反例**：描写写「沈清漪」但 `charCodes: []` → `DEX-CAST-ON-DESC`（唯一 CD 可智能绑；歧义拒绑保留名）
- **正例（无图）**：点名保留「沈清漪」进 characters；**禁假 --cref**；有定妆图再挂 cref
- **反例**：有脸/CHAR 无本镜绑且无法 stub 入册 → `DEX-ASSET-CREF`（深链 AS）；仅 stub 无真图时 **AS/compose** 仍 BLOCK
- 首帧脏/多拍反推：`still_firstframe_dirty` → **智能拆镜**（优先）或改单拍描写 → stale → MD-IMG；**禁止只 regen**
- 描写过短反推：`qp02_visual_short` → SB 重写 `visualDescription`；导入不发明占位

### 智能拆 · Chat/exit 矩阵

| 模式 | Chat | 服务器 |
|------|------|--------|
| auto+高置信 | 展示已拆 N 镜；可 undo/override | exit apply still_onebeat + sync |
| auto+低置信 | RH 出 splitPlan，须 Confirm | 不 auto |
| chatStrict | 仅 propose；完成步前 Confirm | 未 apply → BLOCK |

## 每镜必填 visualDescription

| 字段 | 说明 |
|------|------|
| visualDescription | 画面主体与动作（供 EN subject / MD-IMG）；**一镜一拍、裸名** |

## 执行步骤

1. 按 scriptPlan 分场拆镜
2. 为每句台词创建 shot，填入 dialogue.lines
3. 标 shotSize + emotionIntensity + duration + rhythmZone
4. 为每镜填 **visualDescription**（必填）
5. 标 shotSize + emotionIntensity + duration + rhythmZone
6. 为信息镜填 markers；标 **string** spatialRelation（按上式从 B13 压串）
7. 写入 **Bundle 根** `preDesignPack.shots[]`（禁止只写 `planData.preDesignPack`）
8. 导出前自检：JSON 可 parse、根 `}` 闭合、顶层 shots≥1；script↔dialoguePlan↔shot `lineId`/原文同文（标点差 → DC-01 / RH-QP-03）

## BLOCK 闸门

| 项 | 条件 |
|----|------|
| R2 | 台词 100% 覆盖，零丢句 |
| visualDescription | 每镜非空 |
| DEX-SPATIAL-STR | 任一 `spatialRelation` 为 object → **不得导出** |
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
| B13 | spatialAnchors | 空间锚点（轴线/站位） | SB spatialRelation（**压成 string**） |

## 执行步骤

1. 从 script 提取角色、场景、道具 → B6 assetHints
2. 从 G3 toneProfile 锁定 B3
3. 标 B5 信息链：本集埋/收哪些伏笔
4. 写 B7/B8 跨集状态（有上集则读 continuity）
5. 填 B11 linkageTargets = `["台词","资产","连贯","视听","故事","场景","运镜","改编","模态编译","修复"]`
6. 按 GB 分场标 B12 rhythmZoneOutline（每场起承转合）
7. 标 B13 spatialAnchors：主轴线与关键站位，供 SB **写成站位 string**（禁止把 B13 对象原样塞进 `spatialRelation`）

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
    "B12": [{ "scene": "Sc1", "zone": "起", "beats": 2, "summary": "开场立意（可选）" }],
    "B13": [{ "scene": "Sc1", "axis": "女主-男主", "anchors": ["女主左", "男主右"] }]
  },
  "rulePackVersion": "2.1.0"
}
```

### B12 权威形状（DEX-B12-BEATS-NUM · BLOCK）

- **`beats` = 节拍数量 number**（如 `2`），不是叙事句子。
- 叙事说明写可选 **`summary`**（或 `beatSummary`）。
- **正例**：`{ "scene": "祠堂", "zone": "起", "beats": 2, "summary": "自残取佩，立下决意" }`
- **反例（禁止）**：`{ "scene": "祠堂", "zone": "起", "beats": "自残取佩，立下决意" }`
- 导入 salvage（SH-B12-BEATS）仅兜底；Chat **不得**依赖 salvage 导出错形。

## BLOCK 闸门

- 11 字段全非空（B12/B13 有场则必填）
- 无镜级/prompt 内容
- B6 与 script 角色场景一致
- B5 每条：`payoffEp` 仅未来集号（number）；本集收/当集兑现用 `payoffLabel: "本集收"`，**禁止**把语义串写进 `payoffEp`
- **DEX-B12-BEATS-NUM**：扫描 `designBrief.B12[]`；任一 `beats` 非 number → **不得导出**
- **质量同核（与 SB）**：`runDesignExitGate(designBrief)` 挂 DEX-QP-02 / CAST-ON-DESC / **EMPTY-SHOT** / **EXPR-SPEAK**；不得提前出站绕开 SB 硬闸
- DEX-SFX-BRIDGE：有爆点/钩子意图才要求 sfxIntent；禁逼造假音效意图（交付见 `sfx_unbacked`）
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
- **原创**：G→W1→W2→W3→…（跳过 P；G 前补一次爆款公式确认）
- **爆款深度**：见 `viral_adaptation_playbook.md` — 设计期出站硬闸，禁止带病进下一站；import RH 仅兜底

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
- 真正修复：复制 `chatRepairText`（含【深链·反推舞台】）→ Chat 改**权威字段** → **再入编排**（`design_split_forward_reentry` / Confirm / SB setStep heal）→ 再 dryRun/exportGate → 再导入/烧片。
- **二次修复铁律**：只改 `dialoguePlan` 不 mirror shots → 仍会 DC-01 / 镜级 NAR-15；同 trigger≥3 升人工（loop_guard）。
- **NAR-14 残句**：`nar14_residual` fork＝改短重设计(W3) | Confirm拆镜(SB) | 显式 splitHint；clause-split≠清零。
- 设计拆族 trigger：`nar14_split` / `nar14_residual` / `nar15_reaction` / `dc16_cast` / `speaker_bare` / `design_split_orchestrator` / `dialogue_hash_mismatch`；另含 `cam_whitelist`、`img_cref_missing`、`pr_lip_duration`、`modality_fx_missing`；禁止落到 INFRA 死路由。

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
| 写入 `--cref CHAR-*` | `--cref SCENE-*`（场景必须 `--sref`） |
| 写入 `--sref SCENE-*` | 漂移锚点 token |
| PURE-SCENE 前置 no people | T1 档位写 imagePrompt |

## BaseSpec 规则

- V1–V4：type / cref / negative 位置 / --ar
- CHAR-SCENE 须 `--cref CHAR-CODE`；场景码只进 `--sref`，禁止 `--cref SCENE-*`
- PURE-SCENE / **空镜**：前缀禁人物正脸；不得与人名/出脸并存（DEX-EMPTY-SHOT）；compose 禁叠「正脸清晰」
- 有出脸须 CHAR + 定妆真图（设计期可 stub+`assetCrefPlan` 延期；DEX-ASSET-CREF → `asset_cref`）；preview≡generate 同核，预览假绿不代替 generate BLOCK
- identity 与 BP L0.gender 一致（identityAudit）
- 保真环失败标 `fidelityFailed` → 禁作视频首帧（`still_firstframe_dirty`）

## Agnes VendorPack

- tag-stack-zh 模板
- 无独立 negative 通道 → AG-GATE-04 剥离 @图N
- cref 引用分镜图或角色资产

## 正推

```
BP L0 → SB charCodes/type → EN subject → MD-IMG imagePrompt
```

## 反推

| 触发 | 目标 |
|------|------|
| empty_shot_conflict | SB |
| cast_on_desc_missing | SB |
| asset_cref | AS |
| still_firstframe_dirty | SB → MD-IMG |
| qp02_visual_short | SB |
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

- V9 duration 与 SB 一致（1–30s）；高情绪对白须 **emotionHold** 预留（可读进 Camera）
- QF-VIEW / QF-DUR 运镜词；裸秒 `2s,3s` 须收敛为单一 `duration Ns`（quality 单源）
- 有**出镜**对白须 lipSync 关键词；**禁止**显式 `no lip sync` / `lipSyncPolicy=none|silent`（NO-LIP-DIALOGUE → `no_lip_dialogue`）。**OS/VO 不强制口型**；空 policy 自动升 subtle（≠ silent 假阳）
- burn 读 policy：`shotDesign` → `narrative` → `shot` →（出镜）默认 subtle
- 静帧闭口 ∩ 强口型（仅出镜）：mouth handoff soft 一次后复检，仍冲突 BLOCK（`still_mouth_handoff`）
- 镜/倒影描写须 anti-warp（禁 funhouse 变形）
- `sfx:<>` 须有 `audioCue`/intent 真源；无 SfxSynthPort ≠ 音效满分（`sfx_unbacked`）
- fx 同镜 ≤F3（PR-07）

## Agnes VendorPack

| 项 | 规则 |
|----|------|
| 首位帧 | AG-GATE-01：referenceImage 或分镜图；脏静帧禁烧（`still_firstframe_dirty`） |
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
| still_firstframe_dirty | SB → MD-IMG | P0 |
| still_mouth_handoff | EN / SB | P0 |
| no_lip_dialogue | EN | P0 |
| sfx_unbacked | SB | P1 |
| svq_motion_fail（含镜面） | EN | P1 |
| motion_overflow | EN | P0 |
| native_audio_mismatch | EN | P1 |
| duration_clamp / lip_duration_short | SB | P0 WARN |

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

编译/烧片走五层：`buildPromptIR` → `sanitizeVideoPrompt` → `applyModeDialect` → `applyVendorPromptPack` → burn gate（BLOCK 带 RH+rePushPlan）。**lip/时长以 `quality/resolveLipDuration` 单源**（裸秒去重、对白禁 no-lip）。详见 `docs/video-quality-chain.md`。对白源语言进 `[Audio]`；stub videoPrompt 强制 IR 重编译；`motion-from-frame` 全文至多一次。

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
| OS/VO 分型标注（`type: os|vo`，speaker=本名） | `speaker: "名（OS）"` 混写 |
| | T3 在 MD 改 lines |

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

## 出口 / CAST

- export 前：dialogue speakers ∪ 上镜码 ⊆ characterDesign.assets 且非 stub-only（DC-16）
- **APP / UI / 系统** 不可作 speaker — 改 `type` 或旁白策略（DEX-SPEAKER-BARE）
- **CD.name 裸名**：禁 `沈清漪（OS）`；OS 用 dialogue `type=os`（DEX-STILL-OS-NAME；导入同剥）
- reverseTarget=CD；修后可 `design_split_forward_reentry` 再正推
- 静帧假双脸反推主链在 **SB**（改 visualDescription），非只补定妆册 regen

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
- **两类 stub**：真说话人缺册的 speaker stub 仍 BLOCK（须补 identity）；`CHAR-ORPH-*` / 描写动词粘连假名由 ingest 剥离，**禁止**为假名建角色
- **反例**：B6 含「侍女」但 `characterDesign.assets` 无对应项 → BLOCK；导入 stub **仍** BLOCK
- **正例**：`{ "code": "CHAR-SHINV", "name": "侍女", "L0": { "identity": "沈府贴身侍女，报信出场" } }`
- 修复话术：按 exportGate `chatRepairText` 中 RH-DC-16 补真实 CD → **再点预览/exportGate** 直至 `exportAllowed`；若清单仅 CHAR-ORPH/动词粘连假名 → 勿建角色、勿整集重设计
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
- **DEX-ASSET-CREF**：出脸/`CHAR-*` 镜设计期可 **stub 入册 + assetCrefPlan** 先过 SB；**须本阶段出定妆真图**后再回生成。导入/export 不发明假 `--cref URL`。缺真图在 AS 为 BLOCK，SB 仅 WARN/延期提示
- **导入**：已有 `preDesignPack.shots` 时默认 **diagnose-only**（禁 IRD/cam/oneBeat 静默再拆 16→170）；`forceExpand` 才 apply；dryRun 须展示作者镜数 vs prepare 后；**禁同文口型静默拆**
- **setStepStatus**：与 exportGate 同核 diagnose-only；`forceExpand` 才扩镜；`importOk≠designExitPass`
- SB stub+assetCrefPlan 可延期；生图前须定妆真图（`imageId`）
- VLM 缺 Key ≠ preview `mode is not defined`（后者为 persist 笔误，已修 composeMode）

## 下游

→ BP_blueprint（visualLockTable 汇总）；出图后回 SB / `setStepStatus(SB)` 过 CREF。

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
  - `spatialRelation`: `"axis=女主-男主；anchors=女主左|男主右"`（从 B13 压串；禁止 object）
  - 禁止 `"visualEffect": { "level", "desc" }`（V62 制作路径 legacy，非 T3 export）
  - 禁止 `"spatialRelation": { "axis", "anchors" }`
- **B12.beats**：必须为 **number**；叙事写 `summary`。禁止 `"beats": "自残取佩…"`
- **导出前自检（阻断）**：
  - 扫描全部 `preDesignPack.shots[].visualEffect` / `audioCue` / `spatialRelation`（含 narrative）；若为 object → **不得导出**（RH-MOD-01 / RH-SPATIAL-OBJ）
  - 扫描 `designBrief.B12[].beats`；若非 number → **不得导出**（DEX-B12-BEATS-NUM / RH-B12-BEATS）
  - **DEX-LITERARY-STALE**（BLOCK）：公式已更换 → **按新规范重设计**（入口 W1 → **W3 redesignPass 验收消债**）；或 `acknowledgeKeepLegacy` 保留旧稿补洞。勿只改旧 NAR/DC；勿只完成 W1。导入默认不消 stale。
  - **【设计未闭合】**：export 嵌 `runDesignExitGate(SB,{chatStrict})`；未过 → 短文案「请回 W3/SB 写完再 export；勿当导入补洞」。**禁止**跳过 designExit / 只改 audit 假绿出站。
  - **DEX-CAM-FIT**（BLOCK · SB）：**Chat 硬约束** — `reactionAction` 写在 dialoguePlan；shots **禁止**单镜 onCam 对白+reactionAction（或 VD「开口…反应」）。权威形=说话镜+反应镜两镜；禁「听者反应特写」。服务器 untilClear 仅兜底；**chatStrict 未拆不得假绿**。深链 `cam_fit`（RH-DEX-CAM-FIT：下次写权威形；本包勿手拆已愈项）
  - **DEX-NAR-14/15**：**优先**按标点拆成多条 `lines`（分句 ≤15）；`emotion_hit` **必须**同写 `reactionAction`（**plan**；shots 已拆双镜后 speak 行无 reactionAction）。决策树：标点→A；**残句无标点→must 重设计或 Confirm B**；VisBeat→C。
  - **二次修复必再入编排**：改完字段后须 `designSplitOps.forwardReentry` / tool `design_split_forward_reentry`，或 SB `setStepStatus` heal（会自动 SplitOrchestrator mirror + 残句 B）。**禁止只改 plan 不 mirror**，否则镜级 NAR-15 / DC-01 会二次爆。
  - **NAR-14「可不手改」仅当 A 拆净或已 B 绑 hint**；残句进【须手改】。导入与设计 **同核** `runSplitOrchestrator`（高置信 auto / 低置信 Confirm）；禁静默同文克隆；残留才 stamp；真实反应镜存在才可绑 splitHint（禁静默发明）。
  - **契约不符＝重设计**：deep link `nar14_residual` → W3；禁止只改 `narrativeSelfcheck.passed`（服务器会覆写）。
  - **DEX-DC-01 / DC-01-EXTRA / DEX-DC-ALIGN**：缺覆盖=DC-01；乱入=EXTRA；`lineId` ⊆ shots；拆行后缺镜行 → Confirm/Orchestrator
  - **DEX-SPEAKER-BARE**：speaker 裸名；禁 OS/VO 后缀；禁 APP/UI 作说话人
  - **DEX-STILL-ONEBEAT**（**BLOCK**）：visualDescription 一镜一可静帧拍。多拍 → 智能拆镜（簪刺金样三镜 / splitPlan）或 Confirm；首帧脏 → `still_firstframe_dirty`：优先智能拆，或 SB 改单拍 → stale → 重出；禁只 regen（RH-STILL-FIRSTFRAME）
  - **DEX-STILL-OS-NAME / FILLER**（WARN）：人名裸名禁（OS）；禁「对白瞬间神态」
  - **DEX-QP-02 / QP-02**（BLOCK）：画面描写空/过短/抽象无物象 — 与 export 同核；须 SB 重设计。深链 `qp02_visual_short`。minChars 仅防空壳底线
  - **DEX-CAST-ON-DESC**（BLOCK）：描写点名须进 `charCodes`（与 DEX-CAST-CODES 分立）。**智能绑定**：CD/资产唯一命中可自动补码+cref；歧义拒绑保留姓名；CD 无则 orphan stub（仍 BLOCK export 假绿）。**禁剥名**、禁自由 NER 造角。深链 `cast_on_desc_missing`（RH-CAST-ON-DESC）
  - **DEX-EMPTY-SHOT-CONSISTENCY**（BLOCK）：空镜声明不得与人名/出脸/codes 并存。深链 `empty_shot_conflict`（RH-EMPTY-SHOT）；forbidRegenWithoutDescFix。compose 出站禁再叠「正脸清晰」
  - **DEX-EXPR-SPEAK**（BLOCK）：高强度**出镜**对白须 `microExpression`+`lipSyncPolicy`；OS/VO 不强制口型闸。禁默认表演假过。深链 `expr_speak_missing`（RH-EXPR-SPEAK）
  - **DEX-ASSET-CREF**（BLOCK · AS；SB 可 stub 延期）：出脸/`CHAR-*` 须本镜绑；SB 可用 stub+`assetCrefPlan` 过设计闸，AS/compose 须定妆真图。禁止假 `--cref`/假绿。深链 `asset_cref`（RH-ASSET-CREF → AS）
  - **designBrief 同挂 EMPTY/EXPR/CAST**（与 SB 同核）：不得提前出站绕开 SB
  - **NO-LIP-DIALOGUE**（BLOCK · EN/MD-VID）：**出镜对白**禁止显式 `lipSyncPolicy=none/silent` 与提示词 `no lip sync`。空 policy → 自动升 `subtle_natural`（≠假阳）。**仅 OS/VO 的镜允许 no lip**。深链 `no_lip_dialogue`（RH-NO-LIP-DIALOGUE）
  - **STILL-MOUTH-HANDOFF**：静帧闭口 ∩ 视频强口型（仅出镜对白）→ soft 一次后须复检；仍冲突 **BLOCK**（禁 silent soft 假愈）。深链 `still_mouth_handoff`
  - **SFX-UNBACKED**（WARN）：字面 `sfx:<>` 无 adapter / 无 `audioCue` 真源 ≠ 音效满分。深链 `sfx_unbacked`（RH-SFX-UNBACKED）。DEX-SFX-BRIDGE 禁逼造假意图
  - **镜面**：描写含镜/倒影须 anti-warp；成片变形 → `svq_motion_fail`
  - **emotionHold**：对白高情绪须时长预留可读；不足并 `lip_duration_short`
  - **静帧脏禁烧**：保真环失败 / 无 visualPass → `still_firstframe_dirty`；禁脏首帧续烧
  - **DEX-CUT-01 / DEX-CAM-XSHOT**（WARN）：邻镜硬切/运镜突变，与 export 同核
  - **DEX-DC-16**：`designBrief.B6.characters` 每人必须进 `characterDesign.assets`（code/name/`L0.identity`）；禁仅 stub（如「侍女」）
  - **DEX-FX-F0**：无特效镜写 `visualEffect: "F0"`（或 fxLevel/fxFeasibility F0）；有特效写散文 `generation.fxPrompt`。禁止 `modalityPromptAudit.FX=pass` 却全空
  - **DEX-DURATION / LIP**：对白镜 `duration` ≥ 朗读时长。可抬短镜由**设计侧**抬时（autoClose/export）；超 vendor/多句须 Confirm。DFW-DURATION 不得与超限 LIP 同镜谎称「导入可愈」。导入抬时仅兜底。
  - **DEX-MOD-SEED**：T3 每镜非空 `generation.imagePrompt` / `videoPrompt`；有台词则 `audioPrompt`
  - 服务器 import salvage/heal 仅兜底；Chat 输出仍以权威形为规范；**chatStrict=propose-only**（L2 不落盘）
  - `chatRepairText` 分两层：【须手改】vs【导入将自动适配】；并含【深链·反推舞台】`toonflow://stage/...`
  - 若返回 `shapeSalvageSummary`（【已自动适配】），下次导出须改权威形，勿依赖 salvage

## 静帧→视频质量闭环（Chat 必遵）

SSOT：`data/fixtures/still_video_quality_doctrine.json` + `reverse_route_table.json` + `repair_hint_catalog.json`。

| 症状 | 正推挡点 | 反推 trigger | Chat 动作 |
|------|----------|--------------|-----------|
| 描写点名无码 | DEX-CAST-ON-DESC | `cast_on_desc_missing` | 智能绑 CD；歧义拒绑；禁剥名 |
| 空镜∩正脸 | DEX-EMPTY + compose egress | `empty_shot_conflict` | 二选一改描写；禁只 regen |
| 高强度出镜对白无表演 | DEX-EXPR-SPEAK | `expr_speak_missing` | 补 microExpression+lipSyncPolicy |
| 有脸无定妆计划 | DEX-ASSET-CREF | `asset_cref` | SB 可 stub 延期；AS 补定妆真图 |
| 出镜对白+no lip | NO-LIP-DIALOGUE | `no_lip_dialogue` | 改 policy；OS 不强制；空 policy 升 subtle |
| 闭口静帧强口型 | mouth handoff | `still_mouth_handoff` | 改静帧口型或 EN 口型强度 |
| 假 sfx:<> | SFX-UNBACKED | `sfx_unbacked` | 补 audioCue 真源；无 adapter≠满分 |
| 脏静帧烧视频 | still detect | `still_firstframe_dirty` | hq_update 重出后再烧 |

**愈后**：designExit L2 愈 CAST/EMPTY 后须 stale 级联（MD-IMG/EN），禁止旧静帧/旧 VID 续烧。
## 禁止写入 bundle

- `ruleAudit: { passed: true }` 假通过
- `linkageAudit` 假六链 pass
- `externalHashCheck: { match: true }` demo 值
- **只导出纯 JSON**：禁止把 `chatRepairText` 修复清单粘在 JSON 前面再回传
- **根级 SSOT**：`preDesignPack` / `characterDesign` / `designBrief` / `visualLockTable` **必须写在 Bundle 根**，禁止只塞进 `planData.*`（服务器可 SH-HOIST，但下次导出须顶层）
- **完整闭合**：输出须可 `JSON.parse`；根对象 `}` 闭合完整。截断 → `JSON_INCOMPLETE`（≠ DG-EMPTY）。大包可分片续写，但最终必须是单份可 parse 包
- **末尾自检**：顶层 `preDesignPack.shots.length≥1`；勿把 PDP 再嵌回 `planData` 当唯一源

## 下游

export JSON → `POST /api/ruleEngine/exportGate` → `exportAllowed=true` 且附 `closureSnapshot` → `POST importScript` 落库。  
禁止仅靠 `ruleAudit` / `linkageAudit` / `modalityPromptAudit` 自报通过。

若 `chatRepairText` 出现「已结构 salvage（SH-HOIST-* / SH-JSON-BRACE）」：假空集已修，**只改剩余真闸**（如 NAR-14），勿整包重写 21 镜/CD。

**配角入册（DC-16）**：`chatRepairText` 含 RH-DC-16 时，补真实 `characterDesign`（code/name/`L0.identity`，禁仅 stub）后须**再预览**直至 `exportAllowed`。详见 `preview_vs_import_guide.md` 与 `docs/image-quality-chain.md`。

**两类 stub**：① **Speaker stub**（真说话人缺册 → `ensureCdSpeakerStubs`）仍 DC-16 BLOCK，须 Chat 补 `L0.identity`。② **CHAR-ORPH**（描写动词粘连假名）由 ingest **auto_adapt 剥离**，禁止为「沈清漪紧 / 视谢玄辞」等建角色，禁止整集重设计。

**语义双轨**：形态/时长/空 prompt 种子等可在 dryRun·导入自动适配；NAR-15 / DC-16（真缺口）/ SPEAKER-BARE / CAST-ON-DESC / EMPTY-SHOT / EXPR-SPEAK / ASSET-CREF / NO-LIP-DIALOGUE **必须** Chat 写完再过严闸；NAR-14 可愈则 Orchestrator，不可愈须手改。DEX-STILL-* 为 WARN 但须在 chatRepairText 可见并回 SB 改描写；禁止「只 regen 静照」假闭环。soft_patch（mouth）**不得**代替 BLOCK 静默过。

{
  "version": "1.0.0",
  "heal": {
    "minConfidence": 0.72,
    "exprHighIntensityMustEdit": 6,
    "conflictOrder": ["cast_on_desc", "empty_shot", "performance_defaults", "duration_lip"]
  },
  "dimPolicy": {
    "identity_cast": "must",
    "dialogue_lip": "must",
    "emotion_clarity": "must",
    "motion_fidelity": "must",
    "audio_mood": "must",
    "cam_variety": "optional",
    "retention_hook": "optional",
    "packaging": "optional",
    "vis_beat": "optional"
  },
  "unknownScore": 0.35,
  "asr": { "defaultEnabled": false, "skipWhenNoAdapter": true },
  "vlm": { "requireAdapter": true, "stubIsUnknown": true },
  "dex": {
    "DEX-CAST-ON-DESC": { "severity": "BLOCK", "stages": ["SB", "designBrief", "W3"], "trigger": "cast_on_desc_missing" },
    "DEX-EMPTY-SHOT-CONSISTENCY": { "severity": "BLOCK", "stages": ["SB", "designBrief", "W3"], "trigger": "empty_shot_conflict" },
    "DEX-EXPR-SPEAK": { "severity": "BLOCK", "stages": ["SB", "designBrief", "W3"], "trigger": "expr_speak_missing" },
    "DEX-ASSET-CREF": { "severity": "BLOCK", "stages": ["AS", "SB"], "trigger": "asset_cref", "note": "SB may stub+plan defer; AS/compose require imaged" },
    "DEX-CUT-01": { "severity": "WARN", "stages": ["SB"], "trigger": "cut01_adjacent" },
    "DEX-CAM-XSHOT": { "severity": "WARN", "stages": ["SB"], "trigger": "cam_xshot" },
    "DEX-QP-02": { "severity": "BLOCK", "stages": ["SB", "designBrief"], "trigger": "qp02_visual_short" },
    "NO-LIP-DIALOGUE": { "severity": "BLOCK", "stages": ["EN", "MD-VID"], "trigger": "no_lip_dialogue" },
    "SFX-UNBACKED": { "severity": "WARN", "stages": ["EN", "MD-VID"], "trigger": "sfx_unbacked" },
    "MIRROR-WARP": { "severity": "WARN", "stages": ["EN", "MD-VID"], "trigger": "svq_motion_fail" }
  },
  "failDimTriggers": {
    "identity_cast": "still_firstframe_dirty",
    "dialogue_lip": "still_mouth_handoff",
    "emotion_clarity": "expr_speak_missing",
    "motion_fidelity": "svq_motion_fail",
    "audio_mood": "svq_audio_fail",
    "sfx_unbacked": "sfx_unbacked",
    "cam_variety": "emotion_structure",
    "retention_hook": "retention_opening_missing",
    "packaging": "packaging_end_preview",
    "vis_beat": "visual_multi_beat"
  },
  "healLayers": {
    "L1": "healViralDesignRouter",
    "L2": "healShotQuality",
    "L3": "applySilentSoftPatches",
    "L4": "planPostBurnRepairs"
  },
  "cases": [
    { "id": "cast_on_desc_block", "pillar": "design", "expect": "DEX-CAST-ON-DESC" },
    { "id": "empty_shot_block", "pillar": "design", "expect": "DEX-EMPTY-SHOT-CONSISTENCY" },
    { "id": "expr_speak_block", "pillar": "design", "expect": "DEX-EXPR-SPEAK" },
    { "id": "heal_ambiguous_refuse", "pillar": "heal", "expect": "unsalvageable" },
    { "id": "heal_revalidate", "pillar": "heal", "expect": "residual" },
    { "id": "svq_unknown_not_07", "pillar": "postburn", "expect": "fail" },
    { "id": "block_to_trigger_mapped", "pillar": "reverse", "expect": "cast_on_desc_missing" }
  ]
}

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
      "trigger": "visual_multi_beat",
      "ruleIds": ["DEX-VIS-SPLIT", "VIS-MULTI-BEAT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "MD-IMG"],
      "repairPriority": "P0",
      "defaultAction": "confirmClusterSplit",
      "presentationFork": ["确认拆镜", "艺术长镜头 override"],
      "note": "须手改 Confirm；不进 autoAdapt 可不手改（shadow→enforce 本体 L-Out）"
    },
    {
      "trigger": "visual_tag_missing",
      "ruleIds": ["DEX-VIS-TAG-MISSING"],
      "reverseTarget": "SB",
      "forwardStages": ["W3", "SB"],
      "repairPriority": "P0",
      "presentationFork": ["补 visualBeatTags"]
    },
    {
      "trigger": "visual_tag_inconsistent",
      "ruleIds": ["DEX-VIS-TAG-INCONSISTENT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P1"
    },
    {
      "trigger": "visual_beat_score",
      "ruleIds": ["VIS-BEAT-SCORE"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P1"
    },
    {
      "trigger": "visual_sync_drift",
      "ruleIds": ["VIS-SYNC-DRIFT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P1"
    },
    {
      "trigger": "still_onebeat_multi",
      "ruleIds": ["DEX-STILL-ONEBEAT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["智能拆镜", "改画面描写为一镜一拍"],
      "defaultAction": "confirmClusterSplit",
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": ["preDesignPack.shots[].visualDescription"],
      "note": "正推 DEX-STILL-ONEBEAT ↔ 反推同核 expandStillOneBeat/splitPlan；高置信 auto；低置信 Confirm；禁 soft_patch 顶拆"
    },
    {
      "trigger": "series_continuity_shape",
      "ruleIds": ["SH-SERIES-CONT", "SCHEMA_SHAPE", "SCHEMA_SHAPE_BLOCK", "SH-BRIEF-STRING", "SH-SCENE-AV-TAGS", "SH-MICRO-EXPR"],
      "reverseTarget": "AS",
      "forwardStages": ["AS", "SB"],
      "repairPriority": "P0",
      "presentationFork": ["改 seriesContinuity 为 record", "改 sceneAvTags 为数组", "microExpression 用 eyes/mouthDetail"],
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": [
        "planData.narrativeBrief.seriesContinuity",
        "planData.sceneMeta[].sceneAvTags",
        "preDesignPack.shots[].shotDesign.performance.microExpression"
      ],
      "note": "霜兰令导入：形状 salvage 解锁后仍须写权威形；禁只 regen 静帧"
    },
    {
      "trigger": "design_loss",
      "ruleIds": ["DESIGN-LOSS", "DESIGN-LOSS-DURATION"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["强补可拍描写", "设定可信时长"],
      "forbidRegenWithoutDescFix": true,
      "note": "设计遗失：正式源 salvage 后仍缺 → SB 手补；禁发明正文/默认1s"
    },
    {
      "trigger": "prompt_fidelity",
      "ruleIds": ["PROMPT-FIDELITY"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "forbidRegenWithoutDescFix": true,
      "note": "提示词须覆盖 VD 锚点；禁 freeform 跳过 Shot List"
    },
    {
      "trigger": "dur_desync",
      "ruleIds": ["DUR-DESYNC"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P0",
      "note": "时长只升不降；对齐 shot.duration"
    },
    {
      "trigger": "cam_fit",
      "ruleIds": ["DEX-CAM-FIT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["服务端智能拆（untilClear）", "残留→IRD-CONFIRM"],
      "defaultAction": "runCamFitUntilClear",
      "forbidHandRewriteShotIndex": true,
      "note": "auto→智能拆；Confirm 仅 IRD-CONFIRM；勿诱手改镜号；Chat 下次写权威双镜"
    },
    {
      "trigger": "dialogue_extra",
      "ruleIds": ["DC-01-EXTRA"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P1",
      "note": "台词乱入：删多余或对齐 plan"
    },
    {
      "trigger": "chain_beat",
      "ruleIds": ["CHAIN-BEAT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "note": "拆镜子镜须覆盖父文学锚点"
    },
    {
      "trigger": "aud_orphan",
      "ruleIds": ["AUD-ORPHAN-SPEECH"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P1",
      "note": "无对白剥口播；OS 可压反应镜"
    },
    {
      "trigger": "import_split_sync",
      "ruleIds": ["IMPORT-SPLIT-SYNC"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P0",
      "forbidRegenWithoutDescFix": true,
      "note": "拆后写库失败=愈失败"
    },
    {
      "trigger": "audio_missing",
      "ruleIds": ["CHAT-AUD-01"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P1",
      "note": "有词无声须 seed audioPrompt"
    },
    {
      "trigger": "intent_pic",
      "ruleIds": ["DEX-INTENT-PIC"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": ["preDesignPack.shots[].visualDescription", "shotDesignIntent[].picture"],
      "note": "intent.picture↔VD 同核；修后须 designExit"
    },
    {
      "trigger": "ird_confirm",
      "ruleIds": ["IRD-CONFIRM"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "defaultAction": "confirmClusterSplit",
      "forbidRegenWithoutDescFix": true,
      "note": "低置信 IRD 待 Confirm；禁止假绿"
    },
    {
      "trigger": "dirty_still_prompt",
      "ruleIds": ["DEX-DIRTY-STILL-PROMPT", "DEX-DUP-VD", "DEX-HAND-LIP", "VID-INHERIT-DIRTY-STILL"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "AS", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["改 VD 为一镜一拍", "合并同文镜", "手镜 lip=none", "剥裸 cref/sref"],
      "defaultAction": "handEditVisualDescription",
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": [
        "preDesignPack.shots[].visualDescription",
        "preDesignPack.shots[].generation.imagePrompt",
        "preDesignPack.shots[].shotDesign.lipSyncPolicy"
      ],
      "note": "脏静帧契约：回 SB 改 JSON 字段；深链勿走 INFRA chat_repair 空跳"
    },
    {
      "trigger": "aud_speak_react",
      "ruleIds": ["DEX-CAM-FIT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["服务端智能拆说话镜+反应镜", "残留→IRD-CONFIRM"],
      "defaultAction": "runCamFitUntilClear",
      "forbidHandRewriteShotIndex": true,
      "forbidRegenWithoutDescFix": true,
      "note": "口播+反应同镜：untilClear 自动拆；Confirm 仅低置信；禁手改镜号；修后 designExit"
    },
    {
      "trigger": "still_firstframe_dirty",
      "ruleIds": ["STILL-FIRSTFRAME-DIRTY", "STILL-FIRSTFRAME-STALE", "IMG-CREF-CHAR", "DC-16", "DEX-STILL-ONEBEAT", "DEX-STILL-OS-NAME", "DEX-STILL-FILLER"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "AS", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["智能拆镜", "改画面描写为一镜一拍", "重出静照"],
      "defaultAction": "confirmClusterSplit",
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": ["preDesignPack.shots[].visualDescription", "characterDesign.assets[].name"],
      "note": "多拍/脏首帧：优先智能拆镜（still_onebeat/splitPlan）回写 shots；或手改单拍描写→stale→MD-IMG；禁止只 regen"
    },
    {
      "trigger": "lip_duration_short",
      "ruleIds": ["DFW-DURATION"],
      "reverseTarget": "SB",
      "forwardStages": ["W3", "SB", "EN"],
      "repairPriority": "P0",
      "defaultAction": "soft_patch",
      "note": "仅 canSilentRaise；needsSplit/lipOver 走 pr_lip_duration"
    },
    {
      "trigger": "still_mouth_handoff",
      "ruleIds": ["STILL-MOUTH-HANDOFF", "GEN-01"],
      "reverseTarget": "EN",
      "forwardStages": ["SB", "EN", "MD-VID"],
      "repairPriority": "P1",
      "defaultAction": "soft_patch"
    },
    {
      "trigger": "qp02_visual_short",
      "ruleIds": ["QP-02", "CHAT-SB-01", "DEX-QP-02"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["补可拍画面描写"],
      "authoritativeFields": ["preDesignPack.shots[].visualDescription", "shotDesign.picture"],
      "note": "minChars 为防空壳底线；正式标准为可拍物象。禁止只改 audit。"
    },
    {
      "trigger": "cast_on_desc_missing",
      "ruleIds": ["DEX-CAST-ON-DESC"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["补 charCodes", "改描写去名"],
      "authoritativeFields": ["preDesignPack.shots[].charCodes", "preDesignPack.shots[].visualDescription"],
      "forbidRegenWithoutDescFix": true
    },
    {
      "trigger": "empty_shot_conflict",
      "ruleIds": ["DEX-EMPTY-SHOT-CONSISTENCY"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["去掉空镜声明", "去掉人名/出脸"],
      "authoritativeFields": ["preDesignPack.shots[].visualDescription", "preDesignPack.shots[].charCodes"],
      "forbidRegenWithoutDescFix": true
    },
    {
      "trigger": "expr_speak_missing",
      "ruleIds": ["DEX-EXPR-SPEAK", "GEN-01", "QF-EXPR-01"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "MD-VID"],
      "repairPriority": "P0",
      "presentationFork": ["补 microExpression + lipSyncPolicy"],
      "authoritativeFields": ["preDesignPack.shots[].shotDesign.performance", "preDesignPack.shots[].shotDesign.lipSyncPolicy"]
    },
    {
      "trigger": "asset_cref",
      "ruleIds": ["DEX-ASSET-CREF", "IMG-CREF", "QP-11", "QP-12"],
      "reverseTarget": "AS",
      "forwardStages": ["AS", "SB", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["补 assetCrefPlan / 定妆图", "烧图前绑定 --cref"],
      "authoritativeFields": ["planData.assetCrefPlan", "characterDesign.assets", "preDesignPack.shots[].charCodes"],
      "note": "设计侧 asset_cref；烧图缺 cref 仍可走 img_cref_missing"
    },
    {
      "trigger": "shot_intent_decay",
      "ruleIds": ["DEX-SHOT-INTENT"],
      "reverseTarget": "W3",
      "forwardStages": ["W3", "designBrief", "SB"],
      "repairPriority": "P0",
      "presentationFork": ["补 shotDesignIntent picture/durationSec/peakId|hookId", "可从 peakLedger 派生"],
      "authoritativeFields": ["planData.shotDesignIntent", "planData.peakLedger", "planData.hookPlan"],
      "note": "INTENT→W3 非 INFRA；服务端可高置信从 peak 自动补"
    },
    {
      "trigger": "no_lip_dialogue",
      "ruleIds": ["NO-LIP-DIALOGUE"],
      "reverseTarget": "EN",
      "forwardStages": ["SB", "EN", "MD-VID"],
      "repairPriority": "P0",
      "presentationFork": ["去掉 no lip sync", "改 lipSyncPolicy 为 dialogue_native/subtle"],
      "authoritativeFields": ["preDesignPack.shots[].shotDesign.lipSyncPolicy", "o_videoTrack.prompt"]
    },
    {
      "trigger": "sfx_unbacked",
      "ruleIds": ["SFX-UNBACKED", "audio_mood"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "MD-VID"],
      "repairPriority": "P1",
      "presentationFork": ["补可交付 audioCue/SFX adapter", "去掉假 sfx:<> 满分"],
      "authoritativeFields": ["preDesignPack.shots[].audioCue", "shotDesignIntent[].sfxIntent"]
    },
    {
      "trigger": "cut01_adjacent",
      "ruleIds": ["DEX-CUT-01", "CUT-01"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P1",
      "presentationFork": ["补转场", "对齐场景"]
    },
    {
      "trigger": "cam_xshot",
      "ruleIds": ["DEX-CAM-XSHOT", "CAM-XSHOT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P1",
      "presentationFork": ["对齐运镜/转场"]
    },
    {
      "trigger": "svq_motion_fail",
      "ruleIds": ["motion_fidelity", "QC-SVQ"],
      "reverseTarget": "EN",
      "forwardStages": ["EN", "MD-VID"],
      "repairPriority": "P1",
      "defaultAction": "strengthen",
      "presentationFork": ["加强 motion 提示", "重试成片"]
    },
    {
      "trigger": "svq_audio_fail",
      "ruleIds": ["audio_mood"],
      "reverseTarget": "EN",
      "forwardStages": ["EN", "MD-VID"],
      "repairPriority": "P1",
      "presentationFork": ["补 audioCue / ASR 覆盖"]
    },
    {
      "trigger": "runtime_type_error",
      "ruleIds": ["runtime_type_error"],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "presentationFork": []
    },
    {
      "trigger": "emotion_structure",
      "ruleIds": ["DC-EMO", "E2", "CAM-VARIETY", "svq_cam"],
      "reverseTarget": "EN",
      "forwardStages": ["SB", "EN"],
      "defaultAction": "soft_patch",
      "presentationFork": []
    },
    {
      "trigger": "dialogue_hash_mismatch",
      "ruleIds": [
        "R2",
        "H3",
        "DC-01",
        "DC-13",
        "DEX-DC-ALIGN"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN",
        "designSplitOps"
      ],
      "presentationFork": [
        "P1改剧本",
        "P2改分镜",
        "Confirm 同步 lineId"
      ],
      "authoritativeFields": [
        "dialoguePlan.lines[].lineId",
        "shots[].narrative.dialogue.lines[].lineId"
      ],
      "forwardReentry": "designSplitOps.forwardReentry"
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
      "ruleIds": ["PR-09", "LIP-01", "DEX-LIP-SPLIT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "W3"],
      "repairPriority": "P0",
      "defaultAction": "confirmClusterSplit",
      "note": "needsSplit|lipOver|overVendor → Confirm 拆镜，勿 soft_patch 抬时"
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
      "trigger": "literary_stale",
      "ruleIds": [
        "DEX-LITERARY-STALE"
      ],
      "reverseTarget": "W1",
      "forwardStages": [
        "W1",
        "W2",
        "W3",
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
        "NAR-15",
        "DEX-LIP-SPLIT"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB"
      ],
      "authoritativeFields": [
        "dialoguePlan.lines[].splitHint",
        "dialoguePlan.lines[].reactionAction",
        "shots[].narrative.dialogue.lines[].splitHint",
        "shots[].narrative.dialogue.lines[].reactionAction"
      ]
    },
    {
      "trigger": "nar14_split",
      "ruleIds": ["NAR-14", "DEX-LIP-SPLIT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "designSplitOps"],
      "repairPriority": "P0",
      "defaultAction": "soft_patch",
      "presentationFork": ["Confirm 物理拆行", "补 splitHint"],
      "authoritativeFields": [
        "dialoguePlan.lines[].text",
        "dialoguePlan.lines[].lineId",
        "shots[].narrative.dialogue.lines[].lineId"
      ],
      "forwardReentry": "designSplitOps.forwardReentry"
    },
    {
      "trigger": "nar14_residual",
      "ruleIds": ["NAR-14", "NAR-14-RESIDUAL"],
      "reverseTarget": "W3",
      "forwardStages": ["W3", "SB", "designSplitOps"],
      "repairPriority": "P0",
      "presentationFork": ["改短重设计", "Confirm拆镜B", "显式补splitHint"],
      "authoritativeFields": [
        "dialoguePlan.lines[].text",
        "dialoguePlan.lines[].splitHint",
        "shots[].narrative.dialogue.lines[].splitHint"
      ],
      "forwardReentry": "designSplitOps.forwardReentry",
      "notes": "A拆后仍超预算无标点；禁只改 narrativeSelfcheck.passed"
    },
    {
      "trigger": "nar15_reaction",
      "ruleIds": ["NAR-15"],
      "reverseTarget": "W3",
      "forwardStages": ["W3", "SB"],
      "repairPriority": "P0",
      "presentationFork": ["补 reactionAction"],
      "authoritativeFields": [
        "dialoguePlan.lines[].functions",
        "dialoguePlan.lines[].reactionAction",
        "shots[].narrative.dialogue.lines[].reactionAction"
      ],
      "forwardReentry": "designSplitOps.forwardReentry"
    },
    {
      "trigger": "dc16_cast",
      "ruleIds": ["DC-16", "DG-CD-COVERAGE", "DEX-CAST-CODES"],
      "reverseTarget": "CD",
      "forwardStages": ["CD", "SB"],
      "repairPriority": "P0",
      "authoritativeFields": ["characterDesign.assets[].code", "characterDesign.assets[].name", "characterDesign.assets[].L0.identity"]
    },
    {
      "trigger": "speaker_bare",
      "ruleIds": ["DEX-SPEAKER-BARE"],
      "reverseTarget": "SB",
      "forwardStages": ["W3", "SB"],
      "repairPriority": "P0",
      "authoritativeFields": ["dialoguePlan.lines[].speaker", "shots[].narrative.dialogue.lines[].speaker", "lines[].type"]
    },
    {
      "trigger": "self_report_mismatch",
      "ruleIds": ["DG-NAR-SELFCHECK", "FALSE_GREEN_SELFCHECK"],
      "reverseTarget": "W3",
      "forwardStages": ["W3", "SB"],
      "repairPriority": "P0",
      "authoritativeFields": ["narrativeSelfcheck.passed", "dialoguePlan.lines"]
    },
    {
      "trigger": "design_split_orchestrator",
      "ruleIds": ["DC-01", "NAR-14", "NAR-15"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "designSplitOps"],
      "repairPriority": "P0",
      "presentationFork": ["Confirm 编排", "forwardReentry"],
      "forwardReentry": "designSplitOps.forwardReentry"
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
  "motionWhitelist": ["静止", "缓慢横移", "缓慢变焦", "轻推", "微漂移", "static", "slow pan", "slow zoom", "gentle push", "subtle drift"],
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
      "trigger": "visual_multi_beat",
      "ruleIds": ["DEX-VIS-SPLIT", "VIS-MULTI-BEAT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "MD-IMG"],
      "repairPriority": "P0",
      "defaultAction": "confirmClusterSplit",
      "presentationFork": ["确认拆镜", "艺术长镜头 override"],
      "note": "须手改 Confirm；不进 autoAdapt 可不手改（shadow→enforce 本体 L-Out）"
    },
    {
      "trigger": "visual_tag_missing",
      "ruleIds": ["DEX-VIS-TAG-MISSING"],
      "reverseTarget": "SB",
      "forwardStages": ["W3", "SB"],
      "repairPriority": "P0",
      "presentationFork": ["补 visualBeatTags"]
    },
    {
      "trigger": "visual_tag_inconsistent",
      "ruleIds": ["DEX-VIS-TAG-INCONSISTENT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P1"
    },
    {
      "trigger": "visual_beat_score",
      "ruleIds": ["VIS-BEAT-SCORE"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P1"
    },
    {
      "trigger": "visual_sync_drift",
      "ruleIds": ["VIS-SYNC-DRIFT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P1"
    },
    {
      "trigger": "still_onebeat_multi",
      "ruleIds": ["DEX-STILL-ONEBEAT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["智能拆镜", "改画面描写为一镜一拍"],
      "defaultAction": "confirmClusterSplit",
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": ["preDesignPack.shots[].visualDescription"],
      "note": "正推 DEX-STILL-ONEBEAT ↔ 反推同核 expandStillOneBeat/splitPlan；高置信 auto；低置信 Confirm；禁 soft_patch 顶拆"
    },
    {
      "trigger": "series_continuity_shape",
      "ruleIds": ["SH-SERIES-CONT", "SCHEMA_SHAPE", "SCHEMA_SHAPE_BLOCK", "SH-BRIEF-STRING", "SH-SCENE-AV-TAGS", "SH-MICRO-EXPR"],
      "reverseTarget": "AS",
      "forwardStages": ["AS", "SB"],
      "repairPriority": "P0",
      "presentationFork": ["改 seriesContinuity 为 record", "改 sceneAvTags 为数组", "microExpression 用 eyes/mouthDetail"],
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": [
        "planData.narrativeBrief.seriesContinuity",
        "planData.sceneMeta[].sceneAvTags",
        "preDesignPack.shots[].shotDesign.performance.microExpression"
      ],
      "note": "霜兰令导入：形状 salvage 解锁后仍须写权威形；禁只 regen 静帧"
    },
    {
      "trigger": "design_loss",
      "ruleIds": ["DESIGN-LOSS", "DESIGN-LOSS-DURATION"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["强补可拍描写", "设定可信时长"],
      "forbidRegenWithoutDescFix": true,
      "note": "设计遗失：正式源 salvage 后仍缺 → SB 手补；禁发明正文/默认1s"
    },
    {
      "trigger": "prompt_fidelity",
      "ruleIds": ["PROMPT-FIDELITY"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "forbidRegenWithoutDescFix": true,
      "note": "提示词须覆盖 VD 锚点；禁 freeform 跳过 Shot List"
    },
    {
      "trigger": "dur_desync",
      "ruleIds": ["DUR-DESYNC"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P0",
      "note": "时长只升不降；对齐 shot.duration"
    },
    {
      "trigger": "cam_fit",
      "ruleIds": ["DEX-CAM-FIT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["服务端智能拆（untilClear）", "残留→IRD-CONFIRM"],
      "defaultAction": "runCamFitUntilClear",
      "forbidHandRewriteShotIndex": true,
      "note": "auto→智能拆；Confirm 仅 IRD-CONFIRM；勿诱手改镜号；Chat 下次写权威双镜"
    },
    {
      "trigger": "dialogue_extra",
      "ruleIds": ["DC-01-EXTRA"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P1",
      "note": "台词乱入：删多余或对齐 plan"
    },
    {
      "trigger": "chain_beat",
      "ruleIds": ["CHAIN-BEAT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "note": "拆镜子镜须覆盖父文学锚点"
    },
    {
      "trigger": "aud_orphan",
      "ruleIds": ["AUD-ORPHAN-SPEECH"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P1",
      "note": "无对白剥口播；OS 可压反应镜"
    },
    {
      "trigger": "import_split_sync",
      "ruleIds": ["IMPORT-SPLIT-SYNC"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P0",
      "forbidRegenWithoutDescFix": true,
      "note": "拆后写库失败=愈失败"
    },
    {
      "trigger": "audio_missing",
      "ruleIds": ["CHAT-AUD-01"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P1",
      "note": "有词无声须 seed audioPrompt"
    },
    {
      "trigger": "intent_pic",
      "ruleIds": ["DEX-INTENT-PIC"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": ["preDesignPack.shots[].visualDescription", "shotDesignIntent[].picture"],
      "note": "intent.picture↔VD 同核；修后须 designExit"
    },
    {
      "trigger": "ird_confirm",
      "ruleIds": ["IRD-CONFIRM"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "defaultAction": "confirmClusterSplit",
      "forbidRegenWithoutDescFix": true,
      "note": "低置信 IRD 待 Confirm；禁止假绿"
    },
    {
      "trigger": "dirty_still_prompt",
      "ruleIds": ["DEX-DIRTY-STILL-PROMPT", "DEX-DUP-VD", "DEX-HAND-LIP", "VID-INHERIT-DIRTY-STILL"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "AS", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["改 VD 为一镜一拍", "合并同文镜", "手镜 lip=none", "剥裸 cref/sref"],
      "defaultAction": "handEditVisualDescription",
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": [
        "preDesignPack.shots[].visualDescription",
        "preDesignPack.shots[].generation.imagePrompt",
        "preDesignPack.shots[].shotDesign.lipSyncPolicy"
      ],
      "note": "脏静帧契约：回 SB 改 JSON 字段；深链勿走 INFRA chat_repair 空跳"
    },
    {
      "trigger": "aud_speak_react",
      "ruleIds": ["DEX-CAM-FIT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["服务端智能拆说话镜+反应镜", "残留→IRD-CONFIRM"],
      "defaultAction": "runCamFitUntilClear",
      "forbidHandRewriteShotIndex": true,
      "forbidRegenWithoutDescFix": true,
      "note": "口播+反应同镜：untilClear 自动拆；Confirm 仅低置信；禁手改镜号；修后 designExit"
    },
    {
      "trigger": "still_firstframe_dirty",
      "ruleIds": ["STILL-FIRSTFRAME-DIRTY", "STILL-FIRSTFRAME-STALE", "IMG-CREF-CHAR", "DC-16", "DEX-STILL-ONEBEAT", "DEX-STILL-OS-NAME", "DEX-STILL-FILLER"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "AS", "MD-IMG", "EN"],
      "repairPriority": "P0",
      "presentationFork": ["智能拆镜", "改画面描写为一镜一拍", "重出静照"],
      "defaultAction": "confirmClusterSplit",
      "forbidRegenWithoutDescFix": true,
      "authoritativeFields": ["preDesignPack.shots[].visualDescription", "characterDesign.assets[].name"],
      "note": "多拍/脏首帧：优先智能拆镜（still_onebeat/splitPlan）回写 shots；或手改单拍描写→stale→MD-IMG；禁止只 regen"
    },
    {
      "trigger": "lip_duration_short",
      "ruleIds": ["DFW-DURATION"],
      "reverseTarget": "SB",
      "forwardStages": ["W3", "SB", "EN"],
      "repairPriority": "P0",
      "defaultAction": "soft_patch",
      "note": "仅 canSilentRaise；needsSplit/lipOver 走 pr_lip_duration"
    },
    {
      "trigger": "still_mouth_handoff",
      "ruleIds": ["STILL-MOUTH-HANDOFF", "GEN-01"],
      "reverseTarget": "EN",
      "forwardStages": ["SB", "EN", "MD-VID"],
      "repairPriority": "P1",
      "defaultAction": "soft_patch"
    },
    {
      "trigger": "qp02_visual_short",
      "ruleIds": ["QP-02", "CHAT-SB-01", "DEX-QP-02"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["补可拍画面描写"],
      "authoritativeFields": ["preDesignPack.shots[].visualDescription", "shotDesign.picture"],
      "note": "minChars 为防空壳底线；正式标准为可拍物象。禁止只改 audit。"
    },
    {
      "trigger": "cast_on_desc_missing",
      "ruleIds": ["DEX-CAST-ON-DESC"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["补 charCodes", "改描写去名"],
      "authoritativeFields": ["preDesignPack.shots[].charCodes", "preDesignPack.shots[].visualDescription"],
      "forbidRegenWithoutDescFix": true
    },
    {
      "trigger": "empty_shot_conflict",
      "ruleIds": ["DEX-EMPTY-SHOT-CONSISTENCY"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["去掉空镜声明", "去掉人名/出脸"],
      "authoritativeFields": ["preDesignPack.shots[].visualDescription", "preDesignPack.shots[].charCodes"],
      "forbidRegenWithoutDescFix": true
    },
    {
      "trigger": "expr_speak_missing",
      "ruleIds": ["DEX-EXPR-SPEAK", "GEN-01", "QF-EXPR-01"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "MD-VID"],
      "repairPriority": "P0",
      "presentationFork": ["补 microExpression + lipSyncPolicy"],
      "authoritativeFields": ["preDesignPack.shots[].shotDesign.performance", "preDesignPack.shots[].shotDesign.lipSyncPolicy"]
    },
    {
      "trigger": "asset_cref",
      "ruleIds": ["DEX-ASSET-CREF", "IMG-CREF", "QP-11", "QP-12"],
      "reverseTarget": "AS",
      "forwardStages": ["AS", "SB", "MD-IMG"],
      "repairPriority": "P0",
      "presentationFork": ["补 assetCrefPlan / 定妆图", "烧图前绑定 --cref"],
      "authoritativeFields": ["planData.assetCrefPlan", "characterDesign.assets", "preDesignPack.shots[].charCodes"],
      "note": "设计侧 asset_cref；烧图缺 cref 仍可走 img_cref_missing"
    },
    {
      "trigger": "shot_intent_decay",
      "ruleIds": ["DEX-SHOT-INTENT"],
      "reverseTarget": "W3",
      "forwardStages": ["W3", "designBrief", "SB"],
      "repairPriority": "P0",
      "presentationFork": ["补 shotDesignIntent picture/durationSec/peakId|hookId", "可从 peakLedger 派生"],
      "authoritativeFields": ["planData.shotDesignIntent", "planData.peakLedger", "planData.hookPlan"],
      "note": "INTENT→W3 非 INFRA；服务端可高置信从 peak 自动补"
    },
    {
      "trigger": "no_lip_dialogue",
      "ruleIds": ["NO-LIP-DIALOGUE"],
      "reverseTarget": "EN",
      "forwardStages": ["SB", "EN", "MD-VID"],
      "repairPriority": "P0",
      "presentationFork": ["去掉 no lip sync", "改 lipSyncPolicy 为 dialogue_native/subtle"],
      "authoritativeFields": ["preDesignPack.shots[].shotDesign.lipSyncPolicy", "o_videoTrack.prompt"]
    },
    {
      "trigger": "sfx_unbacked",
      "ruleIds": ["SFX-UNBACKED", "audio_mood"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "MD-VID"],
      "repairPriority": "P1",
      "presentationFork": ["补可交付 audioCue/SFX adapter", "去掉假 sfx:<> 满分"],
      "authoritativeFields": ["preDesignPack.shots[].audioCue", "shotDesignIntent[].sfxIntent"]
    },
    {
      "trigger": "cut01_adjacent",
      "ruleIds": ["DEX-CUT-01", "CUT-01"],
      "reverseTarget": "SB",
      "forwardStages": ["SB"],
      "repairPriority": "P1",
      "presentationFork": ["补转场", "对齐场景"]
    },
    {
      "trigger": "cam_xshot",
      "ruleIds": ["DEX-CAM-XSHOT", "CAM-XSHOT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN"],
      "repairPriority": "P1",
      "presentationFork": ["对齐运镜/转场"]
    },
    {
      "trigger": "svq_motion_fail",
      "ruleIds": ["motion_fidelity", "QC-SVQ"],
      "reverseTarget": "EN",
      "forwardStages": ["EN", "MD-VID"],
      "repairPriority": "P1",
      "defaultAction": "strengthen",
      "presentationFork": ["加强 motion 提示", "重试成片"]
    },
    {
      "trigger": "svq_audio_fail",
      "ruleIds": ["audio_mood"],
      "reverseTarget": "EN",
      "forwardStages": ["EN", "MD-VID"],
      "repairPriority": "P1",
      "presentationFork": ["补 audioCue / ASR 覆盖"]
    },
    {
      "trigger": "runtime_type_error",
      "ruleIds": ["runtime_type_error"],
      "reverseTarget": "INFRA",
      "forwardStages": [],
      "presentationFork": []
    },
    {
      "trigger": "emotion_structure",
      "ruleIds": ["DC-EMO", "E2", "CAM-VARIETY", "svq_cam"],
      "reverseTarget": "EN",
      "forwardStages": ["SB", "EN"],
      "defaultAction": "soft_patch",
      "presentationFork": []
    },
    {
      "trigger": "dialogue_hash_mismatch",
      "ruleIds": [
        "R2",
        "H3",
        "DC-01",
        "DC-13",
        "DEX-DC-ALIGN"
      ],
      "reverseTarget": "SB",
      "forwardStages": [
        "SB",
        "EN",
        "designSplitOps"
      ],
      "presentationFork": [
        "P1改剧本",
        "P2改分镜",
        "Confirm 同步 lineId"
      ],
      "authoritativeFields": [
        "dialoguePlan.lines[].lineId",
        "shots[].narrative.dialogue.lines[].lineId"
      ],
      "forwardReentry": "designSplitOps.forwardReentry"
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
      "ruleIds": ["PR-09", "LIP-01", "DEX-LIP-SPLIT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "EN", "W3"],
      "repairPriority": "P0",
      "defaultAction": "confirmClusterSplit",
      "note": "needsSplit|lipOver|overVendor → Confirm 拆镜，勿 soft_patch 抬时"
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
      "trigger": "literary_stale",
      "ruleIds": [
        "DEX-LITERARY-STALE"
      ],
      "reverseTarget": "W1",
      "forwardStages": [
        "W1",
        "W2",
        "W3",
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
        "NAR-15",
        "DEX-LIP-SPLIT"
      ],
      "reverseTarget": "W3",
      "forwardStages": [
        "W3",
        "SB"
      ],
      "authoritativeFields": [
        "dialoguePlan.lines[].splitHint",
        "dialoguePlan.lines[].reactionAction",
        "shots[].narrative.dialogue.lines[].splitHint",
        "shots[].narrative.dialogue.lines[].reactionAction"
      ]
    },
    {
      "trigger": "nar14_split",
      "ruleIds": ["NAR-14", "DEX-LIP-SPLIT"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "designSplitOps"],
      "repairPriority": "P0",
      "defaultAction": "soft_patch",
      "presentationFork": ["Confirm 物理拆行", "补 splitHint"],
      "authoritativeFields": [
        "dialoguePlan.lines[].text",
        "dialoguePlan.lines[].lineId",
        "shots[].narrative.dialogue.lines[].lineId"
      ],
      "forwardReentry": "designSplitOps.forwardReentry"
    },
    {
      "trigger": "nar14_residual",
      "ruleIds": ["NAR-14", "NAR-14-RESIDUAL"],
      "reverseTarget": "W3",
      "forwardStages": ["W3", "SB", "designSplitOps"],
      "repairPriority": "P0",
      "presentationFork": ["改短重设计", "Confirm拆镜B", "显式补splitHint"],
      "authoritativeFields": [
        "dialoguePlan.lines[].text",
        "dialoguePlan.lines[].splitHint",
        "shots[].narrative.dialogue.lines[].splitHint"
      ],
      "forwardReentry": "designSplitOps.forwardReentry",
      "notes": "A拆后仍超预算无标点；禁只改 narrativeSelfcheck.passed"
    },
    {
      "trigger": "nar15_reaction",
      "ruleIds": ["NAR-15"],
      "reverseTarget": "W3",
      "forwardStages": ["W3", "SB"],
      "repairPriority": "P0",
      "presentationFork": ["补 reactionAction"],
      "authoritativeFields": [
        "dialoguePlan.lines[].functions",
        "dialoguePlan.lines[].reactionAction",
        "shots[].narrative.dialogue.lines[].reactionAction"
      ],
      "forwardReentry": "designSplitOps.forwardReentry"
    },
    {
      "trigger": "dc16_cast",
      "ruleIds": ["DC-16", "DG-CD-COVERAGE", "DEX-CAST-CODES"],
      "reverseTarget": "CD",
      "forwardStages": ["CD", "SB"],
      "repairPriority": "P0",
      "authoritativeFields": ["characterDesign.assets[].code", "characterDesign.assets[].name", "characterDesign.assets[].L0.identity"]
    },
    {
      "trigger": "speaker_bare",
      "ruleIds": ["DEX-SPEAKER-BARE"],
      "reverseTarget": "SB",
      "forwardStages": ["W3", "SB"],
      "repairPriority": "P0",
      "authoritativeFields": ["dialoguePlan.lines[].speaker", "shots[].narrative.dialogue.lines[].speaker", "lines[].type"]
    },
    {
      "trigger": "self_report_mismatch",
      "ruleIds": ["DG-NAR-SELFCHECK", "FALSE_GREEN_SELFCHECK"],
      "reverseTarget": "W3",
      "forwardStages": ["W3", "SB"],
      "repairPriority": "P0",
      "authoritativeFields": ["narrativeSelfcheck.passed", "dialoguePlan.lines"]
    },
    {
      "trigger": "design_split_orchestrator",
      "ruleIds": ["DC-01", "NAR-14", "NAR-15"],
      "reverseTarget": "SB",
      "forwardStages": ["SB", "designSplitOps"],
      "repairPriority": "P0",
      "presentationFork": ["Confirm 编排", "forwardReentry"],
      "forwardReentry": "designSplitOps.forwardReentry"
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
  "version": "2.0.2",
  "hints": [
    {
      "id": "RH-JSON-INCOMPLETE",
      "ruleId": "JSON_INCOMPLETE",
      "checkIds": ["JSON_INCOMPLETE"],
      "symptom": "Bundle JSON 截断或不完整",
      "action": "重出可 parse 的完整根对象",
      "chatTemplate": "【JSON_INCOMPLETE】Bundle JSON 截断/中段损坏，禁止瞎补。请重出完整可 JSON.parse 的根对象（含顶层 preDesignPack/characterDesign/designBrief）。勿当作 DG-EMPTY「无分镜」。大包须根 `}` 闭合自检。"
    },
    {
      "id": "RH-HOIST-NEST",
      "ruleId": "NESTED_PACK_ONLY",
      "checkIds": ["NESTED_PACK_ONLY", "SH-HOIST-PDP", "SH-HOIST-CD", "SH-HOIST-CONFLICT"],
      "symptom": "包装字段只写在 planData 内",
      "action": "下次导出写 Bundle 根；冲突时人工确认顶层",
      "chatTemplate": "【结构】preDesignPack/characterDesign/designBrief 须在 Bundle 根。服务器可 SH-HOIST 提升假空集；双源冲突（顶层少镜、嵌套多镜）不静默覆盖。假空集已 salvage 后只改剩余真闸（如 NAR-14），勿整包重写。"
    },
    {
      "id": "RH-SERIES-CONT",
      "ruleId": "SH-SERIES-CONT",
      "checkIds": ["SH-SERIES-CONT", "SCHEMA_SHAPE", "SCHEMA_SHAPE_BLOCK"],
      "symptom": "seriesContinuity 写成散文 string，Zod 期望 record",
      "action": "写成 { ep1Summary, carryInfoIds? }；导入可 SH-SERIES-CONT 默愈",
      "chatTemplate": "【SH-SERIES-CONT】planData.narrativeBrief.seriesContinuity 须为对象，例如 {\"ep1Summary\":\"…\",\"carryInfoIds\":[\"INF-01\"]}。禁止整段散文 string。服务器可自动 string→record，下次请写权威形。sceneAvTags 用数组；microExpression 用 {eyes,mouthDetail}（多角色可 byName）。"
    },
    {
      "id": "RH-QP-01",
      "qpId": "QP-01",
      "symptom": "场数过少",
      "action": "在 W3 补场",
      "chatTemplate": "请增加场次，确保每集场数满足最低要求。"
    },
    {
      "id": "RH-QP-02",
      "qpId": "QP-02",
      "symptom": "画面描述空泛或过短",
      "action": "重写 SB 画面描述；若为拆镜子镜自伤则 Confirm/重切而非整包重写",
      "chatTemplate": "【QP-02·可拍描写】visualDescription 须非空、≥minChars、禁抽象无物象、禁「听者反应特写」等占位。若 evidence 含 healInduced / 拆镜子镜 / IRD·lip 自愈：勿当文学空洞整包重写——应 Confirm 拆镜或从父 VD 重切反应镜。真短 VD：shotDesign.picture/composition 溯源或手改 SB。深链：toonflow://stage/SB?trigger=qp02_visual_short。",
      "checkIds": [
        "QP-02",
        "CHAT-SB-01",
        "DEX-QP-02",
        "too_short",
        "healInduced"
      ],
      "ruleId": "QP-02"
    },
    {
      "id": "RH-QP-02-HEAL",
      "qpId": "QP-02",
      "ruleId": "QP-02-HEAL-INDUCED",
      "checkIds": ["QP-02", "healInduced", "IRD-PLACEHOLDER"],
      "symptom": "拆镜/IRD 自愈写出短占位 VD",
      "action": "服务端应重切或 Confirm；勿当空洞文学整包重写",
      "chatTemplate": "【QP-02·自愈自伤】该镜过短很可能是 speak/react·lip 拆镜占位（如听者反应特写）。请 Confirm 智能拆或从父镜 VD 切片补足锚点；禁止只改 audit / 整集重设计。"
    },
    {
      "id": "RH-QP-03",
      "qpId": "QP-03",
      "ruleId": "R2",
      "checkIds": [
        "DC-01",
        "H3",
        "R2"
      ],
      "symptom": "台词与源不一致",
      "action": "逐句对齐 W3 剧本到 SB.lines",
      "chatTemplate": "请对照剧本原文，修正分镜台词，禁止删改字词。"
    },
    {
      "id": "RH-LANG-01",
      "ruleId": "LANG-01",
      "checkIds": [
        "LANG-01",
        "LANG-AUD-01"
      ],
      "symptom": "中文台词被英译进 VID/AUD",
      "action": "用 SB 源语言台词回填 videoPrompt [Audio] 段",
      "chatTemplate": "请将 videoPrompt/audioPrompt 中的英译对白改回剧本源语言原句，运镜壳可保留英文，台词禁止翻译。"
    },
    {
      "id": "RH-FX-01",
      "ruleId": "FX-GRADE-01",
      "checkIds": [
        "FX-GRADE-01",
        "DG-FALSE-GREEN-FX",
        "DG-MODALITY-MISMATCH",
        "INT-FX-EMPTY"
      ],
      "symptom": "FX 空未声明或高难不可行",
      "action": "无特效镜声明 F0；有特效补 fxPrompt；F4/F5 降级或拆镜",
      "chatTemplate": "【FX/CAM 同文案】无特效镜头请在 fxFeasibilityAudit/镜级声明 level:F0，不要写 modalityPromptAudit.FX=pass 却留空 fxPrompt。有特效才写 fxPrompt；F4/F5 请降级或拆镜，禁止占位特效文案。台词镜运镜须 static（CAM-SPEAK 同策）。"
    },
    {
      "id": "RH-CAM-SPEAK",
      "ruleId": "CAM-SPEAK",
      "checkIds": [
        "CAM-SPEAK",
        "cam_speak"
      ],
      "symptom": "台词镜运镜非 static",
      "action": "Speak→static",
      "chatTemplate": "【FX/CAM 同文案】台词镜运镜须 static（CAM-SPEAK）；无特效镜声明 F0，禁止假绿 audit。reverseTarget=SB。"
    },
    {
      "id": "RH-QP-04",
      "qpId": "QP-04",
      "symptom": "对白密度异常",
      "action": "调整 SB 台词密度",
      "chatTemplate": "请调整对白密度：台词镜保持一句一镜，旁白镜减少对白。"
    },
    {
      "id": "RH-QP-05",
      "qpId": "QP-05",
      "symptom": "角色称谓混乱",
      "action": "统一 W3 角色称谓",
      "chatTemplate": "请统一剧本中的角色称谓，与 globalAnchors 一致。"
    },
    {
      "id": "RH-QP-06",
      "qpId": "QP-06",
      "symptom": "情绪单调",
      "action": "补 GB 情绪曲线",
      "chatTemplate": "请在全局 Brief 中补充情绪起伏与峰值场。"
    },
    {
      "id": "RH-QP-07",
      "qpId": "QP-07",
      "symptom": "钩子不足",
      "action": "强化 W1 开场钩子",
      "chatTemplate": "请加强开场 30 秒内的视觉或情感钩子。"
    },
    {
      "id": "RH-QP-08",
      "qpId": "QP-08",
      "symptom": "张力不足",
      "action": "升级 W2 冲突",
      "chatTemplate": "请在对峙场增加 stakes 升级与阻碍。"
    },
    {
      "id": "RH-QP-09",
      "qpId": "QP-09",
      "symptom": "吸引力弱",
      "action": "重写 W3 低吸引力场",
      "chatTemplate": "请重写吸引力不足的场次，增加悬念或情感峰值。"
    },
    {
      "id": "RH-QP-10",
      "qpId": "QP-10",
      "checkIds": [
        "DC-13"
      ],
      "symptom": "信息链断裂",
      "action": "补 designBrief 信息链",
      "chatTemplate": "请在 designBrief 中补全因果链与伏笔承接；若为台词链断裂请对照剧本补全 SB 台词。"
    },
    {
      "id": "RH-QP-11",
      "qpId": "QP-11",
      "symptom": "资产引用缺失",
      "action": "补 AS 资产绑定",
      "chatTemplate": "请为角色/场景补全资产引用与 cref 绑定。"
    },
    {
      "id": "RH-QP-12",
      "qpId": "QP-12",
      "symptom": "cref 未绑定",
      "action": "绑定 EN cref",
      "chatTemplate": "请在 EN-IMG 中绑定角色 cref 与场景资产。"
    },
    {
      "id": "RH-QP-13",
      "qpId": "QP-13",
      "symptom": "跨镜色温跳变",
      "action": "统一 SB 色温",
      "chatTemplate": "请统一相邻镜头的色温与光线描述。"
    },
    {
      "id": "RH-QP-14",
      "qpId": "QP-14",
      "ruleId": "PR-CAM-01",
      "symptom": "运镜不可执行",
      "action": "改用运镜白名单重编译 EN-VID",
      "chatTemplate": "请将运镜改为 slow pan / gentle push 等白名单词。"
    },
    {
      "id": "RH-QP-15",
      "qpId": "QP-15",
      "symptom": "时长与台词不匹配",
      "action": "对齐 SB 时长与台词",
      "chatTemplate": "请调整镜时长或拆分台词，使口型时长可执行。"
    },
    {
      "id": "RH-PR-09",
      "ruleId": "LIP-01",
      "checkIds": [
        "LIP-01",
        "PR-09",
        "DEX-LIP-SPLIT"
      ],
      "symptom": "镜时长/多句同镜口型冲突",
      "action": "needsSplit|lipOver→Confirm拆镜；仅canSilentRaise→设计侧抬时（导入仅兜底）",
      "chatTemplate": "【LIP双轨】①多句同镜/超厂商上限：须 Confirm 设计拆分（confirmClusterSplit|forwardReentry），禁止只写 prose hint / 禁止把 reactionAction 当 splitHint。②仅时长偏短且可无感抬时：设计侧调 duration（autoClose/export 会抬）；导入仅历史残留兜底，不得以「导入一键完善」替代设计出口。深链：toonflow://stage/SB?trigger=pr_lip_duration"
    },
    {
      "id": "RH-LIP-MULTI",
      "ruleId": "LIP-01",
      "checkIds": [
        "multi_line_one_shot",
        "lip_over_vendor"
      ],
      "symptom": "多句同镜或超 vendor",
      "action": "Confirm Orchestrator 拆镜",
      "chatTemplate": "【LIP·多拍】reasons 含 multi_line_one_shot / lip_over_vendor：须手改 Confirm 拆镜，不可只靠抬 duration。"
    },
    {
      "id": "RH-VIS-SPLIT",
      "ruleId": "DEX-VIS-SPLIT",
      "checkIds": [
        "DEX-VIS-SPLIT",
        "VIS-MULTI-BEAT",
        "vis_multi_beat"
      ],
      "symptom": "visualBeatTags×景别冲突须拆镜",
      "action": "高置信可 auto 拆镜；低置信 Confirm 或艺术 override；非可不手改静默立法",
      "chatTemplate": "【VisBeat】DEX-VIS-SPLIT / VIS-MULTI-BEAT：高置信 exit/import 可 auto expand；低置信须 Confirm（VisBeatConfirmBar / confirmClusterSplit）或艺术长镜头 override。禁止 suggestor 静默立法。深链：toonflow://stage/SB?trigger=visual_multi_beat。修后 forwardReentry。"
    },
    {
      "id": "RH-STILL-FIRSTFRAME",
      "ruleId": "STILL-FIRSTFRAME-DIRTY",
      "checkIds": [
        "STILL-FIRSTFRAME-DIRTY",
        "STILL-FIRSTFRAME-STALE",
        "DEX-STILL-ONEBEAT",
        "DEX-STILL-OS-NAME",
        "DEX-STILL-FILLER",
        "still_firstframe_dirty"
      ],
      "symptom": "静照假双脸/OS名/描写已变却烧旧图",
      "action": "智能拆镜（splitPlan/still_onebeat）或改单拍描写→stale→MD-IMG；禁止只regen",
      "chatTemplate": "【静帧Identity·反推】脏首帧/DEX-STILL-ONEBEAT：①优先智能拆镜（一镜一拍；簪刺样本→prop_insert渗血 / reaction浅笑 / reveal匕首）；②或手改 visualDescription 为单拍裸名；③改后旧静照作废再 MD-IMG。禁止只 regen。高置信 exit 可 auto apply；低置信 Confirm。深链：toonflow://stage/SB?trigger=still_firstframe_dirty"
    },
    {
      "id": "RH-QP-16",
      "qpId": "QP-16",
      "symptom": "模态 slot 缺失",
      "action": "补 EN 模态 slot",
      "chatTemplate": "请补全 EN 四模态 slot（IMG/VID/AUD/FX）。"
    },
    {
      "id": "RH-QP-17",
      "qpId": "QP-17",
      "symptom": "FX 词不可实现",
      "action": "降级 SB FX 描述",
      "chatTemplate": "请将 FX 改为 F2 可执行描述或拆镜后期处理。"
    },
    {
      "id": "RH-QP-18",
      "qpId": "QP-18",
      "symptom": "identity 冲突",
      "action": "重编译 EN 身份词",
      "chatTemplate": "请统一 IMG/VID/AUD 性别与身份词，与 BP L0 一致。"
    },
    {
      "id": "RH-QP-19",
      "qpId": "QP-19",
      "symptom": "debut 缺 establishing",
      "action": "补 SB establishing 镜",
      "chatTemplate": "请为首登场角色/场景补 establishing 全景镜。"
    },
    {
      "id": "RH-QP-20",
      "qpId": "QP-20",
      "symptom": "跨集衔接弱",
      "action": "补 W3 集间衔接",
      "chatTemplate": "请在上集结尾与本集开场补 continuity 承接。"
    },
    {
      "id": "RH-W93",
      "ruleId": "W93",
      "symptom": "爆点不够",
      "action": "增情绪峰值场",
      "chatTemplate": "建议在 W3 或 SB 增加对峙升级场。"
    },
    {
      "id": "RH-AG-GATE-01",
      "ruleId": "AG-GATE-01",
      "symptom": "缺首位帧",
      "action": "生成首帧分镜图",
      "chatTemplate": "请先生成分镜参考图再写 MD-VID singleImage。"
    },
    {
      "id": "RH-identity",
      "ruleId": "identity_mismatch",
      "symptom": "跨模态性别冲突",
      "action": "重编译 EN 全模态",
      "chatTemplate": "请统一 IMG/VID/AUD 性别词与 BP L0。"
    },
    {
      "id": "RH-RET-01",
      "ruleId": "RET-01",
      "symptom": "ep1 缺开场钩子",
      "action": "补 W3 ep1 opening5s/opening3to10s",
      "chatTemplate": "请在 ep1 第一场结构化 opening5s 钩子（困境/反差/情感暴击三选一）。"
    },
    {
      "id": "RH-NAR-05",
      "ruleId": "NAR-05",
      "symptom": "台词无动作因果",
      "action": "补 causedByActionId",
      "chatTemplate": "请为台词标注 causedByActionId，遵循动作是因、对话是果。"
    },
    {
      "id": "RH-PKG-03",
      "ruleId": "PKG-03",
      "symptom": "debut 缺 copyHint",
      "action": "补 debutIntroPack",
      "chatTemplate": "请为首登场角色补 copyHint 与 establishingPattern。"
    },
    {
      "id": "RH-GEN-05",
      "ruleId": "GEN-05",
      "symptom": "设计未进 prompt",
      "action": "对齐 shotDesign 与 imagePrompt",
      "chatTemplate": "请将 shotDesign/visualDescription 编译进 imagePrompt。"
    },
    {
      "id": "RH-ADP-D01",
      "ruleId": "ADP-D01",
      "symptom": "深度改编未落地",
      "action": "补 nameMap",
      "chatTemplate": "请在 adaptationMatrixStructured.deepAdaptation 补全 nameMap，格式仅允许 [{ \"from\": \"原名\", \"to\": \"新名\" }]，禁止 null、禁止用「原→新」作 object key。"
    },
    {
      "id": "RH-DSG-B14",
      "ruleId": "DSG-B14",
      "symptom": "付费点未进设计",
      "action": "补 designBrief B14",
      "chatTemplate": "请将 paypointSchedule 镜像到 designBrief B14 paypointMarkers。"
    },
    {
      "id": "RH-VIR-01",
      "ruleId": "VIR-01",
      "symptom": "投流点不足",
      "action": "补 clipPoints30s",
      "chatTemplate": "请在前10集标注至少10个 clip30sCandidate 投流爆点。"
    },
    {
      "id": "RH-NAR-14",
      "ruleId": "NAR-14",
      "checkIds": [
        "NAR-14",
        "nar14_long_line",
        "nar14_split"
      ],
      "symptom": "长台词未物理拆行/无 splitHint",
      "action": "auto 先跑 clause-split+Orchestrator；不可愈再 RH",
      "chatTemplate": "【NAR-14·双轨真】导入/Confirm 时服务器必跑 expandLinesByClauseSplit（标点拆行），再 mirror+补缺 lineId。可愈路径：POST designSplitOps confirmClusterSplit 或 forwardReentry，勿只改 narrativeSelfcheck.passed。不可物理拆时须人工补 splitHint=\"reaction_shot\"（plan+shots 同 lineId）。权威字段：dialoguePlan.lines[].text|lineId|splitHint 与 shots[].narrative.dialogue.lines[]。reverseTarget=SB。"
    },
    {
      "id": "RH-NAR-14-RESIDUAL",
      "ruleId": "NAR-14",
      "checkIds": [
        "NAR-14",
        "nar14_residual",
        "NAR-14-RESIDUAL"
      ],
      "symptom": "A拆后残句仍超15字无标点",
      "action": "须手改：改短重设计 | Confirm B拆镜 | 显式 splitHint；Confirm/forceExpand 才可 B；ingest 只诊不拆（真实反应镜可绑 hint，禁静默发明）",
      "chatTemplate": "【NAR-14·残句】clause-split 后仍超预算且无停顿标点。完整闭环：①改短/重写(W3)；②Confirm/导入 B 拆镜后才可绑 splitHint=reaction_shot；③禁止只改 passed。深链：toonflow://stage/W3?trigger=nar14_residual。修后 forwardReentry。"
    },
    {
      "id": "RH-LITERARY-STALE",
      "ruleId": "DEX-LITERARY-STALE",
      "checkIds": ["DEX-LITERARY-STALE", "literary_stale"],
      "symptom": "公式已更换仍用旧稿出站",
      "action": "按新规范重设计；或 acknowledgeKeepLegacy 保留旧稿补洞",
      "chatTemplate": "【须重设计】公式已更换。请按新规范重走设计（入口 W1 → 验收 W3 redesignPass：NAR-15/intent 等同核），勿只改旧字段或只点 W1。选项：A 按新规范重设计（推荐） / B 保留旧稿继续补洞（须 acknowledgeKeepLegacy）。entry=W1；accept=W3。"
    },
    {
      "id": "RH-FALSE_GREEN",
      "ruleId": "FALSE_GREEN_SELFCHECK",
      "checkIds": ["FALSE_GREEN_SELFCHECK", "DG-NAR-SELFCHECK", "self_report_mismatch"],
      "symptom": "narrativeSelfcheck.passed 与服务器 NAR 不一致",
      "action": "按 redesignPass 写齐 reactionAction/拆句；禁止只改 passed",
      "chatTemplate": "【假绿·须重设计验核】自报 passed 但服务器检出 NAR-14/15 等。须回 W3 同写 reactionAction/改短；禁止只改 narrativeSelfcheck.passed。reverseTarget=W3。"
    },
    {
      "id": "RH-NAR-15",
      "ruleId": "NAR-15",
      "checkIds": [
        "NAR-15",
        "nar15_reaction"
      ],
      "symptom": "emotion_hit 无反应Action",
      "action": "W3 补 dialoguePlan.reactionAction；shots 权威双镜 speak 无 RA",
      "chatTemplate": "【NAR-15·双轨】①权威：dialoguePlan.lines[] 含 emotion_hit 须写 reactionAction（听者可见反应）；W3 打标带齐，禁止只标 functions。②shots：已拆则说话镜禁止带 reactionAction（+反应镜）；未拆同镜 onCam+RA→DEX-CAM-FIT。勿为过闸往 speak 镜回写 RA。修后 forwardReentry。reverseTarget=W3/SB。"
    },
    {
      "id": "RH-DC-16",
      "ruleId": "DC-16",
      "checkIds": [
        "DC-16",
        "DG-CD-COVERAGE",
        "dc16_cast",
        "INT-CHAR-ORPHAN"
      ],
      "symptom": "说话人未入 CD / APP 伪角色",
      "action": "CD 入册；APP/UI 改 type 非 speaker；假 orphan 勿建角色",
      "chatTemplate": "【DC-16】真缺口：说话人/上镜码须入 characterDesign.assets（code/name/L0.identity），禁止仅 L0.stub。APP/UI/系统 不可作 speaker。并写入 designBrief.B6.characters 与 visualLockTable.characterAssets。\n【假 orphan】若标签含 CHAR-ORPH / 动词粘连假名（如「沈清漪紧」「视谢玄辞」），勿为描写切碎名建角色——导入会 auto_adapt 剥离；勿整集重设计。reverseTarget=CD（仅真缺口）。修复后重新 exportGate。"
    },
    {
      "id": "RH-DESIGN-LOSS",
      "ruleId": "DESIGN-LOSS",
      "checkIds": ["DESIGN-LOSS", "DESIGN-LOSS-DURATION", "design_loss"],
      "symptom": "镜级设计遗失（VD/时长等）且无正式源",
      "action": "SB 强补可拍 visualDescription / duration；禁发明正文瞎补",
      "chatTemplate": "【DESIGN-LOSS】设计字段遗失。仅可从 plan/父镜 stash 等正式源 salvage；无源须在 SB 手写可拍 visualDescription 与可信 duration。禁止默认 1s、禁止 trim 假绿。reverseTarget=SB。修后 designExit→再 exportGate。"
    },
    {
      "id": "RH-DUR-DESYNC",
      "ruleId": "DUR-DESYNC",
      "checkIds": ["DUR-DESYNC"],
      "symptom": "烧片/提示时长低于 shot.duration",
      "action": "对齐 shot.duration；厂商桶只升不降",
      "chatTemplate": "【DUR-DESYNC】shot.duration 为权威下限；prompt/API 不得降到更短（如 2→1）。可接受厂商升档并可见。reverseTarget=SB。修后重烧。"
    },
    {
      "id": "RH-PROMPT-FIDELITY",
      "ruleId": "PROMPT-FIDELITY",
      "checkIds": ["PROMPT-FIDELITY"],
      "symptom": "image/video 提示词未覆盖设计锚点",
      "action": "改 VD 或重编译提示词，禁 freeform 跳过 Shot List",
      "chatTemplate": "【PROMPT-FIDELITY】提示词须覆盖 visualDescription 锚点。回 SB 改描写或重跑 compose/finalize，禁止另编故事。reverseTarget=SB。"
    },
    {
      "id": "RH-DEX-CAM-FIT",
      "ruleId": "DEX-CAM-FIT",
      "checkIds": ["DEX-CAM-FIT", "cam_split"],
      "symptom": "景别×运镜×可拍物冲突或口播+反应同镜未拆",
      "action": "服务端 untilClear 智能拆；Chat 下次写权威双镜；低置信 Confirm",
      "chatTemplate": "【DEX-CAM-FIT·双轨】①下次权威形：dialoguePlan 可写 reactionAction（NAR-15）；shots 须已是说话镜（无 reactionAction）+反应镜两镜，禁同镜口播+反应、禁「听者反应特写」。②本包：服务端 untilClear/智能拆愈；勿手改镜号/勿当 Confirm 手拆已愈项。残留低置信→IRD-CONFIRM。reverseTarget=SB。"
    },
    {
      "id": "RH-DC-01-EXTRA",
      "ruleId": "DC-01-EXTRA",
      "checkIds": ["DC-01-EXTRA"],
      "symptom": "shots 台词乱入（不在 script∪plan）",
      "action": "删多余行或回写 plan/script",
      "chatTemplate": "【DC-01-EXTRA】分镜出现 script∪plan 没有的台词（乱入）。删除或对齐 plan。reverseTarget=SB。"
    },
    {
      "id": "RH-CHAIN-BEAT",
      "ruleId": "CHAIN-BEAT",
      "checkIds": ["CHAIN-BEAT"],
      "symptom": "拆镜子镜未覆盖父文学锚点",
      "action": "补子镜 VD 锚点或重拆",
      "chatTemplate": "【CHAIN-BEAT】拆后子镜须覆盖父文学锚点，否则故事碎裂。回 SB 补描写或 Confirm 重拆。reverseTarget=SB。"
    },
    {
      "id": "RH-AUD-ORPHAN",
      "ruleId": "AUD-ORPHAN-SPEECH",
      "checkIds": ["AUD-ORPHAN-SPEECH", "aud_orphan"],
      "symptom": "无对白镜残留口播/口型文案",
      "action": "sanitize 剥口播或补对白设计；反应镜 OS 可留画外音",
      "chatTemplate": "【AUD-ORPHAN】设计无对白却有 lip/引号口播。执行层会剥成环境音；若需独白请标 OS/VO。reverseTarget=SB。"
    },
    {
      "id": "RH-IMPORT-SPLIT-SYNC",
      "ruleId": "IMPORT-SPLIT-SYNC",
      "checkIds": ["IMPORT-SPLIT-SYNC", "import_split_sync"],
      "symptom": "拆镜后 o_storyboard 写库失败或镜数不一致",
      "action": "重试 syncStoryboard；失败=愈失败，禁止假绿导出",
      "chatTemplate": "【IMPORT-SPLIT-SYNC】拆后 pack↔DB 不同步。重试导入/confirm sync；勿按 index 偷父镜媒体。reverseTarget=SB。"
    },
    {
      "id": "RH-INTENT-PIC",
      "ruleId": "DEX-INTENT-PIC",
      "checkIds": ["DEX-INTENT-PIC", "intent_pic"],
      "symptom": "shotDesignIntent.picture 与 visualDescription 不同核",
      "action": "stillIntentOps apply sync_intent_picture；或手改 VD/picture 对齐",
      "chatTemplate": "【DEX-INTENT-PIC】意图 picture 与镜级 VD 须同核。调用 stillIntentOps.diagnose→apply；修后必须再 designExit→MD-IMG。禁止只 regen。"
    },
    {
      "id": "RH-IRD-CONFIRM",
      "ruleId": "IRD-CONFIRM",
      "checkIds": ["IRD-CONFIRM", "ird_confirm"],
      "symptom": "IRD 低置信补丁未 Confirm",
      "action": "stillIntentOps.apply(force) 或手改后清 confirm",
      "chatTemplate": "【IRD-CONFIRM】智能反推有低置信拆/补丁。点确认 apply 或手改 VD；import≠exit 通过。修后 designExit。"
    },
    {
      "id": "RH-SPEAKER-BARE",
      "ruleId": "DEX-SPEAKER-BARE",
      "checkIds": [
        "DEX-SPEAKER-BARE",
        "speaker_bare"
      ],
      "symptom": "speaker 含 OS/VO 或非人码",
      "action": "裸名 + type 字段",
      "chatTemplate": "【SPEAKER-BARE】speaker 写裸名；OS/VO 放到 type 字段。禁止 APP/UI 作 speaker。reverseTarget=SB。"
    },
    {
      "id": "RH-DESIGN-SPLIT-ORCH",
      "ruleId": "DC-01",
      "checkIds": [
        "DC-01",
        "design_split_orchestrator"
      ],
      "symptom": "拆行后 lineId 未进 shots",
      "action": "Confirm Orchestrator / forwardReentry",
      "chatTemplate": "【编排】clause-split 后须 mirrorAndSyncPlanToShots。请 POST /api/scriptAgent/designSplitOps action=confirmClusterSplit 或 forwardReentry；FE 深链 reverseTarget=SB。权威字段：lineId。"
    },
    {
      "id": "RH-MOD-01",
      "ruleId": "MOD-01",
      "symptom": "fxIntent 未进 SB",
      "action": "补 visualEffect",
      "chatTemplate": "请将 W3 sceneMeta.fxIntent 镜像到 SB：visualEffect 为 string（如 \"F1: 烛火摇曳\"），可选 fxLevel: \"F1\"；禁止 object {level,desc}。"
    },
    {
      "id": "RH-MOD-02",
      "ruleId": "MOD-02",
      "checkIds": [
        "MOD-02",
        "DG-SCENE-ORPHAN-FX"
      ],
      "symptom": "缺 fxPrompt 或孤儿场",
      "action": "判型后补散文或降F0",
      "chatTemplate": "【先判型】若清单含「孤儿场」：不要补其他场的 fxPrompt。请改 planData.narrativeBrief.implementationPlan[sceneRef=N]：删除该项，或 fxIntent.level→F0，或给接场独立 sceneName 并挂镜+散文。若有映射镜缺散文：写 preDesignPack.shots[shotIndex=K].generation.fxPrompt 可执行散文（可从 visualEffect 去 F1: 前缀），禁止字母 F1；无特效则该场/该镜改为 F0。"
    },
    {
      "id": "RH-MOD-02-ORPHAN",
      "ruleId": "MOD-02",
      "checkIds": [
        "MOD-02",
        "DG-SCENE-ORPHAN-FX",
        "DG-SCENE-CARDINALITY"
      ],
      "symptom": "孤儿场无映射镜",
      "action": "删plan或降F0或独立sceneName",
      "chatTemplate": "【孤儿场】implementationPlan 的 sceneRef 无对应唯一 sceneName 映射镜。禁止只给其他场补 fxPrompt。二选一：(1) 删除该 plan/sceneMeta 项或 fxIntent.level→\"F0\"；(2) 接场改用独立 sceneName（如「卧房·后」）并挂镜，有特效再写 generation.fxPrompt。"
    },
    {
      "id": "RH-SCENE-CARD",
      "ruleId": "DG-SCENE-CARDINALITY",
      "checkIds": [
        "DG-SCENE-CARDINALITY"
      ],
      "symptom": "场镜基数不对齐",
      "action": "对齐 plan 与 sceneName",
      "chatTemplate": "【场镜基数】唯一 sceneName 数必须等于 implementationPlan/sceneMeta 条数。接场同地点：要么独立 sceneName，要么合并为一场并删除多余 sceneRef。禁止 script 写场N、SB 共用名、plan 仍留多余 F1。"
    },
    {
      "id": "RH-FX-F0",
      "ruleId": "FX-GRADE-01",
      "checkIds": [
        "FX-GRADE-01",
        "DG-FX-DUAL-TRACK"
      ],
      "symptom": "空FX未声明F0",
      "action": "声明F0",
      "chatTemplate": "镜K 无特效：写 fxFeasibility/fxLevel=\"F0\"，并在 fxFeasibilityAudit.items 增加 {shotIndex:K,level:\"F0\",feasible:true,desc:\"无特效\"}；不要写 fxPrompt，不要只改 modalityPromptAudit.FX=pass。"
    },
    {
      "id": "RH-IMG-CREF",
      "ruleId": "IMG-CREF",
      "checkIds": [
        "IMG-CREF",
        "img_cref_missing"
      ],
      "symptom": "定妆/cref 静照缺失",
      "action": "先 batch_still 再烧视频",
      "chatTemplate": "身份参考图/cref 缺失：请先在资产或分镜跑静照（batch_still），绑定 CHAR-*/SCENE-* 后再烧视频；禁止脏首帧硬烧 singleImage。"
    },
    {
      "id": "RH-MOD-03",
      "ruleId": "MOD-03",
      "symptom": "缺 audioPrompt",
      "action": "补 MD-AUD",
      "chatTemplate": "请将 W3 audioBeat 编译进台词镜 audioPrompt。"
    },
    {
      "id": "RH-MOD-04",
      "ruleId": "MOD-04",
      "symptom": "voiceProfile 冲突",
      "action": "对齐 AUD 音色词",
      "chatTemplate": "请统一 voiceProfile 与 audioPrompt 音色描述。"
    },
    {
      "id": "RH-MOD-05",
      "ruleId": "MOD-05",
      "symptom": "留存镜运镜不符",
      "action": "改 videoPrompt",
      "chatTemplate": "retentionTier 0-2s 镜请用 static + motion-from-frame。"
    },
    {
      "id": "RH-MOD-06",
      "ruleId": "MOD-06",
      "symptom": "开场 FX 过高",
      "action": "补 degradeFixPlan",
      "chatTemplate": "debutIntroPack fxLevel > F2 须写 degradeFixPlan 可拍替代。"
    },
    {
      "id": "RH-MOD-07",
      "ruleId": "MOD-07",
      "checkIds": [
        "MOD-07",
        "DG-MODALITY-MISMATCH"
      ],
      "symptom": "模态 slot 空",
      "action": "补 modalityPromptAudit",
      "chatTemplate": "请补全 T3 四模态 slot（IMG/VID/AUD/FX）。"
    },
    {
      "id": "RH-DG-SCENE",
      "ruleId": "DG-SCENE-KEY",
      "checkIds": [
        "DG-SCENE-KEY",
        "DC-06"
      ],
      "symptom": "场景 key/映射",
      "action": "SCENE-* + SB.sceneName",
      "chatTemplate": "请将 visualLockTable.sceneColorLock 的中文 key 改为 SCENE-* code，并确保 designBrief.B6.scenes 与分镜 sceneName 对齐。"
    },
    {
      "id": "RH-DG-LINK",
      "ruleId": "DG-LINKAGE-FALSE-GREEN",
      "checkIds": [
        "DG-LINKAGE-FALSE-GREEN"
      ],
      "symptom": "资产链假绿",
      "action": "先补 CD 再改 audit",
      "chatTemplate": "禁止自写 linkageAudit.资产=pass。请先按 RH-DC-16 补齐 characterDesign，再重新导出。"
    },
    {
      "id": "RH-DC-AV",
      "ruleId": "DC-04",
      "checkIds": [
        "DC-04",
        "DC-10"
      ],
      "symptom": "视听情绪/AUD 标注",
      "action": "对齐 B4 与 audioCue",
      "chatTemplate": "请对齐 designBrief.B4 与分镜 emotion；高情绪镜建议补 audioCue / B9 或 T3 AUD 标注。"
    },
    {
      "id": "RH-DC-CAM",
      "ruleId": "DC-09",
      "checkIds": [
        "DC-09",
        "PR-CAM-01"
      ],
      "symptom": "运镜/转场越白名单",
      "action": "改用白名单 transition",
      "chatTemplate": "请将 transitionType/rhythmZone 改为运镜白名单内取值（如 soft cut / slow pan）。"
    },
    {
      "id": "RH-ADP-D02",
      "ruleId": "ADP-D02",
      "symptom": "relationMap 空",
      "action": "补 deepAdaptation.relationMap",
      "chatTemplate": "请在 deepAdaptation 补全 relationMap，格式 [{ \"from\", \"to\" }]，禁止 null / arrow-key 伪对象。"
    },
    {
      "id": "RH-ADP-D03",
      "ruleId": "ADP-D03",
      "symptom": "substitutions 空",
      "action": "补 deepAdaptation.substitutions",
      "chatTemplate": "请在 deepAdaptation 补全 substitutions，格式 [{ \"from\", \"to\" }]，禁止 null / arrow-key 伪对象。"
    },
    {
      "id": "RH-ADP-D04",
      "ruleId": "ADP-D04",
      "symptom": "settingProfile 空",
      "action": "补 deepAdaptation.settingProfile",
      "chatTemplate": "请在 deepAdaptation 补全 settingProfile（object）；可选 string 字段无内容时省略 key，禁止写 null。"
    },
    {
      "id": "RH-MODE-RULES",
      "ruleId": "mode_rules_mismatch",
      "symptom": "mode 与模板不一致",
      "action": "按 mode 重载 modelPrompt",
      "chatTemplate": "请按当前文生/单图/首尾帧/多参模式选择正确模板后重生成提示词。"
    },
    {
      "id": "RH-PROMPT-GEN-MEDIA",
      "ruleId": "prompt_gen_media_missing",
      "symptom": "缺分镜或资产",
      "action": "补绑 AS/SB 后重跑",
      "chatTemplate": "请先关联分镜与资产信息列表，再生成视频提示词。"
    },
    {
      "id": "RH-DERIVE-PARENT",
      "ruleId": "derive_parent_ref_missing",
      "symptom": "衍生缺父图",
      "action": "先生成父资产图",
      "chatTemplate": "请先完成父级资产成图，再生成衍生态。"
    },
    {
      "id": "RH-IMG-MODE-REF",
      "ruleId": "image_mode_ref_mismatch",
      "symptom": "参考图数与模式不符",
      "action": "调整 ref 数",
      "chatTemplate": "文生图 0 张、单图 1 张、多参考 ≥2 张，请对齐后重试。"
    },
    {
      "id": "RH-VENDOR-PASS",
      "ruleId": "vendor_passthrough",
      "symptom": "上游队列/限流",
      "action": "稍后重试勿改词",
      "chatTemplate": "供应商繁忙（queue/rate limit），请稍后重试，不要改写提示词。"
    },
    {
      "id": "RH-QF-EXPR-01",
      "ruleId": "QF-EXPR-01",
      "checkIds": [
        "QF-EXPR-01"
      ],
      "symptom": "提示词含改脸",
      "action": "剥离改脸词，微表情落静照",
      "chatTemplate": "【QF-EXPR】请删除改脸/换脸描述；角色脸以定妆为准，微表情写在分镜静照构图，不要在 VID 里重塑五官。"
    },
    {
      "id": "RH-IMG-STILL-QA",
      "ruleId": "IMG-STILL-QA",
      "checkIds": [
        "IMG-STILL-QA"
      ],
      "symptom": "分镜静照弱图",
      "action": "hq_update 再生分镜首帧",
      "chatTemplate": "【IMG-STILL-QA】请用高质量模式更新分镜图（权力位/正脸/9:16 安全区），再烧视频。不要只改 VID 提示词。"
    },
    {
      "id": "RH-CAST-ON-DESC",
      "ruleId": "DEX-CAST-ON-DESC",
      "checkIds": [
        "DEX-CAST-ON-DESC"
      ],
      "symptom": "描写点名未进 charCodes",
      "action": "补码或改描写",
      "chatTemplate": "【CAST-ON-DESC】描写中的角色名须写入 charCodes（CD 唯一映射可导入自动补）。歧义多名拒修。深链：toonflow://stage/SB?trigger=cast_on_desc_missing"
    },
    {
      "id": "RH-EMPTY-SHOT",
      "ruleId": "DEX-EMPTY-SHOT-CONSISTENCY",
      "checkIds": [
        "DEX-EMPTY-SHOT-CONSISTENCY"
      ],
      "symptom": "空镜与人名/出脸冲突",
      "action": "剥空镜声明或去掉人名",
      "chatTemplate": "【EMPTY-SHOT】空镜声明不得与人名/出脸/charCodes 并存。导入仅剥冲突句。深链：toonflow://stage/SB?trigger=empty_shot_conflict"
    },
    {
      "id": "RH-EXPR-SPEAK",
      "ruleId": "DEX-EXPR-SPEAK",
      "checkIds": [
        "DEX-EXPR-SPEAK",
        "GEN-01",
        "QF-EXPR-01"
      ],
      "symptom": "高强度对白缺表演",
      "action": "补 microExpression+lipSyncPolicy",
      "chatTemplate": "【EXPR-SPEAK】高强度对白须 performance.microExpression + lipSyncPolicy；禁止用默认表演假过。深链：toonflow://stage/SB?trigger=expr_speak_missing"
    },
    {
      "id": "RH-CUT-01",
      "ruleId": "DEX-CUT-01",
      "checkIds": [
        "DEX-CUT-01",
        "CUT-01"
      ],
      "symptom": "邻镜硬切场景跳变",
      "action": "补转场或对齐场景",
      "chatTemplate": "【CUT-01】邻镜场景/色温/道具硬切突变（WARN）。勿发明转场文案。深链：toonflow://stage/SB?trigger=cut01_adjacent"
    },
    {
      "id": "RH-CAM-XSHOT",
      "ruleId": "DEX-CAM-XSHOT",
      "checkIds": [
        "DEX-CAM-XSHOT",
        "CAM-XSHOT"
      ],
      "symptom": "邻镜运镜突变",
      "action": "对齐运镜/转场",
      "chatTemplate": "【CAM-XSHOT】邻镜运镜/节奏突变（WARN）。深链：toonflow://stage/SB?trigger=cam_xshot"
    },
    {
      "id": "RH-SVQ-MOTION",
      "ruleId": "motion_fidelity",
      "checkIds": [
        "motion_fidelity",
        "QC-SVQ"
      ],
      "symptom": "成片运镜记分未过",
      "action": "加强 motion 或重试成片",
      "chatTemplate": "【SVQ motion】成片 motion_fidelity 未过或缺测。深链：toonflow://stage/EN?trigger=svq_motion_fail"
    },
    {
      "id": "RH-SVQ-AUDIO",
      "ruleId": "audio_mood",
      "checkIds": [
        "audio_mood"
      ],
      "symptom": "成片听感/ASR 未过",
      "action": "补 audioCue 或 ASR",
      "chatTemplate": "【SVQ audio】audio_mood 未过。深链：toonflow://stage/EN?trigger=svq_audio_fail"
    },
    {
      "id": "RH-ASSET-CREF",
      "ruleId": "DEX-ASSET-CREF",
      "checkIds": ["DEX-ASSET-CREF", "IMG-CREF", "QP-11"],
      "symptom": "出脸镜未完成设计绑，或 AS/生成缺定妆真图（SB 可 stub 延期）",
      "action": "SB：stub+charCodes/assetCrefPlan 过设计闸；AS：出定妆真图后再烧；禁止假 --cref URL",
      "chatTemplate": "【ASSET-CREF·设计/生成分轨】SB 可用 stub+assetCrefPlan 延期配角补图；AS/compose 须本镜带图 CHAR-*。导入不发明假 --cref。缺真图→AS；缺设计绑→SB。深链：toonflow://stage/AS?trigger=asset_cref"
    },
    {
      "id": "RH-DIRTY-STILL",
      "ruleId": "DEX-DIRTY-STILL-PROMPT",
      "checkIds": ["DEX-DIRTY-STILL-PROMPT", "DEX-DUP-VD", "DEX-HAND-LIP", "VID-INHERIT-DIRTY-STILL"],
      "symptom": "手+眼同帧 / 连续同文 VD（有对白也算） / 文学体裸 cref·sref / 手镜口型 / 脏静帧烧视频",
      "action": "回 SB 改一镜一画面（景别/运镜/intent.picture）；真手+脸→VisBeat Confirm 拆（禁同文脸镜）；手镜 lip=none；配方层智能适配≠改设计 VD；超 vendor→Confirm 语义拆或改短",
      "chatTemplate": "【一镜一画面·脏静帧】真手+脸同写=Chat 不过绿，须 SB 改 VD 或 Confirm 拆手/脸（禁同文脸镜、禁导入静默拆）。手 CU 配方不得硬注正脸/权力位正脸/脸型微表情/全员必须出现。配方适配≠回写 visualDescription。importOk≠designExitPass。深链：toonflow://stage/SB?trigger=dirty_still_prompt"
    },
    {
      "id": "RH-DUP-VD",
      "ruleId": "DEX-DUP-VD",
      "checkIds": ["DEX-DUP-VD"],
      "symptom": "连续≥3镜 visualDescription 归一化相同",
      "action": "为每镜写可区分画面/景别/运镜；或 Confirm 语义拆；禁止 clone 父镜同文",
      "chatTemplate": "【DEX-DUP-VD】同文连镜不是设计。请改 VD/景别/运镜或 VisBeat Confirm 语义拆；导入不会替你编造画面。深链：toonflow://stage/SB?trigger=dirty_still_prompt&rule=DEX-DUP-VD"
    },
    {
      "id": "RH-NO-LIP-DIALOGUE",
      "ruleId": "NO-LIP-DIALOGUE",
      "checkIds": ["NO-LIP-DIALOGUE"],
      "symptom": "出镜对白镜含 no lip sync",
      "action": "去掉 no lip；改 lipSyncPolicy；OS/VO 不强制口型",
      "chatTemplate": "【NO-LIP】有出镜对白禁止 no lip sync（OS/VO 可允许；空 policy 自动升 subtle）。深链：toonflow://stage/EN?trigger=no_lip_dialogue"
    },
    {
      "id": "RH-SFX-UNBACKED",
      "ruleId": "SFX-UNBACKED",
      "checkIds": ["SFX-UNBACKED", "audio_mood"],
      "symptom": "sfx:<> 字面无交付",
      "action": "补 audioCue 真源或 adapter；无 adapter≠满分",
      "chatTemplate": "【SFX】字面 sfx:<> 不算交付。深链：toonflow://stage/SB?trigger=sfx_unbacked"
    }
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
