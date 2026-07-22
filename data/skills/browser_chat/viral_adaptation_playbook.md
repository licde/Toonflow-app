---
name: viral_adaptation_playbook
description: 爆款系统性改编 Playbook — 对白主推/视听辅助/分集规范/五域修复/反推故事
stageId: playbook
rulePackVersion: "2.1.0"
---

# 爆款改编 Playbook（设计期主路径）

> **Forward gate > Reverse repair**。质量在本站出站维护；禁止带病进下一站。  
> 铁律：**台词/独白主推**；视听辅助不单调；直白给信息；硬规范主落 ep1；后集抓因果。

详见 `docs/VIRAL_ADAPTATION_METHOD.md` · 契约 `viral_rhythm_contract.json`。

## 细节层（必守）

| 层 | 字段 | 要点 |
|----|------|------|
| 主推对白 | dialogue / OS | 事件+情绪说清楚；禁「观众感到」 |
| 视听爆点 | `peakLedger[]` | 真形态+avPayload；禁假爆点 |
| 视听钩子 | `hookPlan` | 开场/中段/集末 + 付费卡 |
| 分镜意图 | `shotDesignIntent[]` | sidecar；SB 只执行 |
| 原→改 | changeLog / reconstructionTrace | **须已应用**，非仅 pack 有例 |
| 锁稿 | `literaryLocked` | W3 通过后禁改正文 |

## 工具

| 工具 | 用途 |
|------|------|
| `get_viral_writing_context` | brief + 铁律 |
| `extract_peak_hook` | 抓取 peak/hook |
| `repair_viral_design` | 五域智能修复 + changeDiff |
| `reconstruct_story_from_signals` | 反推故事（确认后提交） |
| `run_design_exit_gate` | 监督与执行同一套闸 |
| `unlock_literary_lock` | 人工解锁重开设计 |

## 阶段 SOP

### P0

1. 选 pack + audienceTaste + storyStyle + 平台  
2. `extract_peak_hook`  
3. 出站：公式 / peak / hook（viral 禁弱路径跳闸）

### P06

1. 展示原→改 → 写 storyCore + changeLog/trace  
2. 出站含 `DEX-RECON-APPLIED`  
3. 若反推重构：确认 → 级联作废 W1/W3

### W1–W3

1. 对白主推兑现；sidecar 挂意图  
2. 失败 → `repair_viral_design`；打满内核空洞 → 反推 P06  
3. W3 通过 → `literaryLocked`

### designBrief / SB

续读同一 `shotDesignIntent` / sfx；禁重发明爆点。

## 禁

- viral 下 `acknowledgeWeakPath` 跳闸  
- 锁稿后机器改台词  
- 用视听替代主信息  
- 每集通篇套 ep1 30s 清单（后集只检因果）
