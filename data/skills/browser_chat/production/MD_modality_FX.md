---
name: MD_modality_FX
description: MD 特效模态 · F matrix + degrade
stageId: MD-FX
outputTag: modalityPromptAudit.FX
rulePackVersion: "2.0.1"
---

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

## 反推

| 触发 | 目标 |
|------|------|
| fx_infeasible / F5 | W3 / SB |
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

FX 段 + `fxFeasibilityAudit.items` + `modalityPromptAudit.FX`
