---
name: design_av
description: 视听设计 · B4/B9→AUD/VID
stageId: DAV
rulePackVersion: "2.0.1"
---

# 视听设计（av 链）

## 正推

B4 emotionArc → GB.emotionCurve → SB.emotionIntensity → EN.Y9 → MD-AUD.emotion + MD-VID.expr

## 反推

| 触发 | 目标 |
|------|------|
| B4 偏差>2 | designBrief/GB |
| B9 无 AUD 槽 | EN |
| 色温跳变 | SB |

## SD-AV

SD-AV-01 B4↔SB.emotion；SD-AV-02 B9→audioMood

## dryRun DC-04/DC-10
