---
name: P0_precheck
description: P0 源材料六维度预检（Browser Chat 改编路径入口）
stageId: P0
outputTag: preCheck
rulePackVersion: "2.0.1"
---

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
