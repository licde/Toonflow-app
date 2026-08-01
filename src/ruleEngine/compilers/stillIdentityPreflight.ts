/**
 * Dual-char seating identity preflight — block vendor spend when looks missing.
 */
import { extractDescPredicates } from "./extractDescPredicates";
import type { ComposeStillCharHint } from "./composeStillPrompt";
import {
  assertStillIdentityCoverage,
  applyLookCreditsForChars,
  collectRequiredStillChars,
  countRoleReferenceCredits,
  charCrefCodesFromPrompt,
} from "./stillIdentityCoverage";
import { buildPrimaryBlock } from "./primaryBlock";
import { looksLikeSceneName } from "./hydrateComposeStillContext";
import { normalizeDialogueSpeakers } from "./normalizeDialogueSpeaker";

export interface StillIdentityPreflightResult {
  ok: boolean;
  code?: string;
  primaryNextStep?: string;
  userMessage?: string;
  ctaLabel?: string;
  missing?: string[];
  /** Suggest selfHeal batch_still */
  suggestBatchStill?: boolean;
  /** Honest: never synth identity plate */
  debtKind?: "missing_identity";
  enqueueIdentity?: boolean;
}

function realCharacters(input?: ComposeStillCharHint[] | null): ComposeStillCharHint[] {
  return (input ?? []).filter(
    (c) => c.kind !== "scene" && !looksLikeSceneName(c.name) && Boolean(c.name || c.code),
  );
}

export function assertStillIdentityPreflight(input: {
  characters?: ComposeStillCharHint[] | null;
  description?: string | null;
  dialogueSpeakers?: string[] | null;
  referenceUrls?: string[] | null;
  promptCrefCodes?: string[] | null;
  enforce?: boolean;
}): StillIdentityPreflightResult {
  const speakers = normalizeDialogueSpeakers(input.dialogueSpeakers).filter((s) => !looksLikeSceneName(s));
  const required = collectRequiredStillChars({
    characters: realCharacters(input.characters),
    dialogueSpeakers: speakers,
  });
  // Credit once here; coverage below must not re-apply the same URLs/crefs
  const credited = applyLookCreditsForChars(required, {
    referenceUrls: input.referenceUrls,
    promptCrefCodes: input.promptCrefCodes,
  });

  const names = credited.map((c) => c.name || "").filter(Boolean);
  const pack = extractDescPredicates({
    description: input.description,
    characterNames: names,
  });

  if (pack.hasSeatingOrKneel && names.length >= 2) {
    const missingLooks = credited.filter((c) => !c.hasImage);
    if (missingLooks.length && input.enforce !== false) {
      const missing = missingLooks.map((c) => c.name || c.code || "?").filter(Boolean);
      const primary = buildPrimaryBlock("batch_still", {
        stage: "prompt",
        userMessageOverride: `双人座次场面缺少定妆图（${missing.join("、")}），请先补全角色定妆再生成高质量静照`,
      });
      return {
        ok: false,
        code: "IMG-CREF-CHAR",
        primaryNextStep: primary.primaryNextStep,
        userMessage: primary.userMessage,
        ctaLabel: "补定妆资产后再生成",
        missing,
        suggestBatchStill: true,
        debtKind: "missing_identity",
        enqueueIdentity: true,
      };
    }
  }

  const gate = assertStillIdentityCoverage({
    characters: credited,
    dialogueSpeakers: [],
    enforce: input.enforce !== false,
  });
  if (!gate.ok) {
    return {
      ok: false,
      code: gate.code ?? "IMG-CREF-CHAR",
      primaryNextStep: gate.primaryNextStep,
      userMessage: gate.userMessage,
      ctaLabel: "补定妆资产后再生成",
      missing: gate.missing,
      suggestBatchStill: true,
      debtKind: "missing_identity",
      enqueueIdentity: true,
    };
  }
  return { ok: true };
}

export { countRoleReferenceCredits, charCrefCodesFromPrompt };
