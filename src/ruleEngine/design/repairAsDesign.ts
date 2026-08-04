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
  if (/spatial|eyeline|站位|axis180|axis_180/i.test(kind)) {
    writes.push({
      slot: "visualDescription",
      value: `${vd}${vd.endsWith("。") ? "" : "。"}保持站位轴线连续。`,
      reason: "axis_hint",
    });
  }
  if (/headroom|looking_room|composition_|构图/i.test(kind)) {
    const hint = String(input.hint ?? "");
    const add =
      /looking/i.test(kind) || /视线/.test(hint)
        ? "视线前方留白。"
        : "保留头上空间。";
    if (!vd.includes(add.slice(0, 4))) {
      writes.push({
        slot: "visualDescription",
        value: `${vd}${vd.endsWith("。") ? "" : "。"}${add}`,
        reason: "composition_soft",
      });
    }
  }
  if (/jl_cut|j_cut|l_cut|transition_audio|声先入|声延/i.test(kind)) {
    writes.push({
      slot: "narrative.avBeats" as RepairWriteSlot,
      value: /j_cut|声先入/i.test(kind) ? "下句声先入再切画" : "本镜声延至下画",
      reason: "jl_cut_avbeat",
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
  const phase = String(
    ((shot.narrative as { stillPhase?: string } | undefined)?.stillPhase) ?? "",
  );
  const approaching = phase === "approaching" || phase === "mid_contact";
  const bendVd = /弯腰|捡起|捡拾|俯身|休书/.test(String(shot.visualDescription ?? ""));
  for (const w of plan.writes) {
    let value = w.value;
    // Approaching bend: do not poison VD with grip-complete / kneel language
    if (
      (approaching || bendVd) &&
      (w.slot === "visualDescription" || w.slot === "propPose") &&
      /捏紧|指节泛白|触地捡拾|跪坐|蹲跪持纸/.test(String(value))
    ) {
      value = String(value)
        .replace(/指尖捏紧纸张边缘[^。；]*/g, "主手伸向纸缘尚未捏紧")
        .replace(/捏紧[^。；]*/g, "伸向纸缘尚未捏紧")
        .replace(/触地捡拾/g, "伸向纸缘")
        .replace(/跪坐|蹲跪/g, "弯腰俯身");
    }
    const field = SLOT_FIELD[w.slot] ?? w.slot;
    const before = String(
      field === "sfx"
        ? (shot.sound as { sfx?: string } | undefined)?.sfx ?? ""
        : field === "shotDesign"
          ? (shot.shotDesign as { cameraMotion?: string } | undefined)?.cameraMotion ?? ""
          : (shot[field] as string) ?? "",
    );
    if (field === "sfx") {
      const sound = { ...((shot.sound as Record<string, unknown>) ?? {}), sfx: value };
      shot.sound = sound;
      applied.push("sfx");
    } else if (field === "avCausality") {
      const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
      narr.avCausality = typeof value === "string" ? { visualPeak: value } : value;
      shot.narrative = narr;
      applied.push("avCausality");
    } else if (field === "visualDescription") {
      shot.visualDescription = value;
      applied.push("visualDescription");
    } else if (field === "shotDesign" || w.slot === "shotDesign") {
      const sd = { ...((shot.shotDesign as Record<string, unknown>) ?? {}) };
      sd.cameraMotion = value;
      shot.shotDesign = sd;
      applied.push("shotDesign.cameraMotion");
    } else if (w.slot === "narrative.avBeats" || field === "narrative.avBeats") {
      const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
      const prev = Array.isArray(narr.avBeats) ? [...(narr.avBeats as string[])] : [];
      const beat = String(value ?? "");
      if (beat && !prev.some((b) => b.includes(beat.slice(0, 4)))) prev.push(beat);
      narr.avBeats = prev.slice(0, 12);
      shot.narrative = narr;
      applied.push("narrative.avBeats");
    } else {
      shot[field] = value;
      applied.push(String(field));
    }
    log.push({
      slot: String(field),
      before,
      after: String(value ?? ""),
      reason: String(w.reason ?? "repair_as_design"),
      at: new Date().toISOString(),
      packageVersion: Number(shot.packageVersion ?? 0) + 1,
    });
  }
  // VD write invalidates phase hash — restamp IntentGraph so SSOT survives
  if (applied.includes("visualDescription")) {
    try {
      const { applyLiteraryIntentGraphToShot } =
        require("../compilers/literaryIntentGraph") as typeof import("../compilers/literaryIntentGraph");
      applyLiteraryIntentGraphToShot(shot);
    } catch {
      /* optional */
    }
  }
  shot.repairChangelog = log.slice(-40);
  shot.packageVersion = Number(shot.packageVersion ?? 0) + 1;
  shot.promptState = "stale";
  shot.videoStale = true;
  shot.repairAsDesignAt = new Date().toISOString();
  return { applied };
}
