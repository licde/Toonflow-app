---
name: appendix_V_intelligent_repair
description: QP+W93+SF+rePush 智能修复流程
rulePackVersion: "2.0.1"
---

# 智能提示与修复

1. 用户话术 QP-01~20 或 W93~W100
2. SD 检出 → repair_hint_catalog 文案
3. 单点 → fixPlan；增强 → smartDesignProposals（须用户确认）
4. autoApplicable + confidence≥0.8 → applicator
5. 3 轮失败 → rePushPlan；构图歧义 → presentationFork

IC dryRun：intelligent_closure_checklist.json
