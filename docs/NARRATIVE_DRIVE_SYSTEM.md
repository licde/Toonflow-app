# 叙事驱动系统

与 `data/fixtures/narrative_drive_spec.json` 同一份标准。

## 三原则

1. 留存靠有用信息交付，不靠猜谜式悬念
2. 动作是因、对话是果
3. 每句台词须标 `functions` + `causedByActionId`

## 结构化字段

- `informationLedger` — 信息账本
- `dialoguePlan` — 台词设计
- `narrativeCausalityGraph` — 六类因果
- designBrief B20–B23 镜像

验收：`inspectBundle.narrativeDriveGaps`（NAR-*）
