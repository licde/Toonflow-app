# Video Intent Ops Contract (VIRD)

Mirror of `POST /api/scriptAgent/videoIntentOps` + `docs/toonflow-web/types/videoIntentOps.ts`.

## Hard rules (Wave-2)

1. **永不硬阻断** — 质量债不 400 死路、不灰烧按钮；漏网 → 降级/最优实现 + 标差异 + CTA「智能修复」。仅真不可拍（缺媒体文件 / 厂商宕机）可失败引导。
2. **设计优先满足** — 行业规范在设计阶段就要满足；不满足 → **静默智能修复写设计**（与 `designAutoClose` / `RepairAsDesign` 同源）。**不是**视频回流改意图。
3. **视频强化实现、不改意图** — Motion/Camera/SFX 时序可强化；禁止把升近景写回 `shotSize` SSOT；实现≠设计时必写 `adaptDiff`。
4. **`designExitPass ≠ videoPromptReady ≠ videoPass`** — 出站先 autoClose；残留横幅+智能修复，不拦试拍；可播 ≠ 通过。
5. **Pseudo dialogue** — keys like `：：：：…Ns` strip via homology heal; must not lip-sync.
6. **beatDuration vs vendor** — author 1–2s event windows must not silent-pad to 4/6 without lip/FX basis.
7. **Viral cam** — retention intent mediates via `viral_motion_mediate.json`；接触 Motion 禁映射丢动词。
8. **Still pose → Motion** — `STILL-VIDEO-POSE-MISMATCH`；可软吸收标债，不硬死路。
9. **Realization adapt** — plate-first；禁 VD「弯腰」毒化 I2V。优先级：`trunk > pose/contact > adapt > episode polish`。
10. **集级 AV** — episode polish **只做实现强化**；设计缺省由设计静默补。
11. **Key optional** — 无 VLM Key ⇒ `pixelDimStatus=unmeasured`；禁硬挡路。
12. **LANG-01 / 中文壳** — Audio `说话人："台词"`；混写标债+智能修复（软路径）。
13. **脸预算 / 对白近景** — 低头+对白+过宽 → 设计侧静默拆 `action_then_dialogue_mcu`；漏网可降级出片并标 diff。
14. **Confirm 仅歧义** — 文学双读 / `presentation_fork`；强契约行业项 `apply_auto`。

## Soft-absorb burn debts (Wave-2)

Never HTTP 400 for these; mark debt + CTA 「智能修复」+ continue (single ≡ batch):

- burn-stage `qualityGate` / LANG / cam mediate scrub
- `VID-DUR-LIP` / lip duration snap / `NO-LIP-DIALOGUE`
- `CHAIN-EGRESS` / `VIDEO-PROMPT-STALE` (live hash continue)
- `VP-THIN-SHELL` design thin shell
- contact / mouth / pose handoff WARN·BLOCK soft path
- fidelity miss (`DEX-VID-FIDELITY`) — note critical vs non-critical; still continue burn
- warehouse / track 需完善 / still contamination absorb

**Still hard-fail (true unshootable):** missing still file, voice-bind file missing on dialogue, identity cref missing, empty episode, vendor/preflight infra down, first-frame gate exception.

**Undo:** `selfHeal` `undoIndustryRepair` restores last changelog `before` (split expands = manual).

**Deferred (full engines):** J/L-cut NLE timeline, true 180° geometry solver, pixel headroom without Key.
## Wave-3 J/L-cut & axis180 (minimal)

- Design: adjacent on-camera dialogue → silent `ensureAdjacentJlCutAvBeats` stamps L-cut / J-cut into `narrative.avBeats`.
- Eyeline heal stamps `axis180` softHint into `avBeats` (not a full 180° geometry solver).
- Episode: consecutive dialogue → polishNotes jl_cut:l_cut / jl_cut:j_cut + realization footnote (design SSOT untouched).
- Still: softHints include xis180; OTS grammar defaults stamp axis180 into avBeats.
- Spine: reads design `avBeats` → Motion / Audio「转场声画」+ Narrative `adaptDiff:designAvBeats→realize` (never rewrite `shotSize`).
- Still deferred: full J/L-cut NLE timeline engine; true 180° geometric solve; pixel headroom without Key.


## Actions

| action | meaning |
|--------|---------|
| `diagnose` / `dryRun` | findings + primaryAction + ctaLabel |
| `apply` | apply patches; cascade forwardStale |

## FE CTA

主 CTA 一律经 `buildPrimaryBlock` → **「智能修复」**（DebtBar / VIRD / generate 包络同源）。persona 文案仅副标题。

债条三行：设计意图 / 当前实现 / 已适配或差异（`adaptDiff` / `repairChangelog`）。

**人审归层** — 景别/脸 → 设计智能修复；motion/情绪/sfx → 实现 adapt；禁止只改 `cameraPolicy` 假装设计已近景。

**M7 stale** — `VIDEO-PROMPT-STALE` → 重编译提示词（智能修复梯子）。

**Batch** — `summary.softDeferred` / `honestPartial` / `repairChangelog`；部分成功 ≠ 整批绿标。

Wire: `ShotWorkbenchDebtMount.vue`；类型 `types/videoIntentOps.ts` + `VideoIntentDebtBar.vue`。

## Wave-4 screenSide & no-Key composition

- `narrative.screenSide` SSOT from spatial keywords (`left|right|center`).
- Adjacent reverse/OTS same-side → `axis180_same_side` continuity finding; silent repair may flip spatial (soft).
- No Key: `assessCompositionSoftNoKey` emits headroom/looking-room/axis180 undeclared debts; `pixelDimStatus=unmeasured`; never invents visualPass.
- Still deferred: full NLE J/L-cut timeline; true CV 180° solver; measured pixel headroom with Key.

## Wave-5 wiring + Key composition + jlCut ms

- **A (wire):** `narrative.screenSide` → spine Visual「画面侧」; episode J/L-cut `narrativeFootnote` / `jlCutTimeline` persist even when `!adapted`; composition soft IDs → `industryResidualDebts` + DebtBar CTA「智能修复」; undo spatialRelation recomputes `screenSide`.
- **B (composition):** No Key → Wave-4 soft `unmeasured` (undeclared headroom/looking-room). Key + `faceBoxNorm` → measured `headroom_tight` / `looking_room_fail` via `assessComposition` (`pixelDimStatus` measured_pass|fail). Key without box stays `unmeasured`. Never invents `visualPass`.
- **C (jlCut one layer):** Soft ms offsets (`jCutAudioLeadMs` / `lCutAudioLagMs`, default 400) on realization pack + spine/Audio「时间线转场」. Driven by design `avBeats` or adjacent dialogue polish. **Not** full NLE (no Premiere/FCPXML, no multi-track editor).
- Still deferred: full NLE export graph; true CV 180° solver; auto face-box from VLM without caller `faceBoxNorm`.

## Wave-6 faceBox meta + transitionAudio handoff

- Soft-read `faceBoxNorm` / `vlmFaceBox` / xywh(+frame) from still meta via `readFaceBoxNormFromMeta` — never invents a box.
- `composeStillPrompt` + silent repair use `assessComposition` (Key+box → measured; else Wave-4 soft).
- `planIndustryAvRepair` kinds: headroom / looking_room / jl_cut → design writes.
- Design soft field `narrative.transitionAudio` mirrors jlCut ms (from avBeats or episode polish) for future NLE handoff — **not** Premiere/FCPXML export.
- Still deferred: full NLE export graph; true CV 180° solver; VLM auto-detect face box when meta lacks one.

## Wave-7 soft face template + eyeline + Z110 stub

- Soft face template (`suggestSoftFaceBoxForFraming`) for compose framing hints only — **never** upgrades `pixelDimStatus` / measured path.
- Axis soft: `axis180_same_eyeline` on reverse pairs with same L/R gaze; silent heal may flip VD eyeline keywords.
- `Z110.timeline.transitions` stub_json from `transitionAudio` / avBeats (`exportReady: false`, not Premiere/FCPXML).
- Still deferred: full NLE export; true CV 180° / face detection; Premiere/FCPXML packager.

## Wave-8 eyelineDir + single/batch persist + EDL stub

- `narrative.eyelineDir` SSOT stamped in silent repair; spine Visual「视线」; undoable.
- `persistEpisodeAvEnhance` shared by **generateVideo** and **batchGenerateVideo** (single ≡ batch jlCut / transitionAudio).
- `Z110.edlStub` CMX-like text from transitions — handoff only; `exportReady: false`; still not Premiere/FCPXML.
- Still deferred: full NLE editor/export; true CV 180° / auto face detect.

## Wave-9 FCPXML stub + export handoff surface

- `Z110.fcpXmlStub` minimal xmeml scaffold from transitions (lognote carries J/L ms) — **not** a production FCP/Premiere project.
- `exportPackage` returns `handoff` summary (`transitionCount` / `hasEdl` / `hasFcpXml` / `exportReady:false`).
- FE: `types/z110Handoff.ts` + RulePanel「Z110 声画交接（stub）」banner.
- Still deferred: full NLE editor; real FCPXML/Premiere packager; true CV 180° / face detect.

## Wave-10 local soft face + handoff on report/exportGate

- `estimateLocalSoftFaceBox` (sharp luma/skinish blob) stamps `localSoftFaceBox` / `faceBoxNormProvisional` after still gen — **always provisional**, never `measured_*`.
- Compose prefers real meta box → local soft → size template.
- `exportGate.z110Handoff` + `getReport` light handoff (`includeHandoff`, default on when not full export).
- FE unwrap `z110Handoff` on dryRun/inspect path.
- Still deferred: true CV face/180°; production NLE packager.

## Wave-11 face-box axis soft + Premiere XML stub

- `faceBoxAxisSoft`: screenSide / eyelineDir from face box center + looking-room (fills when keyword unknown; not CV solver).
- Silent repair stamps `screenSideSource=face_box_soft` / `eyelineDirSource=face_box_looking_room`.
- `Z110.premiereXmlStub` Premiere-style XML scaffold — **not** a real Premiere/AAF project.
- Handoff summary adds `hasPremiereXml`.
- Still deferred: true CV 180°/face detect; production NLE packager.

## Wave-12 face-box axis audit + stub copy/download

- `auditAxis180Pair` fills unknown sides from face-box center; may emit `axis180_same_side_face_box`.
- `pickZ110HandoffStub` + `exportPackage` `stubFormat=edl|fcp|premiere|json` for copy/download.
- RulePanel: 复制 EDL / FCPXML / Premiere stub + 下载 EDL.
- Still deferred: true CV; production NLE packager.

## Wave-13 provisional soft composition + OTIO stub

- `assessCompositionProvisionalSoft` / `provisionalFaceBoxNorm`: local soft face box yields `headroom_soft_provisional` / `looking_room_soft_provisional` — always `unmeasured`, never `measured_*` / visualPass.
- Compose + silent repair consume provisional geometry for soft hints/debts only.
- `Z110.otioStub` OTIO-shaped JSON handoff — **not** production OpenTimelineIO / Resolve.
- `stubFormat=otio` + RulePanel 复制/下载 OTIO；handoff `hasOtio`.
- Still deferred: true CV face/180°; production NLE packager.

## Wave-14 axis chain + composition heal + stub list

- `auditAxis180Chain` / `auditEpisodeAxisChain`: ≥2 same-side failures in one scene → `axis180_chain_same_side` (soft residual).
- Silent repair: provisional/measured composition findings → RepairAsDesign VD hints (`compHeal:*`); never hard-block.
- `listZ110HandoffStubs` + `exportPackage` `stubFormat=all` + RulePanel「下载全部 stub」.
- Still deferred: true CV; production NLE packager.

## Wave-15 Resolve stub + axisAudit + chain soft notes

- `Z110.resolveXmlStub` Resolve-style XML scaffold — **not** a real DaVinci Resolve / AAF project.
- `Z110.timeline.axisAudit` from `buildZ110AxisAudit` (pair findings + chain rollup; soft, not CV).
- Silent repair on chain risk: stamp `avBeats` axis note + `narrative.axisChainNote` (`axisChainNote:*`).
- `stubFormat=resolve` + RulePanel Resolve stub; handoff `hasResolveXml` / `axisPairFindings`.
- Still deferred: true CV face/180°; production NLE packager.

## Wave-16 framing room SSOT + handoffManifest

- `narrative.headroomStatus` / `lookingRoomStatus` from face-box soft geometry (`framingRoomSoft`) — never measured_*.
- Silent repair stamps framing SSOT (`framingRoom:*`); spine Visual injects 头上空间 / 视线前方留白 when tight.
- `Z110.handoffManifest` inventory JSON + `stubFormat=manifest` + RulePanel 复制 manifest; handoff `hasManifest`.
- Still deferred: true CV face/180°; production NLE packager.

## Wave-17 framingAudit + SRT stub

- `Z110.timeline.framingAudit` rollup of headroom/lookingRoom tight counts (soft, not CV).
- Silent repair residuals: `framing_headroom_tight` / `framing_looking_room_tight`.
- `Z110.srtStub` from dialogue lines — handoff only, not burned-in; `stubFormat=srt` + RulePanel 复制/下载 SRT.
- Handoff `hasSrt` / `framingTight`.
- Still deferred: true CV face/180°; production NLE packager.

## Wave-19 Still SSOT sole spine (architecture close)

- **Read:** `stillSsotRead` is the unique reader; stamped `narrative.stillPhase` / `firstFrameAction` / emo / bgBlur win; re-extract only when stamp absent or VD hash changed.
- **Stamp:** IntentGraph sets `stillPhaseAuthorLock` + `stillPhaseVdHash`; reconciles conflicting FG (手捏→伸向); unlocked re-infer banned while stamp intact.
- **Egress:** compose final = `formatFirstFrameEgressSpine` + identity token tail (`ff.ssot_only_egress`); sample/foundation/compress/Core propLead do not legislate approaching grip/浅景深.
- **Handoff:** generateVideo ≡ batchGenerateVideo phase motion hints; exportGate echoes `stillPhase`; `requireFixBeforeBurn` soft (quality never alone hard-blocks).
- **Policy unchanged:** Key optional; design-first; LLM fills SSOT JSON only (optional).
- Golden: `yarn test:g-lgia-still-phase`.

## Wave-18 First-Frame Literary SSOT + NormGate

**单镜静帧设计意图 = 首帧文学唯一真源 + 智能匹配行业规范加分。**

- **Extract:** `extractStillFirstFrameLiterary` — primary / action freeze / prop / phase / emotion；VD 全过程捏紧 → 静帧 approaching。
- **Design refine:** IntentGraph stamps extract onto `narrative`（幂等）；不堆「禁止作为主态」对立立法。
- **NormGate:** `intentClass × phase × 景别` 兼容才注入短正向（硬顶 2）；action×approaching → 通常 0 条。
- **Compose spine:** SSOT 正向核 + 匹配规范 + ≤4 必要负向；停用第二套 bend_lead / VD 捏紧 lead；终局 `stripInterferenceAgainstFirstFrame`。
- **Refs:** 真休书资产优先；`pose_cue_no_paper` 不得挂 propSoft；`bgBlur:false` → atmosphere，禁 SCENE 佛像抢戏。
- **Policy:** Key 可选；质量债软；`stillPhase` 回包同源；approaching 未捏紧 ≠ `action_misfire`。
- Golden: `yarn test:g-lgia-still-phase`.
- Still deferred: true CV; production NLE.

## LGIA / stillPhase (Wave-18 legacy notes)

Literary-Gated Industry Adapt folded into First-Frame SSOT above. `stillPhase` remains the freeze field on extract; opposing forbid stacks removed.
