---
name: production_execution_modality_effects
description: MD 特效模态 · FX 段与可行性
stageId: MD-FX
---

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
