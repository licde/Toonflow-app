/**
 * failureClusterLibrary — cluster failures for next-round strategy (generic kinds).
 */
export type FailureClusterKind =
  | "gray_studio"
  | "missing_prop"
  | "prop_substitution"
  | "glyph_miss"
  | "secondary_dominance"
  | "contact_miss"
  | "action_misfire"
  | "off_beat_contam"
  | "isomorphic_regen"
  | "other";

export type FailureCluster = {
  clusterKey: string;
  kind: FailureClusterKind;
  objectiveClass?: string;
  hint: string;
  at: string;
};

export function deriveFailureCluster(input: {
  promptUsed?: string | null;
  visualDescription?: string | null;
  criticalMisses?: string[];
  objectiveClass?: string | null;
  i2vReady?: boolean;
  stillQuality?: string | null;
  atomMisses?: string[];
  isomorphic?: boolean;
  contaminationClass?: string | null;
}): FailureCluster | null {
  if (input.i2vReady === true && input.stillQuality === "hq_ok" && !input.isomorphic) return null;
  const misses = [...(input.criticalMisses ?? []), ...(input.atomMisses ?? [])];
  const contam = String(input.contaminationClass ?? "").trim();
  const blob = `${input.promptUsed ?? ""} ${input.visualDescription ?? ""} ${misses.join(",")} ${contam}`;
  let kind: FailureClusterKind = "other";
  let hint = "regen_with_structure";

  if (input.isomorphic) {
    kind = "isomorphic_regen";
    hint = "force_compose_delta_hash_or_refs";
  } else if (contam === "off_beat_cu" || /off_beat|beatIsolation|跨镜污染/.test(blob)) {
    kind = "off_beat_contam";
    hint = "compose_regen_beat_isolate+force_full";
  } else if (contam === "contact_zombie" || contam === "locus_mangled") {
    kind = "action_misfire";
    hint = "compose_regen_strip_contact_zombie+action_lead";
  } else if (contam === "plate_geometry" || contam === "glyph_identity") {
    kind = contam === "glyph_identity" ? "glyph_miss" : "missing_prop";
    hint =
      contam === "glyph_identity"
        ? "inject_prop_glyph+occupancy_plate"
        : "occupancy_prop_soft_plate+compose_regen";
  } else if (
    /gray_studio|missing_soft_env|禁止灰棚|白棚|灰棚/.test(blob) ||
    misses.some((m) => /gray|soft_env|studio/i.test(m))
  ) {
    kind = "gray_studio";
    hint = "keep_soft_env_ref+sref+studio_ban";
  } else if (/missing_anti_sub|prop_substitution|禁止以.+替代|propPlateMissing|propSoftPlate|DEX-PROP-PLATE/.test(blob) || misses.some((m) => /anti_sub|substitution|propPlate|propSoft/i.test(m))) {
    kind = "prop_substitution";
    hint = "inject_cross_class_anti_sub+prop_soft_plate";
  } else if (/missing_prop_glyph|glyph_miss|空白糊纸|字迹/.test(blob) || misses.some((m) => /glyph/i.test(m))) {
    kind = "glyph_miss";
    hint = "inject_prop_glyph+paper_doc_readable";
  } else if (
    (/missing_prop|prop_readable|missing_prop_readable/.test(blob) || misses.some((m) => /prop_readable|missing_prop/i.test(m))) &&
    /missing|无纸|empty|readable/i.test(blob)
  ) {
    kind = "missing_prop";
    hint = "prop_soft_plate+contact_lead";
  } else if (/secondary_dominance|完整立像|双人抢戏|次角正脸|裙摆/.test(blob) || misses.some((m) => /secondary/i.test(m))) {
    kind = "secondary_dominance";
    hint = "strip_secondary_full+hands_only+skirt_blur";
  } else if (
    /action_misfire|桌靠|伏案|未捡|未弯腰|捏紧缺失|action_primary/.test(blob) ||
    misses.some((m) => /action_misfire|pickup|bend|grip/i.test(m))
  ) {
    kind = "action_misfire";
    hint = "compose_regen_action_primary_lead+force_full";
  } else if (
    (/contact|触肤|贴颊|missing_contact/.test(blob) && misses.some((m) => /contact/i.test(m))) ||
    misses.some((m) => /contact/i.test(m))
  ) {
    kind = "contact_miss";
    hint = "compose_regen_contact_geom";
  }

  const clusterKey = [kind, String(input.objectiveClass ?? "unknown"), hint].join("|");
  return {
    clusterKey,
    kind,
    objectiveClass: input.objectiveClass ?? undefined,
    hint,
    at: new Date().toISOString(),
  };
}

/** True when next regen would be isomorphic (same contractHash + same refs signature). */
export function isIsomorphicRegen(input: {
  prevContractHash?: string | null;
  nextContractHash?: string | null;
  prevRefsSig?: string | null;
  nextRefsSig?: string | null;
  forceDelta?: boolean;
}): boolean {
  if (input.forceDelta) return false;
  const ch = String(input.prevContractHash ?? "");
  const nh = String(input.nextContractHash ?? "");
  const pr = String(input.prevRefsSig ?? "");
  const nr = String(input.nextRefsSig ?? "");
  if (!ch || !nh) return false;
  return ch === nh && pr === nr;
}

export function refsSignature(refs: Array<{ base64?: string } | string> | null | undefined): string {
  const list = refs ?? [];
  const parts = list.map((r) => {
    if (typeof r === "string") return `u:${r.slice(0, 48)}`;
    const b = String(r?.base64 ?? "");
    return `b:${b.length}:${b.slice(0, 24)}`;
  });
  return parts.join("|");
}

/**
 * Literary Chinese fills for repair clusters — NEVER engineering tokens (force_compose…).
 * Safe to prepend to vendor egress; stillPromptLint will strip residual ENG_ONLY.
 */
export function literaryFillsForCluster(input: {
  kind?: FailureClusterKind | null;
  hint?: string | null;
  objectiveClass?: string | null;
  atomMisses?: string[] | null;
  visualDescription?: string | null;
}): string[] {
  const kind = input.kind ?? "other";
  const misses = input.atomMisses ?? [];
  const vd = String(input.visualDescription ?? "");
  // SingleShotClosed: oral beats never get paper/休书 fills
  try {
    const { isOralMicroNotActionPrimary } =
      require("../compilers/singleShotClosedCompose") as typeof import("../compilers/singleShotClosedCompose");
    if (isOralMicroNotActionPrimary(vd)) {
      const fills: string[] = [];
      if (kind === "gray_studio" || misses.some((m) => /soft_env|studio|gray/i.test(m))) {
        fills.push("唇部局部特写浅景深，禁止灰棚白棚，禁止半身持纸");
      } else {
        fills.push("唇部/口鼻局部特写占画幅主区，咬唇渗血可读，禁止半身/手持纸张入画");
      }
      return fills;
    }
  } catch {
    /* optional */
  }
  const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(vd)?.[0];
  const fills: string[] = [];
  if (kind === "isomorphic_regen" || kind === "missing_prop" || misses.some((m) => /propPlate|prop_readable|propSoft/i.test(m))) {
    fills.push("本镜事件道具须清晰入画（展开薄纸片/笺面优先，禁止书本卷棒筒状）");
  }
  if (kind === "glyph_miss" || misses.some((m) => /glyph/i.test(m))) {
    fills.push("纸面题名/字形须可辨，禁止空白糊纸");
  }
  if (kind === "prop_substitution" || misses.some((m) => /anti_sub|substitution/i.test(m))) {
    fills.push("禁止以外类大物替代本镜事件道具");
  }
  if (kind === "contact_miss" || misses.some((m) => /contact/i.test(m))) {
    fills.push("接触部位须真实贴合/划过，禁止抵颏贴颏冒充颊触");
  }
  if (kind === "gray_studio" || misses.some((m) => /soft_env|studio|gray/i.test(m))) {
    fills.push(
      atm
        ? `保留${atm}软环境氛围可辨，浅景深，禁止灰棚白棚空白背景`
        : "保留室内软环境轮廓可辨，浅景深，禁止灰棚白棚空白背景",
    );
  }
  if (kind === "secondary_dominance") {
    fills.push("背景仅次角裙摆/衣角碎片虚化浅景深，禁止完整正脸立像抢戏");
  }
  if (kind === "off_beat_contam") {
    fills.push("本拍隔离：仅文学主占位与主道具入画，禁止邻镜咬唇渗血举卡串入");
  }
  if (
    kind === "action_misfire" &&
    /strip_contact_zombie|action_primary|bend|pickup|弯腰|捡起/.test(`${input.hint ?? ""} ${vd}`)
  ) {
    if (!fills.some((f) => /弯腰|捡拾|主手/.test(f))) {
      fills.push("占位：弯腰捡拾，躯干前倾，道具在主手触地，禁止胸前举卡与跪坐替代");
    }
  }
  if (!fills.length) {
    fills.push("按画面描写主导动作与接触优先，禁止工程标记入镜");
  }
  return fills;
}
