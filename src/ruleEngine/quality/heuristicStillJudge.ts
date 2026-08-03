/**
 * Heuristic still pixel judge — no VLM Key path.
 * Marks unmeasured honestly; emits action_misfire / secondary_dominance hints from prompt vs meta only.
 * Never invents visualPass=true / hq_ok.
 */
import { assessCompositionSoftNoKey } from "../compilers/compositionSoftNoKey";
export type HeuristicStillJudgment = {
  measured: boolean;
  debtKind?: "key_unmeasured" | "action_misfire" | "secondary_dominance" | "prop_plate";
  atomMisses: string[];
  hints: string[];
  /** Never claim literary visualPass from heuristics alone */
  visualPassClaim: false;
};

export function judgeStillHeuristicNoVlm(input: {
  visualDescription?: string | null;
  promptUsed?: string | null;
  propPlateGrade?: string | null;
  vlmKeyPresent?: boolean;
  /** Optional cheap signals from caller (not pixel CV) */
  signals?: {
    dualFaceSuspected?: boolean;
    uprightAtTableSuspected?: boolean;
    propInLeadHandSuspected?: boolean | null;
  };
}): HeuristicStillJudgment {
  if (input.vlmKeyPresent) {
    return { measured: false, atomMisses: [], hints: ["defer_to_vlm"], visualPassClaim: false };
  }
  const vd = String(input.visualDescription ?? "");
  const prompt = String(input.promptUsed ?? "");
  const atomMisses: string[] = [];
  const hints: string[] = [];
  let debtKind: HeuristicStillJudgment["debtKind"] = "key_unmeasured";

  if (String(input.propPlateGrade ?? "") === "missing" && /休书|婚书|信笺|纸|捡|捏/.test(vd)) {
    atomMisses.push("prop_plate");
    debtKind = "prop_plate";
    hints.push("synthesize_or_attach_prop_plate");
  }

  const wantsAction = /弯腰|捡|捏紧|指节/.test(vd);
  if (wantsAction) {
    if (!/弯腰|捡|捏紧|指节/.test(prompt)) {
      atomMisses.push("action_primary_egress");
      debtKind = "action_misfire";
      hints.push("compose_regen_action_primary_lead+force_full");
    }
    if (input.signals?.uprightAtTableSuspected) {
      atomMisses.push("action_misfire:desk_lean_ne_pickup");
      debtKind = "action_misfire";
      hints.push("compose_regen_action_primary_lead+force_full");
    }
    if (input.signals?.propInLeadHandSuspected === false) {
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

    // Wave-4: composition soft debts without Key (never measured pass)
  {
    const soft = assessCompositionSoftNoKey({
      visualDescription: vd,
      promptUsed: prompt,
    });
    for (const f of soft.findings) {
      hints.push(f.id);
      atomMisses.push(f.id);
    }
  }
  return {
    measured: atomMisses.length > 0,
    debtKind,
    atomMisses,
    hints: hints.length ? hints : ["unmeasured_no_vlm_key"],
    visualPassClaim: false,
  };
}
