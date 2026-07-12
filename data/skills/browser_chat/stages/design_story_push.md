---
name: design_story_push
description: 故事推进 · B5/markers/graph/FX
stageId: STP
rulePackVersion: "2.0.1"
---

# 故事推进（story 链）

## 正推

W1 → B5 infoLinkage → SB.markers → narrativeCausalityGraph → FX.feasibility

## 反推

| 触发 | 目标 |
|------|------|
| marker 缺失 | W3/SB |
| graph broken | W3 |
| F5 未降级 | W3/SB |

## SD-STP

SD-STP-01 B5↔markers；SD-STP-02 graph edges

## dryRun DC-03/DC-07/DC-15
