---
name: MD_modality_AUD
description: MD 音频模态 · native/TTS 双路径
stageId: MD-AUD
outputTag: modalityPromptAudit.AUD
rulePackVersion: "2.0.1"
---

# MD 音频模态（AUD）

## slots

lines, voiceProfile, emotion, deliveryType, identity

## CAN / CANNOT

| CAN | CANNOT |
|-----|--------|
| 从 SB lines 复制到 AUD slot | 修改 lines 文本 |
| voiceProfile 对齐 BP L6 | OS/VO 混用同一 profile |
| 标注 deliveryType OS/VO | T1 写 audioPrompt |

## BaseSpec

- R2/H3：lines hash 与 W3/SB 一致
- V74 台词字数约束
- PR-10：OS 镜须画外音 profile

## 路径选择（video_audio_policy）

| 路径 | 条件 |
|------|------|
| dialogue-native | Agnes + 台词镜 + generate_audio |
| TTS-dubbing | vendor 不支持 native 或 videoAudioPolicy=post |
| post-bgm | 无台词镜 BGM |

## 正推

```
W3 → SB lines → EN → MD-AUD audioPrompt → audioRoute
```

## 反推

| 触发 | 目标 |
|------|------|
| dialogue_hash_mismatch | SB / W3 |
| identity_mismatch (voice) | EN → BP L6 |
| native_audio_mismatch | EN |
| pr_os_voice | SB |

## SD / SF

| ID | 检查 | SF |
|----|------|-----|
| SD-AUD-01 | lines hash | R2 |
| SD-AUD-02 | voiceProfile vs BP | Y8 |
| SD-AUD-03 | native/post 路径 | — |
| SD-AUD-04 | OS/VO 分型 | PR-10 |

## dryRun

PC-10：台词镜 native/TTS 一致 + voiceProfile BLOCK。

## 输出

`generation.audioPrompt` + `audioRoute` + `modalityPromptAudit.AUD`
