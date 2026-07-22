# VisBeat Ops — FE/BE 契约

API: `POST /api/scriptAgent/visBeatOps`

| action | 必填 | 说明 |
|--------|------|------|
| `suggestTags` | `projectId`, `shotIndex?` | L1 提案，**不立法** |
| `setTags` | `projectId`, `shotIndex`, `visualBeatTags?` / `purpose?` | 写入 L0 tags |
| `proposeSplit` / `confirmExpand` | `projectId` | 跑 expander（weapon→visual→cluster）；可选 `scriptId`+`syncStoryboard` |
| `setOverride` | `projectId`, `shotIndex`, `overrideReason?` | 艺术长镜头旁路（显式审计） |
| `dryRunPanel` | `projectId` | 每镜 matrixRowId / explain |
| `forwardReentry` | `projectId` | 改标后 stale 标记；保留 hq_ok |

可选 body：`pillarsVisBeatV2: off|shadow|enforce`（默认 shadow）。

## ConfirmBar 最小 UI

见 `docs/toonflow-web/components/VisBeatConfirmBar.vue`（a11y region + 双 CTA）。

- 展示 `explain` + `matrixRowId`
- 主 CTA：确认拆镜 → `confirmExpand`
- 次 CTA：长镜头 → `setOverride`
- 禁止静默把未拆父镜标 `hq_ok`
- `confirmExpand` / `proposeSplit` / `setOverride`：每项目每分钟 ≤30 次（429）

## scriptAgent 工具

`set_visual_beat_tags` / `suggest_visual_beat_tags` / `confirm_visual_split` / `set_vis_beat_override` / `vis_beat_dry_run`
