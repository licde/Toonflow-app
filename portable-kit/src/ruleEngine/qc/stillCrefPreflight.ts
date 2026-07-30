/**
 * SeatingHard / LayoutFamily cref preflight — block empty two-stage when character stills missing.
 */
import type { ComposeStillCharHint } from "../compilers/composeStillPrompt";

export interface CrefPreflightResult {
  ok: boolean;
  missingCodes: string[];
  missingNames: string[];
  primaryNextStep: "batch_still" | "chat_repair";
  userMessage: string;
  ctaLabel: string;
  code: "CREF_MISSING_FOR_SEATING" | "CREF_MISSING_FOR_FAMILY";
}

export function preflightSeatingCref(input: {
  seatingHard: boolean;
  characters?: ComposeStillCharHint[] | null;
  /** Minimum imaged characters required when seatingHard */
  minImaged?: number;
}): CrefPreflightResult | null {
  return preflightFamilyCref({
    required: input.seatingHard,
    characters: input.characters,
    minImaged: input.minImaged ?? 2,
    label: "座次镜",
    code: "CREF_MISSING_FOR_SEATING",
  });
}

/** LayoutFamily-aware imaged CHAR gate (e.g. triangle needs 3). */
export function preflightFamilyCref(input: {
  required: boolean;
  characters?: ComposeStillCharHint[] | null;
  minImaged: number;
  label?: string;
  code?: CrefPreflightResult["code"];
}): CrefPreflightResult | null {
  if (!input.required) return null;
  const label = input.label ?? "构图镜";
  const code = input.code ?? "CREF_MISSING_FOR_FAMILY";
  const chars = (input.characters ?? []).filter((c) => c.kind !== "scene");
  if (!chars.length) {
    return {
      ok: false,
      missingCodes: [],
      missingNames: [],
      primaryNextStep: "batch_still",
      userMessage: `${label}缺少角色资产，请先关联角色并生成定妆图`,
      ctaLabel: "去生成角色定妆",
      code,
    };
  }
  const missing = chars.filter((c) => !c.hasImage);
  const imaged = chars.filter((c) => c.hasImage);
  const min = Math.max(1, input.minImaged);
  if (imaged.length >= min) return null;
  return {
    ok: false,
    missingCodes: missing.map((c) => String(c.code || "").toUpperCase()).filter(Boolean),
    missingNames: missing.map((c) => c.name || c.code || "").filter(Boolean) as string[],
    primaryNextStep: "batch_still",
    userMessage: `${label}缺少角色定妆（需至少 ${min} 张）：${
      missing
        .map((c) => c.name || c.code)
        .filter(Boolean)
        .join("、") || "未命名角色"
    }`,
    ctaLabel: "去生成角色定妆",
    code,
  };
}
