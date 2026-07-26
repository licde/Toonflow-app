---
name: P0_precheck
description: P0 源材料六维度预检 + 爆款公式/视听爆点钩子抓取（Browser Chat 改编路径入口）
stageId: P0
outputTag: preCheck
rulePackVersion: "2.0.1"
---

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
