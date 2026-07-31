# Still Intent Ops — FE/BE 契约（IRD）

API: `POST /api/scriptAgent/stillIntentOps`

| action | 必填 | 说明 |
|--------|------|------|
| `diagnose` | `projectId` | 诊断补丁，**不写库**；返回 `patches` / `primaryAction` / `confirmRequired` / LIT·PROP findings / 顶层 `missingSlots`+`ctaLabel` |
| `dryRun` | `projectId`, `shotIndex?` | 同 diagnose，可单镜 |
| `apply` | `projectId`, `patchIds?`, `forceApply?` | 唯一写回核；默认强制 `syncStoryboard`（有 `scriptId`）；失败 `IMPORT-SPLIT-SYNC` |
| `suggestFill` | `projectId` | 文学细节增强建议（与 `applyEnhance` 同模板库；flag 关则空）；**不写库** |
| `applyFill` / `applyEnhance` | `projectId`, `fills?`, `forceApply?`, `intentVisualEnhance?`, `importTrack?` | Confirm/autoMin 写 VD 白名单槽 + drift 拒 + 槽复检；`undo` 可回；cascade SB+MD-IMG；重跑 designExit |
| `undo` | `projectId`, `packageVersion` | 与 designSplit 同 undo 栈 |

可选：`scriptId`, `syncStoryboard`（默认 true）, `chatStrict` 时须 `forceApply`；`confidence` 与 `autoMin`(0.7) 同源。

## 守卫

- `chatStrict` → apply 拒绝，仅返回 diagnose / Confirm
- `literaryLocked` → 禁静默改文学 VD（须 force）
- 低置信 → `confirm_enhance` / `confirmRequired`；exportGate `IRD-CONFIRM` BLOCK
- apply 后：**服务端强制重跑 designExit**；增强 thrash≥3 → `litEnhanceForceHandEdit`
- `primaryAction`：`confirm_enhance` / `apply_auto_enhance` / `confirm_split` / `hand_edit_vd` / **`presentation_fork`**（中置信须选 fork-A/B，禁空跳手改）；**禁**塌 `batch_still`
- 生成：`generateFlowImage` 默认 `qualityMode=hq_update`（含无 storyboardId 工作流画布）；显式 `draft` 才逃逸文学硬闸；响应回显 `excludeScene` / `sceneRefsDropped` / `blockSilentRegen` / `settingsDeepLink` / `keyOptional` / `pixelDimStatus`
- 文学细节：`DEX-LIT-CONTACT-XOR`（颊触≠口含，`missingSlots=contactRoleXor`；≠`audio_xor`；**face-CU 双接触 → `split_shot`，禁止互斥句洗绿**；同源 `stillDebtActionRouter`）/ `DEX-LIT-CONTACT` / `DEX-PROP-IN-FRAME`（`propInFrame`+`contactGeom`；浅痕≠道具；CTA「重出带道具静照」）/ `DEX-LIT-ANCHOR` / `DEX-LIT-EXPR` / `DEX-PROP-CONT`；`wound_visible`/`prop_readable`/`本镜主look` 已进 L0 mustTokens（非仅 VLM）
- 导入：`allowImportStructureSoftFill` 白名单软填；XOR 智拆优先；**同核 until-clear**（`softHealTouchHomology`：F0+台词 absorb/strip）检测 PASS 才算解决；禁 demote/WARN 顶可愈债；`importOk≠designExitPass`（Exit 记 `IMPORT_OK_NOT_EXIT`）仅标未清零 Confirm；禁剧情/FX 散文；拆后 `cascadeForwardStale`
- FE：`LitDetailDebtBar` 支持批准增强 / 拆镜 / 人审 / **presentationFork 双路径** / 手改；类型见 `docs/toonflow-web/types/stillIntentOps.ts`；`stillQuality.shouldBlockSilentStillRegen` / `faceCuRefsEchoLabel` / `mergePreflightBlocksForToast` / `humanRejudgePrimaryCta` — **仅 design 债（`split_shot`/`chat_repair`/缺槽/人审）禁止静默再打 generate**；`retry_shot`/VENDOR/参考图下载失败等**不闩死「生成图片」**；触达 toast 合并时 passed 优先于陈旧 BLOCK
- VisBeat confirmExpand 后服务端强制 designExit（同源 IRD apply）；文学增强 CTA 走本契约；`repair_confidence_ladder.json` 为 IRD/VIRD/SelfHeal 置信 SSOT
- 禁止：仅 regen 静帧冒充设计完成；hygiene（F0/tags）≠ still_ok；generate 轨静默智拆改镜数；**触达残差 WARN 顶 DC/FX 可愈债**；draft 作视频首帧；无 cascade 的 IRD apply
- 类型：`types/stillIntentOps.ts` + `types/stillQuality.ts` + `types/videoIntentOps.ts`

## scriptAgent

路由已挂：`/api/scriptAgent/stillIntentOps`
