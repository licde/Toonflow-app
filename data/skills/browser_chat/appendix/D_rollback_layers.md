---
name: appendix_D_rollback
description: 附录 D · H 层 BLOCK → 回滚阶段
rulePackVersion: "2.0.1"
---

# 附录 D · H 回滚层

| ruleId | rollbackLayer | 说明 |
|--------|---------------|------|
| H2 | GB | 导演规划与 brief 不一致 |
| H3 | SB | 台词/分镜链断裂 |
| H4 | EN | 编译字段缺失 |
| H5 | EN/MD | prompt 漂移/锚点丢失 |
| H9 | EN | 自动追加 --ar 1:1 等 |
| V1–V10 | SB | 分镜字段 |
| MODE-AGNES | MD | 生图开关 |

与 `reverse_route_table.json` 共用；Chat rePushPlan 与 internal applyAutoFix 同表。

import 后 validate BLOCK → 展示 rollbackLayer → 用户修订 JSON 再 import。
