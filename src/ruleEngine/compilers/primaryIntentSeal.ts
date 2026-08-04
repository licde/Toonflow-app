/**
 * PrimaryIntentCarrierSet — seal after intelligent match; norm supplements cannot erase L0.
 * Generic: no role-name / shot hardcoding.
 */
import type {
  DesignIntentProfile,
  GripLocusAtom,
  PoseOccupancy,
} from "./designIntentProfile";
import { createHash } from "crypto";

export type NormSupplementLayer = "L1" | "L2" | "L3" | "L4";

export type PrimaryIntentCarrierSet = {
  poseOccupancy: PoseOccupancy;
  gripLocus: GripLocusAtom[];
  primarySpatialStems: string[];
  primaryObjective: DesignIntentProfile["primaryObjective"];
  propInHand: boolean;
  sealHash: string;
  /** Literary fingerprint at seal time — mismatch → reseal + forceFull */
  literaryHash?: string;
  /** Realization ladder (降方案不降意图) — optional stamp */
  realizationOccupancy?: PoseOccupancy;
  realizationDegraded?: boolean;
  realizationReason?: string;
};

/** Occupancy positive lead stems (L0). */
export function occupancyLeadStem(occ: PoseOccupancy): string {
  switch (occ) {
    case "bend_pickup":
      return "占位：弯腰捡拾，躯干前倾，纸在主手近地触地";
    case "kneel_hold":
      return "占位：跪坐持物，躯干稳定";
    case "desk_lean":
      return "占位：伏案靠桌（文学声明）";
    case "stand_hold":
      return "占位：站立持物";
    default:
      return "占位：按文学主姿态入画";
  }
}

/** Compact compress lead (no hard-coded bend for all action_primary). */
export function occupancyCompressLead(
  occ: PoseOccupancy | null | undefined,
  opts?: { stillPhase?: string | null },
): string {
  switch (occ) {
    case "bend_pickup": {
      const phase = String(opts?.stillPhase ?? "");
      if (phase === "approaching" || phase === "mid_contact") {
        return "占位：弯腰俯身接近地面薄纸，手伸向纸面（尚未捏紧完成），休书在地。";
      }
      return "占位：弯腰捡拾，躯干前倾，指尖捏紧指节泛白，休书薄纸主手近地触地。";
    }
    case "kneel_hold":
      return "占位：跪坐持物，躯干稳定，道具在主手。";
    case "desk_lean":
      return "占位：伏案靠桌，道具入画。";
    case "stand_hold":
      return "占位：站立持物，道具在主手。";
    default:
      return "占位：按文学主姿态入画，道具在主手。";
  }
}

const L0_STEM_RE: Record<PoseOccupancy, RegExp> = {
  bend_pickup: /弯腰|捡拾|捡起|俯身|躯干前倾/,
  kneel_hold: /跪坐|跪姿|屈膝跪/,
  desk_lean: /伏案|靠桌|倚案/,
  stand_hold: /站立持|立持|站立持物/,
  other: /占位/,
};

/** Cheek/contact leads that must not dominate when bend_pickup is sealed. */
function competesWithBendAsContact(line: string, seal: PrimaryIntentCarrierSet): boolean {
  if (seal.poseOccupancy !== "bend_pickup" && seal.primaryObjective !== "action_primary") return false;
  const t = String(line ?? "");
  if (!t.trim()) return false;
  // DebtHints with 禁止 are ok; positive cheek legislation is not
  if (/禁止以颊触|禁止划过替代|弯腰捡拾占位优先/.test(t)) return false;
  return (
    /颊触|划过面颊|贴颊|入画于颊触|真实贴合\/划过|仅(?:面颊|颊)触非口含|禁口含；禁纸入口/.test(t) &&
    !/禁止颊触|非颊触/.test(t)
  );
}

/** Lines that would legislate a competing occupancy (must drop when L0 sealed). */
function competesWithOccupancy(line: string, seal: PrimaryIntentCarrierSet): boolean {
  const t = String(line ?? "");
  if (!t.trim()) return false;
  if (competesWithBendAsContact(t, seal)) return true;
  const occ = seal.poseOccupancy;
  if (occ === "bend_pickup") {
    return /伏案靠桌代替|以跪坐持书替代弯腰|占位：跪坐|占位：伏案|占位：站立持/.test(t) && !/禁止/.test(t);
  }
  if (occ === "kneel_hold") {
    return /占位：弯腰|弯腰捡拾/.test(t) && !/禁止/.test(t);
  }
  if (occ === "stand_hold") {
    return /占位：弯腰|弯腰捡拾|占位：跪坐/.test(t) && !/禁止/.test(t);
  }
  if (occ === "desk_lean") {
    return /占位：弯腰|弯腰捡拾/.test(t) && !/禁止/.test(t);
  }
  return false;
}

/** Fragment/DOF/formScale/glyph — L2/L3; never erase L0 stems in text. */
function erasesPrimarySpatial(line: string, seal: PrimaryIntentCarrierSet): boolean {
  const t = String(line ?? "");
  if (!t.trim()) return false;
  // Explicit delete of primary occupancy stems
  if (/删[除去].*(?:弯腰|捡|跪|占位)|去掉占位|清除站位主锚/.test(t)) return true;
  for (const stem of seal.primarySpatialStems) {
    if (stem.length >= 2 && new RegExp(`(?:禁止|勿|不要).{0,4}${stem.slice(0, 2)}`).test(t)) {
      // ban of secondary standing is ok; ban of primary bend is not
      if (L0_STEM_RE[seal.poseOccupancy].test(stem) && /禁止|勿|不要/.test(t)) {
        if (/禁止次角|禁止完整|禁止伏案代替|禁止以跪坐/.test(t)) continue;
        if (new RegExp(`禁止.{0,6}${stem.slice(0, 2)}`).test(t) && seal.poseOccupancy !== "other") {
          return /禁止弯腰|禁止捡|禁止跪坐持|禁止站立持|禁止占位/.test(t);
        }
      }
    }
  }
  return false;
}

function extractPrimarySpatialStems(
  profile: DesignIntentProfile,
  spatialRelation?: unknown,
): string[] {
  const stems: string[] = [];
  const lead = occupancyLeadStem(profile.poseOccupancy);
  if (profile.poseOccupancy !== "other") {
    const bits = lead.replace(/^占位：/, "").split(/[，,]/).map((s) => s.trim()).filter(Boolean);
    stems.push(...bits.slice(0, 3));
  }
  const raw =
    typeof spatialRelation === "string"
      ? spatialRelation
      : spatialRelation && typeof spatialRelation === "object"
        ? JSON.stringify(spatialRelation)
        : "";
  for (const m of raw.match(/弯腰|捡起|俯身|跪坐|伏案|站立持|主手|指节/g) ?? []) {
    stems.push(m);
  }
  return [...new Set(stems)].slice(0, 8);
}

export function sealPrimaryIntentCarriers(input: {
  profile: DesignIntentProfile;
  literaryHash?: string | null;
  spatialRelation?: unknown;
}): PrimaryIntentCarrierSet {
  const profile = input.profile;
  const primarySpatialStems = extractPrimarySpatialStems(profile, input.spatialRelation);
  const propInHand =
    profile.gripLocus.includes("prop_in_hand") ||
    profile.gripLocus.includes("lead_hand") ||
    profile.classes.includes("action_grip") ||
    profile.classes.includes("doc_readable");
  const payload = [
    profile.poseOccupancy,
    profile.gripLocus.join("+"),
    primarySpatialStems.join("|"),
    profile.primaryObjective,
    propInHand ? "1" : "0",
    String(input.literaryHash ?? ""),
  ].join("::");
  const sealHash = createHash("sha256").update(payload).digest("hex").slice(0, 16);
  return {
    poseOccupancy: profile.poseOccupancy,
    gripLocus: [...profile.gripLocus],
    primarySpatialStems,
    primaryObjective: profile.primaryObjective,
    propInHand,
    sealHash,
    literaryHash: String(input.literaryHash ?? "").trim() || undefined,
  };
}

/** True when prior seal literaryHash differs from current → caller forceFull + reseal. */
export function shouldResealPrimaryIntent(
  prior: PrimaryIntentCarrierSet | null | undefined,
  literaryHash: string | null | undefined,
): boolean {
  if (!prior?.sealHash) return true;
  const cur = String(literaryHash ?? "").trim();
  const prev = String(prior.literaryHash ?? "").trim();
  if (cur && prev && cur !== prev) return true;
  return false;
}

/**
 * Stick prior occupancy/objective when literaryHash unchanged — norms cannot reclassify to contact.
 */
export function clampProfileToPriorSeal<T extends DesignIntentProfile>(
  profile: T,
  prior: PrimaryIntentCarrierSet | null | undefined,
  literaryHash: string | null | undefined,
): T {
  if (!prior?.sealHash || shouldResealPrimaryIntent(prior, literaryHash)) return profile;
  if (prior.poseOccupancy !== "bend_pickup" && prior.primaryObjective !== "action_primary") {
    return profile;
  }
  const next = { ...profile };
  next.poseOccupancy = prior.poseOccupancy;
  next.primaryObjective = "action_primary";
  if (next.plateMode === "cheek_sweep") {
    next.plateMode =
      next.propClassId && next.propClassId !== "paper_doc" ? "object_inset" : "readable_doc";
  }
  if (next.classes.includes("contact_geom")) {
    next.classes = next.classes.filter((c) => c !== "contact_geom");
    if (!next.classes.includes("contact_xor_pickup")) {
      next.classes = [...next.classes, "contact_xor_pickup"];
    }
    next.contactXorPickup = true;
  }
  if (prior.gripLocus?.length) {
    next.gripLocus = [...new Set([...prior.gripLocus, ...next.gripLocus])];
  }
  return next;
}

export function assertPrimaryCarriersPreserved(
  seal: PrimaryIntentCarrierSet,
  text: string,
): { ok: boolean; missing: string[]; violated: string[] } {
  const t = String(text ?? "");
  const missing: string[] = [];
  const violated: string[] = [];
  if (seal.poseOccupancy !== "other") {
    const re = L0_STEM_RE[seal.poseOccupancy];
    if (!re.test(t) && !t.includes(occupancyLeadStem(seal.poseOccupancy).slice(0, 6))) {
      missing.push(`occupancy:${seal.poseOccupancy}`);
    }
  }
  if (seal.propInHand && !/主手|纸在|持|捏|握|入画于主手|物在手/.test(t)) {
    // soft miss — only when action/prop objective
    if (seal.primaryObjective === "action_primary" || seal.primaryObjective === "prop_readable") {
      missing.push("propInHand");
    }
  }
  if (competesWithOccupancy(t, seal) && /占位：/.test(t)) {
    // competing lead present alongside wrong occupancy
    const wrong =
      seal.poseOccupancy === "kneel_hold" && /占位：弯腰|弯腰捡拾/.test(t)
        ? "wrong_occupancy_bend"
        : seal.poseOccupancy === "bend_pickup" && /占位：跪坐(?!.*禁止)/.test(t)
          ? "wrong_occupancy_kneel"
          : "";
    if (wrong) violated.push(wrong);
  }
  return { ok: missing.length === 0 && violated.length === 0, missing, violated };
}

/**
 * Apply norm supplement lines under seal gate.
 * Drop lines that erase L0 or legislate competing occupancy; order L0-safe.
 */
export function applyNormSupplement(input: {
  seal: PrimaryIntentCarrierSet;
  lines: string[];
  layer?: NormSupplementLayer;
}): { kept: string[]; dropped: string[]; ordered: string[] } {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const line of input.lines) {
    const t = String(line ?? "").trim();
    if (!t) continue;
    if (erasesPrimarySpatial(t, input.seal) || competesWithOccupancy(t, input.seal)) {
      dropped.push(t);
      continue;
    }
    kept.push(t);
  }
  const ordered = orderEgressLeadsByPriority(kept, input.seal);
  return { kept, dropped, ordered };
}

/** L0 occupancy/grip → L1 prop/glyph → L2 fragment → L3 DOF/form/atmosphere */
export function orderEgressLeadsByPriority(
  leads: string[],
  seal?: PrimaryIntentCarrierSet | null,
): string[] {
  const rank = (s: string): number => {
    if (/^占位：/.test(s) || /弯腰|跪坐|伏案|站立持/.test(s)) return 0;
    if (/^握持：|主手|指节|物在手/.test(s)) return 1;
    if (/纸面可见|纸面可有|墨迹|薄笺/.test(s)) return 2;
    if (/背景仅|裙摆|碎片|fragment/i.test(s)) return 3;
    if (/景深：|物尺度：|气氛保留/.test(s)) return 4;
    return 5;
  };
  const sorted = [...leads].sort((a, b) => rank(a) - rank(b));
  if (!seal || seal.poseOccupancy === "other") return sorted;
  const stem = occupancyLeadStem(seal.poseOccupancy);
  const hasOcc = sorted.some((l) => L0_STEM_RE[seal.poseOccupancy].test(l) || l.startsWith("占位："));
  if (!hasOcc) return [stem, ...sorted];
  // Ensure L0 occupancy line is first among 占位
  const occIdx = sorted.findIndex((l) => L0_STEM_RE[seal.poseOccupancy].test(l) || /^占位：/.test(l));
  if (occIdx > 0) {
    const [occ] = sorted.splice(occIdx, 1);
    sorted.unshift(occ!);
  }
  return sorted;
}

/**
 * Gate a full prompt: restore L0 lead if missing; drop competing occupancy leads.
 */
export function gatePromptThroughPrimarySeal(input: {
  prompt: string;
  seal: PrimaryIntentCarrierSet | null | undefined;
}): { prompt: string; ok: boolean; restored: string[]; dropped: string[] } {
  let prompt = String(input.prompt ?? "").trim();
  const restored: string[] = [];
  const dropped: string[] = [];
  const seal = input.seal;
  if (!seal?.sealHash) return { prompt, ok: true, restored, dropped };

  // Drop competing occupancy lead sentences
  const parts = prompt.split(/[。；;\n]+/).map((s) => s.trim()).filter(Boolean);
  const keptParts: string[] = [];
  for (const p of parts) {
    if (competesWithOccupancy(p, seal) && /^占位：/.test(p)) {
      dropped.push(p);
      continue;
    }
    keptParts.push(p);
  }
  prompt = keptParts.join("。");

  const check = assertPrimaryCarriersPreserved(seal, prompt);
  if (check.missing.includes(`occupancy:${seal.poseOccupancy}`) && seal.poseOccupancy !== "other") {
    const lead = occupancyLeadStem(seal.poseOccupancy);
    if (!prompt.includes(lead.slice(0, 6))) {
      prompt = `${lead}。${prompt}`.replace(/。{2,}/g, "。").trim();
      restored.push(`occupancy:${seal.poseOccupancy}`);
    }
  }
  const final = assertPrimaryCarriersPreserved(seal, prompt);
  return { prompt, ok: final.ok, restored, dropped };
}

/** Stamp shape for stillMeta / generationContract (FE+BE homology). */
export function primaryIntentSealEcho(
  seal: PrimaryIntentCarrierSet,
  realization?: {
    realizationOccupancy?: string;
    realizationDegraded?: boolean;
    realizationReason?: string;
    ladder?: string[];
  } | null,
): Record<string, unknown> {
  return {
    poseOccupancy: seal.poseOccupancy,
    gripLocus: seal.gripLocus,
    primarySpatialStems: seal.primarySpatialStems,
    primaryObjective: seal.primaryObjective,
    propInHand: seal.propInHand,
    sealHash: seal.sealHash,
    literaryHash: seal.literaryHash,
    ...(realization
      ? {
          intentOccupancy: seal.poseOccupancy,
          realizationOccupancy: realization.realizationOccupancy ?? seal.poseOccupancy,
          realizationDegraded: realization.realizationDegraded === true,
          realizationReason: realization.realizationReason ?? "",
          realizationLadder: realization.ladder ?? [],
        }
      : {}),
  };
}
