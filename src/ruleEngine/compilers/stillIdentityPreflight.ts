/**
 * Dual-char seating identity preflight — block vendor spend when looks missing.
 */
import { extractDescPredicates } from "./extractDescPredicates";
import type { ComposeStillCharHint } from "./composeStillPrompt";
import { assertStillIdentityCoverage } from "./stillIdentityCoverage";
import { buildPrimaryBlock } from "./primaryBlock";

export interface StillIdentityPreflightResult {
  ok: boolean;
  code?: string;
  primaryNextStep?: string;
  userMessage?: string;
  ctaLabel?: string;
  missing?: string[];
  /** Suggest selfHeal batch_still */
  suggestBatchStill?: boolean;
}

export function assertStillIdentityPreflight(input: {
  characters?: ComposeStillCharHint[] | null;
  description?: string | null;
  dialogueSpeakers?: string[] | null;
  enforce?: boolean;
}): StillIdentityPreflightResult {
  const chars = (input.characters ?? []).filter((c) => c.kind !== "scene");
  const names = chars.map((c) => c.name || "").filter(Boolean);
  const pack = extractDescPredicates({
    description: input.description,
    characterNames: names,
  });

  // Dual seating: every named seating role should have look when enforce
  if (pack.hasSeatingOrKneel && names.length >= 2) {
    const missingLooks = chars.filter((c) => (c.name || c.code) && !c.hasImage);
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
        ctaLabel: primary.ctaLabel,
        missing,
        suggestBatchStill: true,
      };
    }
  }

  const gate = assertStillIdentityCoverage({
    characters: chars,
    dialogueSpeakers: input.dialogueSpeakers,
    enforce: input.enforce !== false,
  });
  if (!gate.ok) {
    return {
      ok: false,
      code: gate.code ?? "IMG-CREF-CHAR",
      primaryNextStep: gate.primaryNextStep,
      userMessage: gate.userMessage,
      ctaLabel: gate.ctaLabel,
      missing: gate.missing,
      suggestBatchStill: true,
    };
  }
  return { ok: true };
}
