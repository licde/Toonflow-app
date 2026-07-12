---
name: BP_blueprint
description: BP 资产蓝图 visualLockTable 汇总
stageId: BP
outputTag: visualLockTable
rulePackVersion: "2.0.1"
---

# BP 资产蓝图（visualLockTable）

T2 核心产出：汇总 CD + AS 为 `visualLockTable`，落库 `o_projectBlueprint`。EN compile 与生成触达的权威锚点源。

## 入口条件

- CD L0-L6 完成
- AS assetGapReport.coverage ≥ 80%

## visualLockTable 结构

```json
{
  "visualLockTable": {
    "rulePackVersion": "2.0.1",
    "characterAssets": {
      "CHAR-001": { "L0": {}, "L1": {}, "L2": {}, "L3": {}, "L4": {}, "L5": {}, "L6": {} }
    },
    "sceneColorLock": {
      "SCENE-001": { "name": "寝殿", "colorTemp": "暖", "dominantHue": "米黄", "anchorElements": ["纱帐"] }
    },
    "anchorProps": {
      "PROP-001": { "name": "玉佩", "significance": "情感", "appearanceSchedule": [1, 8] }
    }
  }
}
```

## 执行步骤

1. 合并 CD.characterDesign.assets → characterAssets
2. 合并 AS 场景色温 → sceneColorLock
3. 从 G4.anchorProps 补 significance + appearanceSchedule
4. 校验所有 shots refs 可 resolve 到 CODE
5. 写入 ScriptBundle / EpisodeBundle

## 锚点铁律

| ruleId | 规则 |
|--------|------|
| V4 | CHAR-CODE 必须存在于 characterAssets |
| V5 | PROP-CODE 必须存在于 anchorProps |
| V12 | SCENE 核心锚点描述非空 |
| V15 | anchorProps.significance 必填 |

## BLOCK 闸门

- characterAssets 覆盖本集所有出场角色
- sceneColorLock 覆盖本集所有场景
- 禁止 SB 用 sceneName 绕过 SCENE-CODE（P0-B）
- import 时 bootstrap BP 若缺失则阻断 T2

## 下游

→ corridor_EN（refs 锁定）→ identityAudit 对照源。
