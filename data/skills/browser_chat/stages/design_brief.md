---
name: design_brief
description: B 层 designBrief 11 联动字段
stageId: B
outputTag: designBrief
rulePackVersion: "2.1.0"
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
| B13 | spatialAnchors | 空间锚点（轴线/站位） | SB spatialRelation（**压成 string**） |

## 执行步骤

1. 从 script 提取角色、场景、道具 → B6 assetHints
2. 从 G3 toneProfile 锁定 B3
3. 标 B5 信息链：本集埋/收哪些伏笔
4. 写 B7/B8 跨集状态（有上集则读 continuity）
5. 填 B11 linkageTargets = `["台词","资产","连贯","视听","故事","场景","运镜","改编","模态编译","修复"]`
6. 按 GB 分场标 B12 rhythmZoneOutline（每场起承转合）
7. 标 B13 spatialAnchors：主轴线与关键站位，供 SB **写成站位 string**（禁止把 B13 对象原样塞进 `spatialRelation`）

## 输出

```json
{
  "designBrief": {
    "B1": "ep-01", "B2": "第1集：...", "B3": { "genre": "甜宠", "ratio": {...} },
    "B4": [3, 7, 5],
    "B5": [
      { "type": "伏笔", "desc": "...", "payoffEp": 5 },
      { "type": "钩子", "desc": "...", "payoffLabel": "本集收" }
    ],
    "B6": { "characters": ["..."], "scenes": ["..."], "props": ["..."] },
    "B7": "...", "B8": "...", "B9": "轻快钢琴", "B10": "竖屏9:16",
    "B11": ["台词","资产","连贯","视听","故事","场景","运镜","改编","模态编译","修复"],
    "B12": [{ "scene": "Sc1", "zone": "起", "beats": 2, "summary": "开场立意（可选）" }],
    "B13": [{ "scene": "Sc1", "axis": "女主-男主", "anchors": ["女主左", "男主右"] }]
  },
  "rulePackVersion": "2.1.0"
}
```

### B12 权威形状（DEX-B12-BEATS-NUM · BLOCK）

- **`beats` = 节拍数量 number**（如 `2`），不是叙事句子。
- 叙事说明写可选 **`summary`**（或 `beatSummary`）。
- **正例**：`{ "scene": "祠堂", "zone": "起", "beats": 2, "summary": "自残取佩，立下决意" }`
- **反例（禁止）**：`{ "scene": "祠堂", "zone": "起", "beats": "自残取佩，立下决意" }`
- 导入 salvage（SH-B12-BEATS）仅兜底；Chat **不得**依赖 salvage 导出错形。

## BLOCK 闸门

- 11 字段全非空（B12/B13 有场则必填）
- 无镜级/prompt 内容
- B6 与 script 角色场景一致
- B5 每条：`payoffEp` 仅未来集号（number）；本集收/当集兑现用 `payoffLabel: "本集收"`，**禁止**把语义串写进 `payoffEp`
- **DEX-B12-BEATS-NUM**：扫描 `designBrief.B12[]`；任一 `beats` 非 number → **不得导出**

## 下游

通过 → corridor_GB（scriptPlan 分场）。

## B14–B23 扩展（W3 sidecar → GB/SB 映射）

| # | 字段 | W3 来源 | GB/SB 目标 |
|---|------|---------|------------|
| B14 | paypointMarkers | W1 付费卡点 | GB 场表 paypoint 标注 |
| B15 | clipHooks | viralAdaptation.clipPoints30s | SB clip30sCandidate |
| B16 | adaptationDeepRef | deepAdaptation.nameMap → `{from:to}` record | designBrief.B16 镜像（勿另造 B16_adaptationDeepRef；maps 仅 [{from,to}]） |
| B17 | retentionScenes | retentionPlan.ep1 | GB 场级 retention 窗口 |
| B18 | opening5sAV | sceneMeta.avCausality | SB retentionTier 0-2s |
| B19 | first30sAV | rhythm31545 + infoGap | SB markers infoId |
| B20 | infoLedgerRefs | informationLedger.infoId | SB markers |
| B21 | dialoguePlanRef | dialoguePlan | SB lines functions |
| B22 | causalityGraphRef | narrativeCausalityGraph | SB cause/effect markers |
| B23 | retentionInfoDelivery | infoDeliveryPlan | GB 每场 info 交付清单 |

### B20 / B23 权威形状（禁止对象数组直接当 B20）

```json
"B20": ["INF-01", "INF-02", "INF-03"],
"B23": {
  "retentionInfoDelivery": ["INF-01", "INF-02", "INF-03"],
  "items": [
    { "infoId": "INF-01", "scene": "场1", "delivery": "沈母翻账册动作 + 台词" }
  ]
}
```

- **B20**：只能是 infoId `string[]`，不要写成 `[{ "infoId", "delivery" }]`。
- **B23**：必须是 **record**；最少含 `retentionInfoDelivery: string[]`；明细可放 `items` 数组。
- 导入侧会对错误形态做 SH-B20 / SH-B23  salvage，但导出 JSON 应直接写权威形。

每场 GB 须从 `narrativeBrief.infoDeliveryPlan` 抄 infoIds；B18/B19 须与 W3 `sceneMeta.avCausality` 一致。
