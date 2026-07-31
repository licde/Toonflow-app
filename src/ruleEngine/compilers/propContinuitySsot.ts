/**
 * Neighbor prop continuity SSOT — declare-only chain across adjacent shots.
 * CUT-01 keeps scene/colorTemp; prop state owned here (DEX-PROP-CONT).
 */
import { loadLiteraryIntentDoctrine } from "./stillLiteraryIntentSsot";
import { detectStructuralSlots } from "./stillLiteraryDetailQuality";

export type PropContFinding = {
  id: "DEX-PROP-CONT" | "DEX-PROP-POSE";
  ruleId: "vanish" | "teleport" | "airdrop" | "pose_jump";
  severity: "BLOCK" | "WARN";
  message: string;
  shotIndex?: number;
  missingSlots?: string[];
};

export type PropShotInput = {
  shotIndex?: number;
  visualDescription?: string | null;
  sceneName?: string | null;
  transitionType?: string | null;
  propState?: string | null;
  /** Geometric / contact pose chain — held|at_cheek|ground|released */
  propPose?: string | null;
  shotSize?: string | null;
  /** shotDesignIntent.picture — airdrop allowlist */
  intentPicture?: string | null;
  emptyShot?: boolean;
  osOnly?: boolean;
  /** XOR / oneBeat split child — exempt PROP chain vs parent siblings */
  xorSplit?: boolean;
  _stillBeatSplitId?: string | null;
  _visualSplitId?: string | null;
  _litEnhanceApplied?: boolean;
};

const RELEASE_RE = /放下|丢下|离手|撕毁|撕破|已毁|扔开|抛开|收起|入袖|入怀/;
const EMPTY_RE = /空镜|无人|纯场景|establishing|empty.?shot/i;
const OS_RE = /（OS）|\(OS\)|画外|OS\/VO/;

/** Drop metaphor/false props (如刀、目光冷厉) and grip spans without real prop nouns. */
function sanitizePropToken(tok: string, vd: string): string | null {
  const t = String(tok ?? "").trim();
  if (!t || t.length < 2) return null;
  // Metaphor: 「如刀/似剑」— 刀/剑 not a held prop
  if (/^[刀剑杯盏]$/.test(t) && new RegExp(`(?:如|似|若)${t}`).test(vd)) return null;
  if (
    /厉如刀|冷厉|目光|眼神|杀意|挲门|与门环|执半面|纸张边|起休书|捏紧纸|袖口/.test(t)
  ) {
    return null;
  }
  // Grip fragment without canonical prop noun
  if (/^(?:捏|攥|握|执|捧)/.test(t) && !/(?:休书|信笺|信纸|纸角|书信|玉佩|面具|石子)/.test(t)) {
    return null;
  }
  return t;
}

export function extractPropTokens(vd?: string | null): string[] {
  const text = String(vd ?? "");
  const slots = detectStructuralSlots(vd);
  const raw = [
    ...slots.propSpans,
    ...slots.gripStruct.filter((g) => /持|握|捏|攥|捧|执/.test(g) && /(?:书|信|纸|帕|剑|刀|杯|扇|环|佩|面具|石)/.test(g)),
  ];
  return [...new Set(raw.map((t) => sanitizePropToken(t, text)).filter(Boolean) as string[])];
}

/** Hydrate propState from VD for CUT/Exit homology (declare-only). */
export function hydratePropStateFromVd(visualDescription?: string | null): string {
  const tokens = extractPropTokens(visualDescription);
  if (!tokens.length) {
    if (RELEASE_RE.test(String(visualDescription ?? ""))) return "released";
    return "";
  }
  return tokens.slice(0, 6).join("|");
}

function isExemptPair(a: PropShotInput, b: PropShotInput): boolean {
  if (a.xorSplit || b.xorSplit) return true;
  if (a._stillBeatSplitId && b._stillBeatSplitId && a._stillBeatSplitId === b._stillBeatSplitId) return true;
  if (a._visualSplitId && b._visualSplitId && a._visualSplitId === b._visualSplitId) return true;
  // Cam/lip split children often share shotIndex until reindex — declare-only chain, not BLOCK
  const ia = Number(a.shotIndex) || 0;
  const ib = Number(b.shotIndex) || 0;
  if (ia > 0 && ia === ib) return true;
  if (a.sceneName && b.sceneName && a.sceneName !== b.sceneName) return true;
  const t = String(b.transitionType ?? "");
  if (t && t !== "切" && !/^cut$/i.test(t)) return true;
  if (b.emptyShot || EMPTY_RE.test(String(b.visualDescription ?? ""))) return true;
  if (b.osOnly || OS_RE.test(String(b.visualDescription ?? ""))) return true;
  if (RELEASE_RE.test(String(a.visualDescription ?? "")) || RELEASE_RE.test(String(b.visualDescription ?? "")))
    return true;
  return false;
}

function isReactionNoProp(b: PropShotInput, propsB: string[]): boolean {
  if (propsB.length) return false;
  const vd = String(b.visualDescription ?? "");
  const sz = String(b.shotSize ?? "");
  return /特写|近景|反应|侧脸|正脸|冷笑|凝视/.test(sz + vd) && !/持|握|递|扔|捡|书|剑|杯|帕/.test(vd);
}

/**
 * Audit adjacent shots for prop continuity gaps.
 * Never invent prop names — only compare declared tokens / propState.
 */
export function auditPropContinuity(shots: PropShotInput[]): PropContFinding[] {
  const doctrine = loadLiteraryIntentDoctrine() as {
    literaryDetailQuality?: { propContinuity?: { severityChat?: string } };
  };
  const sevChat =
    (doctrine.literaryDetailQuality?.propContinuity?.severityChat as "BLOCK" | "WARN") || "BLOCK";
  const out: PropContFinding[] = [];

  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1]!;
    const b = shots[i]!;
    const idx = b.shotIndex ?? i + 1;
    if (isExemptPair(a, b)) continue;

    const propsA = [
      ...extractPropTokens(a.visualDescription),
      ...propStateBaseTokens(a.propState),
    ];
    const propsB = [
      ...extractPropTokens(b.visualDescription),
      ...propStateBaseTokens(b.propState),
    ];
    const uniqA = [...new Set(propsA)];
    const uniqB = [...new Set(propsB)];

    if (isReactionNoProp(b, uniqB) && uniqA.length) {
      // soft: reaction may drop prop visibility — WARN only if mid+ held prop without release
      if (!/特写|ecu|cu/i.test(String(b.shotSize ?? ""))) {
        const psB = String(b.propState ?? "");
        if (!/→\s*(continues|offframe|held|carry)/i.test(psB) && !RELEASE_RE.test(psB)) {
          out.push({
            id: "DEX-PROP-CONT",
            ruleId: "vanish",
            severity: "WARN",
            shotIndex: idx,
            message: `镜 ${idx} 邻镜道具连续性：上镜持物「${uniqA.slice(0, 3).join("、")}」本镜未交待离手/去向`,
            missingSlots: ["propCarryOrRelease"],
          });
        }
      }
      continue;
    }

    // Vanish: A had props, B same scene no props and no release — declared →continues/→offframe clears
    if (uniqA.length && !uniqB.length) {
      const psB = String(b.propState ?? "");
      if (/→\s*(continues|offframe|held|carry)/i.test(psB) || RELEASE_RE.test(psB)) {
        continue;
      }
      out.push({
        id: "DEX-PROP-CONT",
        ruleId: "vanish",
        severity: sevChat,
        shotIndex: idx,
        message: `镜 ${idx} 道具消失未交待：上镜「${uniqA.slice(0, 4).join("、")}」→本镜无物象/离手声明`,
        missingSlots: ["propCarryOrRelease"],
      });
      continue;
    }

    // Teleport: both have propState-like and differ without arrow — base-token equal = OK
    const psA = String(a.propState ?? "").trim();
    const psB = String(b.propState ?? "").trim();
    if (psA && psB && psA !== psB && !psB.includes("→") && !RELEASE_RE.test(String(b.visualDescription ?? ""))) {
      const baseA = propStateBaseTokens(psA).sort().join("|");
      const baseB = propStateBaseTokens(psB).sort().join("|");
      if (baseA && baseA === baseB) continue;
      out.push({
        id: "DEX-PROP-CONT",
        ruleId: "teleport",
        severity: sevChat,
        shotIndex: idx,
        message: `镜 ${idx} 道具状态瞬移 ${psA}→${psB}（须交待或写 →）`,
        missingSlots: ["propStateTransition"],
      });
    }

    // Airdrop: new props in B not in A / intent picture
    const pic = String(b.intentPicture ?? "");
    for (const p of uniqB) {
      if (uniqA.some((x) => x.includes(p) || p.includes(x))) continue;
      if (pic && pic.includes(p)) continue;
      if (p.length < 2) continue;
      // Only flag clear airdrop when A also had some prop context or B introduces object mid-scene
      if (!uniqA.length && i > 1) continue;
      if (!uniqA.length) continue;
      out.push({
        id: "DEX-PROP-CONT",
        ruleId: "airdrop",
        severity: "WARN",
        shotIndex: idx,
        message: `镜 ${idx} 道具空降「${p}」：上镜未见且 intent.picture 未报`,
        missingSlots: ["propSource"],
      });
    }
  }
  return out;
}

/**
 * Cross-shot propPose geometry — ground→hand→cheek jumps without transition BLOCK.
 * Complements word-level propState (DEX-PROP-CONT).
 */
export function auditPropPoseContinuity(shots: PropShotInput[]): PropContFinding[] {
  const out: PropContFinding[] = [];
  const norm = (p: string) =>
    String(p ?? "")
      .trim()
      .toLowerCase()
      .replace(/面颊|脸颊|颊/, "cheek")
      .replace(/手持|握|持/, "hand")
      .replace(/地上|地面|落/, "ground")
      .replace(/离手|放下|released/, "released");

  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1]!;
    const b = shots[i]!;
    if (isExemptPair(a, b)) continue;
    const pa = norm(String(a.propPose ?? ""));
    const pb = norm(String(b.propPose ?? ""));
    if (!pa || !pb || pa === pb) continue;
    const jump =
      (pa.includes("ground") && pb.includes("cheek") && !pb.includes("hand")) ||
      (pa.includes("cheek") && pb.includes("ground") && !/落|放|甩/.test(String(b.visualDescription ?? ""))) ||
      (pa.includes("hand") && pb.includes("ground") && !RELEASE_RE.test(String(b.visualDescription ?? "")));
    if (jump) {
      out.push({
        id: "DEX-PROP-POSE",
        ruleId: "pose_jump",
        severity: "BLOCK",
        shotIndex: b.shotIndex ?? i + 1,
        message: `镜 ${b.shotIndex ?? i + 1} 道具姿态跳变 ${pa}→${pb}（须交待过渡）`,
        missingSlots: ["propPoseTransition"],
      });
    }
  }
  return out;
}

/** Apply hydrate onto shot objects (mutates copies' propState when empty). */
export function hydrateShotsPropState<T extends PropShotInput>(shots: T[]): T[] {
  return shots.map((s) => {
    if (String(s.propState ?? "").trim()) return s;
    const hydrated = hydratePropStateFromVd(s.visualDescription);
    if (!hydrated) return s;
    return { ...s, propState: hydrated };
  });
}

export function propStateBaseTokens(ps?: string | null): string[] {
  return String(ps ?? "")
    .split(/[|，,]/)
    .map((s) => s.trim())
    .filter((s) => s && s !== "released" && !/^(?:continues|offframe|held|carry)$/i.test(s))
    .map((s) => {
      // Keep base prop when prior heal wrote `休书→continues` — drop arrow suffix, not whole token
      const base = s.replace(/→.*$/, "").trim();
      return base || "";
    })
    .filter((s) => s && s.length >= 1 && !/厉如刀|冷厉|捏紧纸张|挲门环|执半面/.test(s));
}

/** Clean declare-only carry label — never stack psA→psB garbage chains. */
function declareCarryPropState(from: PropShotInput, mode: "continues" | "offframe"): string {
  const bases = [
    ...new Set([...extractPropTokens(from.visualDescription), ...propStateBaseTokens(from.propState)]),
  ].slice(0, 4);
  const core = bases.join("|") || propStateBaseTokens(from.propState).slice(0, 2).join("|") || "held";
  return `${core}→${mode}`;
}

/**
 * Import/homology soft-heal: declare-only propState carry — never invent VD prose.
 * Vanish → write prior props into empty propState; teleport → insert → arrow.
 * Multi-pass until blocks clear or no progress (3+ shot chains).
 */
export function softHealPropContinuityDeclareOnly<T extends PropShotInput>(
  shots: T[],
): { shots: T[]; mutated: number; blocksLeft: number } {
  let working = hydrateShotsPropState(shots.map((s) => ({ ...s })));
  let mutated = 0;
  const maxPasses = Math.max(2, working.length);

  for (let pass = 0; pass < maxPasses; pass++) {
    let passMut = 0;
    for (let i = 1; i < working.length; i++) {
      const a = working[i - 1]!;
      const b = working[i]!;
      if (isExemptPair(a, b)) continue;

      const propsA = [
        ...extractPropTokens(a.visualDescription),
        ...propStateBaseTokens(a.propState),
      ];
      const propsB = [
        ...extractPropTokens(b.visualDescription),
        ...propStateBaseTokens(b.propState),
      ];
      const uniqA = [...new Set(propsA)];
      const uniqB = [...new Set(propsB)];

      // Vanish: carry declare-only (propState), not VD invent
      if (uniqA.length && !uniqB.length) {
        const next = declareCarryPropState(
          a,
          isReactionNoProp(b, uniqB) ? "offframe" : "continues",
        );
        if (String(b.propState ?? "").trim() !== next) {
          working[i] = { ...b, propState: next };
          passMut++;
        }
        continue;
      }

      const psA = String(a.propState ?? "").trim();
      const psB = String(b.propState ?? "").trim();
      if (psA && psB && psA !== psB && !RELEASE_RE.test(String(b.visualDescription ?? ""))) {
        const baseA = propStateBaseTokens(psA).sort().join("|");
        const baseB = propStateBaseTokens(psB).sort().join("|");
        // Already declared with arrow and same base → skip
        if (psB.includes("→") && baseA && baseA === baseB) continue;
        if (baseA && baseA === baseB && psB.includes("→")) continue;
        // Teleport / dirty chain → rewrite clean continue (禁堆 psA→psB)
        if (!psB.includes("→") || (baseA && baseB && baseA !== baseB) || /→.*→/.test(psB)) {
          const next = declareCarryPropState(a, "continues");
          if (psB !== next) {
            working[i] = { ...b, propState: next };
            passMut++;
          }
        }
      }
    }
    mutated += passMut;
    if (passMut === 0) break;
    const left = auditPropContinuity(working).filter((f) => f.severity === "BLOCK").length;
    if (left === 0) break;
  }

  const findings = auditPropContinuity(working);
  const blocksLeft = findings.filter((f) => f.severity === "BLOCK").length;
  return { shots: working, mutated, blocksLeft };
}

/** Bundle helper: write propState onto preDesignPack.shots */
export function softHealPropContinuityOnBundle(bundle: {
  planData?: unknown;
  preDesignPack?: { shots?: Record<string, unknown>[] };
}): { mutated: number; blocksLeft: number } {
  const pd = (bundle.planData as Record<string, unknown> | undefined) ?? {};
  const nested = pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined;
  const root = bundle.preDesignPack;
  // Prefer the longer live shot list (cam/lip expand writes root first; nested may be stale)
  const rootN = root?.shots?.length ?? 0;
  const nestedN = nested?.shots?.length ?? 0;
  const pack =
    rootN >= nestedN && rootN > 0
      ? root!
      : nestedN > 0
        ? nested!
        : root ?? nested ?? { shots: [] };
  const shots = [...(pack.shots ?? [])];
  if (!shots.length) return { mutated: 0, blocksLeft: 0 };

  const intents = (() => {
    try {
      const { getShotDesignIntentsFromPlan } =
        require("../design/shotDesignIntent") as typeof import("../design/shotDesignIntent");
      return getShotDesignIntentsFromPlan({ planData: pd, ...bundle } as Record<string, unknown>);
    } catch {
      return [] as { shotIndex?: number; picture?: string }[];
    }
  })();

  const input = shots.map((s, i) => {
    const idx = Number(s.shotIndex) || i + 1;
    const narr = s.narrative as
      | { propState?: string; shotSize?: string; transitionType?: string }
      | undefined;
    const intent =
      intents.find((x) => Number((x as { shotIndex?: number }).shotIndex) === idx) ??
      intents.find((x) => String((x as { sceneRef?: string | number }).sceneRef) === String(idx));
    return {
      shotIndex: idx,
      visualDescription: String(s.visualDescription ?? ""),
      sceneName: String(s.sceneName ?? (s as { scene?: string }).scene ?? ""),
      transitionType: String(s.transitionType ?? narr?.transitionType ?? ""),
      propState: String(s.propState ?? narr?.propState ?? ""),
      shotSize: String(s.shotSize ?? narr?.shotSize ?? ""),
      intentPicture: intent?.picture ?? null,
      xorSplit: Boolean((s as { _litXorSplit?: boolean })._litXorSplit),
      _stillBeatSplitId: (s as { _stillBeatSplitId?: string })._stillBeatSplitId ?? null,
      _visualSplitId: (s as { _visualSplitId?: string })._visualSplitId ?? null,
    };
  });

  const healed = softHealPropContinuityDeclareOnly(input);
  for (let i = 0; i < shots.length; i++) {
    const ps = healed.shots[i]?.propState;
    if (ps && String(shots[i]!.propState ?? "") !== ps) {
      shots[i] = { ...shots[i]!, propState: ps };
      const narr = (shots[i]!.narrative as Record<string, unknown> | undefined) ?? {};
      shots[i]!.narrative = { ...narr, propState: ps };
    }
  }
  pack.shots = shots;
  // Dual-write root + nested so seal/exit see the same chain
  if (bundle.preDesignPack) bundle.preDesignPack.shots = shots;
  else bundle.preDesignPack = { shots };
  if (bundle.planData && typeof bundle.planData === "object") {
    const pdx = bundle.planData as { preDesignPack?: { shots?: unknown } };
    if (pdx.preDesignPack) pdx.preDesignPack.shots = shots;
    else (bundle.planData as { preDesignPack: unknown }).preDesignPack = { ...(pack as object), shots };
  }
  return { mutated: healed.mutated, blocksLeft: healed.blocksLeft };
}
