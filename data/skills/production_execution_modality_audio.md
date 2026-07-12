---
name: production_execution_modality_audio
description: MD 音频模态 · 台词与音色
stageId: MD-AUD
---

# MD 音频模态

## slots

lines, voiceProfile, emotion, deliveryType, identity

## 规则

- lines 与 SB narrative.dialogue.lines hash 一致（R2/H3）
- voiceProfile 对齐 BP L6.voice.gender
- OS 镜须标注画外音 profile

## 输出

`audioPrompt` + modalityPromptAudit.AUD
