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
