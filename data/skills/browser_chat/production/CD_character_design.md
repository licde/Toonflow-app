---
name: CD_character_design
description: CD 角色智能设计 L0-L6 与 art_skills
stageId: CD
outputTag: characterDesign
rulePackVersion: "2.0.1"
---

# CD 角色智能设计（L0–L6）

T2 档位：从 G1 + script 提取角色，产出 L0–L6 结构化描述，对齐 art_skills 前缀。

## 入口条件

- T1 已通过或并行 T2 启动
- globalAnchors.G1.characterSoul 可用
- art_skills 前缀已选（如 realpeople_urban_modern）

## L0–L6 层级

| 层 | 字段 | 说明 |
|----|------|------|
| L0 | identity, age, gender | 身份与基础属性 |
| L1 | face, skin, expression | 面部特征 |
| L2 | hair, bodyType | 发型体态 |
| L3 | costume, accessories | 服装配饰 |
| L4 | posture, gesture | 姿态习惯 |
| L5 | voice.speed, timbre, accent | 音色（AUD 用） |
| L6 | arcVisual, stateVariants | 弧光视觉变化 |

## 执行步骤

1. 从 designBrief.B6 + script 提取角色列表
2. 读取 G1.characterSoul 锁定内核与 voiceStyle
3. 按 art_skills 前缀填 L0–L6
4. 分配 CHAR-CODE（CHAR-001 递增）
5. 写入 visualLockTable.characterAssets（供 BP）

## 输出

```json
{
  "characterDesign": {
    "rulePackVersion": "2.0.1",
    "assets": [
      {
        "code": "CHAR-001",
        "name": "女主",
        "L0": { "identity": "真千金", "age": "22", "gender": "女" },
        "L1": { "face": "鹅蛋脸", "skin": "白皙" },
        "L2": { "hair": "黑长直及腰" },
        "L3": { "costume": "白色连衣裙" },
        "L4": { "posture": "背挺直" },
        "L5": { "speed": "正常", "timbre": "清冷" },
        "L6": { "arcVisual": "隐忍→锋芒" }
      }
    ]
  }
}
```

## BLOCK 闸门

- 剧本出场主角/反派均有 CHAR-CODE
- L0–L3 必填，L5 主角必填
- 与 G1 说话风格/记忆点一致
- 禁止自由文本替代 L 层结构

## 下游

→ AS_asset_pipeline → BP_blueprint。
