---
name: appendix_P_modality_touch_four
description: §15 四模态触达走廊 · BaseSpec + Agnes 默认 + 正推反推总表
rulePackVersion: "2.0.1"
---

# §15 四模态触达走廊（Base + Agnes 默认）

Layer0 **BaseSpec**（主流公用）+ Layer1 **Agnes VendorPack**（默认）+ **Touch L0** 触达前闸门。

## 架构

```
设计走廊(T1-T2) → EN compile → MD 四模态(IMG/VID/AUD/FX) → VendorPack → 审计 → import dryRun → 生成 → generationFeedback
```

## 边界矩阵 CAN / CANNOT

| 模态 | CAN | CANNOT |
|------|-----|--------|
| IMG | MD 写 imagePrompt；BP 写 L0 gender | SB 写 prompt；MD 改 lines |
| VID | EN compile motion；MD 写 videoPrompt | EN 调 API；singleImage 改面部 |
| AUD | MD 写 audioPrompt；SB 写 lines | MD 改 lines 文本 |
| FX | MD 写 fxPrompt；F4 仅基底 | F5 未降级 export |
| 跨模态 | T3 四 slot 齐全 | T1 写四模态 prompt |

## Agnes VendorPack 默认

| 模态 | 叠加 |
|------|------|
| IMG | tag-stack-zh；无 negative 通道 |
| VID | singleImage + motion-from-frame + generate_audio |
| AUD | dialogue-native（台词镜） |
| FX | F≤3 默认可出；F4/F5 降级 |

## AG-GATE 摘要

| ID | 检查 |
|----|------|
| AG-GATE-01 | singleImage 须 referenceImage / 分镜图 |
| AG-GATE-02 | motion 白名单；禁面部重写 QF-EXPR-06 |
| AG-GATE-03 | duration 1–30s |
| AG-GATE-04 | 剥离 @图N / negative 通道 |

## videoAudioPolicy

| 值 | 说明 |
|----|------|
| native | 台词镜 generate_audio=true + dialogue-native（Agnes 默认） |
| post | Vendor 不支持 native → TTS-dubbing / post-bgm |

见 `data/fixtures/video_audio_policy.json`。

## 正推链（每模态）

| 模态 | 正推 |
|------|------|
| IMG | CD→BP→SB→EN→MD-IMG |
| VID | SB→EN→MD-VID→首帧图→singleImage |
| AUD | W3→SB lines→EN→MD-AUD→native/TTS |
| FX | W3→SB visualEffect→EN→MD-FX |

## 反推链 + rePush 优先级

| 优先级 | 域 | 触发 | 先修 | 再修 | 最后 |
|--------|-----|------|------|------|------|
| P0 | VID | 缺首帧/时长/运镜 | MD-VID/EN | IMG | SB |
| P0 | IMG | cref/identity/PURE | MD-IMG/EN | BP | SB |
| P1 | AUD | native/lines/voice 冲突 | MD-AUD/EN | BP L6 | SB |
| P1 | FX | F5/F4 未处理 | MD-FX/SB | W3 | — |
| P2 | 跨模态 | identityAudit 失败 | EN 全模态 | BP/CD | — |
| P3 | 叙事 | PR/graph/linkage | SB/W3 | designBrief | W1 |

见 `data/fixtures/reverse_route_table.json` + `modality_touch_matrix.json`。

## dryRun PC-09~14

| ID | 域 | 规则 |
|----|-----|------|
| PC-09 | VID | 首帧/时长/运镜（Agnes singleImage） |
| PC-10 | AUD | native 或 TTS 路径 + voiceProfile |
| PC-11 | IMG | cref/identity/PURE 词 |
| PC-12 | FX | 无 F5；F4 有 postProductionOnly |
| PC-13 | 跨模态 | T3 四 slot 齐全 |
| PC-14 | 跨模态 | identityAudit IMG/VID/AUD 一致 |

与 PC-01~08（§14）合流，exportGate 见 `production_closure_checklist.json`。

## SD / SF 挂载

| SD | 域 |
|----|-----|
| SD-IMG-01~02 | cref、PURE 词 |
| SD-VID-01~04 | 首帧、运镜、时长、lipSync |
| SD-AUD-01~04 | lines hash、voice、路径、OS/VO |
| SD-FX-01~03 | F 等级、与 VID 复杂度 |

见 `stages/smart_detection_modality.md`。

## Vendor 切换（§15.7）

切换 kling/wan 等：**仅换 VendorPack**，Base 规则 ID（V1–V10、QF-EXPR、PR-*）不变。Chat export 标注 `defaultVendor`。

## MediaProbe 预留（§15.8）

生成后 ffprobe 检 duration/audio 轨 → generationFeedback 二次路由。接口：`MediaProbePort`（`probeDuration` / `probeHasAudio`）。

## §15.9 七维 × 四模态合流

设计七维正推在 T1 止于 SB；T2/T3 经 EN 编译进入四模态。反推时**先模态后设计**：

| 七维 | IMG | VID | AUD | FX |
|------|-----|-----|-----|-----|
| 台词 | — | lipSync | lines hash | — |
| 场景 | scene lock | 首帧场景 | 环境音 | 场景基底 |
| 故事 | markers 视觉化 | 钩子镜 | VO/OS | F 等级 |
| 运镜 | — | motion 白名单 | — | — |
| 视听 | emotion tag | expr/motion | emotion BGM | 氛围 |
| 改编 | — | — | — | — |
| 编译 | imagePrompt | videoPrompt | audioPrompt | fxPrompt |

合流 dryRun：`unified_closure_matrix.json`（DC+PC+GC+IC）。见附录 T/U/V/W。

## 验收 G73–G85

见 `docs/BROWSER_CHAT_TUTORIAL.md` §9 与 `yarn test:production-closure-golden`。
