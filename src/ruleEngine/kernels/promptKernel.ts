/**
 * PromptKernel — what to write: identity + media slots + field forwarder + mode matrix seed.
 */
import type { IdentitySlot, MediaSlot, PromptKernelResult } from "./types";
import { applyDesignFieldRegistry, type DesignFields } from "../design/designFieldRegistry";
import { normalizeAssetCode } from "../codes/assetCodeContract";

export type { IdentitySlot, MediaSlot, PromptKernelResult };

export function buildIdentitySlots(input: {
  charCodes?: string[];
  sceneCode?: string | null;
  propCodes?: string[];
  associateCodes?: string[];
}): IdentitySlot[] {
  const out: IdentitySlot[] = [];
  const seen = new Set<string>();
  const push = (kind: IdentitySlot["kind"], raw: string, role?: IdentitySlot["role"]) => {
    const code = normalizeAssetCode(raw) ?? raw.trim().toUpperCase();
    if (!code || seen.has(code)) return;
    if (!/^(CHAR|SCENE|PROP)-/.test(code)) return;
    seen.add(code);
    out.push({ kind, code, role });
  };
  for (const c of input.charCodes ?? []) push("CHAR", c, "primary");
  if (input.sceneCode) push("SCENE", input.sceneCode);
  for (const p of input.propCodes ?? []) push("PROP", p);
  for (const a of input.associateCodes ?? []) {
    const n = normalizeAssetCode(a);
    if (!n) continue;
    if (n.startsWith("CHAR-")) push("CHAR", n);
    else if (n.startsWith("SCENE-")) push("SCENE", n);
    else if (n.startsWith("PROP-")) push("PROP", n);
  }
  return out;
}

/** Inject --cref / --sref into prompt text (design/IR layer). */
export function injectIdentityTokens(prompt: string, slots: IdentitySlot[]): string {
  let next = prompt ?? "";
  for (const s of slots) {
    const token = s.kind === "CHAR" ? `--cref ${s.code}` : `--sref ${s.code}`;
    if (!next.includes(token) && !next.includes(s.code)) {
      next = next.trim() ? `${next.trim()}, ${token}` : token;
    } else if (!next.includes(token) && next.includes(s.code)) {
      next = `${next.trim()}, ${token}`;
    }
  }
  return next.trim();
}

export function formatIdentityBlock(slots: IdentitySlot[]): string {
  if (!slots.length) return "";
  const parts = slots.map((s) => `${s.kind}:${s.code}`);
  return `identity[${parts.join(" | ")}]`;
}

export function buildMediaSlots(
  items: { id: number; sources: string; role?: MediaSlot["role"] }[],
): MediaSlot[] {
  return items.map((item, i) => ({
    role:
      item.role ??
      (item.sources === "storyboard" ? "storyboard" : "asset"),
    ordinal: i + 1,
    assetId: item.id,
    sources: item.sources as "storyboard" | "assets",
  }));
}

export function forwardDesignFields(
  prompt: string,
  fields: DesignFields,
  opts?: { modality?: "image" | "video"; mode?: string },
): { prompt: string; injected: string[] } {
  return applyDesignFieldRegistry(prompt, fields, opts ?? { modality: "video" });
}

export function assemblePromptWithSlots(input: {
  basePrompt: string;
  identitySlots: IdentitySlot[];
  mediaSlots?: MediaSlot[];
  fields?: DesignFields;
  modality?: "image" | "video";
  mode?: string;
}): PromptKernelResult {
  const warnings: string[] = [];
  const modality = input.modality ?? "video";
  // Image: Midjourney --cref/--sref; Video: identity[] only (media slots carry refs; finalize strips cref)
  let prompt =
    modality === "image"
      ? injectIdentityTokens(input.basePrompt, input.identitySlots)
      : (input.basePrompt ?? "");
  const block = formatIdentityBlock(input.identitySlots);
  if (block && !prompt.includes("identity[")) {
    prompt = prompt.trim() ? `${prompt}\n${block}` : block;
  }
  if (!input.identitySlots.length) {
    warnings.push("IDENTITY_SLOTS_EMPTY");
  }
  const ff = forwardDesignFields(prompt, input.fields ?? {}, {
    modality,
    mode: input.mode,
  });
  let out = ff.prompt;
  const mediaLine =
    input.mediaSlots?.length
      ? input.mediaSlots.map((m) => `${m.ordinal}.${m.role}${m.identityCode ? `@${m.identityCode}` : ""}`).join(" | ")
      : "";
  if (mediaLine && !out.includes("mediaSlots")) {
    out = `${out}\nmediaSlots[${mediaLine}]`;
  }
  return {
    prompt: out,
    identitySlots: input.identitySlots,
    mediaSlots: input.mediaSlots ?? [],
    injectedFields: ff.injected,
    warnings,
  };
}
