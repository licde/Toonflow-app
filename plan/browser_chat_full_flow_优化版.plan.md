---
name: Browser Chat Full Flow 优化版
version: "2.0.1"
codename: browser-chat-optimized
status: planned
canonical: .cursor/plans/browser_chat_full_skill_0b1d04d0.plan.md
supersedes:
  - data/skills/design_flow.bundle.md v1.1
  - data/skills/adaptation_flow.bundle.md
related:
  - plan/规则引擎架构重构_00e6d84c.plan.md
  - plan/设计改版闭环规划_49add52f.plan.md
unified_with:
  - plan/规则引擎架构重构_00e6d84c.plan.md  # 轨1 INT/Touch/ModalityOrch
---

# Browser Chat 全流程 · 优化版 v2.0.1（项目计划索引）

> **双目标**：① Browser Chat 外部 bundle；② **与原 V5 内部规则流程统一闭环**（非两套标准）。  
> 重心：设计→提示词质量走廊。合流点：**import → validate（INT 权威）**。  
> 完整细节：[browser_chat_full_skill_0b1d04d0.plan.md](../.cursor/plans/browser_chat_full_skill_0b1d04d0.plan.md)

## 版本说明

| 项 | 值 |
|----|-----|
| 版本 | **v2.0.0** |
| 代号 | browser-chat-optimized |
| 规则包 | rulePackVersion `2.0.0` |
| 主入口 | `data/skills/browser_full_flow.bundle.md`（生成物） |
| 多文件套件 | `data/skills/browser_chat/` + manifest.json |
| 替代 | design_flow.bundle v1.1、adaptation_flow 骨架 |

## 规则流程 · 三轨统一（非两套标准）

```
规则源（主流程 V5 + 规则层.json + autoFix）  rulePackVersion 2.0.1
    ├── 轨1 内部：scriptAgent → productionAgent → RuleEngine INT → Touch
    ├── 轨2 Chat：browser_full_flow.bundle → SD/SF/QP → ScriptBundle
    └── 轨3 合流：import → validate（权威）→ QualityGate → 生成 → 反馈
```

**铁律**：同一 ruleId · 同一 rollback/rePush 表 · 同一 JSON schema · Chat EXT 不替代 INT。

**统一产物**：`data/fixtures/rule_flow_unified.json`（+ browser/internal 子集）

详见主计划 **§13 统一闭环** + 附录 N（内部缺口 I1-I20 对齐表）。

## 规则流程三轨（原摘要）

## 讨论汇总（已全部纳入）

1. 原创/改编双路径 + 三档 T1/T2/T3
2. planData + designBrief import 落库
3. 257 规则 L1-L4 外部实现 + L5 修复
4. 规则逐项检测附录 E（五维 ruleApplicationReport）
5. 剧本智能检测 SD-P/M/W/S/R + supervision A/B/C/D
6. 智能修复 SF + fixPlan + autoFixLibrary
7. 角色智能设计 CD + L0-L6 + art_skills
8. 资产流水线 AS + assetGapReport
9. 图锚点三层 + 附录 H（cref/sref + H5-4）
10. 设计阶段细化 SB/EN 子阶段 + C3-C6 边界 + T1 BP bootstrap
11. 四模态 MD + H 回滚附录 D
12. browser_chat 多文件套件
13. 规则流程 Browser Chat 版 §11 + rule_flow JSON
14. **六链全闭环逐项边界** 附录 I + linkageRepairPlan + G20-G24
15. **T1 PreDesignPack** GB+SB+lines+hash
16. **设计→提示词质量走廊** 附录 K + linkageAudit + G31-G35
17. **正推/反推双向闭环** 附录 L + rePushPlan + presentationFork + G36-G40

19. **V5×Chat 统一闭环** §13 + 附录 N
20. **制作实现闭环** §14 + 附录 O + G56-G65
21. **四模态触达走廊** §15 + 附录 P/Q + Agnes 默认 + G73-G85 + [BROWSER_CHAT_TUTORIAL.md](../docs/BROWSER_CHAT_TUTORIAL.md)

## 制作实现闭环（摘要 · 回答你的 5 点）

| # | 问题 | 方案 |
|---|------|------|
| 1 | 设计男/图视音女等多端不一致 | **identityAudit** 跨 IMG/VID/AUD BLOCK + rePush EN/BP |
| 2 | 特效设计→prompt→AI 无法实现 | **fxFeasibilityAudit** F0-F5 + degradeFixPlan + 生成 Feedback |
| 3 | 分镜不合理反推重设计 | **PR-01~08** + rePushPlan（非单字段 fix） |
| 4 | 故事因果正反向（非仅台词） | **narrativeCausalityGraph** + 断点反推 W1-W3/SB |
| 5 | 首次出场标准介绍/特效 | **debutIntroPack** establishing 镜 + copyHint + 可选 SUB |

合流：设计走廊 → import → identity+FX+因果复核 → QualityGate → 生成 → Feedback → rePush（§11）。

## 内部原流程缺口 I1-I20（摘要 · 统一补齐）

| 类别 | 代表缺口 | 统一方案 |
|------|----------|----------|
| 规则执行 | INT 仅 ~8 条 | Tier-0 分批 + Chat audit 跟踪 |
| 数据模型 | o_storyboard 缺字段 | EpisodeShot 双层 + preDesignPack import |
| 资产/蓝图 | BP 未建 | CD/AS/BP + o_projectBlueprint |
| 修复 | autoFix 3 条 | fix_templates 内外共用 |
| 触达 | videoDesc 自由文本、无 Gate | EN compile + modalityPromptAudit + Touch L0 |
| 反馈 | 生成失败断层 | GenerationFeedback = rePush 合流 |
| 跨集 | continuity 写回 | Pipeline 结束写回 |
| 智能 | W93 stub | smartDesignProposals + Chat SF-4 |

完整 20 项见主计划 **§13.2**。

## 质量问题 QP（摘要）

| 用户话术 | QP ID | 反推 |
|----------|-------|------|
| 缺少画面/场太少 | QP-01/02 | W3/GB/SB |
| 内容/台词问题 | QP-03~05 | W3/SB |
| 太单调 | QP-06 | GB/SB/brief |
| 钩子不够 | QP-07 | W1/W3 |
| 没张力/不吸引 | QP-08/09 | W2/W3/W93 |
| prompt 不齐/不合规 | modalityPromptAudit | EN/MD |

20 项完整表 + IMG/VID/AUD/FX 槽位见 **§12** 与附录 M。

## 正推 / 反推闭环（摘要）

**正推**：故事→台词→情绪→镜头→构图 → GB/SB → EN（五域 forwardTrace）

**反推**：SD/validate 检出症状 → `reverse_route_table.json` → rePushPlan → 从上游 stage **正向重跑**

| 域 | 典型反推 |
|----|----------|
| 台词不符 | SB 拆镜 或 W3 改引号/语气 |
| 情绪不符 | designBrief / GB / W3 铺垫 |
| 构图难表达 | **presentationFork**：改 W3 △ 或改 SB spatialRelation |
| 镜头智能 | SB 景别/运镜 → GB 场备注 |
| 故事断链 | W3 / W2 / W1 按断裂深度 |

最多 **3 轮** rePush；详见主计划 **§11 正推/反推双向联动闭环**。

```
W3(script) → designBrief(LINK) → GB → SB(shots+lines) → EN(compile) → MD(prompts)
     ↑ 每阶段：SPEC 规范 BLOCK + SD 分析 + SF 修复 + linkageAudit 联动审计 ↑
```

| 阶段 | 必产出 | 严禁 |
|------|--------|------|
| W3 | 文学剧本+台词 | 分镜/prompt |
| designBrief | B11 联动字段 | 镜级/prompt |
| GB | scriptPlan 分场情绪 | 光影/切镜 C3 |
| SB | lines/type/emotion/景别 | compiled prompt |
| EN | Y 映射 compile | API 调用/锚点漂移 |

**四支柱**：SPEC（规范）· LINK（联动）· SD（智能分析）· SF（智能修复）

## T1 前期设计包

**T1 不再只是 script+designBrief**，必须含：
- `preDesignPack.scriptPlan`（GB 分场/情绪/过渡）
- `preDesignPack.shots[]`（**每句台词映射到 `narrative.dialogue.lines`**）
- `externalHashCheck.match=true`（出口前自检）
- `preDesignQuality.overall ≥ B` + supervision ≥ B

**T1 仍不产出**：image/video/audioPrompt（T2 EN / T3 MD）

**import**：有 shots → 落库 o_storyboard，**skip autoDesign SB**

## 六链闭环摘要（T1 修订后）

| 链 | T1 | 关键 |
|----|-----|------|
| 台词 | **✅ shots.lines + hash** | 出口前 externalHashCheck |
| 资产 | extract+hint | T2 + CODE |
| 连贯性 | continuity JSON | resolveContext |
| 视听 | designBrief + **GB场情绪 + SB景别/情绪** | 结构化 |
| 故事 | infoLinkageChain + markers | shots.markers |
| 修复 | SF + linkageRepairPlan | 三重闸门 |

## ScriptBundle v2.0.1 核心字段

```
script, planData, designBrief, ruleAudit
preDesignPack: { scriptPlan, shots[], externalHashCheck, preDesignQuality, sceneCodeMap? }
linkageAudit: { chains[] }
rePushPlan?: []                 // 反推重推 max 3 轮
forwardTrace?: []               // 五域正推 trace
provenance.eventTrace?         // Q17
smartDetection, fixPlan, linkageRepairPlan
visualLockTable, modalityAudit                                              // T2/T3
```

## 实施五波

| Wave | 重点 |
|------|------|
| 1 | P skills + browser_flow_orchestration + rule_flow_browser_chat.json |
| 2 | extract + rule_cards + fix_templates |
| 3 | bundle v2.0 + browser_chat/ 套件（CD/AS/SD/SF/production） |
| 4 | schema + import + autoDesign BP bootstrap + applyAutoFix |
| 5 | audit + **G1-G35** + DESIGN_FLOW_GUIDE |

## 验收摘要

- **G1-G9** 基础 · **G10-G12** SD/SF · **G13-G16** 资产锚点
- **G17-G19** 双轨文档 · **G20-G24** 六链 · **G25-G30** T1 PreDesignPack
- **G36-G40** 正推/反推 · **G41-G50** QP+四模态 prompt
- **Q16-Q20** 扩展字段文档化

## 关键交付物

| 路径 | 说明 |
|------|------|
| `data/skills/browser_full_flow.bundle.md` | 单文件 System Prompt v2.0 |
| `data/skills/browser_chat/` | 多文件套件 |
| `data/fixtures/rule_flow_unified.json` | **V5×Chat 统一流程索引** |
| `data/fixtures/rule_flow_browser_chat.json` | Chat 子集 |
| `data/fixtures/fx_feasibility_matrix.json` | 特效 AI 可实现性矩阵 |
| `data/fixtures/debut_intro_templates.json` | 首次出场介绍模板 |
| `data/fixtures/linkage_chains.json` | 六链节点→stage→ruleId→field |
| `data/skills/_generated/rule_cards.json` | 规则卡片 |
| `data/skills/_generated/fix_templates.json` | autoFixLibrary 提取 |
| `scripts/bundle-browser-full-flow.ts` | bundle 生成器 |
| `scripts/extract-rule-checklists.ts` | 规则/流程 extract |
| `scripts/audit-rule-application.ts` | 规则覆盖审计 |

- **G51-G55** 统一闭环 · **G56-G65** 制作实现（identity/FX/PR/因果/debut）

## 与规则引擎重构计划关系

- **规则引擎重构**：轨1 INT/Touch/ModalityOrchestrator/Validator 分批（I1-I20 中 INT 项）
- **本计划**：轨2 Chat bundle + 轨3 import 契约 + **rule_flow_unified** + EXT/INT 对齐
- **共享**：rulePack 2.0.1、rollback/rePush/QP/modality 槽位、EpisodeShot schema
