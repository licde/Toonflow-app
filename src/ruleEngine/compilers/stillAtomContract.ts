/**
 * stillAtomContract — implementable first-frame atoms (event/identity/env/perf).
 * Shared by deriveGenerationContract consumers, compose, and i2v readiness.
 * Driven by objectiveClass / propClassId / mustShowFacts — no shot-specific hardcoding.
 */
import type { GenerationContract } from "../design/deriveGenerationContract";
import { matchContactEventVd, propClassAliases, textHasPropInFrame } from "./contactEventPolicy";

export type StillAtomId =
  | "event.contact"
  | "identity.lead"
  | "env.soft"
  | "perf.micro"
  | "neg.studio"
  | "neg.secondary_full"
  | "prop.readable"
  | "prop.glyph"
  | "prop.form"
  | "prop.anti_sub"
  | "prop.pose_locus";

export type StillAtom = {
  id: StillAtomId;
  priority: "must" | "should";
  text: string;
  ok: boolean;
  missReason?: string;
};

export type StillAtomContract = {
  atoms: StillAtom[];
  mustFail: string[];
  ok: boolean;
};

export function deriveStillAtomContract(input: {
  contract?: GenerationContract | null;
  visualDescription?: string | null;
  prompt?: string | null;
  characterNames?: string[];
}): StillAtomContract {
  const vd = String(input.visualDescription ?? "");
  const prompt = String(input.prompt ?? "");
  const blob = `${vd}\n${prompt}`;
  const c = input.contract;
  const atoms: StillAtom[] = [];
  const contactMatch = (() => {
    try {
      return matchContactEventVd(vd || blob);
    } catch {
      return null;
    }
  })();

  const contact =
    c?.objectiveClass === "contact_geom" ||
    c?.objectiveClass === "prop_readable" ||
    Boolean(contactMatch?.isContactEvent) ||
    /纸角|贴颊|划过|触肤|真实贴合/.test(blob);
  if (contact) {
    const hasEvent = /纸角|贴颊|划过|触肤|贴合|道具/.test(blob) || Boolean(contactMatch?.isContactEvent);
    atoms.push({
      id: "event.contact",
      priority: "must",
      text: "道具触肤事件可见",
      ok: hasEvent,
      missReason: hasEvent ? undefined : "missing_contact_event",
    });
    const aliases = propClassAliases(contactMatch?.propClassId);
    // prop.readable = in-frame at locus (must); glyph is should/L2
    const namedInPrompt =
      (contactMatch ? textHasPropInFrame(prompt, contactMatch) : aliases.some((a) => prompt.includes(a))) ||
      aliases.some((a) => a.length >= 1 && prompt.includes(a));
    const namedInVd = contactMatch
      ? textHasPropInFrame(vd, contactMatch)
      : aliases.some((a) => a.length >= 1 && vd.includes(a));
    const bareReadableOnly = /清晰入画|可读/.test(prompt) && !namedInPrompt;
    const inFrameOk =
      (namedInPrompt || namedInVd) &&
      /入画|贴合|划过|触肤|触点|纸角/.test(prompt + vd) &&
      !bareReadableOnly;
    atoms.push({
      id: "prop.readable",
      priority: "must",
      text: "本镜道具入画于触点",
      ok: Boolean(inFrameOk),
      missReason: inFrameOk ? undefined : "missing_prop_readable",
    });
    // pose_locus: cheek/touch ≠ hand-held card presentation
    const poseOk =
      /贴合|划过|触肤|颊触|纸角/.test(blob) &&
      /禁止手持卡片|禁止.*挡脸|禁止胸前展示|非手持卡片|入画于触点|颊廓/.test(blob);
    const heldCardLeak =
      /手持卡片|胸前展示|挡脸举物|问候卡/.test(prompt) && !/禁止手持卡片|禁止.*挡脸|禁止胸前/.test(prompt);
    atoms.push({
      id: "prop.pose_locus",
      priority: "must",
      text: "触点姿态非手持展示卡",
      ok: poseOk && !heldCardLeak,
      missReason: poseOk && !heldCardLeak ? undefined : "missing_prop_pose_locus",
    });
    const needsGlyph =
      contactMatch?.propClassId === "paper_doc" ||
      c?.mustShowFacts.some((f) => f.id === "prop_glyph") ||
      /字迹|可辨|笺面|纸面可见|二字|「[^」]{1,4}」/.test(blob);
    if (needsGlyph) {
      const glyphOk =
        /「[^」]{1,4}」|纸面可见|字迹可辨|墨迹|第二刀|字形/.test(blob) ||
        /字迹|笺面|纸面可见/.test(blob);
      atoms.push({
        id: "prop.glyph",
        priority: "should",
        text: "纸契字形/字迹可见（第二刀）",
        ok: glyphOk,
        missReason: glyphOk ? undefined : "missing_prop_glyph",
      });
    }
    // Form understanding: paper_doc must deny book/scroll; other classes use doctrine keywords
    const formFact = (c?.mustShowFacts ?? []).find((f) => f.id === "prop_form");
    if (formFact || contactMatch?.propClassId === "paper_doc") {
      const formOk =
        /薄纸片|笺面|纸角|禁止书本|禁止.*卷轴|禁止.*厚本|布帛|刃缘|指上/.test(blob) ||
        Boolean(formFact && blob.includes(formFact.text.slice(0, 12)));
      const bookLeak = /捧书翻阅|线装书|执卷轴/.test(prompt) && !/禁止/.test(prompt);
      atoms.push({
        id: "prop.form",
        priority: "must",
        text: "道具形态教义",
        ok: formOk && !bookLeak,
        missReason: formOk && !bookLeak ? undefined : "missing_prop_form",
      });
    }
    const anti = (c?.forbiddenSubstitutions ?? []).some((s) => /禁止以.+替代/.test(s));
    const antiInPrompt = /禁止以.+替代|禁止折扇|禁止团扇|禁止书本|禁止.*卷轴|禁止.*替代/.test(blob);
    atoms.push({
      id: "prop.anti_sub",
      priority: "must",
      text: "跨类/形态禁替代",
      ok: anti || antiInPrompt,
      missReason: anti || antiInPrompt ? undefined : "missing_anti_sub",
    });
  }

  const names = input.characterNames ?? [];
  if (names.length || /定妆|锁定脸型|--cref/.test(blob)) {
    const idOk = /定妆|锁定脸型|禁止重塑|--cref|本镜主look/.test(blob) || names.length > 0;
    atoms.push({
      id: "identity.lead",
      priority: "must",
      text: "主角定妆锁",
      ok: idOk,
      missReason: idOk ? undefined : "missing_identity",
    });
  }

  const softEnv =
    c?.sceneWeight === "soft" || c?.sceneWeight === "keep" || /浅景深|禁止灰棚|软环境|烛火|色温/.test(blob);
  if (softEnv || c?.sceneWeight === "soft") {
    const envOk =
      /禁止灰棚|浅景深|室内轮廓|烛火|色温|--sref|软环境/.test(blob) && !/^[\s\S]*白棚头像/.test(blob);
    atoms.push({
      id: "env.soft",
      priority: "must",
      text: "软环境/禁灰棚",
      ok: envOk,
      missReason: envOk ? undefined : "missing_soft_env",
    });
  }

  const microFact = (c?.mustShowFacts ?? []).some((f) => f.id.startsWith("micro_"));
  const microDeclared = /微表情|glaring|fierce|冷厉|杀意|隐忍/.test(blob) || microFact;
  if (microDeclared || (contact && microFact)) {
    // Empty "锁定微表情" without eyes/mouth detail fails
    const microOk =
      /微表情眼|微表情[：:].+|glaring|fierce|冷厉|杀意|隐忍|eyes|mouthDetail/i.test(blob) ||
      (c?.mustShowFacts ?? []).some((f) => f.id.startsWith("micro_") && f.text.length > 4);
    const emptyLockOnly = /锁定微表情/.test(blob) && !microOk;
    atoms.push({
      id: "perf.micro",
      priority: contact && microFact ? "must" : microFact ? "must" : "should",
      text: "微表情实句",
      ok: microOk && !emptyLockOnly,
      missReason: microOk && !emptyLockOnly ? undefined : "missing_micro",
    });
  }

  const studioBan = /禁止灰棚|禁止白棚|空白背景/.test(blob) || softEnv;
  if (studioBan) {
    atoms.push({
      id: "neg.studio",
      priority: "must",
      text: "禁止灰棚白棚",
      ok: /禁止灰棚|禁止白棚|空白背景|纯色摄影棚/.test(blob),
      missReason: /禁止灰棚|禁止白棚|空白背景/.test(blob) ? undefined : "missing_studio_ban",
    });
  }

  if (contact || /特写/.test(blob)) {
    // Ban lines like「禁止配角完整立像」must not trip dominance
    const strippedBans = prompt.replace(/禁止[^。；]*/g, " ");
    const dominanceLeak = /完整立像|半身立像|配角站立/.test(strippedBans);
    atoms.push({
      id: "neg.secondary_full",
      priority: "must",
      text: "禁止配角完整立像",
      ok: !dominanceLeak,
      missReason: dominanceLeak ? "secondary_dominance" : undefined,
    });
  }

  const mustFail = atoms.filter((a) => a.priority === "must" && !a.ok).map((a) => a.missReason || a.id);
  return { atoms, mustFail, ok: mustFail.length === 0 };
}

/** Build shotAtoms[] for homologous subsplit writeback */
export function buildShotAtomsTable(input: {
  shotIndex: number;
  contract?: GenerationContract | null;
  visualDescription?: string | null;
}): Array<{ atomId: string; role: string; visualHint: string }> {
  const derived = deriveStillAtomContract({
    contract: input.contract,
    visualDescription: input.visualDescription,
  });
  return derived.atoms.map((a) => ({
    atomId: `${input.shotIndex}:${a.id}`,
    role: a.id.split(".")[0] || "event",
    visualHint: a.text,
  }));
}

/** Structure fills to inject when atoms must-fail before vendor (generic templates). */
export function buildAtomStructureFills(input: {
  contract?: GenerationContract | null;
  visualDescription?: string | null;
  atom?: ReturnType<typeof deriveStillAtomContract>;
}): string[] {
  const atom = input.atom ?? deriveStillAtomContract(input);
  const fills: string[] = [];
  const c = input.contract;
  for (const miss of atom.mustFail) {
    if (miss === "missing_anti_sub") {
      const line = (c?.forbiddenSubstitutions ?? []).find((s) => /禁止以.+替代/.test(s));
      if (line) fills.push(line);
      else fills.push("禁止以外类手持物替代本镜事件道具");
    } else if (miss === "missing_prop_form") {
      const f = (c?.mustShowFacts ?? []).find((x) => x.id === "prop_form");
      fills.push(f?.text || "本镜道具须为真实薄件/小件形态，禁止书本卷轴等外形态替代");
    } else if (miss === "missing_prop_glyph") {
      const g = (c?.mustShowFacts ?? []).find((f) => f.id === "prop_glyph");
      fills.push(g?.text || "纸面须清晰可见字迹，禁止空白糊纸/不可辨墨块");
    } else if (miss === "missing_prop_readable") {
      const p =
        (c?.mustShowFacts ?? []).find((f) => f.id === "prop_in_frame") ||
        (c?.mustShowFacts ?? []).find((f) => f.id === "prop_readable");
      fills.push(p?.text || "本镜道具须入画于触点，禁止为清晰可读改成手持卡片");
    } else if (miss === "missing_prop_pose_locus") {
      const p = (c?.mustShowFacts ?? []).find((f) => f.id === "prop_pose" || f.id === "contact_geom");
      fills.push(p?.text || "道具须贴合/划过触点，禁止手持卡片/挡脸举物冒充颊触");
    } else if (miss === "missing_contact_event") {
      const g = (c?.mustShowFacts ?? []).find((f) => f.id === "contact_geom");
      fills.push(g?.text || "道具与接触部位真实贴合，禁止悬空");
    } else if (miss === "missing_soft_env" || miss === "missing_studio_ban") {
      fills.push("浅景深虚化环境，禁止灰棚/白棚空白背景");
    } else if (miss === "missing_micro") {
      const m = (c?.mustShowFacts ?? []).find((f) => f.id.startsWith("micro_"));
      fills.push(m?.text || "微表情须写出眼/口细节，禁止空锁「锁定微表情」");
    }
  }
  return [...new Set(fills.filter(Boolean))];
}
