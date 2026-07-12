---
name: production_debut_intro
description: debutIntroPack 首次出场标准介绍镜
stageId: PD
outputTag: debutIntroPack
rulePackVersion: "2.0.1"
---

# 首次出场介绍（debutIntroPack）

角色/场景/道具**首次出场**时，产出标准 establishing 镜 + copyHint，可选 SUB 字幕。

## 触发条件

- 角色/场景/道具在剧集中首次出现
- BP visualLockTable 有对应 CODE 定义
- 对照 `debut_intro_templates.json`

## debutIntroPack 结构

```json
{
  "debutIntroPack": {
    "rulePackVersion": "2.0.1",
    "items": [
      {
        "entityType": "character",
        "code": "CHAR-002",
        "name": "反派",
        "firstAppearanceShot": "shot-3",
        "establishingPattern": "局部特写→拉远全身",
        "copyHint": "神秘男子缓步走入，气场压迫",
        "subOptional": { "enabled": true, "text": "陆霆 · 陆家继承人" },
        "fxLevel": "F0",
        "linkedG1": "characterSoul[1]"
      }
    ]
  }
}
```

## establishing 镜模板

| 实体 | 推荐模式 | 时长 |
|------|----------|------|
| 主角 | 出场七技之一 + 记忆点道具 | 3–5s |
| 反派 | 背影/剪影→正面 reveal | 2–4s |
| 场景 | 远景建立→推进关键锚点 | 3–5s |
| 道具 | 特写→功能展示 | 2–3s |

## 执行步骤

1. 扫描本集 script + shots，标记首次出场实体
2. 为每个实体选 establishingPattern
3. 写 copyHint（可拍 △ 级描述，非 prompt）
4. 重要角色附 subOptional
5. 插入或标注对应 shot，不破坏 R2 台词链

## BLOCK 闸门

- 本集新出场主角/反派均有 item
- establishingShot 已映射到 shots[].id
- copyHint 无 prompt/vendor 语法
- 与 fxFeasibilityAudit F 等级一致

## 与 SB/EN 关系

- SB 阶段：标注 debut 镜 type=ESTABLISHING
- EN 阶段：refs 锁定 BP CODE，compile 保护锚点
