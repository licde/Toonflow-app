/**
 * ClosureGate — suite helpers + identity/slot enforcement checks.
 */
import { buildIdentitySlots, injectIdentityTokens, formatIdentityBlock } from "./promptKernel";
import { resolveDepthPolicy, buildDeepRePushPlan } from "./reverseKernel";
import { canonicalModeId } from "./types";

export function assertIdentityInPrompt(prompt: string, codes: string[]): { ok: boolean; missing: string[] } {
  const missing = codes.filter((c) => !prompt.includes(c) && !prompt.includes(`--cref ${c}`) && !prompt.includes(`--sref ${c}`));
  return { ok: missing.length === 0, missing };
}

export function enforceIdentityOnModes(
  modes: string[],
  seed: string,
  charCodes: string[],
  sceneCode?: string,
): Record<string, { prompt: string; ok: boolean }> {
  const slots = buildIdentitySlots({ charCodes, sceneCode });
  const out: Record<string, { prompt: string; ok: boolean }> = {};
  for (const m of modes) {
    const mode = canonicalModeId(m);
    let p = injectIdentityTokens(seed, slots);
    const block = formatIdentityBlock(slots);
    if (block) p = `${p}\n${block}`;
    const check = assertIdentityInPrompt(p, slots.map((s) => s.code));
    out[mode] = { prompt: p, ok: check.ok || slots.length === 0 };
  }
  return out;
}

export { resolveDepthPolicy, buildDeepRePushPlan };
