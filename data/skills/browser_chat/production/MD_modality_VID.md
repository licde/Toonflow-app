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

- V9 duration 与 SB 一致（1–30s）；高情绪对白须 **emotionHold** 预留（可读进 Camera）
- QF-VIEW / QF-DUR 运镜词；裸秒 `2s,3s` 须收敛为单一 `duration Ns`（quality 单源）
- 有**出镜**对白须 lipSync 关键词；**禁止**显式 `no lip sync` / `lipSyncPolicy=none|silent`（NO-LIP-DIALOGUE → `no_lip_dialogue`）。**OS/VO 不强制口型**；空 policy 自动升 subtle（≠ silent 假阳）
- **Audio XOR**：设计确认无对白时剥孤儿口播（`AUD-ORPHAN-SPEECH`）；有对白须 `audioPrompt`（`CHAT-AUD-01`）
- **PromptFidelity / stale**：视频词须覆盖 VD 锚点（`PROMPT-FIDELITY`→heal 双写 untilClear，非挡烧）；`designContentHash` 漂移 → `VIDEO-PROMPT-STALE` 重编译再 heal_then_burn
- burn 读 policy：`shotDesign` → `narrative` → `shot` →（出镜）默认 subtle
- 静帧闭口 ∩ 强口型（仅出镜）：mouth handoff soft 一次后复检，仍冲突 BLOCK（`still_mouth_handoff`）
- 接触事件 ∩ 静帧无道具：contact handoff **BLOCK**（`still_prop_missing` / `STILL-CONTACT-HANDOFF`）；浅痕≠道具；禁 soft-allow；须重出带道具静照后再烧
- **VIRD（videoIntentOps）**：`DEX-VID-*` / `VID-CONTACT-BEATS` / `VIDEO-PROMPT-STALE` — diagnose→confirm apply→untilClear；`designExitPass ≠ videoPromptReady`；无 Key 时像素维 = unmeasured（≠失败），禁伪装 videoPass
- 镜/倒影描写须 anti-warp（禁 funhouse 变形）
- `sfx:<>` 须有 `audioCue`/intent 真源；无 SfxSynthPort ≠ 音效满分（`sfx_unbacked`）
- fx 同镜 ≤F3（PR-07）

## Agnes VendorPack

| 项 | 规则 |
|----|------|
| 首位帧 | AG-GATE-01：referenceImage 或分镜图；脏静帧禁烧（分流：`still_firstframe_dirty` / `_stale` / `_weak` / `dirty_still_prompt`） |
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
| still_firstframe_dirty | SB → MD-IMG | P0 |
| still_mouth_handoff | EN / SB | P0 |
| still_prop_missing | MD-IMG / SB | P0 |
| still_video_contact_handoff | MD-IMG → EN | P0 |
| no_lip_dialogue | EN | P0 |
| sfx_unbacked | SB | P1 |
| svq_motion_fail（含镜面） | EN | P1 |
| motion_overflow | EN | P0 |
| native_audio_mismatch | EN | P1 |
| duration_clamp / lip_duration_short | SB | P0 WARN |

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

编译/烧片走五层：`buildPromptIR` → `sanitizeVideoPrompt` → `applyModeDialect` → `applyVendorPromptPack` → burn gate（BLOCK 带 RH+rePushPlan）。**lip/时长以 `quality/resolveLipDuration` 单源**（裸秒去重、对白禁 no-lip）。详见 `docs/video-quality-chain.md`。对白源语言进 `[Audio]`；stub videoPrompt 强制 IR 重编译；`motion-from-frame` 全文至多一次。
