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
