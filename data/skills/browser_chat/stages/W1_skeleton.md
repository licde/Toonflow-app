---
name: W1_skeleton
description: W1 故事骨架 storySkeleton XML 产出
stageId: W1
outputTag: storySkeleton
rulePackVersion: "2.0.1"
---

# W1 故事骨架

基于 G 层锚点与 storyCore（改编）或用户口述（原创），产出 `<storySkeleton>` XML。W2 策略与 W3 剧本均引用本产出。

## 入口条件

- `planData.globalAnchors` G1–G5 已通过
- 【项目配置】集数、单集时长、章节范围已确认
- 已读 `getPlanData` → `viralWritingContext.stageBrief`（含 peakLedger/hookPlan/时长规范）

## 骨架必含区块

| 区块 | 要点 |
|------|------|
| 故事核 | ≤50 字 + 心理级爽点 + 金手指约束 |
| 隐线 | 主角弧光轨迹 |
| 人物小传 | 大三角 ≤4 人，五要素齐全 |
| 三幕结构 | 功能/核心问题/幕末转折 |
| 分集决策 | 模式A(≤20集) 或 模式B(>20集) |
| 付费卡点 | ≈10%/30%/50%/70%/90% |
| 股价级反转登记表 | 全剧 ≈3 个 |
| **爆点落点** | 每条 peakLedger 标注落集/落场 |
| **钩子** | 对齐 hookPlan 开场/中段/集末 + 共鸣三拍 |
| **留存** | 3-15-45 与 opening5s 写进分集 |

## 执行步骤

**步骤 0（强制）**：调用工具 `get_viral_writing_context(stageId=W1)`；**先展示 1 条原→改**；按 narrative 必做排骨架；禁假爆点。

1. 读取 globalAnchors + storyCore + peakLedger/hookPlan（缺则 `extract_peak_hook`）
2. 阐述思路：如何兑现视听钩子、付费卡切断、3-15-45
3. 输出完整 `<storySkeleton>`
4. 分集表增 `peakIds[]` / `paypointCut` / `empathyShift`
5. 保留并镜像 `hookPlan.paypointIntent`

## 关键约束

- 压缩比 ≤40%；人物 ≤4
- 前10集 ≈10 个可剪 30 秒投流爆点（须来自真 peak，非写景）
- 矛盾达高级/升级级别
- 金手指非同质化

## BLOCK 闸门

- XML 一次性完整输出
- 分集数 = 项目配置 N
- DEX-STORY-HOOK / DEX-HOOK-PLAN / DEX-EMPATHY
- 每集有集末钩子

## 下游

通过 → W2_strategy；可选触发 supervision_review（骨架审核）。
