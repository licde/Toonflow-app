---
name: appendix_G_smart_design
description: 附录 G · W93-W100 智能设计增强
rulePackVersion: "2.0.1"
---

# 附录 G · 智能设计 W93–W100

用户话术触发 **SF-4 smartDesignProposals**，确认后 merge。

| ID | 触发话术示例 | 提案内容 | merge 落点 |
|----|--------------|----------|------------|
| W93 | 爆点不够/不够爽 | 增情绪峰值场/镜 | W3 或 SB |
| W94 | 太拖/节奏慢 | 删场/压缩台词 | W3 |
| W95 | 反转不够 | 补误导+揭晓 | W1 登记表 / W3 |
| W96 | 人物 flat | 补 arcStage 推进 | designBrief.arcToneMap |
| W97 | 钩子弱 | 补 W12/W13 | W3 首尾场 |
| W98 | 信息太密 | 拆 infoLinkage | designBrief |
| W99 | 同质化 | 换桥段/金手指边界 | W2 策略 |
| W100 | 付费点弱 | 补 paypointMarkers | designBrief |

## 输出结构

```json
{
  "smartDesignProposals": [{
    "ruleId": "W93",
    "trigger": "爆点不够",
    "proposal": "场2 增对峙升级",
    "targetStage": "W3",
    "status": "pending_user_confirm"
  }]
}
```

用户确认 → 写入 fixPlan / rePushPlan → 重跑对应阶段。
