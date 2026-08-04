/**
 * Execute literary repair delta hints (anti-isomorphic) before next vendor spend.
 * propSoft_resynth / drop_softEnv / keep_softEnv / seed — not persist-only.
 * Honesty: never claim「已智能修」while display-card prop / full SCENE softEnv still hung.
 */
import type { LiteraryEffectMiss } from "./literaryPrimaryEffects";
import { repairPlanForMissingEffects } from "./literaryPrimaryEffects";

export type LiteraryRepairDeltaResult = {
  injectLines: string[];
  deltaHints: string[];
  forceFull: boolean;
  propSoftBase64?: string;
  droppedSoftEnv: boolean;
  seedSalt?: string;
  refsRoles?: Array<"identity" | "propSoft" | "softEnv">;
  referenceList?: Array<{ type: "image"; base64: string; role?: string }>;
  sources: string[];
  /** True only when hostile plates were actually swapped (propSoft resynth ± softEnv drop). */
  platesSwapped: boolean;
  /** Safe to surface「已换板重出」— never true on inject-only. */
  claimPlateRepair: boolean;
};

/**
 * Apply delta hints against current refs. Mutates nothing external — returns next refs.
 */
export async function applyLiteraryRepairDeltas(input: {
  missingEffects?: LiteraryEffectMiss[] | null;
  deltaHints?: string[] | null;
  injectLines?: string[] | null;
  poseOccupancy?: string | null;
  visualDescription?: string | null;
  referenceList?: Array<{ type: "image"; base64: string; role?: string }>;
  refsRoles?: string[] | null;
  propClassId?: string | null;
  propCanonical?: string | null;
  glyphText?: string | null;
  /** SCENE softEnv bytes to re-hang on keep_softEnv (from prior hung plate / FE salvage). */
  softEnvBase64?: string | null;
  stillPhase?: string | null;
}): Promise<LiteraryRepairDeltaResult> {
  const misses = input.missingEffects ?? [];
  const plan =
    misses.length > 0
      ? repairPlanForMissingEffects(misses, { stillPhase: input.stillPhase })
      : {
          injectLines: input.injectLines ?? [],
          forceFull: true,
          deltaHints: input.deltaHints ?? ["seed", "egress_hash"],
          triggers: [],
        };
  const hints = [...new Set([...(input.deltaHints ?? []), ...plan.deltaHints])];
  const sources: string[] = ["literaryRepair.delta"];
  let refs = (input.referenceList ?? []).map((r) => ({ ...r, role: r.role }));
  let roles = (input.refsRoles ?? refs.map((r) => String(r.role || "identity"))).map(String);
  // Align roles length with refs
  while (roles.length < refs.length) roles.push(String(refs[roles.length]?.role || "identity"));
  let droppedSoftEnv = false;
  let propSoftBase64: string | undefined;
  let seedSalt: string | undefined;
  let propSoftResynthed = false;
  let identityRecropped = false;
  let softEnvRehung = false;
  /** Preserve softEnv bytes before any drop so keep_softEnv can re-attach. */
  let preservedSoftEnvB64 = String(input.softEnvBase64 ?? "")
    .replace(/^data:image\/\w+;base64,/, "")
    .trim();
  if (!preservedSoftEnvB64) {
    const softIdx = roles.indexOf("softEnv");
    if (softIdx >= 0) {
      preservedSoftEnvB64 = String(refs[softIdx]?.base64 ?? "")
        .replace(/^data:image\/\w+;base64,/, "")
        .trim();
    }
  }

  const bend =
    String(input.poseOccupancy ?? "") === "bend_pickup" ||
    /弯腰|捡起|捡拾|俯身/.test(String(input.visualDescription ?? ""));

  // SingleShotClosed healer ingress: oral — never propSoft_resynth / paper fills
  let oralBeat = false;
  try {
    const { isOralMicroNotActionPrimary, gateHealInjectLines } =
      require("../compilers/singleShotClosedCompose") as typeof import("../compilers/singleShotClosedCompose");
    oralBeat = isOralMicroNotActionPrimary(input.visualDescription);
    if (oralBeat) {
      const gated = gateHealInjectLines(plan.injectLines, input.visualDescription);
      plan.injectLines = gated.kept;
      for (const h of ["propSoft_resynth", "identity_bend_sil"] as const) {
        const ix = hints.indexOf(h);
        if (ix >= 0) hints.splice(ix, 1);
      }
      sources.push("literaryRepair.oral_no_prop_repollute");
      if (gated.rejected.length) sources.push(`literaryRepair.rejected:${gated.rejected.length}`);
    }
  } catch {
    /* optional */
  }

  let refsContract: import("../compilers/stillRefsContract").StillRefsContract | null = null;
  try {
    const { resolveStillRefsContract } = await import("../compilers/stillRefsContract");
    refsContract = resolveStillRefsContract({
      poseOccupancy: input.poseOccupancy,
      visualDescription: input.visualDescription,
    });
    sources.push(refsContract.reason);
  } catch {
    /* optional */
  }

  const wantKeepSoftEnv =
    hints.includes("keep_softEnv") ||
    misses.some(
      (m) =>
        m.id === "bg.scene_soft" ||
        m.id === "bg.composition" ||
        m.id === "bg.no_gray_studio",
    );

  const needsPlateSwap =
    !oralBeat &&
    (Boolean(refsContract?.forcePropOccupancySynth) ||
      Boolean(refsContract?.dropFullSoftEnv) ||
      bend ||
      hints.includes("propSoft_resynth") ||
      hints.includes("drop_softEnv") ||
      hints.includes("keep_softEnv") ||
      wantKeepSoftEnv ||
      misses.some(
        (m) =>
          m.id === "occupancy.bend_pickup" ||
          m.id === "prop.locus.ground_or_lead_hand" ||
          m.id === "prop.in_frame.paper" ||
          m.id === "bg.fragment.skirt" ||
          m.id === "bg.scene_soft" ||
          m.id === "bg.composition" ||
          m.id === "bg.no_gray_studio",
      ));

  // Merge contract default hints for whole-shot repair
  if (needsPlateSwap && refsContract?.repairDeltaHints?.length) {
    for (const h of refsContract.repairDeltaHints) {
      if (!hints.includes(h)) hints.push(h);
    }
  }

  // 1) Drop full-hall softEnv only when contract / explicit hint says so AND keep_softEnv does not win
  if (
    (hints.includes("drop_softEnv") || refsContract?.dropFullSoftEnv === true) &&
    !wantKeepSoftEnv
  ) {
    const nextRefs: typeof refs = [];
    const nextRoles: string[] = [];
    for (let i = 0; i < refs.length; i++) {
      const role = roles[i] || refs[i]?.role || "identity";
      if (role === "softEnv") {
        if (!preservedSoftEnvB64) {
          preservedSoftEnvB64 = String(refs[i]?.base64 ?? "")
            .replace(/^data:image\/\w+;base64,/, "")
            .trim();
        }
        droppedSoftEnv = true;
        sources.push("delta.drop_softEnv");
        continue;
      }
      nextRefs.push({ ...refs[i]!, role: String(role) });
      nextRoles.push(String(role));
    }
    refs = nextRefs;
    roles = nextRoles;
  } else if (wantKeepSoftEnv && hints.includes("drop_softEnv")) {
    sources.push("delta.keep_softEnv_blocks_drop");
    // Remove dead drop hint so callers don't think softEnv was dropped
    const di = hints.indexOf("drop_softEnv");
    if (di >= 0) hints.splice(di, 1);
  }

  // 1b) keep_softEnv: truly re-hang SCENE bytes (not inject-only / dead hint)
  if (wantKeepSoftEnv) {
    let softB64 = preservedSoftEnvB64;
    if (!softB64) {
      // Salvage wide / non-char plate already in refs
      for (let i = 0; i < refs.length; i++) {
        const role = roles[i] || refs[i]?.role;
        if (role === "identity" || role === "propSoft") continue;
        const b = String(refs[i]?.base64 ?? "")
          .replace(/^data:image\/\w+;base64,/, "")
          .trim();
        if (b.length > 800) {
          softB64 = b;
          break;
        }
      }
    }
    if (softB64) {
      const softIdx = roles.indexOf("softEnv");
      if (softIdx >= 0) {
        refs[softIdx] = { type: "image", base64: softB64, role: "softEnv" };
        softEnvRehung = true;
        sources.push("delta.keep_softEnv_replace");
      } else {
        // Cap: softEnv-first prefer — insert as softEnv; drop trailing if >3
        refs.push({ type: "image", base64: softB64, role: "softEnv" });
        roles.push("softEnv");
        softEnvRehung = true;
        sources.push("delta.keep_softEnv");
        while (refs.length > 3) {
          // Prefer drop duplicate identity/prop over softEnv
          const dropIdx = roles.findIndex((r, i) => i > 0 && r !== "softEnv" && r !== "identity");
          if (dropIdx > 0) {
            refs.splice(dropIdx, 1);
            roles.splice(dropIdx, 1);
          } else {
            break;
          }
        }
      }
      droppedSoftEnv = false;
      if (!hints.includes("keep_softEnv")) hints.push("keep_softEnv");
    } else {
      sources.push("delta.keep_softEnv_no_bytes");
    }
  }

  // 2) Resynth propSoft — only when forced, explicit propSoft_resynth, or no asset plate + bend swap need
  const wantPropResynth =
    hints.includes("propSoft_resynth") ||
    (refsContract?.forcePropOccupancySynth === true) ||
    (needsPlateSwap && !hints.includes("propSoft_resynth_if_no_asset"));
  const conditionalBendResynth =
    (hints.includes("propSoft_resynth_if_no_asset") || bend) &&
    !roles.includes("propSoft");
  if (wantPropResynth || conditionalBendResynth) {
    try {
      const { synthesizePropSoftPlate, resolvePropPlateLabel } = await import(
        "../compilers/eventPlateReadiness"
      );
      const label = resolvePropPlateLabel({
        contract: null,
        visualDescription: input.visualDescription,
      });
      const occForSynth =
        refsContract?.propPoseOccupancy ||
        (bend ? "bend_pickup" : input.poseOccupancy);
      let synth = await synthesizePropSoftPlate({
        propClassId: input.propClassId || label.propClassId,
        canonical: input.propCanonical || label.canonical,
        glyphText: input.glyphText || label.glyphText,
        softPlateHint: label.softPlateHint,
        plateMode: occForSynth === "bend_pickup" ? "object_inset" : label.plateMode,
        poseOccupancy: occForSynth,
      });
      if (occForSynth === "bend_pickup" || bend) {
        try {
          const { composeBendPropSoftFromScene } = await import("../compilers/eventPlateReadiness");
          const softIdx = roles.indexOf("softEnv");
          const softB64 = softIdx >= 0 ? refs[softIdx]?.base64 : undefined;
          const fromScene = await composeBendPropSoftFromScene({ sceneBase64: softB64 });
          const { isPoseCueNoPaperProp } =
            require("../compilers/stillFirstFrameExtract") as typeof import("../compilers/stillFirstFrameExtract");
          if (fromScene?.base64 && !isPoseCueNoPaperProp(fromScene.reason)) {
            synth = {
              base64: fromScene.base64,
              kind: fromScene.kind,
              label: input.propCanonical || label.canonical || "纸",
              plateMode: "object_inset",
            };
            sources.push(`delta.propSoft_scene_floor:${fromScene.reason}`);
          } else if (fromScene && isPoseCueNoPaperProp(fromScene.reason)) {
            sources.push(`delta.propSoft.reject_pose_cue:${fromScene.reason}`);
          }
        } catch {
          /* keep SVG */
        }
      }
      if (synth.base64) {
        propSoftBase64 = synth.base64;
        propSoftResynthed = true;
        const propIdx = roles.indexOf("propSoft");
        if (propIdx >= 0 && refs[propIdx]) {
          refs[propIdx] = { type: "image", base64: synth.base64, role: "propSoft" };
        } else if (refs.length >= 1) {
          refs.splice(1, 0, { type: "image", base64: synth.base64, role: "propSoft" });
          roles.splice(1, 0, "propSoft");
        } else {
          refs.push({ type: "image", base64: synth.base64, role: "propSoft" });
          roles.push("propSoft");
        }
        while (refs.length > 3) {
          refs.pop();
          roles.pop();
        }
        sources.push("delta.propSoft_resynth");
      } else {
        sources.push("delta.propSoft_empty");
      }
    } catch (e) {
      sources.push(`delta.propSoft_fail:${String((e as Error)?.message ?? e).slice(0, 40)}`);
    }
  }

  // 3) Re-crop identity when contract / camera.MS / bend prefers action body
  if (
    (refsContract?.identityPreferActionBody || bend || hints.includes("preferActionBody")) &&
    refs.length &&
    roles[0] !== "propSoft"
  ) {
    try {
      const { cropTurnaroundSheetToIdentityPlate } = await import(
        "../compilers/cropTurnaroundToIdentityPlate"
      );
      const { cropIdentityPlateToFaceBias } = await import("../compilers/eventPlateReadiness");
      const idIdx = roles.indexOf("identity") >= 0 ? roles.indexOf("identity") : 0;
      const idB64 = refs[idIdx]?.base64;
      if (idB64) {
        let next = idB64;
        const sheet = await cropTurnaroundSheetToIdentityPlate(next, {
          assumeSheet: true,
          threeViewStrip: true,
          preferActionBody: true,
        });
        if (sheet.cropped && sheet.base64) next = sheet.base64;
        const body = await cropIdentityPlateToFaceBias(next, { preferActionBody: true });
        if (body.cropped && body.base64) next = body.base64;
        if (next !== idB64) {
          refs[idIdx] = { type: "image", base64: next, role: "identity" };
          identityRecropped = true;
          sources.push("delta.identity_action_body");
        }
      }
    } catch (e) {
      sources.push(`delta.identity_fail:${String((e as Error)?.message ?? e).slice(0, 40)}`);
    }
  }

  // 3b) Bend: replace standing identity with face+lean silhouette (anti upright sheet)
  if (
    (refsContract?.identityReplaceStandingSheet ||
      bend ||
      hints.includes("identity_bend_sil")) &&
    refs.length &&
    roles[0] !== "propSoft"
  ) {
    try {
      const { composeBendIdentityPlate } = await import("../compilers/eventPlateReadiness");
      const idIdx = roles.indexOf("identity") >= 0 ? roles.indexOf("identity") : 0;
      const idB64 = refs[idIdx]?.base64;
      if (idB64) {
        const bendId = await composeBendIdentityPlate({ faceSourceBase64: idB64 });
        if (bendId.usedFace && bendId.base64 && bendId.base64 !== idB64) {
          refs[idIdx] = { type: "image", base64: bendId.base64, role: "identity" };
          identityRecropped = true;
          sources.push(`delta.identity_bend_sil:${bendId.reason}`);
        }
      }
    } catch (e) {
      sources.push(`delta.identity_bend_fail:${String((e as Error)?.message ?? e).slice(0, 40)}`);
    }
  }

  if (hints.includes("seed") || hints.includes("egress_hash")) {
    seedSalt = `lit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sources.push("delta.seed");
  }

  const softEnvGone = !roles.includes("softEnv");
  // Plate swap honesty: when contract drops softEnv, it must be gone; propSoft must resynth when forced
  const softEnvOk =
    wantKeepSoftEnv
      ? softEnvRehung || roles.includes("softEnv")
      : !refsContract?.dropFullSoftEnv || softEnvGone || droppedSoftEnv || !needsPlateSwap;
  const platesSwapped = needsPlateSwap
    ? ((refsContract?.forcePropOccupancySynth ? propSoftResynthed : propSoftResynthed || droppedSoftEnv || softEnvRehung) &&
        softEnvOk) ||
      softEnvRehung
    : propSoftResynthed || droppedSoftEnv || identityRecropped || softEnvRehung;
  const claimPlateRepair =
    platesSwapped &&
    (propSoftResynthed || softEnvRehung || !refsContract?.forcePropOccupancySynth);

  if (needsPlateSwap && !claimPlateRepair) {
    sources.push("delta.no_plate_swap_no_claim");
  } else if (claimPlateRepair) {
    sources.push("delta.plates_swapped_claim_ok");
  }

  // Inject lines are auxiliary; never imply repair succeeded without plate swap
  let injectLines = [...new Set([...(input.injectLines ?? []), ...plan.injectLines])].slice(0, 8);
  if (needsPlateSwap && !claimPlateRepair) {
    injectLines = injectLines.filter((l) => !/已智能修|已修复|已换板/.test(l));
    sources.push("delta.inject_only_aux");
  }

  return {
    injectLines,
    deltaHints: hints,
    forceFull: plan.forceFull || true,
    propSoftBase64,
    droppedSoftEnv,
    seedSalt,
    refsRoles: roles as Array<"identity" | "propSoft" | "softEnv">,
    referenceList: refs,
    sources,
    platesSwapped,
    claimPlateRepair,
  };
}

/** Min decoded bytes for propSoft to count as hung (soft debt otherwise — never hard-block). */
export const PROP_SOFT_MIN_BYTES = 64;

/** Decode length of propSoft base64 (0 if missing). */
export function propSoftSlotByteLength(input: {
  refsRoles?: string[] | null;
  referenceList?: Array<{ base64?: string; role?: string }> | null;
}): number {
  const roles = input.refsRoles ?? [];
  const refs = input.referenceList ?? [];
  const rawOf = (b64: string) => String(b64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
  const idx = roles.indexOf("propSoft");
  const candidates: string[] = [];
  if (idx >= 0) candidates.push(rawOf(String(refs[idx]?.base64 ?? "")));
  for (const r of refs) {
    if (r.role === "propSoft") candidates.push(rawOf(String(r.base64 ?? "")));
  }
  let max = 0;
  for (const raw of candidates) {
    if (!raw) continue;
    // Approximate decoded bytes without Buffer alloc of full image
    const approx = Math.floor((raw.length * 3) / 4);
    if (approx > max) max = approx;
  }
  return max;
}

/** True only when propSoft slot has enough bytes (skipSynth honesty). Short/empty → soft debt CTA. */
export function propSoftSlotActuallyPresent(input: {
  refsRoles?: string[] | null;
  referenceList?: Array<{ base64?: string; role?: string }> | null;
  minBytes?: number;
}): boolean {
  return propSoftSlotByteLength(input) >= (input.minBytes ?? PROP_SOFT_MIN_BYTES);
}
