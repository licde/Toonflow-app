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
- 单句 ≤20 字，单次 ≤50 字；超预算按**决策树**：标点→A 物理拆行；**残句无标点仍超预算→must 重设计或 Confirm B**（非可不手改）；VisBeat→C；`emotion_hit` **必须**同写 `reactionAction`
- 设计拆分 Confirm：`designSplitOps` / tools `confirm_design_split`；反推修好后 `design_split_forward_reentry`
- **契约不符＝重设计**：禁止只改 `narrativeSelfcheck.passed`；残句深链 `nar14_residual` → W3
- 假绿禁：`narrativeSelfcheck.passed=true` 不得代替 `runDesignExitGate(W3)`；缺 `reactionAction` → NAR-15 BLOCK；服务器可补占位 RA，但 CAM/双镜与其它硬闸仍须同轮修完再 `setStepStatus`
- **W3 权威=plan**：本步验 `dialoguePlan` 的 NAR-14/15；无 shots 时 **跳过** DC-01-EXTRA（非 UNIMPLEMENTED）。镜覆盖/乱入在 SB 拦
- **DEX-SHOT-INTENT**：sidecar `shotDesignIntent[]` **必须非空**（含 `picture`/`durationSec`；钩子/爆点须 `peakId|hookId`）。可与 `peakLedger` 一一对应；**禁止空数组 + passed**。服务器可从 peak 高置信派生，无 peak 时须手写

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

- △ 描写「人怎么干」：动作、表情、环境、光线 — 落地 SB 时须可拍结构槽（who/action/object/contact|spatial）
- 禁镜头技术括注（如「全景·缓推·6秒」）
- 禁小说化描写与冗长心理独白
- 竖屏适配：人物居中，无横向全景
- 邻镜道具去向须可交待（放下/仍持/撕毁）；细节闸在 SB：`DEX-LIT-*` / `DEX-PROP-CONT`

## 执行步骤

**步骤 0（强制）**：调用 `get_viral_writing_context(stageId=W3)`；写每场前标注本场兑现的 `peakId` / `hookId` / `retentionBeat` / `infoId`。  
**步骤 0b**：按 brief **时长规范**估算对白镜；>20 字 `splitHint`；反应镜 0.8–2s。  
**步骤 0c（视听配方）**：若 brief 示范含 `weaponId`（如 five_cut_reveal / silence_scream / intimate_ots），sidecar `shotDesignIntent` 须挂 `weaponId`/`sceneRecipeId`/`sfxIntent`；**禁止**写入文学正文括注。  
T3：同步写 `narrativeBrief.implementationPlan[]`（每场 `sceneRef` + `fxIntent` 含 **F0** + `avCausality`）。  
**分镜设计意图（sidecar）**：

```
purpose / emotionGoal / picture / shotSizeIntent / cutIntent / audioIntent / durationSec / peakId|hookId / weaponId / sfxIntent[] / visualBeatTags
```

**VisBeat**：`purpose` 映射默认 tags（钩子→reveal）；多拍点须在 SB 拆镜或打齐 tags，禁止「露刃+浅笑」塞进单一脸特写。

**场镜基数 MUST**：`implementationPlan`/`sceneMeta` 条数 = 剧本「场N」数。

1. 从骨架提取**当前集**
2. 阐述思路（兑现开场钩、付费卡前拍、真爆点）
3. 输出 `<scriptItem>`
4. 共生产 tags + 口型 + fx + **shotDesignIntent**（供 designBrief/SB 续读，禁止下游重发明爆点）
5. 短确认，禁复述正文

## BLOCK 闸门

| ruleId | 条件 |
|--------|------|
| R2 | 台词格式规范，hash 稳定 |
| W12 | 每场推进冲突，集末有钩子；3-15-45 |
| W13 | △ 可拍，无技术括注 |
| DEX-SHOT-INTENT | shotDesignIntent 非空且爆点/钩子可回溯 |
| DEX-TEMPLATE-FILL | mustEmit 填满 |
| L06 | ScriptReadyGate |

## 严禁产出

分镜表、景别、运镜、imagePrompt、videoPrompt、audioPrompt **写入文学正文**。  
允许且必须：sidecar `shotDesignIntent`（给 designBrief/SB 执行，SB **不得重发明爆点**）。

## 下游

全集完成 → design_brief → corridor_GB。
