# HQ still → video first_frame contract

HQ storyboard stills produced by the composition/character-first loop are the intended
**video first frame** input for burn pipelines that accept a still (Agnes / Seedream video
`first_frame` / FLF).

## Rules (this iteration)

1. Only `stillQuality === hq_ok` with `visualPass` should be treated as a trusted first_frame.
2. Weak / pendingHumanRejudge stills must not silently become video identity anchors.
3. Background policy (`drop`/`demote`) does not change video compiler prompts this round —
   video compile is unchanged; still composition quality is the lever.
4. Telemetry on still reason meta may include: `bgPolicy`, `layoutTemplateId`, `stageCost`,
   `sceneRefsDropped`, `repairRoute` for ops debugging.

## Follow-ups (not this round)

- Auto-wire `hq_ok` still path into video `role: first_frame` payload when missing.
- Reject burn when still is weak and shot is seatingHard.
