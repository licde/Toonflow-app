/**
 * Heuristic still pixel judge — no VLM Key path.
 * Marks unmeasured honestly; emits action_misfire / secondary_dominance hints from prompt vs meta only.
 * Never invents visualPass=true / hq_ok.
 */
import { assessComposition } from "../compilers/compositionAssess";
export type HeuristicStillJudgment = {
  measured: boolean;
  debtKind?: "key_unmeasured" | "action_misfire" | "secondary_dominance" | "prop_plate";
  atomMisses: string[];
  hints: string[];
  /** Never claim literary visualPass from heuristics alone */
  visualPassClaim: false;
  pixelDimStatus?: "unmeasured" | "measured_pass" | "measured_fail";
};

export function judgeStillHeuristicNoVlm(input: {
  visualDescription?: string | null;
  promptUsed?: string | null;
  propPlateGrade?: string | null;
  vlmKeyPresent?: boolean;
  shotSize?: string | null;
  faceBudget?: string | null;
  faceBoxNorm?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null;
  /** LGIA stillPhase — approaching must not miss on missing grip */
  stillPhase?: string | null;
  /** Optional cheap signals from caller (not pixel CV) */
  signals?: {
    dualFaceSuspected?: boolean;
    uprightAtTableSuspected?: boolean;
    propInLeadHandSuspected?: boolean | null;
  };
}): HeuristicStillJudgment {
  // Key present with face box → measured composition path; else soft/unmeasured.
  // Never invent visualPass from composition alone.
  if (input.vlmKeyPresent && !input.faceBoxNorm) {
    return { measured: false, atomMisses: [], hints: ["defer_to_vlm"], visualPassClaim: false, pixelDimStatus: "unmeasured" };
  }
  const vd = String(input.visualDescription ?? "");
  const prompt = String(input.promptUsed ?? "");
  const atomMisses: string[] = [];
  const hints: string[] = [];
  let debtKind: HeuristicStillJudgment["debtKind"] = "key_unmeasured";
  let pixelDimStatus: HeuristicStillJudgment["pixelDimStatus"] = "unmeasured";
  const phase = String(input.stillPhase ?? "");
  const approaching = phase === "approaching" || phase === "mid_contact";

  if (String(input.propPlateGrade ?? "") === "missing" && /休书|婚书|信笺|纸|捡|捏/.test(vd)) {
    atomMisses.push("prop_plate");
    debtKind = "prop_plate";
    hints.push("synthesize_or_attach_prop_plate");
  }

  const wantsAction = /弯腰|捡|捏紧|指节/.test(vd);
  if (wantsAction) {
    // Approaching: require bend/reach atoms, not completed grip
    const actionOk = approaching
      ? /弯腰|俯身|接近|伸向|触及|捡/.test(prompt)
      : /弯腰|捡|捏紧|指节/.test(prompt);
    if (!actionOk) {
      atomMisses.push("action_primary_egress");
      debtKind = "action_misfire";
      hints.push("compose_regen_action_primary_lead+force_full");
    }
    if (!approaching && input.signals?.uprightAtTableSuspected) {
      atomMisses.push("action_misfire:desk_lean_ne_pickup");
      debtKind = "action_misfire";
      hints.push("compose_regen_action_primary_lead+force_full");
    }
    if (!approaching && input.signals?.propInLeadHandSuspected === false) {
      atomMisses.push("prop_ownership");
      debtKind = "action_misfire";
      hints.push("prop_in_lead_hand");
    }
  }

  if (/裙摆虚化|仅次角裙摆|身体碎片/.test(prompt) || /裙摆/.test(vd)) {
    if (input.signals?.dualFaceSuspected) {
      atomMisses.push("secondary_dominance");
      debtKind = "secondary_dominance";
      hints.push("strip_secondary_full+skirt_blur");
    }
  }

  // Wave-4/5/6: composition soft (no Key) or measured (Key + faceBox from meta/caller)
  {
    const metaBag = {
      faceBoxNorm: input.faceBoxNorm,
      visualPassAt: input.vlmKeyPresent ? "x" : undefined,
      vlmKeyPresent: input.vlmKeyPresent,
    } as Record<string, unknown>;
    let faceBox = input.faceBoxNorm ?? null;
    try {
      const { readFaceBoxNormFromMeta } =
        require("../compilers/faceBoxNormFromMeta") as typeof import("../compilers/faceBoxNormFromMeta");
      faceBox = faceBox ?? readFaceBoxNormFromMeta(metaBag);
    } catch {
      /* optional */
    }
    const soft = assessComposition({
      keyOrAdapterPresent: Boolean(input.vlmKeyPresent && faceBox),
      faceBoxNorm: faceBox,
      visualDescription: vd,
      promptUsed: prompt,
      shotSize: input.shotSize,
      faceBudget: input.faceBudget,
    });
    pixelDimStatus = soft.pixelDimStatus;
    for (const f of soft.findings) {
      hints.push(f.id);
      atomMisses.push(f.id);
    }
  }
  return {
    measured: softMeasuredOrMisses(atomMisses, pixelDimStatus),
    debtKind,
    atomMisses,
    hints: hints.length ? hints : ["unmeasured_no_vlm_key"],
    visualPassClaim: false,
    pixelDimStatus,
  };
}

function softMeasuredOrMisses(
  atomMisses: string[],
  status: HeuristicStillJudgment["pixelDimStatus"],
): boolean {
  if (status === "measured_pass" || status === "measured_fail") return true;
  return atomMisses.length > 0;
}
