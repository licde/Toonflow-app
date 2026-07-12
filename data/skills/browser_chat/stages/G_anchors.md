---
name: G_anchors
description: G 层项目锚点 G1-G5 模板
stageId: G
outputTag: globalAnchors
rulePackVersion: "2.0.1"
---

# G 层全局锚点（G1–G5）

项目级锚点，写入 `planData.globalAnchors`（import 落库 `o_projectBlueprint`）。W1–W3、GB、BP 均须引用，防漂移。

## 入口条件

- 改编路径：P09 或 P08 通过
- 原创路径：直接进入本阶段
- storyCore 或用户口述核心可用

## G1–G5 模板

| 锚点 | 字段 | 内容要求 | 下游引用 |
|------|------|----------|----------|
| **G1** 角色灵魂 | `characterSoul[]` | 每角：内核矛盾、说话风格、记忆点、金手指边界 | W3 台词、CD L0-L6 |
| **G2** 世界观 | `worldRules` | 3–5 条铁律 + 渐进披露顺序 | GB 场备注、W3 OS/VO |
| **G3** 调性 | `toneProfile` | 情绪基调占比、禁忌、类型标签 | designBrief B3 |
| **G4** 道具 | `anchorProps[]` | 名称/CODE 预留/significance/出场节点 | BP anchorProps |
| **G5** 关系 | `relationshipGraph` | 核心关系对 + 张力类型 + 变化节点 | W3 冲突、SB 情绪 |

## 执行步骤

1. 从 storyCore.characterAnchors 提炼 G1（≤4 角色）
2. 写 G2 世界观铁律，禁止大段旁白灌输
3. G3 锁定情绪基调占比（如甜60%+虐30%+惊喜10%）
4. G4 列核心道具，标注 significance（情感/权力/线索）
5. G5 画关系图，标注张力变化集数

## 输出

```json
{
  "globalAnchors": {
    "G1": { "characterSoul": [{ "name": "...", "coreConflict": "...", "voiceStyle": "..." }] },
    "G2": { "worldRules": ["..."] },
    "G3": { "toneProfile": { "genre": "甜宠", "ratio": { "sweet": 60, "bitter": 30 } } },
    "G4": { "anchorProps": [{ "name": "...", "significance": "情感", "episodes": [1, 5] }] },
    "G5": { "relationshipGraph": [{ "pair": ["A", "B"], "tension": "对立→和解", "ep": 8 }] }
  },
  "rulePackVersion": "2.0.1"
}
```

## BLOCK 闸门

- G1–G5 五块均非空
- G1 角色数 ≤4
- G4 每个道具有 significance
- 与 adaptationMatrix 视觉风格一致

## ruleAudit

stage `G`；未通过不得进 W1_skeleton。
