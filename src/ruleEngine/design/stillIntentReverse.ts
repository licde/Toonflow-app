/**
 * Still Intent Reverse Designer (IRD) — diagnose → apply-able patches.
 * Design-layer only; compose/burn must not invent literary VD.
 */
import { shouldWarnOneBeat } from "../compilers/stillIdentitySsot";
import { extractDescPredicates } from "../compilers/extractDescPredicates";
import { expandStillOneBeat, planStillOneBeatSplit } from "./expandStillOneBeat";
import { runShotExpanders } from "./expanderRegistry";
import { runSplitOrchestrator } from "./splitOrchestrator";
import { recomposeChildrenAfterSplit } from "./recomposeAfterSplit";
import { resolveAudioShotLinkage } from "../quality/audioShotLinkage";
import { applyDesignLossSupplement, auditDesignLoss } from "../quality/designLossSupplement";
import {
  buildShotChainContract,
  assertChainEgress,
  markChainStale,
  type ChainEgressFinding,
} from "../quality/shotChainContract";
import { qp02MinChars } from "../bundle/visualQualityAudit";
import { loadRepairConfidenceLadder } from "../quality/practiceCompleteness";
import type { ScriptBundle } from "../bundle/types";
import type { ShotDesignIntent } from "./shotDesignIntent";
import { sliceFieldsAfterIrdSplit } from "./sliceFieldsAfterIrdSplit";
import { planSpeakReactChildren, ensureChildVisualDescription, isForbiddenSplitPlaceholder, stripReactionFieldsFromLines } from "./splitChildVisual";

export type IrdPatchOp =
  | "split_onebeat"
  | "split_speak_react"
  | "rewrite_vd"
  | "sync_intent_picture"
  | "seed_audio"
  | "clamp_camera";

export type IrdPatch = {
  id: string;
  op: IrdPatchOp;
  shotIndex: number;
  confidence: number;
  before: unknown;
  after: unknown;
  authoritativePaths: string[];
};

export type IrdPrimaryAction =
  | "apply_auto"
  | "apply_auto_enhance"
  | "confirm_split"
  | "confirm_enhance"
  | "hand_edit_vd"
  | "batch_still_hq"
  | "presentation_fork"
  | "none";

export type IrdDiagnoseResult = {
  ok: boolean;
  findings: ChainEgressFinding[];
  patches: IrdPatch[];
  primaryAction: IrdPrimaryAction;
  confirmRequired: boolean;
  irdProvenance?: { diagnosedAt: string; codes: string[] };
  /** Flattened BLOCK LIT/PROP structure slots — FE chips / CTA */
  missingSlots?: string[];
  /** Prefer hand_edit naming slots; never sole「重出静照」 */
  ctaLabel?: string;
  /** Med-confidence: FE must pick fork-A/B before empty chat_repair */
  presentationFork?: { fork: string; label: string }[];
};

export function flattenIrdMissingSlots(
  findings: Array<{ severity?: string; missingSlots?: string[] }> | null | undefined,
): string[] {
  const out = new Set<string>();
  for (const f of findings ?? []) {
    if (f.severity !== "BLOCK") continue;
    for (const s of f.missingSlots ?? []) {
      if (s) out.add(String(s));
    }
  }
  return [...out];
}

export function irdCtaLabelFromAction(input: {
  primaryAction?: IrdPrimaryAction | string | null;
  missingSlots?: string[] | null;
  /** Optional BE/FE cta hint — used for sheetLeak / 重出同源 */
  ctaLabel?: string | null;
}): string {
  const slots = (input.missingSlots ?? []).filter(Boolean);
  // Contact prop debt: align with docs/toonflow-web/types/stillIntentOps.ts irdCtaLabel
  if (slots.includes("propInFrame") || slots.includes("contactGeom")) {
    if (input.primaryAction === "confirm_enhance" || input.primaryAction === "apply_auto_enhance") {
      return `批准增强补${slots.slice(0, 3).join("/")}`;
    }
    if (
      input.primaryAction === "batch_still_hq" ||
      /重出|静照/.test(String(input.ctaLabel ?? ""))
    ) {
      return "重出带道具静照";
    }
    return `手改VD补${slots.slice(0, 3).join("/")}`;
  }
  if (input.primaryAction === "confirm_split" || input.primaryAction === "apply_auto") {
    return slots.length ? `确认拆镜（${slots.slice(0, 3).join("/")}）` : "确认拆镜";
  }
  if (input.primaryAction === "confirm_enhance") {
    return slots.length ? `批准增强补${slots.slice(0, 3).join("/")}` : "批准增强";
  }
  if (input.primaryAction === "apply_auto_enhance") {
    return slots.length ? `自动增强补${slots.slice(0, 3).join("/")}` : "自动增强";
  }
  if (input.primaryAction === "hand_edit_vd" || slots.length) {
    return slots.length ? `手改VD补${slots.slice(0, 3).join("/")}` : "手改VD";
  }
  if (input.primaryAction === "batch_still_hq") return "重出HQ静照";
  return "查看诊断";
}

export type IrdApplyOptions = {
  chatStrict?: boolean;
  literaryLocked?: boolean;
  forceApply?: boolean;
  /** Only apply these patch ids; default all auto-eligible */
  patchIds?: string[];
  meta?: Record<string, unknown> | null;
  planData?: Record<string, unknown> | null;
  intents?: ShotDesignIntent[];
  knownNames?: string[];
  /** conf >= this → auto when !chatStrict */
  autoMinConfidence?: number;
};

const AUTO_MIN = loadRepairConfidenceLadder().thresholds?.autoApplyMin ?? 0.85;

function knownNamesFromBundle(bundle?: ScriptBundle | null): string[] {
  const assets = (bundle?.characterDesign as { assets?: { name?: string }[] } | undefined)?.assets ?? [];
  return assets.map((a) => String(a.name ?? "").replace(/（OS）|\(OS\)/g, "").trim()).filter((n) => n.length >= 2);
}

function intentsForShot(
  intents: ShotDesignIntent[] | undefined,
  shotIndex: number,
): ShotDesignIntent | undefined {
  if (!intents?.length) return undefined;
  return intents[shotIndex - 1] ?? intents.find((i) => String(i.sceneRef) === String(shotIndex));
}

function anchorOverlap(a: string, b: string, knownNames: string[]): number {
  const pack = extractDescPredicates({ description: a, characterNames: knownNames });
  const tokens = pack.mustAppear.filter((t) => t.length >= 2).slice(0, 8);
  if (!tokens.length) return 1;
  const hit = tokens.filter((t) => b.includes(t)).length;
  return hit / tokens.length;
}

/**
 * Diagnose still/intent design failures and propose patches (no write unless apply).
 */
export function diagnoseStillIntent(
  shots: Record<string, unknown>[],
  opts?: IrdApplyOptions & { bundle?: ScriptBundle | null },
): IrdDiagnoseResult {
  const findings: ChainEgressFinding[] = [];
  const patches: IrdPatch[] = [];
  const known = opts?.knownNames ?? knownNamesFromBundle(opts?.bundle);
  const intents = opts?.intents ?? [];
  const minChars = qp02MinChars();
  let patchSeq = 0;
  const pid = (op: string, idx: number) => `ird-${op}-${idx}-${++patchSeq}`;

  for (const shot of shots) {
    const idx = Number(shot.shotIndex) || 0;
    if (shot._stillBeatSplitId || shot._visualSplitId) continue; // anti double-split diagnose on children

    const vd = String(shot.visualDescription ?? "").trim();
    const intent = intentsForShot(intents, idx);

    // DEX-INTENT-PIC
    if (intent?.picture?.trim()) {
      const pic = intent.picture.trim();
      const overlap = vd ? anchorOverlap(pic, vd, known) : 0;
      if (!vd || overlap < 0.5) {
        findings.push({
          id: "DEX-INTENT-PIC",
          severity: "BLOCK",
          message: `镜 ${idx || "?"} intent.picture 与 visualDescription 不同核`,
          breakAt: "design",
        });
        patches.push({
          id: pid("sync_intent", idx),
          op: "sync_intent_picture",
          shotIndex: idx,
          confidence: vd ? 0.75 : 0.9,
          before: { visualDescription: vd, picture: pic },
          after: { visualDescription: vd || pic.slice(0, 400) },
          authoritativePaths: ["preDesignPack.shots[].visualDescription", "shotDesignIntent[].picture"],
        });
      }
    }

    // DESIGN-LOSS / short VD
    if (vd.replace(/\s/g, "").length < minChars) {
      const fromIntent = intent?.picture?.trim() ?? "";
      if (fromIntent.replace(/\s/g, "").length >= minChars) {
        findings.push({
          id: "DESIGN-LOSS",
          severity: "WARN",
          message: `镜 ${idx || "?"} VD 过短，可从 intent.picture salvage`,
          breakAt: "design_loss",
        });
        patches.push({
          id: pid("rewrite_vd", idx),
          op: "rewrite_vd",
          shotIndex: idx,
          confidence: 0.85,
          before: { visualDescription: vd },
          after: { visualDescription: fromIntent.slice(0, 400) },
          authoritativePaths: ["preDesignPack.shots[].visualDescription"],
        });
      } else if (!vd) {
        findings.push({
          id: "DESIGN-LOSS",
          severity: "BLOCK",
          message: `镜 ${idx || "?"} visualDescription 遗失且无 intent 源`,
          breakAt: "design_loss",
        });
      }
    }

    // ONEBEAT
    if (vd && shouldWarnOneBeat(vd)) {
      const plan = planStillOneBeatSplit(vd);
      findings.push({
        id: "DEX-STILL-ONEBEAT",
        severity: "BLOCK",
        message: `镜 ${idx || "?"} 多拍须智能拆镜`,
        breakAt: "split",
      });
      patches.push({
        id: pid("split_onebeat", idx),
        op: "split_onebeat",
        shotIndex: idx,
        confidence: plan.confidence,
        before: { visualDescription: vd },
        after: {
          children: plan.children.map((c) => ({
            role: c.role,
            visualDescription: c.visualDescription,
            shotSize: c.shotSize,
            duration: c.duration,
            hasDialogue: c.hasDialogue,
          })),
          refuse: plan.refuse,
        },
        authoritativePaths: ["preDesignPack.shots[].visualDescription"],
      });
    }

    // speak+react / cam fit via linkage
    const link = resolveAudioShotLinkage(shot);
    if (link.mustSplit) {
      findings.push({
        id: "DEX-CAM-FIT",
        severity: "BLOCK",
        message: `镜 ${idx || "?"} ${link.reason}`,
        breakAt: link.breakAt === "split" ? "split" : "cam_split",
      });
      const sd = shot.shotDesign as { picture?: string; composition?: string } | undefined;
      const planned = planSpeakReactChildren(vd, {
        picture: sd?.picture ?? intent?.picture,
        composition: sd?.composition,
        knownNames: known,
        minChars,
      });
      patches.push({
        id: pid("split_speak_react", idx),
        op: "split_speak_react",
        shotIndex: idx,
        confidence: planned.confidence,
        before: { visualDescription: vd, camera: shot.camera },
        after: {
          splitHint: link.splitHint ?? "reaction_shot",
          children: planned.children,
          refuse: planned.refuse,
        },
        authoritativePaths: ["preDesignPack.shots[].visualDescription"],
      });
    } else if (link.healHint === "clamp_static") {
      patches.push({
        id: pid("clamp_cam", idx),
        op: "clamp_camera",
        shotIndex: idx,
        confidence: 0.9,
        before: { camera: shot.camera },
        after: { camera: "static" },
        authoritativePaths: ["preDesignPack.shots[].camera"],
      });
    }

    // Literary detail quality (contact/anchor) — diagnose only, never invent VD atoms
    if (vd.length >= minChars) {
      try {
        const { auditLiteraryDetailQuality } =
          require("../compilers/stillLiteraryDetailQuality") as typeof import("../compilers/stillLiteraryDetailQuality");
        const detail = auditLiteraryDetailQuality({
          visualDescription: vd,
          shotSize: String(
            shot.shotSize ?? (shot.narrative as { shotSize?: string } | undefined)?.shotSize ?? "",
          ),
          spatialRelation: String(
            (shot.narrative as { spatialRelation?: string } | undefined)?.spatialRelation ??
              shot.spatialRelation ??
              "",
          ),
        });
        for (const f of detail.findings) {
          findings.push({
            id: f.id,
            severity: f.severity,
            message: `镜 ${idx || "?"} ${f.message}`,
            breakAt: "design",
            missingSlots: f.missingSlots,
          });
        }
      } catch {
        /* optional */
      }
    }

    // Neighbor prop continuity — diagnosed per-shot when prior exists (full chain at Exit)
    // Single-shot diagnose skips; Exit owns DEX-PROP-CONT chain.

    // Fidelity preview: empty body vs anchors (compose will hard-block)
    if (vd.length >= minChars) {
      const c = buildShotChainContract(shot, { knownNames: known });
      const eg = assertChainEgress("compose", c, { imagePrompt: " " });
      const fid = eg.findings.filter((f) => f.id === "PROMPT-FIDELITY");
      // Only surface when we have intent salvage path
      if (fid.length && intent?.picture) {
        findings.push(...fid.map((f) => ({ ...f, severity: "WARN" as const })));
      }
    }
  }

  // Neighbor prop continuity (full shot list)
  try {
    const { auditPropContinuity, hydrateShotsPropState } =
      require("../compilers/propContinuitySsot") as typeof import("../compilers/propContinuitySsot");
    const propInputs = hydrateShotsPropState(
      shots.map((s) => {
        const si = Number(s.shotIndex) || 0;
        const intent = intentsForShot(si, opts?.intents);
        return {
          shotIndex: si || undefined,
          visualDescription: String(s.visualDescription ?? ""),
          sceneName: String((s as { sceneName?: string }).sceneName ?? ""),
          transitionType: String((s as { transitionType?: string }).transitionType ?? ""),
          propState: String((s as { propState?: string }).propState ?? ""),
          shotSize: String(s.shotSize ?? ""),
          intentPicture: intent?.picture ?? null,
        };
      }),
    );
    for (const f of auditPropContinuity(propInputs)) {
      findings.push({
        id: f.id,
        severity: f.severity,
        message: f.message,
        breakAt: "design",
      } as ChainEgressFinding);
    }
  } catch {
    /* optional */
  }

  // Bundle-level design loss audit
  if (opts?.bundle) {
    for (const f of auditDesignLoss(opts.bundle)) findings.push(f);
  }

  const blocks = findings.filter((f) => f.severity === "BLOCK");
  const autoMin = opts?.autoMinConfidence ?? AUTO_MIN;
  let confirmRequired =
    patches.some((p) => p.confidence < autoMin || Boolean((p.after as { refuse?: boolean })?.refuse)) ||
    blocks.some((f) => f.id === "DESIGN-LOSS");
  const hasAuto = patches.some((p) => p.confidence >= autoMin);
  const hasSplit = patches.some((p) => p.op === "split_onebeat" || p.op === "split_speak_react");

  const isLitOrProp = (id: string) =>
    id === "DEX-LIT-CONTACT-XOR" ||
    id === "DEX-LIT-CONTACT" ||
    id === "DEX-LIT-ANCHOR" ||
    id === "DEX-LIT-EXPR" ||
    id === "DEX-PROP-CONT" ||
    id === "DEX-PROP-IN-FRAME";

  const enhanceSlots = new Set([
    "contactStruct",
    "gripStruct",
    "groundOrPathStruct",
    "contactRoleXor",
    "woundVisible",
    "propReadable",
    "propInFrame",
    "contactGeom",
    "surfaceStruct",
    "thresholdStruct",
  ]);
  const litBlocks = blocks.filter((f) => isLitOrProp(f.id));
  const xorBlocks = litBlocks.filter((f) => f.id === "DEX-LIT-CONTACT-XOR");
  const enhanceableLit =
    litBlocks.length > 0 &&
    litBlocks.every((f) => {
      const slots = f.missingSlots ?? [];
      return slots.length > 0 && slots.every((s) => enhanceSlots.has(String(s)));
    });
  const driftLike =
    litBlocks.some((f) => /drift|主体|新角色|否定/.test(String(f.message ?? ""))) ||
    findings.some((f) => f.id === "DEX-LIT-DRIFT");
  // enhancementPriority: split > XOR — face CU dual-contact prefer Confirm 拆镜
  const xorPreferSplit = xorBlocks.length > 0 && shots.some((shot) => {
    const vd = String(shot.visualDescription ?? "");
    const sz = String(shot.shotSize ?? (shot.narrative as { shotSize?: string } | undefined)?.shotSize ?? "");
    const faceCu = /特写|近景|CU|ecu|extreme\s*close/i.test(sz) || /侧脸|正脸|特写/.test(vd);
    if (!faceCu) return false;
    try {
      const { auditLiteraryDetailQuality } =
        require("../compilers/stillLiteraryDetailQuality") as typeof import("../compilers/stillLiteraryDetailQuality");
      return auditLiteraryDetailQuality({ visualDescription: vd, shotSize: sz }).findings.some(
        (f) => f.id === "DEX-LIT-CONTACT-XOR" && f.severity === "BLOCK",
      );
    } catch {
      return /划过|贴/.test(vd) && /咬|渗血|血珠/.test(vd);
    }
  });

  let primaryAction: IrdPrimaryAction = "none";
  if (blocks.length === 0 && patches.length === 0) {
    primaryAction = findings.some((f) => isLitOrProp(f.id)) ? "hand_edit_vd" : "none";
  } else if (confirmRequired && hasSplit) primaryAction = "confirm_split";
  else if (hasAuto && !confirmRequired) primaryAction = "apply_auto";
  else if (xorPreferSplit || (xorBlocks.length && !enhanceableLit)) {
    primaryAction = "confirm_split";
    confirmRequired = true;
  }
  else if (enhanceableLit && !driftLike && !confirmRequired && hasAuto)
    primaryAction = "apply_auto_enhance";
  else if (enhanceableLit && !driftLike) primaryAction = "confirm_enhance";
  else if (
    blocks.some((f) => f.id === "DESIGN-LOSS" || f.id === "DEX-INTENT-PIC" || isLitOrProp(f.id)) ||
    findings.some((f) => isLitOrProp(f.id))
  )
    primaryAction = "hand_edit_vd";
  else if (hasSplit) primaryAction = "confirm_split";
  else primaryAction = hasAuto ? "apply_auto" : "hand_edit_vd";

  // Med-confidence ladder: presentation_fork instead of silent confirm_only / empty chat_repair
  try {
    const { repairActionForConfidence } =
      require("../quality/practiceCompleteness") as typeof import("../quality/practiceCompleteness");
    const trigger =
      xorBlocks[0]?.id ||
      blocks.find((f) => /CU-CAST|ONEBEAT|VIS-SPLIT|IRD-CONFIRM/i.test(f.id))?.id ||
      (confirmRequired ? "ird_confirm" : "");
    if (trigger && primaryAction === "hand_edit_vd" && confirmRequired) {
      const conf =
        patches.reduce((m, p) => Math.max(m, Number(p.confidence) || 0), 0) || 0.6;
      const ladderAct = repairActionForConfidence(trigger, conf);
      if (ladderAct === "presentation_fork") primaryAction = "presentation_fork";
    }
  } catch {
    /* optional */
  }

  const codes = [...new Set(findings.map((f) => f.id))];
  const missingSlots = flattenIrdMissingSlots(findings);
  let ctaLabel = irdCtaLabelFromAction({ primaryAction, missingSlots });
  let presentationFork: { fork: string; label: string }[] | undefined;
  if (primaryAction === "presentation_fork") {
    try {
      const { presentationForkChoices } =
        require("./presentationForkResolver") as typeof import("./presentationForkResolver");
      const choices = presentationForkChoices(codes.join(" ") || missingSlots.join(" "));
      presentationFork = choices.map((c) => ({ fork: c.fork, label: c.label }));
      ctaLabel = "选择修复路径（禁空跳手改）";
    } catch {
      /* optional */
    }
  }
  return {
    ok: blocks.length === 0,
    findings,
    patches,
    primaryAction,
    confirmRequired,
    irdProvenance: { diagnosedAt: new Date().toISOString(), codes },
    missingSlots: missingSlots.length ? missingSlots : undefined,
    ctaLabel,
    presentationFork,
  };
}

function applySpeakReactSplit(
  shots: Record<string, unknown>[],
  shotIndex: number,
  after: { children?: { role: string; visualDescription: string; hasDialogue?: boolean }[]; refuse?: boolean },
): { shots: Record<string, unknown>[]; refused: boolean } {
  const out: Record<string, unknown>[] = [];
  let refused = Boolean(after.refuse);
  for (const shot of shots) {
    if (Number(shot.shotIndex) !== shotIndex) {
      out.push(shot);
      continue;
    }
    if (shot._stillBeatSplitId || shot._visualSplitId) {
      out.push(shot);
      continue;
    }
    const parentKey = String(shot.clientId ?? shot.shotIndex ?? "s");
    const parentVd = String(shot.visualDescription ?? "");
    const kids = after.children ?? [];
    if (kids.length < 2 || after.refuse) {
      refused = true;
      out.push({ ...shot, irdConfirmRequired: true, stillSpeakReactRefuse: true });
      continue;
    }
    const sd = shot.shotDesign as { picture?: string; composition?: string } | undefined;
    const ensuredKids = kids.map((c) => {
      const ens = ensureChildVisualDescription({
        role: c.role,
        childVd: c.visualDescription,
        parentVd,
        picture: sd?.picture,
        composition: sd?.composition,
      });
      return { ...c, visualDescription: ens.visualDescription, ok: ens.ok };
    });
    if (ensuredKids.some((c) => !c.ok || isForbiddenSplitPlaceholder(c.visualDescription))) {
      refused = true;
      out.push({ ...shot, irdConfirmRequired: true, stillSpeakReactRefuse: true });
      continue;
    }
    for (let i = 0; i < ensuredKids.length; i++) {
      const c = ensuredKids[i]!;
      const isSpeak = c.role === "speak" || c.hasDialogue;
      const n = shot.narrative as { dialogue?: { lines?: unknown }; shotSize?: string } | undefined;
      const rawLines = (n?.dialogue?.lines ?? []) as unknown[];
      const speakLines = isSpeak ? stripReactionFieldsFromLines(rawLines) : [];
      out.push({
        ...shot,
        clientId: `${parentKey}-sr-${c.role}-${i}`,
        shotIndex: undefined,
        _stillBeatSplitId: parentKey,
        _parentVisualDescription: parentVd,
        _parentShotIndex: Number(shot.shotIndex),
        _parentClientId: String(shot.clientId ?? ""),
        visualSplitRole: c.role,
        visualDescription: c.visualDescription,
        burnParentForbidden: true,
        filePath: undefined,
        promptState: "stale",
        videoPass: false,
        narrative: {
          ...(n ?? {}),
          dialogue: isSpeak ? { lines: speakLines } : { lines: [] },
          shotSize: c.role === "reaction" ? "特写" : n?.shotSize,
        },
        irdApplied: true,
      });
    }
  }
  out.forEach((s, i) => {
    s.shotIndex = i + 1;
    s.index = i;
  });
  return { shots: sliceFieldsAfterIrdSplit(recomposeChildrenAfterSplit(out).shots).shots, refused };
}

/**
 * Apply IRD patches. Respects chatStrict / literaryLocked unless forceApply.
 */
export function applyStillIntentPatches(
  shots: Record<string, unknown>[],
  diagnose: IrdDiagnoseResult,
  opts?: IrdApplyOptions,
): {
  shots: Record<string, unknown>[];
  applied: string[];
  skipped: string[];
  refused: string[];
  irdProvenance: { appliedAt: string; patchIds: string[]; codes: string[] };
} {
  const applied: string[] = [];
  const skipped: string[] = [];
  const refused: string[] = [];
  const autoMin = opts?.autoMinConfidence ?? AUTO_MIN;
  const proposeOnly = Boolean(opts?.chatStrict) && !opts?.forceApply;
  const locked = Boolean(opts?.literaryLocked) && !opts?.forceApply;

  if (proposeOnly || locked) {
    return {
      shots,
      applied: [],
      skipped: diagnose.patches.map((p) => p.id),
      refused: locked ? ["literaryLocked"] : ["chatStrict"],
      irdProvenance: {
        appliedAt: new Date().toISOString(),
        patchIds: [],
        codes: diagnose.irdProvenance?.codes ?? [],
      },
    };
  }

  let next = [...shots];
  const selected = opts?.patchIds?.length
    ? diagnose.patches.filter((p) => opts.patchIds!.includes(p.id))
    : diagnose.patches.filter((p) => p.confidence >= autoMin || opts?.forceApply);

  // Non-split first
  for (const p of selected.filter((x) => x.op !== "split_onebeat" && x.op !== "split_speak_react")) {
    const shot = next.find((s) => Number(s.shotIndex) === p.shotIndex);
    if (!shot) {
      skipped.push(p.id);
      continue;
    }
    if (shot._stillBeatSplitId || shot._visualSplitId) {
      skipped.push(p.id);
      continue;
    }
    const after = p.after as Record<string, unknown>;
    if (p.op === "rewrite_vd" || p.op === "sync_intent_picture") {
      if (typeof after.visualDescription === "string") {
        shot.visualDescription = after.visualDescription;
        markChainStale(shot, { still: true, video: true });
        shot.irdApplied = true;
        applied.push(p.id);
      }
    } else if (p.op === "clamp_camera") {
      shot.camera = "static";
      const narr = (shot.narrative as Record<string, unknown>) ?? {};
      narr.camera = "static";
      shot.narrative = narr;
      shot.irdApplied = true;
      applied.push(p.id);
    } else if (p.op === "seed_audio") {
      const gen = (shot.generation as Record<string, unknown>) ?? {};
      if (typeof after.audioPrompt === "string") {
        shot.generation = { ...gen, audioPrompt: after.audioPrompt };
        applied.push(p.id);
      }
    } else {
      skipped.push(p.id);
    }
  }

  // Splits — onebeat via expandStillOneBeat on filtered set
  const onebeatPatches = selected.filter((p) => p.op === "split_onebeat");
  if (onebeatPatches.length) {
    const indices = new Set(onebeatPatches.map((p) => p.shotIndex));
    const refuseLow = onebeatPatches.filter((p) => p.confidence < autoMin && !opts?.forceApply);
    for (const p of refuseLow) refused.push(p.id);

    const expandable = next.map((s) => {
      const idx = Number(s.shotIndex);
      if (!indices.has(idx)) return s;
      const patch = onebeatPatches.find((p) => p.shotIndex === idx);
      const refuse = Boolean((patch?.after as { refuse?: boolean })?.refuse);
      if (patch && (patch.confidence >= autoMin || opts?.forceApply) && (!refuse || opts?.forceApply)) {
        // Clear override so expandStillOneBeat can run
        const { visBeatOverride: _drop, stillOneBeatRefuse: _r, ...rest } = s as Record<string, unknown> & {
          visBeatOverride?: unknown;
          stillOneBeatRefuse?: unknown;
        };
        return rest;
      }
      return { ...s, visBeatOverride: true }; // skip expand
    });

    const expanded = expandStillOneBeat(expandable, { recompose: true, force: Boolean(opts?.forceApply) });
    next = expanded.shots;
    for (const p of onebeatPatches) {
      if (refuseLow.includes(p) && !opts?.forceApply) continue;
      if ((p.after as { refuse?: boolean }).refuse && !opts?.forceApply) {
        refused.push(p.id);
        continue;
      }
      if (expanded.expandedCount > 0 || opts?.forceApply) applied.push(p.id);
      else refused.push(p.id);
    }
    next = sliceFieldsAfterIrdSplit(next).shots;
  }

  for (const p of selected.filter((x) => x.op === "split_speak_react")) {
    if (p.confidence < autoMin && !opts?.forceApply) {
      refused.push(p.id);
      continue;
    }
    if ((p.after as { refuse?: boolean }).refuse && !opts?.forceApply) {
      refused.push(p.id);
      continue;
    }
    const sr = applySpeakReactSplit(next, p.shotIndex, p.after as never);
    next = sr.shots;
    if (sr.refused && !opts?.forceApply) refused.push(p.id);
    else applied.push(p.id);
  }

  // Optional orchestrator pass for dialogue mirror when meta enforce
  if (applied.some((id) => id.includes("split")) && opts?.planData) {
    const orch = runSplitOrchestrator({
      planData: opts.planData,
      shots: next,
      meta: opts.meta,
      applyVisBeatExpanders: false,
      applyClauseSplit: false,
      applySemanticSplit: false,
    });
    next = orch.shots;
  }

  return {
    shots: next,
    applied,
    skipped,
    refused,
    irdProvenance: {
      appliedAt: new Date().toISOString(),
      patchIds: applied,
      codes: diagnose.irdProvenance?.codes ?? [],
    },
  };
}

/** Import/exit convenience: diagnose + auto-apply eligible patches. */
export function runStillIntentHeal(
  bundle: ScriptBundle,
  opts?: IrdApplyOptions,
): {
  diagnose: IrdDiagnoseResult;
  applied: string[];
  refused: string[];
  shots: Record<string, unknown>[];
} {
  const pack = bundle.preDesignPack as { shots?: Record<string, unknown>[] } | undefined;
  const shots = [...((pack?.shots ?? []) as Record<string, unknown>[])];
  const intents =
    opts?.intents ??
    ((bundle.planData as { shotDesignIntent?: ShotDesignIntent[] } | undefined)?.shotDesignIntent ?? []);

  // Salvage design loss into bundle first (formal sources)
  if (!opts?.chatStrict) {
    applyDesignLossSupplement(bundle, { proposeOnly: false });
  }

  const diagnose = diagnoseStillIntent(shots, {
    ...opts,
    bundle,
    intents,
    knownNames: knownNamesFromBundle(bundle),
  });

  const result = applyStillIntentPatches(shots, diagnose, opts);
  if (pack) pack.shots = result.shots as never;

  const meta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
  if (result.applied.length) {
    meta.irdProvenance = result.irdProvenance;
    meta.importOkNotExitPass = true;
    try {
      const { reindexDerivedTables } =
        require("../bundle/reindexDerivedTables") as typeof import("../bundle/reindexDerivedTables");
      reindexDerivedTables(bundle);
    } catch {
      /* optional */
    }
  }
  if (diagnose.confirmRequired || result.refused.length) {
    meta.irdConfirmRequired = true;
    (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
  }

  return {
    diagnose,
    applied: result.applied,
    refused: result.refused,
    shots: result.shots,
  };
}

/** Burn/stillDetect fork helper */
export function stillDirtyPrimaryAction(
  shot: Record<string, unknown>,
  opts?: { fidelityFailed?: boolean; layoutOnly?: boolean },
): IrdPrimaryAction {
  if (opts?.layoutOnly && !opts.fidelityFailed) {
    // Still check literary debt before batch
    try {
      const { auditLiteraryDetailQuality } =
        require("../compilers/stillLiteraryDetailQuality") as typeof import("../compilers/stillLiteraryDetailQuality");
      const a = auditLiteraryDetailQuality({
        visualDescription: String(shot.visualDescription ?? ""),
        shotSize: String(shot.shotSize ?? ""),
      });
      if (a.findings.some((f) => f.severity === "BLOCK")) return "hand_edit_vd";
    } catch {
      /* optional */
    }
    return "batch_still_hq";
  }
  const d = diagnoseStillIntent([shot], {});
  if (d.patches.some((p) => p.op === "split_onebeat" || p.op === "split_speak_react")) {
    return d.confirmRequired ? "confirm_split" : "apply_auto";
  }
  if (
    d.findings.some(
      (f) =>
        f.id === "DESIGN-LOSS" ||
        f.id === "DEX-INTENT-PIC" ||
        f.id === "PROMPT-FIDELITY" ||
        f.id === "DEX-LIT-CONTACT-XOR" ||
        f.id === "DEX-LIT-CONTACT" ||
        f.id === "DEX-LIT-ANCHOR" ||
        f.id === "DEX-PROP-CONT" ||
        f.id === "DEX-PROP-IN-FRAME",
    )
  ) {
    if (d.primaryAction === "confirm_enhance" || d.primaryAction === "apply_auto_enhance") {
      return d.primaryAction;
    }
    if (d.primaryAction === "confirm_split") return "confirm_split";
    return "hand_edit_vd";
  }
  if (opts?.fidelityFailed || opts?.layoutOnly) return "batch_still_hq";
  return d.primaryAction;
}

/** Re-export expanders for single apply surface callers */
export function runIrdExpanders(
  shots: Record<string, unknown>[],
  meta?: Record<string, unknown> | null,
): ReturnType<typeof runShotExpanders> {
  return runShotExpanders(shots, {
    meta: { ...(meta ?? {}), pillarsVisBeatV2: (meta?.pillarsVisBeatV2 as string) || "enforce" },
    applyClusters: true,
    applyStillOneBeat: true,
  });
}
