---
name: appendix_N_unified_closure
description: 附录 N · V5×Chat 统一闭环
rulePackVersion: "2.0.1"
---

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
