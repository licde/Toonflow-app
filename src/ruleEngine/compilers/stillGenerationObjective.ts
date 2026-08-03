/**
 * stillGenerationObjective — compress a generation contract into model-friendly prompt layers.
 * Event > prop/glyph > anti-sub > micro > identity for contact/prop objectives.
 * No shot-specific character names in strip patterns.
 */
import type { GenerationContract } from "../design/deriveGenerationContract";
import { guardStillPromptFoundations } from "./stillPromptFoundationGuard";

export type StillGenerationObjective = {
  primaryObjective: string[];
  secondaryConstraints: string[];
  sacrificableConstraints: string[];
  strippedFlowHints: string[];
  stripPatterns: RegExp[];
  promptLead: string;
};

function orderMustFacts(facts: GenerationContract["mustShowFacts"]): string[] {
  const rank = (id: string): number => {
    if (id === "contact_geom") return 0;
    if (id === "prop_form" || id === "prop_pose") return 1;
    if (id === "prop_readable" || id === "prop_glyph" || id === "foreground" || id === "contact_freeze") return 2;
    if (id.startsWith("micro_")) return 3;
    if (id === "color_temp" || id === "spatial") return 4;
    if (id === "vd") return 9;
    return 5;
  };
  return [...facts]
    .filter((f) => f.priority === "must")
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map((f) => f.text);
}

export function deriveStillGenerationObjective(input: {
  contract: GenerationContract;
  visualDescription?: string | null;
  prompt?: string | null;
}): StillGenerationObjective {
  const strippedFlowHints: string[] = [];
  const rawPrompt = String(input.prompt ?? "");
  if (/不可读则拆|失败后|确认智能拆镜|手改VD/.test(rawPrompt)) {
    strippedFlowHints.push("repair_flow_removed");
  }

  const orderedMust = orderMustFacts(input.contract.mustShowFacts);
  const eventLead = orderedMust.filter((t) => !/定妆|锁定脸型|本镜主look/.test(t)).slice(0, 4);
  const identitySoft = orderedMust.filter((t) => /定妆|锁定脸型|本镜主look/.test(t)).slice(0, 1);
  // forbidden/antiSub stay in contract bag — NEVER splice into promptLead
  const microFacts = input.contract.mustShowFacts
    .filter((f) => f.id.startsWith("micro_"))
    .map((f) => f.text)
    .slice(0, 2);

  const secondaryConstraints = input.contract.secondaryConstraints.map((f) => f.text).slice(0, 4);
  const sacrificableConstraints = input.contract.sacrificableConstraints.map((f) => f.text).slice(0, 3);

  const stripPatterns: RegExp[] = [];
  if (input.contract.sceneWeight === "min") {
    stripPatterns.push(/SCENE-\d+/gi, /--sref\s+\S+/gi);
  }
  const eventObj =
    input.contract.objectiveClass === "contact_geom" ||
    input.contract.objectiveClass === "prop_readable" ||
    input.contract.objectiveClass === "action_primary";
  if (eventObj) {
    stripPatterns.push(/[^。；]*完整立像[^。；]*[。；]?/g);
    stripPatterns.push(/[^。；]*半身立像[^。；]*[。；]?/g);
    stripPatterns.push(/[^。；]*配角站立[^。；]*[。；]?/g);
    stripPatterns.push(/[^。；]*二号角色[^。；]*[。；]?/g);
    stripPatterns.push(/[^。；]*禁四视图\/拼版[^。；]*[。；]?/g);
    stripPatterns.push(/(?:^|[。；])[^。；]*手持(?:折扇|团扇|扇|伞|杯)[^。；]*[。；]?/g);
    // Fragment budget: strip secondary 站位…站立 only — never wipe primary 弯腰/捡
    stripPatterns.push(/站位：[^\n。；]*(?:次角|配角|二号)[^\n。；]*站立[^\n。；]*/g);
    stripPatterns.push(/anchors?=[^\n。；]*(?:次角|配角|二号)[^\n。；]*站立[^\n。；]*/gi);
    stripPatterns.push(/站位：[^\n。；]*完整立像[^\n。；]*/g);
  }

  const identityHint =
    eventObj && identitySoft.length
      ? identitySoft.map((t) => t.replace(/手持[^。；]*/g, "").trim())
      : identitySoft;
  // Positive lead only — strip any accidental 禁止 clauses from must facts
  const cleanLead = [...eventLead.slice(0, 3), ...microFacts, ...identityHint]
    .map((t) => String(t).replace(/禁止[^。；]*/g, "").trim())
    .filter(Boolean);
  const promptLead = cleanLead.join("。");

  return {
    primaryObjective: eventLead,
    secondaryConstraints,
    sacrificableConstraints,
    strippedFlowHints,
    stripPatterns,
    promptLead,
  };
}

export function applyGenerationObjectiveToPrompt(input: {
  prompt: string;
  objective: StillGenerationObjective;
  contract?: GenerationContract | null;
  visualDescription?: string | null;
  characterNames?: string[];
  primaryIntentSeal?: {
    poseOccupancy?: string;
    sealHash?: string;
    propInHand?: boolean;
  } | null;
}): { prompt: string; foundationRestored: string[] } {
  const original = String(input.prompt ?? "").trim();
  let rest = original;
  for (const re of input.objective.stripPatterns) {
    rest = rest.replace(re, " ");
  }
  rest = rest.replace(/\s{2,}/g, " ").replace(/。{2,}/g, "。").trim();

  // For event objectives: keep identity lock sentences but move after lead (don't let them dominate)
  const eventObj =
    input.contract?.objectiveClass === "contact_geom" ||
    input.contract?.objectiveClass === "prop_readable";
  if (eventObj) {
    const identityBits: string[] = [];
    rest = rest
      .replace(/[^。；]*(?:定妆为准|锁定脸型|禁止重塑五官)[^。；]*[。；]?/g, (m) => {
        identityBits.push(m.replace(/[。；]+$/g, "").trim());
        return " ";
      })
      .replace(/\s{2,}/g, " ")
      .trim();
    if (identityBits.length) {
      rest = `${rest}。${identityBits.slice(0, 1).join("。")}`.replace(/。{2,}/g, "。");
    }
  }

  const sections = [
    input.objective.promptLead,
    ...input.objective.secondaryConstraints,
    ...input.objective.sacrificableConstraints,
    rest,
  ]
    .filter(Boolean)
    .join("。")
    .replace(/。{2,}/g, "。")
    .trim();

  const guarded = guardStillPromptFoundations({
    prompt: sections,
    originalPrompt: original,
    visualDescription: input.visualDescription,
    contract: input.contract,
    characterNames: input.characterNames,
    primaryIntentSeal: input.primaryIntentSeal,
  });
  let prompt = guarded.prompt;
  try {
    if (input.primaryIntentSeal?.sealHash || input.primaryIntentSeal?.poseOccupancy) {
      const { gatePromptThroughPrimarySeal } =
        require("./primaryIntentSeal") as typeof import("./primaryIntentSeal");
      const gated = gatePromptThroughPrimarySeal({
        prompt,
        seal: input.primaryIntentSeal as import("./primaryIntentSeal").PrimaryIntentCarrierSet,
      });
      prompt = gated.prompt;
    }
  } catch {
    /* optional */
  }
  return { prompt, foundationRestored: guarded.restored };
}
