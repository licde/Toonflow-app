# 爆款系统性方案：设计期正向维护 + 双向反推闭环

> 原则：**Forward gate > Reverse repair**（本站修达标再前进）。质量在 Chat 设计期出站维护；import/制作 hint 仅为漏网兜底。
> 产品铁律：**台词/独白主推**；视听辅助不单调；**直白给信息**不猜；硬规范主落 **ep1**；后集抓因果。

相关：[`viral_rhythm_contract.json`](../data/fixtures/viral_rhythm_contract.json) · [`genre_template_packs/`](../data/fixtures/genre_template_packs/) · [`design_exit_checklist.json`](../data/fixtures/design_exit_checklist.json)

## 产品铁律

| 项 | 规则 |
|----|------|
| 主推 | 对白 / 独白 / OS 明确信息推动故事与情绪 |
| 辅助 | 视听 / 镜头语言可拍不单调，不替代主通道；禁正文技术括注 |
| 给什么 | 角色说出事件与情绪；禁「观众感到…」 |
| 分集 | ep1：0–3s / 30s 信息≤1 / 15·45 / 钩 / 付费前拍；epN+：carry / causedBy |
| 锁稿 | W3 出站 → `literaryLocked`；其后禁改原文；可人工解锁 |

## 双向闭环

```
storyCore 原→改 → 对白主推 → 视听/镜头辅助 → 情绪爆点
        ↑                                    ↓
   反推重构 ←──── 内核空洞信号 ←──── 本站修失败打满
```

- 本站修：`healViralDesignRouter` 五域 A–E
- 反推：`reconstructStoryFromSignals`（默认待确认）→ 级联 `literaryStale` 作废 W1/W3/ep2+
- 工具：`repair_viral_design` / `reconstruct_story_from_signals` / `run_design_exit_gate`

## Chat 正向示范

```
公式+taste/style+抓取 → brief → P06 原→改应用 → W1/W3 → 自检修复 → literaryLocked → SB 续读 sidecar
```

viral 深度下 **禁止** `acknowledgeWeakPath` 跳闸。

## API

| 入口 | 作用 |
|------|------|
| `setViralFormula` | pack + audienceTaste/storyStyle/platform + brief |
| `repairViralDesign` | heal / reconstruct / confirm_recon / unlock_literary |
| `setStepStatus` | 出站硬闸；失败可 autoHeal 1 轮；W3 通过锁稿 |
| `designExitGate` | 与监督共用 SSOT |

## 编译器绑定

`bindViralSidecarForCompile` / `appendViralSidecarToPrompt`：视频提示续读 `shotDesignIntent`+sfx；衰减则 RH 回设计。

## L-Out

投流 AB/完播反哺、真 LUT、成片像素 VLM、BGM 曲库、全季情绪精算。

## Chat bundle ≠ 后端 API

- `yarn bundle:browser-full-flow` 只打包 **skills / fixtures / rule-packs** 给外部 Chat。
- 改 `src/ruleEngine/**`（出站闸、heal、定妆闸等）**不会**进 bundle；需重启 Toonflow 服务生效。
- 顶层 `rulePackVersion` 与 playbook 应对齐（当前 2.1.0）。
