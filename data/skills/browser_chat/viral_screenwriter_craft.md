---
name: viral_screenwriter_craft
description: Browser Chat 编剧爆款思维（从 script_execution 抽取的可执行教学法）
stageId: craft
rulePackVersion: "2.0.1"
---

# 编剧爆款思维 · Browser Chat 可执行版

> **必读**：进入 W 阶段前通读本节，并通读 `viral_adaptation_playbook.md`。W3 对照 `viralWritingContext.stageBrief` + `peakLedger`/`hookPlan`/`shotDesignIntent` 兑现，禁止只填 JSON 不落地。

读取：`getPlanData.viralWritingContext` / `viralFormulaPicker` / `extractPeakHook`。

## 0. 视听爆点与钩子（先于文笔）

- **真爆点**：巴掌/下跪/掉马/背叛证据/泪目/告白等带声画载荷
- **假爆点禁标**：别墅写景、开会交代、纯环境
- **开场钩**：0–3s 第一强刺激；须可拍 △ + 建议秒数
- **共鸣**：题材三拍（如困境→无门→微反击）；`emotionTarget` 必填
- **时长**：对白≥口型；反应 0.8–2s；开场钩组前 3s 完成强刺激

## 1. 有用信息 vs 猜谜式悬念

**禁止**（对照 `narrative_drive_spec.json` forbiddenSuspense）：

- `opaque_mystery`：大家都不知道、观众也看不懂在猜什么
- `exposition_dump`：开会/旁白一口气交代背景
- `self_reveal_dialogue`：角色自己念设定说明书

**必须**：每条信息写进 `informationLedger`，标注 `emotionTarget`（替谁捏汗/替观众爽）与 `payoffBy`（何时兑现）。

| 废稿 | 报款 |
|------|------|
| △ 豪华别墅内，阳光洒落。女主打量四周。 | △ 巴掌脆响！女主脸侧红肿，箱子砸地。 |
| 旁白：她是被抱错的真千金…… | 假千金（冷笑）：这房子，从来就不是你的。 |

## 2. 信息差三配置

| 类型 | 观众 | 角色 | 情绪效果 |
|------|------|------|----------|
| audience_knows_character_not | 知 | 不知 | 替主角捏汗 |
| character_knows_audience_not | 不知 | 知 | 期待打脸 |
| partial_both | 部分 | 部分 | 心疼又着急 |

ep1 前 30s **最多 1 条**核心 info 释放；禁止连续猜谜。

## 3. 动作是因，对话是果

- 每句对白前必须有 △ 动作
- `dialoguePlan` 每行须 `causedByActionId`（A1/A2…）+ ≥1 `function`
- ep1 前 30s：至少 1 句 `emotion_hit` + 1 句 `conflict_escalate`
- 单句 >20 字须标 `splitHint: reaction_shot` + 听者反应 △

## 4. 节奏 3-15-45 与可拍 △

| 秒级 | 剧本要求 | retention 字段 |
|------|----------|----------------|
| 0–3s | 强视觉冲突（非写景/开会） | opening5sHook |
| 3–15s | 第一次剧情变化 | opening3to10s |
| 15–45s | 强期待 + 主角抉择空间 | rhythm31545 |
| 集末 | 反转钩子 | endHook |

**废稿**：缓推全景写景 + 旁白介绍世界观  
**报款**：特写巴掌 + 骤停 BGM + 一句宣战对白

## 5. 三大密度（每场自评）

写入 `narrativeBrief.densityBudget` 与每场 `sceneMeta.densityScore`：

- **情绪**：ep1 前 3s 峰值；禁止三场连续 low
- **信息**：ep1 前 30s ≤1 核心 info；每集 ≤3 新 info
- **情节**：15s 内第一次变化；每集 ≥1 反转

## 6. 共情三拍（ep1 前 30s 至少完成前两拍）

1. **困境**：主角被压到谷底（被羞辱/被误解）
2. **无门**：看似无解（权力/信息/关系封锁）
3. **微反击**：一个小动作暗示反击可能（攥拳/眼神/藏证据）

`empathyPlan.rootFor` / `rootAgainst` 须在 ledger 的 `emotionTarget` 中体现。

## 7. 改编 ≠ 缩写

- P06 `changeLog` 每条链 `matrixDim` + `densityImpact`
- `reconstructionTrace` 中 ≥80% P-issue 须在 ep1 剧本可指出对应 △/对白
- 删留须写「替代爆点」，禁止只删不补

## 8. AI 可实现边界（衔接 MD×4）

- ep1 Opening `fxIntent.level` ≤ F2；F3+ 须 `degradeHint`
- 禁「大楼坍塌」类 F5 → 改「人群惊逃+烟尘」
- 有台词场须写 `voiceIntent`（音色/语速/情绪）供 AUD 编译

## 9. 自检口诀（export 前）

1. 首场首 △ 是冲突不是写景？
2. 每条 ledger 有 emotionTarget 且已兑现？
3. changeLog / reconstructionTrace 80% 可追踪？
4. 长台词有 splitHint + 反应 △？
5. ep1 首场 `sceneMeta.avCausality` 非空？

未过 → 跑 `W3_narrative_selfcheck.md`，不得进 designBrief。

## 10. 情绪规范 profile（emotionNorm）与视听 sidecar

项目锁定 `planData.emotionNorm.activeProfileId`（甜宠/虐恋/战神/悬疑/generic）。W3 **按当前档写正文**；导入后机器**不改措辞**，只自愈结构。

### 必写 sidecar（禁止塞进文学括注）

每场 `sceneMeta` / 镜级 sidecar：

| 字段 | 说明 |
|------|------|
| `activeProfileId` | 须与项目 `emotionNorm.activeProfileId` 一致 |
| `avStyle` | 与 profile 对齐：sweet / abuse_romance / war_god / suspense / generic |
| `emotionPhase` | suppress → signal → burst → release → hook |
| `intensity` | 0–10；驱动簇策略与景别偏置 |
| `beatRole` | speak \| reaction \| emphasize \| action（对白簇） |

**禁止**：在 `<scriptItem>` 正文用「（缓推特写）（BGM 骤停）」等技术括注。运镜/声画进 sidecar 与 SB，不进台词原文。

### 对白簇意图（D2）

- `emotion_hit` / `conflict_escalate` / 单句 >20 字：`splitHint: speak_react`（或 `reaction_shot`）
- Speak 镜口型 + **static**；React 镜可 gentle push；口型仅 speak

### 换档

创作中换 profile：继续按新风格写；已写正文不会被机器改写，需作者修订。制作台换档 → 结构 heal，对白不动。
