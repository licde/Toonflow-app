/**
 * Literary still SSOT — peel identity tokens; edit prompt ≠ vendor egress soup.
 * Generic: no role-name / shot hardcoding.
 */

const EGRESS_SOUP_RE =
  /定妆为准|锁定脸型|禁止重塑五官|竖屏9:16安全区|safe\s*area|power\s*blocking|compositionContract|占位：站立持|完整立像抢戏|force_compose|delta_hash|色温：暖白|约4500K|负向：灰棚/i;

const LITERARY_ATOM_RES: RegExp[] = [
  /弯腰|捡起|捡拾|俯身/,
  /指尖捏|指节|捏紧/,
  /裙摆|衣角|碎片|虚化/,
  /烛火|烛光|暖光|色温/,
  /休书|婚书|信笺|薄纸|薄笺/,
  /面颊|浅痕/,
  /古言写实|中景|近景|特写/,
];

/** Peel --cref/--sref/--ar and continuity noise for literary body. */
export function peelLiteraryStillBody(raw: string | null | undefined): string {
  let cleaned = String(raw ?? "");
  try {
    const { stripIdentityTokens, scrubStillPromptNoise } =
      require("./composeStillPrompt") as typeof import("./composeStillPrompt");
    cleaned = scrubStillPromptNoise(stripIdentityTokens(cleaned).body).cleaned;
  } catch {
    cleaned = cleaned
      .replace(/--(?:cref|sref|ar)\s+\S+/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  try {
    const { peelContinuityNoise, stripBareCrefSref } =
      require("../design/dirtyStillPromptGate") as typeof import("../design/dirtyStillPromptGate");
    cleaned = peelContinuityNoise(stripBareCrefSref(cleaned));
  } catch {
    /* optional */
  }
  cleaned = cleaned.replace(/--ar\s+\S+/gi, "").replace(/\s{2,}/g, " ").trim();
  // Agnes / vendor template crumbs
  cleaned = cleaned.replace(/,?\s*tag-stack-zh\b/gi, "").replace(/\s{2,}/g, " ").trim();
  // Orphan CU soup when body is MS / bend action
  if (/中景|弯腰|捡起|捡拾|俯身|\bMS\b/i.test(cleaned)) {
    cleaned = cleaned
      .replace(/(?:^|[。；，,\s])特写。/g, (m) => m.replace(/特写。/, ""))
      .replace(/^特写[，,。\s]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return cleaned;
}

function hasAtom(text: string, re: RegExp): boolean {
  return re.test(text);
}

/** Append literary atoms from donor that are missing in base (通类词干). */
export function mergeMissingLiteraryAtoms(base: string, donor: string): string {
  let out = String(base ?? "").trim();
  const d = String(donor ?? "").trim();
  if (!d) return out;
  if (!out) return d;
  for (const re of LITERARY_ATOM_RES) {
    if (hasAtom(d, re) && !hasAtom(out, re)) {
      // Pull short clause containing the atom
      const m = d.match(new RegExp(`[^。；;，,]{0,24}${re.source}[^。；;，,]{0,24}`));
      const bit = (m?.[0] ?? "").trim();
      if (bit && !out.includes(bit.slice(0, Math.min(6, bit.length)))) {
        out = `${out}。${bit}`.replace(/。{2,}/g, "。").trim();
      }
    }
  }
  return out;
}

export function resolveLiteraryStillPrompt(input: {
  visualDescription?: string | null;
  compiledImagePrompt?: string | null;
  background?: string | null;
  spatialRelation?: unknown;
}): {
  literary: string;
  peeledImagePrompt: string;
  peeledVd: string;
  source: "imagePrompt" | "visualDescription" | "union" | "empty";
} {
  const peeledVd = peelLiteraryStillBody(input.visualDescription);
  let peeledImagePrompt = peelLiteraryStillBody(input.compiledImagePrompt);
  // When current VD is bend/action and imagePrompt carries neighbor oral-CU, prefer VD and scrub image
  try {
    const { isBendSealed, stripHostileCheekLegislation, isOffBeatOralCuClause } =
      require("./stillSealGate") as typeof import("./stillSealGate");
    const bendVd =
      isBendSealed({
        poseOccupancy: /弯腰|捡起|捡拾|俯身/.test(peeledVd) ? "bend_pickup" : null,
        primaryObjective: /弯腰|捡起|捡拾/.test(peeledVd) ? "action_primary" : null,
      }) || /弯腰|捡起|捡拾|俯身/.test(peeledVd);
    if (bendVd && peeledImagePrompt && isOffBeatOralCuClause(peeledImagePrompt, peeledVd)) {
      const scrubbed = stripHostileCheekLegislation(
        peeledImagePrompt,
        {
          poseOccupancy: "bend_pickup",
          gripLocus: [],
          primarySpatialStems: [],
          primaryObjective: "action_primary",
          propInHand: true,
          sealHash: "lit_scrub",
        },
        { currentVisualDescription: peeledVd },
      );
      peeledImagePrompt = scrubbed.prompt;
      // If imagePrompt was mostly oral-CU, fall through to VD-primary below
      if (!peeledImagePrompt.trim() || isOffBeatOralCuClause(peeledImagePrompt, peeledVd)) {
        peeledImagePrompt = "";
      }
    }
  } catch {
    /* optional */
  }
  // SingleShotClosed: imagePrompt adopt ∩ VD — undeclared stems never enter literary/L0
  try {
    const { intersectImagePromptWithVd, isOralMicroNotActionPrimary } =
      require("./singleShotClosedCompose") as typeof import("./singleShotClosedCompose");
    if (peeledImagePrompt) {
      const intersected = intersectImagePromptWithVd(peeledImagePrompt, peeledVd);
      peeledImagePrompt = intersected.text;
      if (
        isOralMicroNotActionPrimary(peeledVd) &&
        (!peeledImagePrompt.trim() || /弯腰|捡起|休书/.test(peeledImagePrompt))
      ) {
        peeledImagePrompt = "";
      }
    }
  } catch {
    /* optional */
  }
  const bg = peelLiteraryStillBody(
    typeof input.background === "string"
      ? input.background
      : input.background != null
        ? String(input.background)
        : "",
  );
  const spatial =
    typeof input.spatialRelation === "string"
      ? peelLiteraryStillBody(input.spatialRelation)
      : input.spatialRelation != null
        ? peelLiteraryStillBody(JSON.stringify(input.spatialRelation))
        : "";

  // Edit SSOT: prefer peeled imagePrompt (package still intent); union missing VD/bg atoms
  let literary = "";
  let source: "imagePrompt" | "visualDescription" | "union" | "empty" = "empty";
  if (peeledImagePrompt) {
    literary = mergeMissingLiteraryAtoms(peeledImagePrompt, peeledVd);
    literary = mergeMissingLiteraryAtoms(literary, bg);
    literary = mergeMissingLiteraryAtoms(literary, spatial);
    source = peeledVd && literary !== peeledImagePrompt ? "union" : "imagePrompt";
  } else if (peeledVd) {
    literary = mergeMissingLiteraryAtoms(peeledVd, bg);
    literary = mergeMissingLiteraryAtoms(literary, spatial);
    source = "visualDescription";
  }
  return { literary: literary.slice(0, 2000), peeledImagePrompt, peeledVd, source };
}

/** True when text looks like vendor egress soup (not literary edit SSOT). */
export function isStillEgressSoup(text: string | null | undefined): boolean {
  const t = String(text ?? "").trim();
  if (!t) return false;
  if (EGRESS_SOUP_RE.test(t)) return true;
  // Dense ban soup / lock stack
  const banCount = (t.match(/禁止/g) ?? []).length;
  if (banCount >= 3 && /定妆|锁定脸型|灰棚/.test(t)) return true;
  return false;
}

/**
 * Gate FE rawPrompt patches: keep true literary deltas only; drop egress re-injection.
 */
export function gateUserPatchAgainstLiterary(input: {
  rawPatch: string | null | undefined;
  literary: string;
}): string | null {
  const patch = peelLiteraryStillBody(input.rawPatch);
  if (!patch || patch.length < 4) return null;
  const lit = String(input.literary ?? "").trim();
  if (lit && patch.includes(lit.slice(0, Math.min(20, lit.length)))) return null;
  if (isStillEgressSoup(patch)) return null;
  // If patch is mostly already covered by literary atoms, skip
  let covered = 0;
  let present = 0;
  for (const re of LITERARY_ATOM_RES) {
    if (re.test(patch)) {
      present++;
      if (re.test(lit)) covered++;
    }
  }
  if (present > 0 && covered === present && patch.length <= lit.length + 8) return null;
  // Keep short genuine user beats that aren't soup
  if (/safe area|power blocking|9:16安全区/i.test(patch) && patch.replace(/\s+/g, "").length < 20) {
    return null;
  }
  return patch;
}

/** L0 blob for DIP / seal hash (VD ∪ peeled imagePrompt ∪ bg ∪ composition). */
export function literaryL0Blob(input: {
  visualDescription?: string | null;
  compiledImagePrompt?: string | null;
  background?: string | null;
  foreground?: string | null;
  spatialRelation?: unknown;
}): string {
  const r = resolveLiteraryStillPrompt(input);
  const spatial =
    typeof input.spatialRelation === "string"
      ? peelLiteraryStillBody(input.spatialRelation)
      : input.spatialRelation
        ? peelLiteraryStillBody(JSON.stringify(input.spatialRelation))
        : "";
  return [
    r.peeledVd,
    r.peeledImagePrompt,
    peelLiteraryStillBody(input.background),
    peelLiteraryStillBody(input.foreground),
    spatial,
  ]
    .filter(Boolean)
    .join("\n");
}
