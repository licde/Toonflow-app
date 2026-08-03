/**
 * Shot3 design-intent golden — CHAR-SCENE 休书接信镜.
 * Used by scripts/test-g-video-shot3-intent-parity.ts
 */
export const SHOT3_INTENT_GOLDEN = {
  shotIndex: 3,
  type: "CHAR-SCENE",
  sceneName: "寝殿",
  duration: 3,
  shotSize: "MS",
  visualDescription: "中景。沈清漪弯腰捡起休书，指尖捏紧纸张边缘，指节泛白，面颊浅痕清晰。",
  charCodes: ["CHAR-SHENQINGYI"],
  shotDesign: {
    composition: { foreground: "沈清漪手捏休书", background: "沈母裙摆" },
    performance: { microExpression: { eyes: "focused", mouthDetail: "neutral_closed" } },
    cameraAnchor: { shotSize: "MS", bgBlur: false },
    lipSyncPolicy: "dialogue_native",
  },
  narrative: {
    dialogue: {
      lines: [
        {
          speaker: "沈清漪",
          text: "这休书，我收下了。",
          lineId: "L-01",
          functions: ["character_voice", "conflict_escalate"],
        },
      ],
    },
    markers: [{ type: "承接", desc: "接信" }],
    emotionIntensity: 6,
    spatialRelation: "axis=沈清漪-沈母；anchors=沈清漪弯腰|沈母站立",
    transitionType: "切",
    rhythmZone: "起",
  },
  generation: {
    audioPrompt: "沈清漪，清冷女声，隐忍而决绝",
    fxPrompt: "",
    fxFeasibility: "F0",
  },
} as const;

/** Expected atoms after adaptBurn / spine (post mouth XOR heal). */
export const SHOT3_EXPECTED_ATOMS = {
  dialogueCjk: "这休书",
  eyes: "focused",
  mouthHealed: "speak_ready",
  motionVerbs: ["弯腰", "捏紧"],
  voice: "清冷女声",
  noEnSpoken: true,
  noFxSection: true,
  compositionFg: "手捏休书",
} as const;

/** Path B — kneel plate: intent still bend, motion plate-first. */
export const SHOT3_DEGRADED_STILL_META = {
  intentOccupancy: "bend_pickup",
  realizationOccupancy: "kneel_hold",
  realizationDegraded: true,
  realizationReason: "degrade_bend_to_kneel_hold",
} as const;

export const SHOT3_DEGRADED_EXPECTED = {
  noBendMotion: true,
  hasKneelMotion: true,
  hasPinchMotion: true,
  narrativeFootnote: "设计意图仍为弯腰捡拾",
  plateFirst: "起态与静帧一致",
} as const;

/** Cross-shot regression matrix — dialogue / action / contact / weak-light stubs. */
export const REALIZATION_REGRESSION_MATRIX = [
  { id: "dialogue_bend", intent: "bend_pickup", real: "kneel_hold", degraded: true, hasDialogue: true },
  { id: "action_bend", intent: "bend_pickup", real: "bend_pickup", degraded: false, hasDialogue: false },
  { id: "stand_card", intent: "bend_pickup", real: "stand_hold", degraded: true, hasDialogue: false },
  { id: "weak_light", intent: "bend_pickup", real: "kneel_hold", degraded: true, atmosphere: "烛光" },
] as const;
