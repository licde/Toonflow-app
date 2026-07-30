# Video Intent Ops Contract (VIRD)

Mirror of `POST /api/scriptAgent/videoIntentOps` + `docs/toonflow-web/types/videoIntentOps.ts`.

## Hard rules

1. **Confirm over silent regen** — BLOCK findings require `forceApply` or `patchIds`; never treat WARN demote as ready.
2. **`designExitPass ≠ videoPromptReady`** — exit green does not authorize burn when VIRD still BLOCK.
3. **Pseudo dialogue** — keys like `：：：：…Ns` strip via homology heal; must not lip-sync.
4. **beatDuration vs vendor** — author 1–2s event windows must not silent-pad to 4/6 without lip/FX basis.
5. **Viral cam** — retention intent mediates via `viral_motion_mediate.json` per vendor; unmappable → Confirm. Contact Motion verbs/phases must not be mapped away.
6. **Still pose → Motion** — `stillPoseAnchor` / `contactStartState=at_locus` 时 Motion 禁「自…侧进入」；闸 `STILL-VIDEO-POSE-MISMATCH`（`assertStillVideoPoseHandoff`）。
7. **Key optional** — 无 VLM Key ⇒ `pixelDimStatus=unmeasured`；人审可交付；禁硬「必须配置 Key」挡路。
8. **可播 ≠ videoPass** — `playable`/`qcSoftDeliver` 可预览下载，但未 `videoPass`/`motionPassAt` 前 FE 禁绿标交付。

## Actions

| action | meaning |
|--------|---------|
| `diagnose` / `dryRun` | findings + primaryAction + ctaLabel |
| `apply` | apply patches; re-diagnose until-clear；须 cascade forwardStale |

## FE CTA

Use `videoIrdCtaLabel` — prefer enhance / hand_edit_vd / voice / beat / cam mediate.

Post-burn `primaryNextStep=human_review` → CTA「SVQ 未测维 · 人审」或「未测·人审（非失败）」（`isSvqHumanReviewStep`）；禁止当 videoPass.

**成片人审** — `POST …/humanRejudgeFidelity` `modality=video` 写 `motionPassAt`/`videoPass`；静帧人审通过后 cascade `videoStale` 强制重编译。

**接触事件** — `still_prop_missing` / `STILL-CONTACT-HANDOFF` → CTA「重出带道具静照」；`vid_contact_beats` →「重编译接触分相 Motion」；pose mismatch → 重编译 at_locus 模板；`missingSlots` 可含 `propInFrame` / `contactBeats`。

**M7 `VIDEO-PROMPT-STALE` / `video_prompt_stale`** → CTA「重编译视频提示词」（`isVideoPromptStaleSignal`）；禁 IRD forceApply 顶替；禁旧 prompt 幽灵烧片。

**Post-burn soft deliver (`qcWeak`)** — vendor 已出片 + SVQ/IRD 软债 → 可预览，债条仍展示（`VideoIntentDebtBar` softDeliverHint）；仅真 vendor 失败保持 `生成失败`。

**Batch soft_defer** — 批烧响应 `summary.softDeferred` / `honestPartial`；部分成功 ≠ 整批绿标。

Wire: `ShotSpecDrawer` → `POST /api/scriptAgent/videoIntentOps`；UI `VideoIntentDebtBar`（对称 LitDetailDebtBar，含成片人审 CTA）。

`VIDEO-PROMPT-STALE` 债条主按钮 → `recompile-prompt` → workbench `genText`；禁止用 IRD forceApply 顶替。

`fillModeMatrix` 不得用更长脏 seed 覆盖已编译 `generateVideoPrompt` 结果。

类型：`types/videoIntentOps.ts` + `components/VideoIntentDebtBar.vue`
