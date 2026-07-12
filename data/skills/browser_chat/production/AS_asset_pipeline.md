---
name: AS_asset_pipeline
description: AS 资产流水线 extract 与 assetGapReport
stageId: AS
outputTag: assetPipeline
rulePackVersion: "2.0.1"
---

# AS 资产流水线

T2 档位：从 designBrief + script + CD 产出场景/道具资产，生成 assetGapReport。

## 入口条件

- CD characterDesign 已完成
- designBrief.B6 assetHints 可用

## 流水线阶段

| 步 | 动作 | 产出 |
|----|------|------|
| AS-1 | extract 角色 | CHAR-CODE（CD 已有则校验） |
| AS-2 | extract 场景 | SCENE-CODE + sceneColorLock 草案 |
| AS-3 | extract 道具 | PROP-CODE + significance |
| AS-4 | 衍生资产 | 换装/状态变体（L6 stateVariants） |
| AS-5 | gap 检测 | assetGapReport |

## assetGapReport 结构

```json
{
  "assetGapReport": {
    "rulePackVersion": "2.0.1",
    "gaps": [
      {
        "type": "scene",
        "name": "宴会厅",
        "referencedIn": ["shot-4", "shot-5"],
        "status": "missing",
        "action": "创建 SCENE-003"
      }
    ],
    "coverage": 85,
    "blockBP": false
  }
}
```

## 执行步骤

1. 扫描 shots + script 引用场景/道具名
2. 与已有 assets 列表比对
3. 缺失项写入 gaps，标 referencedIn
4. 计算 coverage = 已覆盖引用 / 总引用 × 100
5. coverage < 80 → blockBP = true

## 场景色温草案

每个 SCENE-CODE 预填：

```json
{ "colorTemp": "暖", "dominantHue": "金黄", "anchorElements": ["吊灯", "红毯"] }
```

## BLOCK 闸门

- coverage ≥ 80%
- 每场戏有 SCENE-CODE 或明确占位
- G4 anchorProps 中道具均有 PROP-CODE
- gaps 均有 action

## 下游

→ BP_blueprint（visualLockTable 汇总）。
