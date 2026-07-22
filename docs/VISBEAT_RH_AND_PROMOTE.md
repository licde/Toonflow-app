# VisBeat 反推 / RH / 打标手册

## 失败码 → trigger → 舞台

| 码 | trigger | reverseTarget | 修复 |
|----|---------|---------------|------|
| DEX-VIS-TAG-MISSING | visual_tag_missing | SB/W3 | `setTags` 用枚举 tags |
| DEX-VIS-TAG-INCONSISTENT | visual_tag_inconsistent | SB | 补 picture 或去掉互斥 tags |
| DEX-VIS-SPLIT / VIS-MULTI-BEAT | visual_multi_beat | SB | ConfirmBar 拆镜或 override |
| VIS-BEAT-SCORE | visual_beat_score | SB | 对齐设计/成片 vis_beat |
| VIS-SYNC-DRIFT | visual_sync_drift | SB | confirmExpand + syncStoryboard |

允许 L0 tags（RH 必须写死枚举，防造词）：`reveal,prop_insert,reaction,face_cu,establish,action,speak,os_vo`

## shadow → enforce 检查表

1. 历史包 `migratePackVisualBeatTags` 覆盖率 ≥ 阈值  
2. shadow FP/FN 可接受（见 SLO）  
3. `pillarsVisBeatCanaryPercent` 先小流量  
4. 再全量 `pillarsVisBeatV2=enforce`

## 晋升 runbook

见 `visBeatPromote.ts`：候选 diff → 金标脚手架 → 人工锁 `golden_locked` → 才可合入 `suggestorPatterns`。**永不自动写 conflict_matrix。**
