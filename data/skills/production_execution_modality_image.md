---
name: production_execution_modality_image
description: MD 图像模态 · imagePrompt 编译与合规
stageId: MD-IMG
---

# MD 图像模态

T3 阶段产出每镜 `imagePrompt`。须 trace 回 SB 字段。

## slots（modality_prompt_slots.json）

subject, scene, composition, lighting, style, negative, cref, identity

## 规则

- CHAR-SCENE 须 `--cref CHAR-CODE`
- PURE-SCENE 前 10 词含 `no people, no characters`
- identity 与 BP L0.gender 一致（identityAudit）
- 锚点 token 不可被 polish 漂移

## 输出

`shots[].generation.imagePrompt` + modalityPromptAudit.IMG
