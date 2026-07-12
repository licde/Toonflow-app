---
name: T1_quality_gate
description: T1 PreDesignPack 出口自检（非 JSON 假闸）
stageId: T1
outputTag: preDesignQuality
rulePackVersion: "2.0.1"
---

# T1 质量自检（PreDesignPack）

T1 为 T3 路径中的 **分镜检查点**，不是最终出口。最终出口见 `T3_quality_gate.md`。

## T1 必填产物

| 字段 | 来源 stage | 说明 |
|------|------------|------|
| script | W3 | 文学剧本全文 |
| planData | P/G/W | 预检/锚点/骨架/策略 |
| designBrief | B | B1–B13 联动字段 |
| preDesignPack.scriptPlan | GB | 分场/情绪/过渡 |
| preDesignPack.shots[] | SB | 台词映射 + visualDescription |
| rulePackVersion | — | `"2.0.1"` |

## preDesignPack.shots 结构

```json
{
  "shotIndex": 1,
  "type": "CHAR-SCENE",
  "sceneName": "寝殿",
  "visualDescription": "婢女俯身",
  "duration": 2,
  "narrative": {
    "dialogue": {
      "lines": [{ "speaker": "婢女", "text": "殿下醒了。" }]
    }
  }
}
```

## 出口前自检（创作清单，不写假 JSON）

1. **台词链**：剧本每句台词在 shots 中可追溯，100% 覆盖（可合并，不可丢）
2. **视听链**：designBrief.B4 → GB emotionCurve → SB emotionIntensity
3. **visualDescription**：每镜非空
4. **监督**：supervisionReport.grade ≥ B（若有）

## T1 阶段不写

`imagePrompt` / `videoPrompt` / `audioPrompt` / `fxPrompt`（属 T3 MD，见 `T3_quality_gate.md`）

## 禁止写入 bundle

- `externalHashCheck.match: true` 占位
- `linkageAudit` 假 pass
- `ruleAudit.passed: true` 无实测

## import 说明

有完整 shots → `POST importScript` 落库；**缺 T3 prompt 由外部 inspect 报告**，不在 Chat 填假通过。
