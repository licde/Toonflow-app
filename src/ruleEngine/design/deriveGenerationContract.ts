/**
 * deriveGenerationContract — reverse script/design/storyboard into a shot-scoped generation contract.
 * This is the SSOT that generation/repair/readiness all consume.
 */
import { buildExtractContext, extractDesignFields } from "./designFieldRegistry";
import { deriveShotModalityIntent, inferHasSceneLink } from "../compilers/shotModalityIntent";
import { buildCrossClassAntiSubstitutions } from "../compilers/contactEventPolicy";
import { buildPropFormInject } from "../compilers/propFormDoctrine";

export type GenerationContractFact = {
  id: string;
  text: string;
  priority: "must" | "should" | "soft";
  source: "script" | "designIntent" | "storyboardVd" | "repairInject" | "humanOverride";
};

export type GenerationContract = {
  contractVersion: string;
  contractHash: string;
  promptProvenance: GenerationContractFact[];
  mustShowFacts: GenerationContractFact[];
  secondaryConstraints: GenerationContractFact[];
  sacrificableConstraints: GenerationContractFact[];
  actionCarrier?: string;
  propCarrier?: string;
  forbiddenSubstitutions: string[];
  sceneWeight: "keep" | "soft" | "min";
  i2vCriticalFacts: string[];
  objectiveClass:
    | "contact_geom"
    | "prop_readable"
    | "identity_first"
    | "scene_keep"
    | "empty_scene"
    | "action_primary";
};

function hashText(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function pushFact(
  bucket: GenerationContractFact[],
  seen: Set<string>,
  id: string,
  text: string,
  priority: GenerationContractFact["priority"],
  source: GenerationContractFact["source"],
): void {
  const clean = String(text ?? "").trim();
  if (!clean) return;
  const key = `${id}:${clean}`;
  if (seen.has(key)) return;
  seen.add(key);
  bucket.push({ id, text: clean, priority, source });
}

export function deriveGenerationContract(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  spatialRelation?: string | null;
  foreground?: string | null;
  background?: string | null;
  sceneCode?: string | null;
  sceneName?: string | null;
  dialogueLines?: string[] | null;
  characterNames?: string[] | null;
  episodeShot?: Record<string, unknown> | null;
}): GenerationContract {
  const vd = String(input.visualDescription ?? "").trim();
  const names = (input.characterNames ?? []).map((s) => String(s).trim()).filter(Boolean);
  const hasSceneLink = inferHasSceneLink({
    sceneCode: input.sceneCode,
    sceneName: input.sceneName,
    promptText: vd,
  });
  const modality = deriveShotModalityIntent({
    visualDescription: vd,
    shotSize: input.shotSize,
    characterNames: names,
    hasSceneLink,
  });
  const seen = new Set<string>();
  const mustShowFacts: GenerationContractFact[] = [];
  const secondaryConstraints: GenerationContractFact[] = [];
  const sacrificableConstraints: GenerationContractFact[] = [];
  const promptProvenance: GenerationContractFact[] = [];

  pushFact(promptProvenance, seen, "vd", vd, "must", "storyboardVd");
  pushFact(mustShowFacts, seen, "vd", vd, "must", "storyboardVd");

  const designFields = (() => {
    try {
      return extractDesignFields(
        buildExtractContext({
          modality: "image",
          episodeShot: (input.episodeShot ?? undefined) as never,
        }),
      );
    } catch {
      return {} as ReturnType<typeof extractDesignFields>;
    }
  })();
  if (designFields.spatialRelation) {
    pushFact(mustShowFacts, seen, "spatial", `站位：${designFields.spatialRelation}`, "should", "designIntent");
    pushFact(promptProvenance, seen, "spatial", `站位：${designFields.spatialRelation}`, "should", "designIntent");
  } else if (input.spatialRelation) {
    pushFact(mustShowFacts, seen, "spatial", `站位：${input.spatialRelation}`, "should", "storyboardVd");
  }
  // Foreground is must for contact/prop shots (休书纸角 etc.)
  if (input.foreground) {
    const fgPri =
      modality.primaryVisualObjective === "contact_geom" || modality.primaryVisualObjective === "prop_readable"
        ? "must"
        : "should";
    pushFact(mustShowFacts, seen, "foreground", `前景：${input.foreground}`, fgPri, "designIntent");
  }
  if (input.background) pushFact(secondaryConstraints, seen, "background", `背景：${input.background}`, "soft", "designIntent");
  if (input.sceneCode || input.sceneName) {
    pushFact(
      secondaryConstraints,
      seen,
      "scene",
      `场景：${input.sceneName || input.sceneCode}`,
      modality.bgMode === "keep_plate" || modality.bgMode === "soft_env" ? "should" : "soft",
      "designIntent",
    );
  }

  // Micro-expression + color temp from episodeShot / design
  const shotDesign = (input.episodeShot?.shotDesign ?? null) as Record<string, unknown> | null;
  const perf = (shotDesign?.performance ?? null) as { microExpression?: { eyes?: string; mouthDetail?: string } } | null;
  if (perf?.microExpression?.eyes) {
    const microPri =
      modality.primaryVisualObjective === "contact_geom" ||
      modality.primaryVisualObjective === "prop_readable"
        ? "must"
        : "should";
    pushFact(
      mustShowFacts,
      seen,
      "micro_eyes",
      `微表情眼：${perf.microExpression.eyes}`,
      microPri,
      "designIntent",
    );
    if (perf.microExpression.mouthDetail) {
      pushFact(
        mustShowFacts,
        seen,
        "micro_mouth",
        `微表情口：${perf.microExpression.mouthDetail}`,
        microPri,
        "designIntent",
      );
    }
  }
  const colorTemp =
    String(
      (input.episodeShot as { colorTemp?: string } | null)?.colorTemp ??
        (shotDesign?.cameraAnchor as { colorTemp?: string } | undefined)?.colorTemp ??
        "",
    ).trim() ||
    (/4500|暖光|烛火/.test(vd) ? "暖光约4500K" : "");
  if (colorTemp || modality.bgMode === "soft_env") {
    pushFact(
      mustShowFacts,
      seen,
      "color_temp",
      `色温：${colorTemp || "暖光约4500K"}，禁止灰棚/白棚空白背景`,
      "must",
      "designIntent",
    );
  }

  const forbiddenSubstitutions: string[] = [];
  if (modality.contact?.isContactEvent) {
    const prop = modality.contact.propAlias || modality.contact.propCanonical || "道具";
    const locus = modality.contact.locus || "接触部位";
    pushFact(mustShowFacts, seen, "contact_geom", `${prop}与${locus}真实贴合/划过接触，禁止悬空，禁止手持卡片挡脸冒充贴合`, "must", "storyboardVd");
    // prop_in_frame (must) — not full-card legibility; glyph is should/L2
    pushFact(mustShowFacts, seen, "prop_in_frame", `${prop}须入画于触点（薄件边缘可见即可，禁止为「清晰可读」改成胸前手持卡片）`, "must", "storyboardVd");
    pushFact(mustShowFacts, seen, "prop_readable", `${prop}入画优先于字形全可读（第一刀几何；第二刀字形）`, "should", "storyboardVd");
    forbiddenSubstitutions.push(`禁止仅有${locus}浅痕无${prop}`);
    forbiddenSubstitutions.push(`禁止${prop}脱离${locus}独立存在`);
    forbiddenSubstitutions.push("禁止手持卡片/胸前展示卡/挡脸举物冒充接触划过");
    for (const line of buildCrossClassAntiSubstitutions(
      modality.contact.propClassId,
      modality.contact.propCanonical || prop,
    )) {
      forbiddenSubstitutions.push(line);
    }
    // Form / glyph / pose doctrine — framework material understanding (not shot hardcode)
    const formInject = buildPropFormInject({
      visualDescription: vd,
      propClassId: modality.contact.propClassId,
      propAlias: modality.contact.propAlias,
      propCanonical: modality.contact.propCanonical,
      locus: modality.contact.locus,
      stillPhase:
        (input.episodeShot as { narrative?: { stillPhase?: string } } | null)?.narrative?.stillPhase ??
        (/弯腰|俯身|捡/.test(vd) ? "approaching" : null),
    });
    if (formInject.formFact) {
      pushFact(mustShowFacts, seen, "prop_form", formInject.formFact, "must", "designIntent");
    }
    if (formInject.poseFact) {
      pushFact(mustShowFacts, seen, "prop_pose", formInject.poseFact, "must", "designIntent");
    }
    if (formInject.glyphFact) {
      pushFact(mustShowFacts, seen, "prop_glyph", formInject.glyphFact, "should", "storyboardVd");
    } else if (
      modality.contact.propClassId === "paper_doc" ||
      /字迹|可辨|笺面|纸面可见|二字/.test(vd)
    ) {
      pushFact(
        mustShowFacts,
        seen,
        "prop_glyph",
        `${prop}纸面可有字迹更佳（第二刀可读；第一刀以触点薄纸几何优先）`,
        "should",
        "storyboardVd",
      );
    }
    for (const line of formInject.forbidden) {
      forbiddenSubstitutions.push(line);
    }
    // Still freeze phase for video pose handoff — LGIA: respect stillPhase
    {
      let freeze = `本帧冻结为${prop}已触肤瞬间（非进入前悬空、非离开后空位）`;
      try {
        const phase = String(
          (input.episodeShot as { narrative?: { stillPhase?: string } } | null)?.narrative?.stillPhase ?? "",
        );
        if (phase === "approaching") {
          freeze = `本帧冻结为弯腰接近${prop}（手伸向纸，尚未捏紧完成；触及与捏紧归视频后相）`;
        } else if (phase === "mid_contact") {
          freeze = `本帧冻结为${prop}指尖刚触瞬间`;
        }
      } catch {
        /* default held freeze */
      }
      pushFact(mustShowFacts, seen, "contact_freeze", freeze, "should", "designIntent");
    }
  }
  if (/禁口含|禁纸入口|仅颊触非口含|仅面颊触非口含/.test(vd)) {
    forbiddenSubstitutions.push("禁止口含/纸入口");
  }
  if (/禁止灰棚|纯色摄影棚|空白背景/.test(vd)) {
    forbiddenSubstitutions.push("禁止灰棚/纯色摄影棚空白背景");
  }
  if (
    /禁止群像|禁止二号角色抢戏/.test(vd) ||
    modality.secondaryCharacterBudget === "hands_only" ||
    modality.secondaryCharacterBudget === "skirt_blur"
  ) {
    forbiddenSubstitutions.push("禁止配角完整立像抢主导");
    pushFact(
      sacrificableConstraints,
      seen,
      "secondary_presence",
      modality.secondaryCharacterBudget === "skirt_blur"
        ? "次角仅裙摆/衣角碎片虚化，禁止完整正脸立像"
        : "配角仅允许手/前臂/衣角级参与",
      "soft",
      "designIntent",
    );
  }

  // Form inject for doc/action without requiring contact event
  if (!modality.contact?.isContactEvent) {
    try {
      const { buildPropFormInjectFromVd, resolvePaperDocIntent } =
        require("../compilers/propFormDoctrine") as typeof import("../compilers/propFormDoctrine");
      const paper = resolvePaperDocIntent(vd);
      const actionDoc =
        paper.isPaperDoc ||
        modality.primaryVisualObjective === "action_primary" ||
        modality.primaryVisualObjective === "prop_readable";
      if (actionDoc) {
        const formInject = buildPropFormInjectFromVd(vd);
        if (formInject.formFact) {
          pushFact(mustShowFacts, seen, "prop_form", formInject.formFact, "must", "designIntent");
        }
        if (formInject.glyphFact) {
          pushFact(mustShowFacts, seen, "prop_glyph", formInject.glyphFact, "should", "designIntent");
        }
        if (formInject.poseFact) {
          pushFact(mustShowFacts, seen, "prop_pose", formInject.poseFact, "should", "designIntent");
        }
        for (const line of formInject.forbidden.slice(0, 4)) {
          forbiddenSubstitutions.push(line);
        }
      }
    } catch {
      /* optional */
    }
  }

  if (names.length) {
    let primaryLock = names[0];
    try {
      const { pickVdLiteraryPrimary } =
        require("../compilers/stillFirstFrameLiterarySsot") as typeof import("../compilers/stillFirstFrameLiterarySsot");
      const lit = pickVdLiteraryPrimary(vd, names);
      if (lit) primaryLock = lit;
      const narrPrimary = String(
        (input.episodeShot as { narrative?: { literaryPrimary?: string } } | null)?.narrative
          ?.literaryPrimary ?? "",
      ).trim();
      if (narrPrimary && names.some((n) => n.includes(narrPrimary) || narrPrimary.includes(n))) {
        primaryLock = names.find((n) => n.includes(narrPrimary) || narrPrimary.includes(n)) ?? narrPrimary;
      }
    } catch {
      /* names[0] fallback */
    }
    pushFact(secondaryConstraints, seen, "identity", `主角定妆锁：${primaryLock}`, "should", "designIntent");
  }

  const i2vCriticalFacts = mustShowFacts
    .filter((f) => /contact|prop|主角|站位/.test(f.id + f.text))
    .map((f) => f.text)
    .slice(0, 6);
  const sceneWeight: GenerationContract["sceneWeight"] =
    modality.bgMode === "keep_plate" ? "keep" : modality.bgMode === "soft_env" ? "soft" : "min";
  const actionCarrier = modality.roleScope.femaleLead ?? names[0];
  const propCarrier = modality.roleScope.propOwner ?? modality.roleScope.secondaryRole ?? actionCarrier;
  const contractHash = hashText(
    JSON.stringify({
      vd,
      names,
      mustShowFacts,
      secondaryConstraints,
      sacrificableConstraints,
      forbiddenSubstitutions,
      sceneWeight,
      i2vCriticalFacts,
      objectiveClass: modality.primaryVisualObjective,
    }),
  );

  return {
    contractVersion: "1.0.0",
    contractHash,
    promptProvenance,
    mustShowFacts,
    secondaryConstraints,
    sacrificableConstraints,
    actionCarrier,
    propCarrier,
    forbiddenSubstitutions,
    sceneWeight,
    i2vCriticalFacts,
    objectiveClass: modality.primaryVisualObjective,
  };
}
