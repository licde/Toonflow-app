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
| C11 | T5 | I1–I20 / lines↔audio / shape B20 B23 | [partial] |
| C12 | T6 | derive UX; F9–F18; RulePanel | [partial] |
| C13 | T7 | E2E journey + expanded closure-suite | [x] |
| C14 | T8 | FE vitest/playwright smoke | [x] |
