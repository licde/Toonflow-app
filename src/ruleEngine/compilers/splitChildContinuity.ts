/**
 * After Confirm split: child shots inherit parent anchors (identity / axis / wardrobe / light).
 */
export type SplitChildContinuitySeed = {
  parentShotIndex?: number | null;
  identityCodes?: string[];
  spatialRelation?: string | null;
  sceneCode?: string | null;
  sceneName?: string | null;
  wardrobeHint?: string | null;
  lightHint?: string | null;
  continuityFrom?: string | null;
  splitHint?: string | null;
  /** LGIA: inherit parent freeze phase when child is action-type */
  stillPhase?: string | null;
  emotionIntensity?: number | null;
};

export function buildSplitChildContinuitySeed(parent: Record<string, unknown> | null | undefined): SplitChildContinuitySeed {
  const p = parent ?? {};
  const narr = (p.narrative as Record<string, unknown> | undefined) ?? {};
  const codes =
    (narr.assetCodes as string[] | undefined) ??
    (p.charCodes as string[] | undefined) ??
    [];
  return {
    parentShotIndex: Number(p.shotIndex ?? p.index ?? 0) || null,
    identityCodes: codes.filter((c) => /^CHAR-/i.test(String(c))),
    spatialRelation: String(narr.spatialRelation ?? p.spatialRelation ?? "").trim() || null,
    sceneCode: String(p.sceneCode ?? "").trim() || null,
    sceneName: String(p.sceneName ?? "").trim() || null,
    wardrobeHint: String(narr.wardrobeContinuity ?? p.wardrobeHint ?? "服化与父镜连续").trim() || null,
    lightHint: String(narr.lightContinuity ?? p.lightHint ?? "光比与父镜连续").trim() || null,
    continuityFrom: String(narr.continuityFrom ?? `承接父镜${p.shotIndex ?? ""}`).trim() || null,
    splitHint: String(p.splitHint ?? narr.splitHint ?? "").trim() || null,
    stillPhase: String(narr.stillPhase ?? "").trim() || null,
    emotionIntensity:
      typeof narr.emotionIntensity === "number"
        ? Number(narr.emotionIntensity)
        : Number.isFinite(Number(p.emotionIntensity))
          ? Number(p.emotionIntensity)
          : null,
  };
}

/** Merge seed onto child design shot without erasing child's own dialogue/VD. */
export function applySplitChildContinuity(
  child: Record<string, unknown>,
  seed: SplitChildContinuitySeed,
): Record<string, unknown> {
  const narr = {
    ...((child.narrative as Record<string, unknown> | undefined) ?? {}),
  };
  if (seed.spatialRelation && !narr.spatialRelation) narr.spatialRelation = seed.spatialRelation;
  if (seed.continuityFrom) narr.continuityFrom = seed.continuityFrom;
  if (seed.wardrobeHint) narr.wardrobeContinuity = seed.wardrobeHint;
  if (seed.lightHint) narr.lightContinuity = seed.lightHint;
  if (seed.splitHint) narr.splitHint = seed.splitHint;
  if (seed.stillPhase && !narr.stillPhase) {
    narr.stillPhase = seed.stillPhase;
    narr.stillPhaseSource = "split_child_inherit";
    narr.stillPhaseAuthorLock = true;
  }
  if (seed.emotionIntensity != null && narr.emotionIntensity == null) {
    narr.emotionIntensity = seed.emotionIntensity;
  }
  if (seed.identityCodes?.length) {
    narr.assetCodes = [...new Set([...(Array.isArray(narr.assetCodes) ? narr.assetCodes : []), ...seed.identityCodes])];
  }
  return {
    ...child,
    sceneCode: child.sceneCode ?? seed.sceneCode,
    sceneName: child.sceneName ?? seed.sceneName,
    charCodes: child.charCodes ?? seed.identityCodes,
    narrative: narr,
    splitParentShotIndex: seed.parentShotIndex,
    splitContinuityApplied: true,
  };
}

export function auditSplitChildContinuity(input: {
  parent?: Record<string, unknown> | null;
  child?: Record<string, unknown> | null;
}): { ok: boolean; findings: string[] } {
  const findings: string[] = [];
  const parent = input.parent ?? {};
  const child = input.child ?? {};
  const pScene = String(parent.sceneCode ?? parent.sceneName ?? "");
  const cScene = String(child.sceneCode ?? child.sceneName ?? "");
  if (pScene && cScene && pScene !== cScene) findings.push("split_scene_drift");
  const pCodes = new Set(
    [
      ...((parent.charCodes as string[]) ?? []),
      ...(((parent.narrative as { assetCodes?: string[] })?.assetCodes ?? []) as string[]),
    ].map(String),
  );
  const cCodes = [
    ...((child.charCodes as string[]) ?? []),
    ...(((child.narrative as { assetCodes?: string[] })?.assetCodes ?? []) as string[]),
  ].map(String);
  if (pCodes.size && cCodes.length && !cCodes.some((c) => pCodes.has(c))) {
    findings.push("split_identity_drift");
  }
  if (!(child as { splitContinuityApplied?: boolean }).splitContinuityApplied && !(child.narrative as { continuityFrom?: string })?.continuityFrom) {
    findings.push("split_continuity_missing");
  }
  return { ok: findings.length === 0, findings };
}
