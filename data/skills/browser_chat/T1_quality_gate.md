---
name: T1_quality_gate
description: T1 PreDesignPack 出口质量闸门
stageId: T1
outputTag: preDesignQuality
rulePackVersion: "2.0.1"
---

# T1 质量闸门（PreDesignPack）

T1 档位出口前**最终闸门**。T1 不再只是 script+designBrief，必须含完整 preDesignPack。

## T1 必填产物

| 字段 | 来源 stage | 说明 |
|------|------------|------|
| script | W3 | 文学剧本全文 |
| planData | P/G/W | 预检/锚点/骨架/策略 |
| designBrief | B | 11 联动字段 |
| preDesignPack.scriptPlan | GB | 分场/情绪/过渡 |
| preDesignPack.shots[] | SB | 每镜 lines 映射 |
| preDesignPack.externalHashCheck | 自检 | match=true |
| preDesignPack.preDesignQuality | 本闸门 | overall ≥ B |
| ruleAudit | 各阶段 | 全链路 pass |
| rulePackVersion | — | `"2.0.1"` |

## preDesignPack 结构

```json
{
  "preDesignPack": {
    "scriptPlan": "...",
    "shots": [
      {
        "id": "shot-1",
        "narrative": {
          "dialogue": { "type": "dialogue", "lines": "角色：\"台词\"" },
          "emotionIntensity": 5,
          "shotSize": "中景"
        }
      }
    ],
    "externalHashCheck": { "scriptHash": "...", "linesHash": "...", "match": true },
    "preDesignQuality": { "overall": "B", "dimensions": {...} },
    "sceneCodeMap": {}
  }
}
```

## 出口前自检（G25–G30）

1. **台词链**：每句剧本台词 → shots[].dialogue.lines，零删改（R2）
2. **视听链**：designBrief.B4 → GB emotionCurve → SB emotionIntensity
3. **hash**：externalHashCheck.match = true
4. **监督**：supervisionReport.grade ≥ B
5. **联动**：linkageAudit 六链无 BLOCK 断裂

## T1 仍不产出

imagePrompt / videoPrompt / audioPrompt / compiled prompt（属 T2 EN / T3 MD）

## BLOCK 闸门

| 项 | 条件 |
|----|------|
| preDesignQuality.overall | ≥ B |
| supervisionReport.grade | ≥ B |
| externalHashCheck.match | true |
| fixPlan.status | applied 或空 |
| shots.length | ≥ 剧本台词句数 |

## import 说明

有 shots → POST importScript → 落库 o_storyboard，**skip autoDesign SB**。
