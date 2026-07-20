# 闭环差距矩阵

每讨论域过 7 环：Spec → Schema → Forward → Audit → Reverse → Repair → Smart。

**全局检测 SSOT：** `data/fixtures/closure_detection_registry.json`（`yarn generate:detection-registry`）  
**覆盖率 CI：** `yarn audit:detection-coverage`  
**生产 preflight：** `POST /api/ruleEngine/preflightProduction`

| 域 | Audit | Chain |
|----|-------|-------|
| 改编 ADP | adaptationGaps | adaptation_deep |
| 留存 RET | retentionGaps | retention |
| 叙事 NAR | narrativeDriveGaps | narrative_drive |
| 包装 PKG | packagingGaps | packaging |
| 生成 GEN | generationApplyGaps | generation_apply |
| 设计 DSG | designSpecGaps | designBrief |
| 爆款 VIR | scriptViralGaps | viral_clip |
| 模态 MOD | modalityGaps | modality_feasibility / modality_compile |

`inspectBundle.closureReport` 聚合 missing（链断/字段空）与 optimize（drift/质量弱）。

Tier：T1/T2 跳过 T3 四槽 missing（见 `docs/PROMPT_STANDARD.md`）。

运行 `yarn audit:closure-gaps` 检查接线状态。
