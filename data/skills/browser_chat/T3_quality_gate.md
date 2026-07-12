---
name: T3_quality_gate
description: T3 全链路出口质量闸门 — 四模态 prompt + 资产包
stageId: T3
outputTag: exportReady
rulePackVersion: "2.0.1"
---

# T3 质量闸门（全链路出口）

T3 为 **默认出口**。export 前对照 `docs/PROMPT_STANDARD.md` 自检。

## T3 必填产物

| 字段 | 来源 | 说明 |
|------|------|------|
| T1 全套 | GB/SB | script + preDesignPack + 台词 100% + visualDescription |
| characterDesign | CD | L0–L6 + CHAR-CODE |
| assetPipeline | AS | 场景/道具 |
| visualLockTable | BP | cref 可解析 |
| generation×4 | MD | 每镜 image/video/audio/fx |
| rulePackVersion | — | `"2.0.1"` |

## 每镜 generation 结构

```json
{
  "shotIndex": 1,
  "visualDescription": "婢女俯身唤醒",
  "charCodes": ["CHAR-MAID"],
  "generation": {
    "imagePrompt": "婢女, 寝殿烛火, 中景, 暖光, 古言写实, no text, --cref CHAR-MAID --ar 16:9",
    "videoPrompt": "中景 static, slow push, duration 2s, motion-from-frame",
    "audioPrompt": "婢女, 轻柔女声, 正常语速, 关切",
    "fxPrompt": ""
  }
}
```

或写入 `flowData.storyboard[]`：`prompt` / `videoDesc` / `duration`。

## 出口前自检（对照 PROMPT_STANDARD §8）

1. 台词覆盖率 100%（可合并，不可丢）
2. 每镜 visualDescription 非空
3. characterDesign 覆盖主角/反派
4. visualLockTable 解析全部 charCodes
5. 每镜 imagePrompt + videoPrompt 非空
6. 台词镜 audioPrompt 非空

## 禁止写入 bundle

- `ruleAudit: { passed: true }` 假通过
- `linkageAudit` 假六链 pass
- `externalHashCheck: { match: true }` demo 值

## 下游

export JSON → 外部 `inspectBundle` 验收 → `POST importScript` 落库（不挡 import）。
