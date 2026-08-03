/**
 * SingleShotClosedCompose — architectural SSOT for still compose/generate.
 * Hard inputs ⊆ { this shot JSON, this-shot assets, this-shot shotDesign ref policy }.
 * Neighbor / episode lexicon / dirty previous must not legislate egress.
 * Fail-closed: closedCompose === true only when all gates pass (never treat undefined as closed).
 */
import {
  ACTION_PRIMARY_SURVIVE_STEMS,
  OFF_BEAT_HOLD_CARD_ATOMS,
  OFF_BEAT_MOUTH_CU_ATOMS,
  previousBodyHasOffBeatContamination,
} from "./stillFirstFrameLiterarySsot";

/** Action / paper stems that must not enter a mouth-CU / non-pickup beat. */
export const ACTION_PRIMARY_ATOMS =
  /弯腰|捡起|捡|捏紧|指节|俯身|休书|婚书|信笺|信纸|纸张边缘|触地捡/;

/** Undeclared paper / hold-doc stems (Forbidden when VD lacks them). */
export const UNDECLARED_PAPER_ATOMS = /休书|婚书|信笺|信纸|薄纸|纸张|持纸|手持.*纸|捡起.*纸/;

/** Foreign shot labels in vendor soup. */
export const FOREIGN_SHOT_LABEL = /镜头\s*[0-9０-９]+|shot\s*#?\s*\d+/i;

/** Half-body / MS framing that fights lips ECU. */
export const HALF_BODY_FRAMING = /半身|中景|腰线|持纸入画|全身站立入画/;

export type FramingMode =
  | "lips_ecu"
  | "face_cu"
  | "hand_cu"
  | "prop_cu"
  | "action_ms"
  | "scene"
  | "unknown";

export type SingleShotBindResult = {
  ok: boolean;
  code?: "BIND_SHOT_MISMATCH" | "BIND_SHOT_UNBOUND";
  shotIndex?: number;
  idx?: number;
  message?: string;
};

export type ClosedComposeAssertResult = {
  ok: boolean;
  /** True only when every gate passes — never infer from undefined. */
  closedCompose: boolean;
  boundShotIndex: number | null;
  framingMode?: FramingMode;
  code?: string;
  userMessage?: string;
  ctaLabel?: string;
  reasons: string[];
};

/**
 * Fail-closed helper: only explicit true counts as closed.
 */
export function isClosedComposeTrue(flag: boolean | null | undefined): boolean {
  return flag === true;
}

/** Oral / lip_bite must not open bend_pickup / paper soft gates. */
export function isOralMicroNotActionPrimary(visualDescription?: string | null): boolean {
  const vd = String(visualDescription ?? "");
  if (!vd.trim()) return false;
  if (ACTION_PRIMARY_SURVIVE_STEMS.test(vd)) return false;
  return (
    OFF_BEAT_MOUTH_CU_ATOMS.test(vd) ||
    (/咬|渗血|唇瓣|下唇|lip_bite/i.test(vd) && /特写|CU|近景|ecu/i.test(vd))
  );
}

/** VD (or imagePrompt) declares paper / pickup — prop plates may legislate. */
export function vdDeclaresPaperOrPickup(visualDescription?: string | null): boolean {
  const vd = String(visualDescription ?? "");
  return ACTION_PRIMARY_ATOMS.test(vd) || UNDECLARED_PAPER_ATOMS.test(vd);
}

/**
 * Infer framingMode from this-shot design signals only (no shotIndex).
 */
export function resolveFramingMode(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  foreground?: string | null;
  mouthDetail?: string | null;
  background?: string | null;
}): FramingMode {
  const vd = String(input.visualDescription ?? "");
  const sz = String(input.shotSize ?? "");
  const fg = String(input.foreground ?? "");
  const mouth = String(input.mouthDetail ?? "");
  const blob = `${vd} ${fg} ${mouth}`;

  if (isOralMicroNotActionPrimary(vd) || /唇/.test(fg) || /lip_bite|咬唇|渗血/.test(mouth)) {
    if (/唇|口|嘴|下唇/.test(fg) || /lip_bite|咬唇|渗血|唇部/.test(blob)) return "lips_ecu";
    return "face_cu";
  }
  if (/手部特写|手部/.test(blob) || /hand/i.test(sz)) return "hand_cu";
  if (/道具特写|物件特写/.test(blob)) return "prop_cu";
  if (ACTION_PRIMARY_ATOMS.test(vd) || /中景|\bMS\b/i.test(sz) || /中景/.test(vd)) {
    if (ACTION_PRIMARY_ATOMS.test(vd)) return "action_ms";
  }
  if (/特写|CU|ecu|大特/i.test(sz) || /特写|近景/.test(vd)) return "face_cu";
  if (/空镜|环境/.test(vd)) return "scene";
  return "unknown";
}

/**
 * Bidirectional off-beat: mouth-CU current must drop action/paper previous (and vice versa via existing helper).
 */
export function previousBodyHasBidirectionalOffBeatContamination(
  previous?: string | null,
  visualDescription?: string | null,
): boolean {
  if (previousBodyHasOffBeatContamination(previous, visualDescription)) return true;
  const prev = String(previous ?? "");
  const vd = String(visualDescription ?? "");
  if (!prev.trim() || !vd.trim()) return false;
  const mouthCu =
    OFF_BEAT_MOUTH_CU_ATOMS.test(vd) ||
    (/特写|近景|CU|ecu/i.test(vd) && /唇|咬|渗血|眼神|面颊/.test(vd) && !ACTION_PRIMARY_SURVIVE_STEMS.test(vd));
  if (mouthCu && ACTION_PRIMARY_ATOMS.test(prev) && !ACTION_PRIMARY_ATOMS.test(vd)) return true;
  if (mouthCu && OFF_BEAT_HOLD_CARD_ATOMS.test(prev) && !OFF_BEAT_HOLD_CARD_ATOMS.test(vd)) return true;
  if (FOREIGN_SHOT_LABEL.test(prev) && !FOREIGN_SHOT_LABEL.test(vd)) return true;
  return false;
}

/** Strip foreign action/paper / shot labels from egress when current VD lacks them. */
export function stripForeignBeatAtomsFromEgress(
  egress: string,
  visualDescription?: string | null,
): { text: string; stripped: string[] } {
  const vd = String(visualDescription ?? "");
  let text = String(egress ?? "");
  const stripped: string[] = [];
  if (!text.trim()) return { text, stripped };

  if (!ACTION_PRIMARY_ATOMS.test(vd)) {
    const before = text;
    text = text
      .replace(/[^。；;\n]*(?:弯腰|捡起|俯身捡|捏紧纸|指节泛白|休书|婚书|信笺)[^。；;\n]*/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (text !== before) stripped.push("action_paper");
  }
  if (!OFF_BEAT_MOUTH_CU_ATOMS.test(vd) && ACTION_PRIMARY_SURVIVE_STEMS.test(vd)) {
    const before = text;
    text = text
      .replace(/[^。；;\n]*(?:咬唇|紧咬下唇|渗出血珠|lip_bite|唇部特写)[^。；;\n]*/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (text !== before) stripped.push("mouth_cu");
  }
  if (FOREIGN_SHOT_LABEL.test(text)) {
    text = text.replace(/镜头\s*[0-9０-９]+/g, "").replace(/shot\s*#?\s*\d+/gi, "").trim();
    stripped.push("foreign_shot_label");
  }
  return { text, stripped };
}

/**
 * imagePrompt adopt ∩ VD: drop undeclared action/paper/mouth stems before L0/DIP.
 */
export function intersectImagePromptWithVd(
  imagePrompt?: string | null,
  visualDescription?: string | null,
): { text: string; dropped: string[] } {
  const vd = String(visualDescription ?? "");
  let text = String(imagePrompt ?? "");
  const dropped: string[] = [];
  if (!text.trim()) return { text, dropped };
  const scrubbed = stripForeignBeatAtomsFromEgress(text, vd);
  if (scrubbed.stripped.length) {
    dropped.push(...scrubbed.stripped.map((s) => `imagePrompt.${s}`));
    text = scrubbed.text;
  }
  return { text, dropped };
}

/** Egress negatives for lips_ecu / oral beats. */
export function oralEcuMouthNegatives(): string {
  return "禁止半身/腰线入画；禁止手持纸类文书入画；口鼻区占画幅主区；背景浅景深虚化";
}

/** HQ recipe for lips ECU (replaces face-uncropped half-body pull). */
export const ECU_MOUTH_HQ_RECIPE =
  "竖屏9:16安全区，唇部/口鼻局部特写占画幅主区，咬唇渗血与微表情可读，浅景深；禁止半身腰线入画，禁止手持纸类文书抢戏，禁止灰棚白棚。";

/**
 * Assert closed compose after hydrate.
 * Fail-closed: closedCompose true only when reasons empty and no hard blockers.
 */
export function assertSingleShotClosedInputs(input: {
  storyboardId?: number | null;
  boundShotIndex?: number | null;
  bindOk?: boolean;
  bindCode?: string | null;
  visualDescription?: string | null;
  compiledImagePrompt?: string | null;
  purpose?: "compose" | "generate";
  episodeLexiconLegislates?: boolean;
  /** SoftContinuity inject — non-empty ⇒ not closed unless sealed opt-in */
  continuityInject?: string | null;
  continuitySealed?: boolean;
  /** FE/DB intends to hang propSoft while VD undeclared */
  propSoftIntended?: boolean;
  shotSize?: string | null;
  foreground?: string | null;
  mouthDetail?: string | null;
}): ClosedComposeAssertResult {
  const reasons: string[] = [];
  const purpose = input.purpose ?? "generate";
  const boundShotIndex =
    typeof input.boundShotIndex === "number" && Number.isFinite(input.boundShotIndex)
      ? Number(input.boundShotIndex)
      : null;
  const framingMode = resolveFramingMode({
    visualDescription: input.visualDescription,
    shotSize: input.shotSize,
    foreground: input.foreground,
    mouthDetail: input.mouthDetail,
  });

  if (input.storyboardId && input.bindOk === false) {
    reasons.push(String(input.bindCode || "BIND_SHOT_MISMATCH"));
    return {
      ok: purpose === "compose",
      closedCompose: false,
      boundShotIndex,
      framingMode,
      code: input.bindCode || "BIND_SHOT_MISMATCH",
      userMessage: "分镜未绑定到正确的单镜设计包，请重新导入/重绑后再生成",
      ctaLabel: "重新导入或重绑分镜",
      reasons,
    };
  }

  if (input.episodeLexiconLegislates) {
    reasons.push("episode_lexicon_legislates");
  }

  const cont = String(input.continuityInject ?? "").trim();
  if (cont && !input.continuitySealed) {
    reasons.push("continuity_inject_unsealed");
  }

  const vd = String(input.visualDescription ?? "").trim();
  if (input.storyboardId && purpose === "generate" && vd.length < 4) {
    reasons.push("visual_description_thin");
    return {
      ok: false,
      closedCompose: false,
      boundShotIndex,
      framingMode,
      code: "CLOSED_COMPOSE_THIN_VD",
      userMessage: "请先补全本镜画面描写（visualDescription）再生成",
      ctaLabel: "补全画面描写",
      reasons,
    };
  }

  // Dirty imagePrompt carrying undeclared paper/action while oral VD
  const img = String(input.compiledImagePrompt ?? "");
  if (vd && img && isOralMicroNotActionPrimary(vd) && ACTION_PRIMARY_ATOMS.test(img) && !ACTION_PRIMARY_ATOMS.test(vd)) {
    reasons.push("imagePrompt_undeclared_action_paper");
  }

  if (input.propSoftIntended && !vdDeclaresPaperOrPickup(vd)) {
    reasons.push("propSoft_undeclared");
  }

  const closedCompose = reasons.length === 0;
  return {
    ok: purpose === "compose" ? true : closedCompose || !reasons.some((r) => /BIND_|THIN_VD|propSoft_undeclared/.test(r)),
    closedCompose,
    boundShotIndex,
    framingMode,
    ...(closedCompose
      ? {}
      : {
          code: "CLOSED_COMPOSE_OPEN",
          userMessage: "单镜封闭未达成（存在未声明立法或未封印连续注入）",
          ctaLabel: "按本镜描写重出/清异镜参考",
        }),
    reasons,
  };
}

/** Filter strengthen/heal inject lines to atoms declared in this-shot VD. */
export function filterInjectToDeclaredAtoms(
  lines: string[] | null | undefined,
  visualDescription?: string | null,
): string[] {
  const vd = String(visualDescription ?? "");
  const list = (lines ?? []).map((s) => String(s ?? "").trim()).filter(Boolean);
  if (!list.length) return [];
  return list.filter((line) => {
    if (ACTION_PRIMARY_ATOMS.test(line) && !ACTION_PRIMARY_ATOMS.test(vd)) return false;
    if (
      OFF_BEAT_MOUTH_CU_ATOMS.test(line) &&
      !OFF_BEAT_MOUTH_CU_ATOMS.test(vd) &&
      ACTION_PRIMARY_SURVIVE_STEMS.test(vd)
    ) {
      return false;
    }
    if (FOREIGN_SHOT_LABEL.test(line)) return false;
    if (UNDECLARED_PAPER_ATOMS.test(line) && !vdDeclaresPaperOrPickup(vd)) return false;
    if (HALF_BODY_FRAMING.test(line) && isOralMicroNotActionPrimary(vd)) return false;
    return true;
  });
}

/**
 * Healer ingress hook — all repair/strengthen injects must pass here.
 */
export function gateHealInjectLines(
  lines: string[] | null | undefined,
  visualDescription?: string | null,
): { kept: string[]; rejected: string[] } {
  const raw = (lines ?? []).map((s) => String(s ?? "").trim()).filter(Boolean);
  const kept = filterInjectToDeclaredAtoms(raw, visualDescription);
  const keptSet = new Set(kept);
  const rejected = raw.filter((l) => !keptSet.has(l));
  return { kept, rejected };
}
