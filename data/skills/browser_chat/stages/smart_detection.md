---
name: smart_detection
description: SD-P/M/W/S/R 智能检测模块
rulePackVersion: "2.0.1"
---

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
