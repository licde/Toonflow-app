---
name: W3_script
description: W3 文学剧本编写与 BLOCK 自检 R2/W12/W13
stageId: W3
outputTag: script
rulePackVersion: "2.0.1"
---

# W3 文学剧本

基于骨架与策略编写单集文学剧本，包裹在 `<scriptItem>` 中。**严禁**输出分镜、景别、compiled prompt。

## 入口条件

- W1 骨架 + W2 策略已通过
- 明确当前编写集数 EP{NN}

## W3 BLOCK 自检清单

### R2 台词保真预备

- 所有对白以 `{角色名}：{台词}` 格式
- OS/VO/V.S 单独标注，不混入 △
- 台词 hash 可计算（无多余空格/标点变异）
- 单句 ≤20 字，单次 ≤50 字

### W12 冲突驱动

- 每场有明确冲突升级或反转
- 黄金单集公式：承接+升级+价值转变+下集勾连
- 节奏 3-15-45：3 秒情绪冲击 / 15 秒变化 / 45 秒强期待

### ep1 专章（RET + NAR）

- 并列产出 `informationLedger` / `dialoguePlan` / `viralAdaptation.retentionPlan`
- 第一场 `sceneMeta`：opening5sHook、rhythm31545、infoGapType、clip30sCandidate
- 第一场禁止 >2 句解释性台词；禁止纯环境描写开场
- ep2+ 每场标 `retentionRole`（carry/escalate/hook）；集末 `endCardPack.preview`

### W13 画面可拍

- △ 描写「人怎么干」：动作、表情、环境、光线
- 禁镜头技术括注（如「全景·缓推·6秒」）
- 禁小说化描写与冗长心理独白
- 竖屏适配：人物居中，无横向全景

## 执行步骤

**步骤 0（强制）**：读取并打印 `planData.narrativeBrief` 摘要；写每场前标注本场兑现的 `retentionBeat` / `infoId` / `reconstructionTrace` 条目。  
T3：同步写 `narrativeBrief.implementationPlan[]`（每场 `sceneRef` + `fxIntent` 含 **F0** + `avCausality`）；长句 >20 字必须 `dialoguePlan.lines[].splitHint`。  
**场镜基数 MUST**：`implementationPlan`/`sceneMeta` 条数 = 剧本「场N」数；「接场/同地点续拍」要么换独立场景名（下游 SB `sceneName` 必须不同），要么合并为一场并删除多余 sceneRef。禁止留下无镜可映射的 F1 plan 项。

1. 从骨架提取**当前集**信息（忽略其他集）
2. 阐述思路 200–300 字
3. 输出完整 `<scriptItem name="{作品名} EP{NN}：{标题}">` … `</scriptItem>`
4. 内部跑 R2/W12/W13 清单
5. 返回简短确认，禁止复述正文

## 格式要点

```
1-1 场景名 日/内
人物：A B
△环境+动作描写
A：台词
---
```

## BLOCK 闸门

| ruleId | 条件 |
|--------|------|
| R2 | 台词格式规范，hash 稳定 |
| W12 | 每场推进冲突，集末有钩子 |
| W13 | △ 可拍，无技术括注 |
| L06 | ScriptReadyGate：正文 1000 字内，密度合格 |

## 严禁产出

分镜表、景别、运镜、imagePrompt、videoPrompt、audioPrompt。

## 下游

全集完成 → design_brief → corridor_GB。
