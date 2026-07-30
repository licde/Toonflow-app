---
name: MD_modality_IMG
description: MD 图像模态 · imagePrompt + Agnes tag-stack
stageId: MD-IMG
outputTag: modalityPromptAudit.IMG
rulePackVersion: "2.0.1"
---

# MD 图像模态（IMG）

T3 产出每镜 `imagePrompt`，trace 回 SB/BP 字段。

## slots

subject, scene, composition, lighting, style, negative, cref, identity

## CAN / CANNOT

| CAN | CANNOT |
|-----|--------|
| 从 EN Y.subject 编译 prompt | 修改 SB lines |
| 写入 `--cref CHAR-*` | `--cref SCENE-*`（场景必须 `--sref`） |
| 写入 `--sref SCENE-*` | 漂移锚点 token |
| PURE-SCENE 前置 no people | T1 档位写 imagePrompt |

## BaseSpec 规则

- V1–V4：type / cref / negative 位置 / --ar
- CHAR-SCENE 须 `--cref CHAR-CODE`；场景码只进 `--sref`，禁止 `--cref SCENE-*`
- PURE-SCENE / **空镜**：前缀禁人物正脸；不得与人名/出脸并存（DEX-EMPTY-SHOT）；compose 禁叠「正脸清晰」
- 有出脸须 CHAR + 定妆真图（设计期可 stub+`assetCrefPlan` 延期；DEX-ASSET-CREF → `asset_cref`）；preview≡generate 同核，预览假绿不代替 generate BLOCK
- identity 与 BP L0.gender 一致（identityAudit）
- 保真环失败标 `fidelityFailed` → 禁作视频首帧（`still_firstframe_dirty`）
- 接触事件 VD ∩ 静帧无道具 → 禁 hq_ok / 禁作首帧（`still_prop_missing`）；浅痕≠道具；CTA「重出带道具静照」

## Agnes VendorPack

- tag-stack-zh 模板
- 无独立 negative 通道 → AG-GATE-04 剥离 @图N
- cref 引用分镜图或角色资产

## 正推

```
BP L0 → SB charCodes/type → EN subject → MD-IMG imagePrompt
```

## 反推

| 触发 | 目标 |
|------|------|
| empty_shot_conflict | SB |
| cast_on_desc_missing | SB |
| asset_cref | AS |
| still_firstframe_dirty | SB → MD-IMG |
| still_prop_missing | MD-IMG（重出带道具静照；禁只改视频词） |
| qp02_visual_short | SB |
| lit_detail_contact_xor | SB（颊触≠口含：互斥句或拆镜；可 `confirm_enhance`；≠audio_xor；禁只 regen） |
| lit_detail_contact / lit_detail_anchor / lit_detail_expr | SB（补落点/部位或批准增强；禁只 regen） |
| prop_continuity | SB（邻镜道具链；拆后 xorSplit 可豁免） |
| cref 无法解析 | EN → BP |
| identity 与 VID/AUD 冲突 | EN 全模态重 compile |
| PURE 词缺失 | EN 前置 negative |

## SD / SF

| ID | 检查 | SF |
|----|------|-----|
| SD-IMG-01 | cref 存在且可解析 | V4 auto |
| SD-IMG-02 | PURE 类型 negative 位置 | V2/V3 |

## 输出

```json
{
  "generation": { "imagePrompt": "..." },
  "modalityPromptAudit": {
    "items": [{ "modality": "IMG", "ruleId": "V4", "severity": "PASS" }]
  }
}
```

**Bundle 路径**：`preDesignPack.shots[].generation.imagePrompt` 或 `flowData.storyboard[].prompt`。标准见 `docs/PROMPT_STANDARD.md` §2。
