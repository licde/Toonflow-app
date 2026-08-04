/**
 * stillPromptFoundationGuard — ensure objective/lint compression never drops foundational invariants.
 * Foundations: identity tokens, contact XOR, contact geom, prop readable, sheet bans, contract forbidden lines.
 */
import type { GenerationContract } from "../design/deriveGenerationContract";
import { buildMustSurvive } from "./stillLiteraryIntentSsot";

export type FoundationGuardResult = {
  prompt: string;
  ok: boolean;
  missing: string[];
  restored: string[];
};

function extractClause(original: string, hint: RegExp): string | null {
  const m = original.match(hint);
  return m?.[0]?.trim() || null;
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

/** Audit + restore foundational slots after prompt transforms. */
export function guardStillPromptFoundations(input: {
  prompt: string;
  originalPrompt?: string | null;
  visualDescription?: string | null;
  contract?: GenerationContract | null;
  characterNames?: string[];
  /** Sealed L0 carriers — restore occupancy if compress dropped them */
  primaryIntentSeal?: {
    poseOccupancy?: string;
    sealHash?: string;
    propInHand?: boolean;
    primaryObjective?: string;
  } | null;
  /** When true (or seal bend), skip cheek-contact restore / mouth XOR / contact mustSurvive */
  contactXorPickup?: boolean | null;
}): FoundationGuardResult {
  let prompt = String(input.prompt ?? "").trim();
  const original = String(input.originalPrompt ?? prompt).trim();
  const vd = String(input.visualDescription ?? "").trim();
  const contract = input.contract ?? null;
  const missing: string[] = [];
  const restored: string[] = [];

  const bendSealed =
    input.primaryIntentSeal?.poseOccupancy === "bend_pickup" ||
    input.contactXorPickup === true ||
    (input.primaryIntentSeal?.primaryObjective === "action_primary" &&
      /弯腰|捡起|捡拾|俯身/.test(vd));

  const restore = (id: string, clause: string, mode: "lead" | "tail" = "lead") => {
    const bit = String(clause ?? "").trim();
    if (!bit || prompt.includes(bit.slice(0, Math.min(8, bit.length)))) return;
    // Bend seal: never restore cheek-contact / mangled locus legislation
    if (
      bendSealed &&
      (/contact_geom|contact:|贴合|划过|仅[\u4e00-\u9fff]{1,4}触|禁口含|入画于触点|紫袍金/.test(id + bit) ||
        /须与.{0,6}贴合/.test(bit))
    ) {
      restored.push(`skip_bend:${id}`);
      return;
    }
    prompt = mode === "tail" ? `${prompt} ${bit}`.trim() : `${bit}。${prompt}`.replace(/。{2,}/g, "。").trim();
    restored.push(id);
  };

  // --- Identity / vendor tokens (never drop cref/sref tail) ---
  const origCrefs = original.match(/--cref\s+\S+/gi) ?? [];
  const origSrefs = original.match(/--sref\s+\S+/gi) ?? [];
  for (const cref of origCrefs) {
    if (!prompt.includes(cref)) {
      prompt = `${prompt} ${cref}`.replace(/\s{2,}/g, " ").trim();
      restored.push("identity:cref");
    }
  }
  // sref only when scene weight is keep/soft
  const sceneWeight = contract?.sceneWeight ?? "soft";
  if (sceneWeight !== "min") {
    for (const sref of origSrefs) {
      if (!prompt.includes(sref)) {
        prompt = `${prompt} ${sref}`.replace(/\s{2,}/g, " ").trim();
        restored.push("identity:sref");
      }
    }
    // soft: ensure studio ban + soft env guidance
    if (!/禁止灰棚|禁止白棚|纯色摄影棚/.test(prompt)) {
      missing.push("env:studio_ban");
      const noDof =
        (contract as { bgBlur?: boolean } | null)?.bgBlur === false ||
        /禁止浅景深|bgBlur.?false|环境轮廓可辨/.test(prompt + original + vd);
      restore(
        "env:studio_ban",
        noDof
          ? "背景弱化：环境轮廓可辨（木作/烛光），禁止浅景深抢戏，禁止灰棚/白棚空白背景"
          : "背景弱化：浅景深虚化环境，保留室内轮廓可辨，禁止灰棚/白棚空白背景",
      );
    }
    const colorFact = contract?.mustShowFacts.find((f) => f.id === "color_temp");
    if (colorFact && !/色温|烛火|暖光|4500/.test(prompt)) {
      missing.push("env:color_temp");
      restore("env:color_temp", colorFact.text);
    }
  }

  const identityBodyRules: Array<{ id: string; patterns: RegExp[]; hint: RegExp; fallback?: string }> = [
    {
      id: "identity:face_lock",
      patterns: [/禁止重塑五官|锁定脸型/],
      hint: /[^。；]*(?:禁止重塑五官|锁定脸型)[^。；]*[。；]?/,
      fallback: "锁定角色定妆参考脸型，禁止重塑五官身份",
    },
    {
      id: "identity:look_anchor",
      patterns: [/本镜主look/],
      hint: /[^。；]*本镜主look[^。；]*[。；]?/,
    },
    {
      id: "layout:sheet_ban",
      patterns: [/单镜头成片|禁四视图|禁复刻多格拼版/],
      hint: /[^。；]*(?:单镜头成片|禁四视图)[^。；]*[。；]?/,
      fallback: "单镜头成片，禁四视图/拼版",
    },
    {
      id: "layout:aspect_safe",
      patterns: [/9:16|安全区/],
      hint: /[^。；]*(?:竖屏9:16|安全区)[^。；]*[。；]?/,
    },
  ];

  for (const rule of identityBodyRules) {
    if (hasAny(original, rule.patterns) && !hasAny(prompt, rule.patterns)) {
      missing.push(rule.id);
      const clause = extractClause(original, rule.hint) ?? rule.fallback;
      if (clause) restore(rule.id, clause);
    }
  }

  // --- Contact / prop foundations from contract + VD ---
  // bend_pickup / contactXor: never resurrect cheek-contact soup (contact zombie)
  const contactScene =
    !bendSealed &&
    (contract?.objectiveClass === "contact_geom" ||
      (contract?.objectiveClass === "prop_readable" && /贴颊|划过面颊|真实贴合/.test(vd)) ||
      (/纸角|贴颊|划过面颊|真实贴合/.test(vd) && !/弯腰|捡起|捡拾/.test(vd)));

  if (contactScene) {
    const contactRules: Array<{ id: string; patterns: RegExp[]; hint: RegExp; fallback?: string }> = [
      {
        id: "contact:geom",
        patterns: [/贴合|划过接触|禁止悬空/],
        hint: /[^。；]*(?:真实贴合|划过接触|禁止悬空)[^。；]*[。；]?/,
        fallback: contract?.mustShowFacts.find((f) => /贴合|划过接触/.test(f.text))?.text,
      },
      {
        id: "contact:prop_readable",
        patterns: [/清晰入画|纸角|可读/],
        hint: /[^。；]*(?:清晰入画|纸角|可读)[^。；]*[。；]?/,
      },
    ];
    for (const rule of contactRules) {
      if (!hasAny(prompt, rule.patterns)) {
        missing.push(rule.id);
        const clause = extractClause(original, rule.hint) ?? rule.fallback;
        if (clause) restore(rule.id, clause);
      }
    }
  }

  if (!bendSealed && /禁口含|禁纸入口|纸未入口|仅颊触|仅面颊触/.test(vd + original)) {
    const mouthOk =
      /禁口含/.test(prompt) &&
      /(?:禁纸入口|纸未入口)/.test(prompt) &&
      /仅(?:颊|面颊)触/.test(prompt);
    if (!mouthOk) {
      missing.push("contact:mouth_xor");
      const clause =
        extractClause(original, /[^。；]*(?:禁口含|纸未入口)[^。；]*[。；]?/) ??
        "禁口含；禁纸入口；仅颊触非口含";
      restore("contact:mouth_xor", clause);
    }
  }

  // Contract forbidden lines — must survive as explicit negatives
  if (contract) {
    for (const forbidden of contract.forbiddenSubstitutions) {
      const key = forbidden.slice(0, Math.min(6, forbidden.length));
      if (key && !prompt.includes(key)) {
        // Bend: skip cheek-contact contract forbids that re-legislate contact soup at head
        if (
          bendSealed &&
          /贴合|划过|口含|颊触|手持卡片|抵颏|卷棒|摊开册页|仅有面颊|脱离面颊/.test(forbidden)
        ) {
          continue;
        }
        missing.push(`contract:forbidden:${key}`);
        restore(`contract:forbidden:${key}`, forbidden);
      }
    }
    for (const fact of contract.mustShowFacts.filter((f) => f.priority === "must").slice(0, 3)) {
      if (bendSealed && (fact.id === "contact_geom" || /贴合|划过接触/.test(fact.text))) {
        continue;
      }
      const key = fact.text.slice(0, Math.min(8, fact.text.length));
      if (key && !prompt.includes(key)) {
        missing.push(`contract:must:${fact.id}`);
        restore(`contract:must:${fact.id}`, fact.text);
      }
    }
  }

  // Literary mustSurvive atoms (VD-derived checklist)
  if (vd) {
    const surv = buildMustSurvive({
      visualDescription: vd,
      prompt,
      characterNames: input.characterNames,
    });
    for (const m of surv.missing) {
      if (bendSealed && /contact_geom|contact:/.test(m.id)) continue;
      if (bendSealed && /lit:wound_visible|wound/.test(m.id)) continue;
      if (m.soft) continue;
      const inject = String(m.healInject ?? "").trim();
      const tokenHit = m.mustTokens.some((t) => t && prompt.includes(t));
      if (!tokenHit && inject) {
        missing.push(`mustSurvive:${m.id}`);
        restore(`mustSurvive:${m.id}`, inject);
      }
    }
  }

  // Re-assert: secondary dominance phrases must stay stripped in contact CU (generic, no role names)
  if (contactScene) {
    const dominance = /[^。；]*(?:完整立像|半身立像|配角站立|次角站立|二号站立)[^。；]*[。；]?/g;
    if (dominance.test(prompt)) {
      prompt = prompt.replace(dominance, " ").replace(/\s{2,}/g, " ").replace(/。{2,}/g, "。").trim();
      restored.push("strip:secondary_dominance_reassert");
    }
  }

  // L0 seal: restore occupancy + strip hostile cheek for bend (never throw)
  try {
    const seal = input.primaryIntentSeal;
    if (seal?.poseOccupancy && seal.poseOccupancy !== "other") {
      const { assertEgressObeysPrimarySeal } =
        require("./stillSealGate") as typeof import("./stillSealGate");
      const sealed = assertEgressObeysPrimarySeal({
        prompt,
        seal: seal as import("./primaryIntentSeal").PrimaryIntentCarrierSet,
      });
      prompt = sealed.prompt;
      restored.push(...sealed.sources.map((s) => s.replace(/^seal\.gate\./, "seal:")));
    }
  } catch {
    /* optional */
  }

  const ok = missing.length === 0 || restored.length >= missing.length;
  return {
    prompt: prompt.replace(/\s{2,}/g, " ").replace(/。{2,}/g, "。").trim(),
    ok,
    missing,
    restored: [...new Set(restored)],
  };
}
