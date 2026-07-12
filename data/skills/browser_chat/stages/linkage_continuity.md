---
name: linkage_continuity
description: 六链闭环 linkageAudit 与 continuity 写回
stageId: LINK
outputTag: linkageAudit
rulePackVersion: "2.0.1"
---

# 十链联动与连贯性（linkageAudit）

T1 修订后的**十链**全闭环。每阶段挂载 LINK 审计，Pipeline 结束写回 continuity。

## 十链定义

| 链 | T1 要求 | 关键字段 | stage |
|----|---------|----------|-------|
| 台词 dialogue | shots.lines + hash | dialogue.lines, externalHashCheck | SB |
| 资产 asset | extract + hint | assetHints, CHAR/SCENE/PROP-CODE | AS/BP |
| 连贯 continuity | continuity JSON | continuityIn/Out, resolveContext | B |
| 视听 av | 结构化情绪 | B4, emotionCurve, emotionIntensity | GB/SB |
| 故事 story | infoLinkageChain | markers, B5 伏笔/揭晓 | B/SB |
| 场景 scene | 场表一致 | B6.scenes, sceneName, BP.sceneColorLock | B/GB/SB |
| 运镜 camera | 景别/过渡/运镜 | B12, shotSize, transitionType, EN.motion | SB/EN |
| 改编 adaptation | 矩阵→策略→剧本 | P03, W2, W3, designBrief | P/W |
| 模态编译 modality_compile | EN→MD×4 | modalityPromptAudit, four slots | EN/MD |
| 生成 generation | 生成反馈 | generationFeedback, MediaProbe | Vendor |
| 修复 repair | SF + linkageRepairPlan | fixPlan, rePushPlan | SF |

## linkageAudit 结构

```json
{
  "linkageAudit": {
    "rulePackVersion": "2.0.1",
    "chains": [
      {
        "chainId": "台词",
        "status": "pass",
        "nodes": [
          { "stage": "W3", "field": "script", "ruleId": "R2" },
          { "stage": "SB", "field": "shots[].dialogue.lines", "ruleId": "H3" }
        ],
        "breakPoint": null
      }
    ],
    "blockExport": false
  }
}
```

## 执行步骤

1. 对照 `linkage_chains.json` 逐链检查节点
2. 验证相邻节点字段一致性（如 B4 → GB emotionCurve）
3. 断裂链标注 breakPoint + 建议 repair
4. 任一链 BLOCK → blockExport = true
5. Pipeline 完成 → 写回 continuity JSON

## continuity 写回

```json
{
  "continuity": {
    "episodeKey": "ep-01",
    "characterStates": { "女主": "得知真相，愤怒" },
    "plotThreads": [{ "thread": "玉佩线索", "status": "未揭晓" }],
    "lastScene": "宴会厅",
    "writtenAt": "pipeline-end"
  }
}
```

## BLOCK 闸门（G20–G24）

- 十链均有 status 判定
- 台词链 externalHashCheck.match = true
- 视听链偏差 ≤2（B4 vs emotionCurve）
- 故事链 B5 每条有 payoffEp 或本集收
- blockExport = false 方可 T1 出口

## 与 linkageRepairPlan

单链断裂 → linkageRepairPlan（smart_fix 子结构）；多链 → rePushPlan。
