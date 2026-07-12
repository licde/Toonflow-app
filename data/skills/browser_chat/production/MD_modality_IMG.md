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
| 写入 --cref CHAR-CODE | 漂移锚点 token |
| PURE-SCENE 前置 no people | T1 档位写 imagePrompt |

## BaseSpec 规则

- V1–V4：type / cref / negative 位置 / --ar
- CHAR-SCENE 须 `--cref CHAR-CODE`
- PURE-SCENE 前 10 词含 `no people, no characters`
- identity 与 BP L0.gender 一致（identityAudit）

## Agnes VendorPack

- tag-stack-zh 模板
- 无独立 negative 通道 → AG-GATE-04 剥离 @图N
- cref 引用分镜图或角色资产

## 正推

```
BP L0 → SB charCodes/type → EN subject → MD-IMG imagePrompt
```

## 反推

| 问题 | 目标 |
|------|------|
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
