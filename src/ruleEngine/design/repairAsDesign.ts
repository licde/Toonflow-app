/**
 * RepairAsDesign — apply failure-cluster / AV detail writes via design slots.
 * Homologous with IRD enhance + industry silent repair; never hard-blocks generate.
 */
import {
  buildRepairAsDesignPlan,
  type RepairAsDesignPlan,
  type RepairAsDesignWrite,
  type RepairWriteSlot,
} from "./shootableArchitecture";

export type RepairChangelogEntry = {
  slot: string;
  before: string;
  after: string;
  reason: string;
  trigger?: string;
  at: string;
  packageVersion?: number;
};

const SLOT_FIELD: Partial<Record<RepairWriteSlot | string, string>> = {
  visualDescription: "visualDescription",
  microExpression: "microExpression",
  propPose: "propPose",
  dialogueCoverage: "dialogue",
  audioCue: "audioCue",
  sfx: "sfx",
  fxPrompt: "fxPrompt",
  avCausality: "avCausality",
  shotSize: "shotSize",
};

export function planRepairFromFailureCluster(input: {
  kind?: string | null;
  visualDescription?: string | null;
  hint?: string | null;
}): RepairAsDesignPlan {
  const writes: RepairAsDesignWrite[] = [];
  const kind = String(input.kind ?? "");
  const vd = String(input.visualDescription ?? "");
  if (kind === "contact_miss" || /paper_in_mouth|口含|纸入口/i.test(`${kind} ${input.hint ?? ""}`)) {
    writes.push({
      slot: "visualDescription",
      value: /纸未入口|仅颊触/.test(vd)
        ? vd
        : `${vd}${vd.endsWith("。") ? "" : "。"}纸未入口；仅颊触非口含；薄纸角贴合面颊外侧。`,
      reason: "neg_repair_cheek",
    });
    writes.push({ slot: "propPose", value: "薄纸角贴颊划过，禁止口含/手持卡片", reason: "prop_pose" });
    writes.push({ slot: "sfx", value: "纸页摩擦", reason: "contact_sfx" });
  } else if (kind === "prompt_fidelity" || /PROMPT-FIDELITY|锚点未覆盖/i.test(`${kind} ${input.hint ?? ""}`)) {
    const miss = String(input.hint ?? "端坐、太师椅").replace(/提示词未覆盖设计锚点[^；]*/g, "").trim();
    writes.push({
      slot: "visualDescription",
      value: `${vd}${vd.endsWith("。") ? "" : "。"}${miss || "端坐太师椅"}`,
      reason: "prompt_fidelity_vd",
    });
  } else if (kind === "gray_studio" || kind === "missing_prop") {
    writes.push({
      slot: "visualDescription",
      value: `${vd}${vd.endsWith("。") ? "" : "。"}保留室内软环境轮廓，禁止灰棚空白背景。`,
      reason: "soft_env_repair",
    });
  } else if (kind === "prop_substitution") {
    writes.push({
      slot: "propPose",
      value: "本镜事件道具入画贴合触点，禁止以外类持物替代",
      reason: "prop_sub",
    });
  }
  // Wave-2: soft ledger — never hard-block burn after design write
  return buildRepairAsDesignPlan({
    writes,
    blocksBurn: false,
    vendorConstraint: "seedream_multiref",
  });
}

/** Industry AV kinds → design slot writes (homology with silent repair). */
export function planIndustryAvRepair(input: {
  kind?: string | null;
  shot?: Record<string, unknown> | null;
  hint?: string | null;
}): RepairAsDesignPlan {
  const writes: RepairAsDesignWrite[] = [];
  const kind = String(input.kind ?? "");
  const shot = input.shot ?? {};
  const vd = String(shot.visualDescription ?? "");
  if (/face_unread|FACE-READABILITY|face_unreadability/i.test(kind)) {
    if (!/面容可读|抬视线/.test(vd)) {
      writes.push({
        slot: "visualDescription",
        value: `${vd}${vd.endsWith("。") ? "" : "。"}近景面容可读，抬视线。`,
        reason: "face_readability",
      });
    }
    writes.push({ slot: "microExpression", value: "抬视线，口型可读", reason: "face_micro" });
  }
  if (/dialogue_shot_too_wide|near_promote|speak_lip_wide/i.test(kind)) {
    writes.push({ slot: "shotSize", value: "近景", reason: "dialogue_near" });
  }
  if (/cam_speak|static_on_speak/i.test(kind)) {
    writes.push({ slot: "shotDesign" as RepairWriteSlot, value: "静止", reason: "static_cam" });
  }
  if (/sfx|纸摩擦/i.test(kind + String(input.hint ?? ""))) {
    writes.push({ slot: "sfx", value: "纸页摩擦", reason: "sfx_beat" });
  }
  if (/spatial|eyeline|站位/i.test(kind)) {
    writes.push({
      slot: "visualDescription",
      value: `${vd}${vd.endsWith("。") ? "" : "。"}保持站位轴线连续。`,
      reason: "axis_hint",
    });
  }
  return buildRepairAsDesignPlan({ writes, blocksBurn: false, vendorConstraint: "seedream_multiref" });
}

/** Apply RepairAsDesignPlan writes onto a shot (mutates). */
export function applyRepairAsDesignToShot(
  shot: Record<string, unknown>,
  plan: RepairAsDesignPlan,
): { applied: string[] } {
  if (shot.designLock === true || shot.authorOverrideLock === true) return { applied: [] };
  const applied: string[] = [];
  const log: RepairChangelogEntry[] = Array.isArray(shot.repairChangelog)
    ? [...(shot.repairChangelog as RepairChangelogEntry[])]
    : [];
  for (const w of plan.writes) {
    const field = SLOT_FIELD[w.slot] ?? w.slot;
    const before = String(
      field === "sfx"
        ? (shot.sound as { sfx?: string } | undefined)?.sfx ?? ""
        : field === "shotDesign"
          ? (shot.shotDesign as { cameraMotion?: string } | undefined)?.cameraMotion ?? ""
          : (shot[field] as string) ?? "",
    );
    if (field === "sfx") {
      const sound = { ...((shot.sound as Record<string, unknown>) ?? {}), sfx: w.value };
      shot.sound = sound;
      applied.push("sfx");
    } else if (field === "avCausality") {
      const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
      narr.avCausality = typeof w.value === "string" ? { visualPeak: w.value } : w.value;
      shot.narrative = narr;
      applied.push("avCausality");
    } else if (field === "visualDescription") {
      shot.visualDescription = w.value;
      applied.push("visualDescription");
    } else if (field === "shotDesign" || w.slot === "shotDesign") {
      const sd = { ...((shot.shotDesign as Record<string, unknown>) ?? {}) };
      sd.cameraMotion = w.value;
      shot.shotDesign = sd;
      applied.push("shotDesign.cameraMotion");
    } else {
      shot[field] = w.value;
      applied.push(String(field));
    }
    log.push({
      slot: String(field),
      before,
      after: String(w.value ?? ""),
      reason: String(w.reason ?? "repair_as_design"),
      at: new Date().toISOString(),
      packageVersion: Number(shot.packageVersion ?? 0) + 1,
    });
  }
  shot.repairChangelog = log.slice(-40);
  shot.packageVersion = Number(shot.packageVersion ?? 0) + 1;
  shot.promptState = "stale";
  shot.videoStale = true;
  shot.repairAsDesignAt = new Date().toISOString();
  return { applied };
}
