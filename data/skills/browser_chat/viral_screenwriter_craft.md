---
name: viral_screenwriter_craft
description: Browser Chat 编剧爆款思维（从 script_execution 抽取的可执行教学法）
stageId: craft
rulePackVersion: "2.0.1"
---

# 编剧爆款思维 · Browser Chat 可执行版

> **必读**：进入 W 阶段前通读本节。W3 写剧本时对照 `planData.narrativeBrief` 逐条兑现，禁止只填 JSON 字段不落地正文。

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
