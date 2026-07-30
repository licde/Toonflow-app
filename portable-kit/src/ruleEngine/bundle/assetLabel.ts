/**
 * Safe display-name extraction for CD / VLT dual-shape assets.
 * VLT.characterAssets may be Record<code, string> OR Record<code, { name?, L0? }>.
 */
export function assetDisplayName(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v).trim();
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const l0 = o.L0 as { identity?: unknown; name?: unknown } | undefined;
    const n = o.name ?? o.label ?? l0?.identity ?? l0?.name ?? o.code;
    if (n == null) return "";
    if (typeof n === "string") return n.trim();
    return String(n).trim();
  }
  return String(v).trim();
}

/** Normalize VLT characterAssets map to code → display name string (drops nested L0 into name). */
export function normalizeCharacterAssetsNameMap(
  raw: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [code, val] of Object.entries(raw)) {
    const name = assetDisplayName(val);
    if (code) out[code] = name || code;
  }
  return out;
}

/** Keep structured locks alongside string name map when value is object. */
export function extractCharacterAssetLocks(
  raw: Record<string, unknown> | null | undefined,
): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [code, val] of Object.entries(raw)) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      out[code] = val as Record<string, unknown>;
    }
  }
  return out;
}

/**
 * Mutate bundle.visualLockTable.characterAssets → code→string names.
 * Structured objects moved to visualLockTable.characterAssetLocks.
 */
export function normalizeVisualLockTableOnBundle(bundle: {
  visualLockTable?: Record<string, unknown> | null;
  characterDesign?: { assets?: { code?: string; name?: unknown }[] };
}): void {
  const vlt = bundle.visualLockTable;
  if (!vlt || typeof vlt !== "object") return;
  const raw = vlt.characterAssets as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return;
  const locks = extractCharacterAssetLocks(raw);
  const names = normalizeCharacterAssetsNameMap(raw);
  // Prefer CD names when present
  for (const a of bundle.characterDesign?.assets ?? []) {
    if (!a.code) continue;
    const n = assetDisplayName(a.name);
    if (n) names[a.code] = n;
  }
  vlt.characterAssets = names;
  if (Object.keys(locks).length) {
    vlt.characterAssetLocks = {
      ...((vlt.characterAssetLocks as Record<string, unknown>) ?? {}),
      ...locks,
    };
  }
}
