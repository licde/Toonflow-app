# @toonflow/rule-engine-core 移植说明

核心模块位于 `src/ruleEngine/`，可按以下 Port 抽包：

- `AssetPort` / `MediaProbePort` / `GenerationFeedbackPort` / `GenerationJobQueuePort`
- `Facade`: validate / dryRun / preflight / syncFromFlowData
- `RulePack` 插件：`vendor-packs/agnesai.ts`

依赖：Node 18+、better-sqlite3（Toonflow 适配层）。
