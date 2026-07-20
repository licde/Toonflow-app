---
name: design_dialogue
description: 台词设计维 · R2/H3/OS/VO 正推反推
stageId: DLG
outputTag: dialogueDesign
rulePackVersion: "2.0.1"
---

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
