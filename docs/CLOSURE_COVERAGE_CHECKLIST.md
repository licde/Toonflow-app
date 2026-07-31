# Closure coverage checklist (release gate)

Mark before release. Mapped from full closed-loop plan tracks.

| ID | Track | Item | Done |
|----|-------|------|------|
| C01 | T-NC | normalizeAssetCode SSOT + FE/BE | [x] |
| C02 | T0 | 19fce1 golden + server re-audit | [x] |
| C03 | T0 | FX empty ≠ PASS; orphan/info/cast gates | [x] |
| C04 | T1 | assetClosureGate create/update/replaceAll | [x] |
| C05 | T1 | comma multi-cref; SCENE/PROP/sref | [x] |
| C06 | T1 | mode adapt (no wipe); polling harden | [x] |
| C07 | T2 | AUD/FX columns; GC always-on; getFlowData charCodes | [x] |
| C08 | T3 | FT/RV table + routing drift + rePush paths | [x] |
| C09 | T3 | skipPreflight lock; parentRef; oss/queue | [x] |
| C10 | T4 | continuity writeback; BP; videoDesc authority | [x] |
| C11 | T5 | I1–I20 / lines↔audio / shape B20 B23 | [partial] — practice wave: AUD-LIT batch parity + PROMPT-AUD matrix; full I1–I20 DEFER |
| C12 | T6 | derive UX; F9–F18; RulePanel | [x] — RulePanel W93 Confirm/Apply + presentationFork; DebtBar 保留镜级 IRD |
| C13 | T7 | E2E journey + expanded closure-suite | [x] |
| C14 | T8 | FE vitest/playwright smoke | [x] |
| C15 | V5 | apply reGate + cascade/DB + stamp proposals | [x] — smartProposal/IRD/VIRD + exportGate/setStepStatus/SelfHeal |
| C16 | V5 | Chat homology + contract CI | [x] — `yarn audit:v5-contract-ci` |
| C17 | V5 | Escape hatches N11 | [x] — pose BLOCK; MOD critical BLOCK; skipPreflight lit lock; humanRejudge undo |
| C18 | V5 | Cross-ep continuity hydrate | [x] — seriesContinuityByEpisode + no invent carry |
| C19 | V5 | Toonflow-web ship (W93/人审/soft_defer) | [x] — `yarn build:integrate` → `data/web` |
