---
name: corridor_GB
description: GB 导演规划走廊 — scriptPlan 分场情绪，禁光影切镜
stageId: GB
outputTag: scriptPlan
rulePackVersion: "2.0.1"
---

# 走廊 GB · 导演规划

质量走廊第一阶段：script → scriptPlan。**只写分场/情绪/过渡**，严禁光影设计、切镜指令（C3 边界）。

## 入口条件

- W3 script + designBrief 11 字段已通过
- corridor 上游 W3 BLOCK 合格

## 必产出

| 字段 | 内容 | 严禁 |
|------|------|------|
| scriptPlan | 分场汇总表 + 逐场注意事项 + 场间过渡 | 光影/色温/布光 |
| episodeBeat | emotionCurve + scenes + markers + rhythmZones | 景别/运镜/切镜 |

## scriptPlan 最低结构

```markdown
## 分场汇总
| 场 | 场景 | 台词条数 | 情绪(0-10) | 基调 |
| Sc1 | 寝殿 | 3 | 4 | 苏醒、茫然 |

## 逐场注意事项
### Sc1 寝殿
- 情绪从茫然→警觉，信息前置主角身份

## 场间过渡
| 从 | 到 | 过渡类型 | 说明 |
| Sc1 | Sc2 | 切 | 时间紧接 |
```

## 执行步骤

1. 从 script 拆场，统计每场景台词数
2. 为每场标 emotion(0-10) 与基调关键词
3. 写场间过渡（切/淡入/叠化），不写具体光影
4. 同步构造 episodeBeat.emotionCurve + rhythmZones（对齐 B12）
5. 对照 designBrief.B4 情绪弧线一致性；B12 每场至少一区
6. 从 `planData.narrativeBrief` 抄入 **sceneCausalBeats**（每场 infoIds + avPeak）与 **infoIds[]**（对齐 informationLedger）

## narrativeBrief → GB 抄入规则

| narrativeBrief 字段 | GB 字段 |
|---------------------|---------|
| infoDeliveryPlan[].infoId | 逐场注意事项 + sceneCausalBeats |
| retentionBeats.opening5s | Sc1 情绪峰值说明 |
| reconstructionTrace[].newBeat | 对应场 beat 备注 |
| empathyPlan.squeezeMoments | 场级情绪挤压窗口 |

## BLOCK 闸门（rollbackLayer GB）

| ruleId | 条件 |
|--------|------|
| L09 | scriptPlan 可被 SB Parser 读取 |
| L10 | emotionCurve 与 B4 偏差 ≤2 |
| C3 | 无光影/切镜/景别描述 |

## 严禁产出

shotSize、cameraMovement、lightingSetup、compiledPrompt。

## 下游

通过 → corridor_SB；情绪不符 → rePush designBrief 或 W3。
