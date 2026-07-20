---
name: MD_modality_VID
description: MD 视频模态 · singleImage + nativeAudio + QF-EXPR
stageId: MD-VID
outputTag: modalityPromptAudit.VID
rulePackVersion: "2.0.1"
---

# MD 视频模态（VID · Agnes 默认）

## slots

motion, camera, duration, lipSync, identity, fx

## CAN / CANNOT

| CAN | CANNOT |
|-----|--------|
| EN compile motion/camera | EN 直接调生成 API |
| singleImage 引用首帧 | 重写面部表情 QF-EXPR-06 |
| generate_audio 与 lines 对齐 | duration 脱离 SB |

## BaseSpec

- V9 duration 与 SB 一致（1–30s）
- QF-VIEW / QF-DUR 运镜词
- 有对白须 lipSync 关键词
- fx 同镜 ≤F3（PR-07）

## Agnes VendorPack

| 项 | 规则 |
|----|------|
| 首位帧 | AG-GATE-01：referenceImage 或分镜图 |
| 运动 | motion-from-frame 白名单 |
| 原生语音 | generate_audio=true + dialogue-native |
| 表情 | QF-EXPR-06 禁改面部 |

## videoAudioPolicy

- `native`（默认）：台词镜 generate_audio=true
- `post`：TTS-dubbing 分离路径

## 正推

```
SB duration/type → EN compile → 分镜图 → MD-VID videoPrompt → singleImage
```

## 反推

| 触发 | 目标 | 优先级 |
|------|------|--------|
| video_first_frame_missing | MD → EN | P0 |
| motion_overflow | EN | P0 |
| native_audio_mismatch | EN | P1 |
| duration_clamp | SB | P0 WARN |

## SD / SF

| ID | 检查 | SF |
|----|------|-----|
| SD-VID-01 | 首帧/referenceImage | MODE-AGNES |
| SD-VID-02 | 运镜白名单 | QF-EXPR |
| SD-VID-03 | duration 1–30 | — |
| SD-VID-04 | lipSync + lines | PR-09 |

## dryRun

PC-09：首帧/时长/运镜 BLOCK。

## 输出

`generation.videoPrompt` + `modalityPromptAudit.VID` + `videoAudioPolicy`

**Bundle 路径**：`preDesignPack.shots[].generation.videoPrompt` 或 `flowData.storyboard[].videoDesc`。标准见 `docs/PROMPT_STANDARD.md` §3。

## 质量链（实现）

编译/烧片走五层：`buildPromptIR` → `sanitizeVideoPrompt` → `applyModeDialect` → `applyVendorPromptPack` → burn gate（BLOCK 带 RH+rePushPlan）。详见 `docs/video-quality-chain.md`。对白源语言进 `[Audio]`；stub videoPrompt 强制 IR 重编译；`motion-from-frame` 全文至多一次。
