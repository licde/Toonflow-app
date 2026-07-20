---
name: design_av
description: 视听设计 · B4/B9→AUD/VID
stageId: DAV
rulePackVersion: "2.0.1"
---

# 视听设计（av 链）

## 正推

B4 emotionArc → GB.emotionCurve → SB.emotionIntensity → EN.Y9
retentionPlan → B18/B19 → SB.retentionTier + rhythm31545
动作镜 visualAction → 台词镜 causedByActionId（视听因果）
W3 `sceneMeta.avCausality` → designBrief B18/B19 → SB `audioCue` + retentionTier

## W3→SB 承接

| W3 sceneMeta | SB 字段 |
|--------------|---------|
| avCausality.audioBeat | audioCue（可选：无则省略 key，禁止 null） |
| avCausality.visualPeak | visualDescription 峰值词 |
| fxIntent.level | `visualEffect` **string** + 可选 `fxLevel` string（如 `"F1: 描述"` / `"F1"`；禁止 object） |

## 留存视听专章（ep1）

| 窗口 | SB 字段 |
|------|---------|
| 0–2s | retentionTier=0-2s，强视觉冲突镜 |
| 2–10s | opening3to10s 情绪峰值 |
| 5–30s | rhythm31545 + infoId markers |

## 反推

| 触发 | 目标 |
|------|------|
| B4 偏差>2 | designBrief/GB |
| B9 无 AUD 槽 | EN |
| 色温跳变 | SB |

## SD-AV

SD-AV-01 B4↔SB.emotion；SD-AV-02 B9→audioMood

## dryRun DC-04/DC-10
