/**
 * Still Seal Gate — typed occupancy/objective egress invariant + contamination class.
 * Non-blocking: strip hostile legislation; never throw for contract debt.
 * Homology: generate may continue; burn/I2V inherit may gate on deliveryTier/contam.
 */
import type { PrimaryIntentCarrierSet } from "./primaryIntentSeal";
import {
  gatePromptThroughPrimarySeal,
  occupancyCompressLead,
  occupancyLeadStem,
} from "./primaryIntentSeal";

export type ContaminationClass =
  | "off_beat_cu"
  | "contact_zombie"
  | "locus_mangled"
  | "plate_geometry"
  | "glyph_identity"
  | "none";

const CHEEK_CONTACT_POS =
  /接触几何：|须与.{0,6}贴合\/划过|真实贴合\/划过|入画于触点|仅[\u4e00-\u9fff]{1,4}触非口含|禁口含；禁纸入口；仅|休书须与面颊真实贴合|须与面颊真实贴合|颊触薄纸角|划过面颊|贴颊|（颊触）|\(颊触\)/;
const HOLD_CARD = /胸前手持卡片|手持卡片|胸前展示卡|挡脸举物|举卡展示/;
/** Neighbor oral-CU atoms — strip under bend even when 浅痕 co-occurs */
const BLOOD_ORAL = /渗出血珠|紧咬下唇|咬唇|lip_bite|血珠渗|唇瓣渗|眼神隐忍/;
const OFF_BEAT_ORAL_CU =
  /特写[。．]?[\u4e00-\u9fff]{0,6}紧咬|紧咬下唇|唇瓣渗出血珠|渗出血珠|眼神隐忍|唇部特写|侧脸特写/;
const FACE_RECIPE = /正脸朝向镜头/;
const PURPLE_ROBE_LOCUS = /紫袍金|须与合贴合|仅合触非口含|仅紫袍金触/;

export function isBendSealed(seal?: {
  poseOccupancy?: string | null;
  primaryObjective?: string | null;
} | null): boolean {
  return (
    seal?.poseOccupancy === "bend_pickup" ||
    (seal?.primaryObjective === "action_primary" && seal?.poseOccupancy !== "kneel_hold")
  );
}

export function isTrueContactSealed(seal?: {
  poseOccupancy?: string | null;
  primaryObjective?: string | null;
} | null): boolean {
  return seal?.primaryObjective === "contact_geom" && seal?.poseOccupancy !== "bend_pickup";
}

/**
 * True when clause is neighbor oral-CU contamination (not current-shot 浅痕 alone).
 * 浅痕 without BLOOD_ORAL / 特写咬唇 → keep (shot3 VD may have 面颊浅痕清晰).
 */
export function isOffBeatOralCuClause(clause: string, currentVd?: string | null): boolean {
  const p = String(clause ?? "").trim();
  if (!p) return false;
  const vd = String(currentVd ?? "");
  // Current VD already owns the oral beat → not off-beat
  if (BLOOD_ORAL.test(vd) && BLOOD_ORAL.test(p) && /咬|渗血|血珠/.test(vd)) {
    return false;
  }
  if (BLOOD_ORAL.test(p) || OFF_BEAT_ORAL_CU.test(p)) return true;
  // CU framing + lip/blood residue without bend verb
  if (/^特写/.test(p) && /唇|血珠|隐忍/.test(p) && !/弯腰|捡起|捡拾|俯身/.test(p)) return true;
  return false;
}

/**
 * Strip cheek-contact + neighbor oral-CU legislation when bend/action sealed.
 * Keeps hold-card bans. Cancels prior 浅痕-coexistence exemption for BLOOD_ORAL.
 */
export function stripHostileCheekLegislation(
  prompt: string,
  seal?: PrimaryIntentCarrierSet | null,
  opts?: { currentVisualDescription?: string | null },
): {
  prompt: string;
  stripped: string[];
} {
  let next = String(prompt ?? "");
  const stripped: string[] = [];
  if (!isBendSealed(seal) && seal?.poseOccupancy !== "bend_pickup") {
    return { prompt: next, stripped };
  }
  const vd = opts?.currentVisualDescription ?? null;
  const parts = next.split(/[。；;\n]+/).map((s) => s.trim()).filter(Boolean);
  const kept: string[] = [];
  for (const p of parts) {
    const isBan = /^禁止/.test(p) || /禁止手持卡片|禁止以跪坐|禁止伏案/.test(p);
    if (!isBan && (CHEEK_CONTACT_POS.test(p) || PURPLE_ROBE_LOCUS.test(p))) {
      stripped.push(p.slice(0, 40));
      continue;
    }
    // BLOOD_ORAL / neighbor CU oral — no 浅痕 exemption
    if (!isBan && isOffBeatOralCuClause(p, vd)) {
      stripped.push(`oral_cu:${p.slice(0, 24)}`);
      continue;
    }
    kept.push(p);
  }
  next = kept.join("。");
  // Drop mangled contact lead at head + residual oral tokens
  next = next
    .replace(/接触几何：[^。；]{0,80}[。；]?/g, "")
    .replace(/须与[合紫袍金绣]{1,4}贴合\/划过[^。；]{0,40}[。；]?/g, "")
    .replace(/仅[合紫袍金]{1,4}触非口含[。；]?/g, "")
    .replace(/紧咬下唇[^。；]{0,20}/g, "")
    .replace(/唇瓣渗出血珠|渗出血珠/g, "")
    .replace(/眼神隐忍/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/。{2,}/g, "。")
    .trim();
  return { prompt: next, stripped };
}

/** Strip face-toward-camera HQ recipe when action/bend/side/empty. */
export function stripFaceRecipeForAction(prompt: string, seal?: PrimaryIntentCarrierSet | null): {
  prompt: string;
  stripped: boolean;
} {
  const t = String(prompt ?? "");
  const bend = isBendSealed(seal);
  const side = /侧脸/.test(t);
  const empty = seal?.primaryObjective === "empty_scene";
  if (!(bend || side || empty || seal?.primaryObjective === "action_primary")) {
    return { prompt: t, stripped: false };
  }
  if (!FACE_RECIPE.test(t)) return { prompt: t, stripped: false };
  const next = t
    .replace(/[^。；]*正脸朝向镜头[^。；]*[。；]?/g, "竖屏9:16安全区构图，主体完整入画不裁切。")
    .replace(/\s{2,}/g, " ")
    .trim();
  return { prompt: next, stripped: true };
}

/**
 * Full egress obeys seal: restore L0, drop competing occupancy + hostile cheek for bend.
 * Never throws — always returns a usable prompt.
 */
export function assertEgressObeysPrimarySeal(input: {
  prompt: string;
  seal?: PrimaryIntentCarrierSet | null;
  ensureBendLead?: boolean;
  /** LGIA stillPhase — approaching lead ≠ grip-complete; don't strip phase atoms */
  stillPhase?: string | null;
}): {
  prompt: string;
  ok: boolean;
  sources: string[];
  contaminationHints: ContaminationClass[];
} {
  const sources: string[] = [];
  const hints: ContaminationClass[] = [];
  let prompt = String(input.prompt ?? "").trim();
  const seal = input.seal;
  const phase = String(input.stillPhase ?? "");
  const approaching = phase === "approaching" || phase === "mid_contact";

  if (seal?.sealHash) {
    const gated = gatePromptThroughPrimarySeal({ prompt, seal });
    prompt = gated.prompt;
    if (gated.restored.length) sources.push(...gated.restored.map((r) => `seal.gate.restore:${r}`));
    if (gated.dropped.length) sources.push(`seal.gate.drop:${gated.dropped.length}`);
  }

  if (isBendSealed(seal)) {
    // Preserve LGIA phase approach atoms — not contact_zombie cheek legislation
    const hasPhaseAtom = /尚未捏紧|接近地面薄纸|手伸向纸面|刚触及/.test(prompt.slice(0, 160));
    if (!approaching && !hasPhaseAtom) {
      const cheek = stripHostileCheekLegislation(prompt, seal, {
        currentVisualDescription: undefined,
      });
      prompt = cheek.prompt;
      if (cheek.stripped.length) {
        sources.push("seal.gate.strip:contact_zombie");
        if (cheek.stripped.some((s) => /oral_cu|blood/.test(s))) {
          sources.push("seal.gate.strip:off_beat_oral");
          hints.push("off_beat_cu");
        } else {
          hints.push("contact_zombie");
        }
      }
    } else if (approaching || hasPhaseAtom) {
      sources.push("seal.gate.preserve:lgia_stillPhase_atoms");
    }
    if (input.ensureBendLead !== false) {
      const lead = occupancyCompressLead(seal?.poseOccupancy ?? "bend_pickup", {
        stillPhase: phase || (hasPhaseAtom ? "approaching" : null),
      });
      if (!/弯腰|捡拾|捡起|俯身/.test(prompt.slice(0, 120))) {
        prompt = `${lead}${prompt}`.replace(/。{2,}/g, "。").trim();
        sources.push("seal.gate.ensure:bend_lead");
      }
    }
  }

  const face = stripFaceRecipeForAction(prompt, seal);
  prompt = face.prompt;
  if (face.stripped) sources.push("seal.gate.strip:face_recipe");

  if (PURPLE_ROBE_LOCUS.test(prompt)) {
    const cleaned = stripHostileCheekLegislation(prompt, seal ?? { poseOccupancy: "bend_pickup", gripLocus: [], primarySpatialStems: [], primaryObjective: "action_primary", propInHand: true, sealHash: "tmp" });
    prompt = cleaned.prompt;
    hints.push("locus_mangled");
    sources.push("seal.gate.strip:locus_mangled");
  }

  return {
    prompt: prompt.replace(/\s{2,}/g, " ").replace(/。{2,}/g, "。").trim(),
    ok: true,
    sources: [...new Set(sources)],
    contaminationHints: [...new Set(hints)],
  };
}

export function classifyStillContamination(input: {
  promptUsed?: string | null;
  seal?: { poseOccupancy?: string | null; primaryObjective?: string | null } | null;
  composeSources?: string[] | null;
  propPlateMissing?: boolean | null;
  previousDroppedOffBeat?: boolean | null;
  /** LGIA: approaching bend atoms must not be misread as contact_zombie / kneel */
  stillPhase?: string | null;
}): ContaminationClass {
  const prompt = String(input.promptUsed ?? "");
  const sources = input.composeSources ?? [];
  const phase = String(input.stillPhase ?? "");
  const approaching = phase === "approaching" || phase === "mid_contact";
  if (input.previousDroppedOffBeat || sources.some((s) => /previous\.dropped_off_beat|off_beat/.test(s))) {
    return "off_beat_cu";
  }
  if (isBendSealed(input.seal)) {
    const head = prompt.slice(0, 100);
    // Phase atoms:「尚未捏紧」「占位：弯腰俯身接近」are not cheek-contact zombies
    const phaseApproachAtom =
      approaching ||
      /尚未捏紧|接近地面薄纸|手伸向纸面|刚触及/.test(head) ||
      sources.some((s) => /lgia\.stillPhase:approaching|lgia\.stillPhase:mid_contact/.test(s));
    if (
      !phaseApproachAtom &&
      (CHEEK_CONTACT_POS.test(head) || /接触几何：/.test(head))
    ) {
      return "contact_zombie";
    }
    if (PURPLE_ROBE_LOCUS.test(prompt)) return "locus_mangled";
    if (input.propPlateMissing && HOLD_CARD.test(prompt) === false) {
      /* missing plate alone → plate_geometry when bend */
      return "plate_geometry";
    }
  }
  if (PURPLE_ROBE_LOCUS.test(prompt)) return "locus_mangled";
  if (
    !approaching &&
    sources.some((s) => /contact_zombie|foundation\.restore:.*contact_geom/.test(s)) &&
    isBendSealed(input.seal)
  ) {
    return "contact_zombie";
  }
  return "none";
}

/** Bend-necessary negatives that must not be squeezed out of egressNegBudget. */
export function bendNegCarveOut(): string[] {
  return [
    "手持卡片挡脸",
    "跪坐替代弯腰",
    "蹲身替代弯腰",
    "蹲跪触地",
    "盘坐捡纸",
    "灰棚白棚",
    "胸前展示卡",
    "胸前标牌贴纸",
    "手提袋写字",
    "现代西装西裤",
    "牛仔夹克牛仔裤",
    "现代连衣裙露背",
    "次角完整正脸立像",
  ];
}

export function buildI2vCriticalFactsFromSeal(seal?: PrimaryIntentCarrierSet | null): string[] {
  if (!seal?.sealHash) return [];
  const facts: string[] = [];
  if (seal.poseOccupancy && seal.poseOccupancy !== "other") {
    facts.push(occupancyLeadStem(seal.poseOccupancy));
  }
  if (seal.gripLocus?.includes("knuckles_pale")) facts.push("指尖捏紧指节泛白");
  if (seal.propInHand) facts.push("纸在主手");
  if (seal.primaryObjective === "contact_geom") facts.push("贴合划过");
  return facts.slice(0, 6);
}

/** Policy: generate path never hard-blocks on contamination — inherit may. */
export function stillGenerateNonBlockPolicy(input: {
  contaminationClass?: ContaminationClass | null;
  deliveryTier?: string | null;
}): {
  blocksGenerate: false;
  blocksI2vInherit: boolean;
  deliveryTier: string;
  ctaLabel: string;
} {
  const contam = input.contaminationClass && input.contaminationClass !== "none";
  const tier = contam ? "draft" : String(input.deliveryTier ?? "draft");
  return {
    blocksGenerate: false,
    blocksI2vInherit: Boolean(contam) || tier === "draft",
    deliveryTier: tier,
    ctaLabel: contam ? "继续生成修复" : "生成静帧",
  };
}

export { BLOOD_ORAL, HOLD_CARD, CHEEK_CONTACT_POS, OFF_BEAT_ORAL_CU };
