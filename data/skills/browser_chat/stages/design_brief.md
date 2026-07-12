---
name: design_brief
description: B 层 designBrief 11 联动字段
stageId: B
outputTag: designBrief
rulePackVersion: "2.0.1"
---

# designBrief（B 层 11 字段）

连接 W3 剧本与设计走廊（GB→SB）的**联动层**。只写结构化字段，**严禁**镜级描述与 prompt。

## 入口条件

- W3 script 当前集已完成
- globalAnchors G1–G5 可用

## B11 联动字段

| # | 字段 | 说明 | 引用 |
|---|------|------|------|
| B1 | episodeKey | 稳定业务键 `ep-01` | import 匹配 |
| B2 | episodeTitle | 显示标题 | scriptMeta |
| B3 | toneLock | 情绪基调锁定（引用 G3） | GB 场基调 |
| B4 | emotionArc | 本集情绪弧线 [起,峰,落] | GB emotionCurve |
| B5 | infoLinkageChain | 信息链节点（伏笔/揭晓） | shots.markers |
| B6 | assetHints | 角色/场景/道具提取 hint | AS extract |
| B7 | continuityIn | 上集衔接状态 | resolveContext |
| B8 | continuityOut | 本集末状态 | 跨集写回 |
| B9 | audioMood | 音乐氛围关键词 | AUD 模态 |
| B10 | platformSpec | 平台规格（竖屏等） | SB 构图 |
| B11 | linkageTargets | 十链目标 stage 列表 | linkageAudit |
| B12 | rhythmZoneOutline | 场级节奏区（起/承/转/合） | SB rhythmZone |
| B13 | spatialAnchors | 空间锚点（轴线/站位） | SB spatialRelation |

## 执行步骤

1. 从 script 提取角色、场景、道具 → B6 assetHints
2. 从 G3 toneProfile 锁定 B3
3. 标 B5 信息链：本集埋/收哪些伏笔
4. 写 B7/B8 跨集状态（有上集则读 continuity）
5. 填 B11 linkageTargets = `["台词","资产","连贯","视听","故事","场景","运镜","改编","模态编译","修复"]`
6. 按 GB 分场标 B12 rhythmZoneOutline（每场起承转合）
7. 标 B13 spatialAnchors：主轴线与关键站位，供 SB spatialRelation 引用

## 输出

```json
{
  "designBrief": {
    "B1": "ep-01", "B2": "第1集：...", "B3": { "genre": "甜宠", "ratio": {...} },
    "B4": [3, 7, 5], "B5": [{ "type": "伏笔", "desc": "...", "payoffEp": 5 }],
    "B6": { "characters": ["..."], "scenes": ["..."], "props": ["..."] },
    "B7": "...", "B8": "...", "B9": "轻快钢琴", "B10": "竖屏9:16",
    "B11": ["台词","资产","连贯","视听","故事","场景","运镜","改编","模态编译","修复"],
    "B12": [{ "scene": "Sc1", "zone": "起", "beats": 2 }],
    "B13": [{ "scene": "Sc1", "axis": "女主-男主", "anchors": ["女主左", "男主右"] }]
  },
  "rulePackVersion": "2.0.1"
}
```

## BLOCK 闸门

- 11 字段全非空（B12/B13 有场则必填）
- 无镜级/prompt 内容
- B6 与 script 角色场景一致
- B5 每条有 payoffEp 或标记「本集收」

## 下游

通过 → corridor_GB（scriptPlan 分场）。
