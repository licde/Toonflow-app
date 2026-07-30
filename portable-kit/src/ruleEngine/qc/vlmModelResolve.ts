/**
 * Resolve VLM display names → vendor API modelName for still literary judge.
 * Matches both `name` (UI) and `modelName` (API id) against volcengine catalog.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export interface VlmCatalogEntry {
  name: string;
  modelName: string;
}

/** Static vision-capable catalog slice (must stay in sync with data/vendor/volcengine.ts). */
export const VOLCENGINE_VLM_CATALOG: VlmCatalogEntry[] = [
  { name: "Doubao-Seed-1.6-Vision", modelName: "doubao-seed-1-6-vision-250815" },
  { name: "Doubao-1.5-Vision-Pro-32K", modelName: "doubao-1-5-vision-pro-32k-250115" },
  { name: "Doubao-Seed-1.6(1015)", modelName: "doubao-seed-1-6-251015" },
  { name: "Doubao-Seed-1.6(0615)", modelName: "doubao-seed-1-6-250615" },
];

/** Aliases that historically appeared in fixtures but are not catalog names. */
const ALIASES: Record<string, string> = {
  "Doubao-Seed-1.6": "Doubao-Seed-1.6-Vision",
  "doubao-seed-1.6": "Doubao-Seed-1.6-Vision",
  "Doubao-Seed-1.6-vision": "Doubao-Seed-1.6-Vision",
};

export function resolveVlmCatalogEntry(
  rawKey: string,
  catalog: VlmCatalogEntry[] = VOLCENGINE_VLM_CATALOG,
): VlmCatalogEntry | null {
  const key = String(rawKey ?? "").trim();
  if (!key) return null;
  const aliased = ALIASES[key] ?? key;
  const byName = catalog.find((m) => m.name === aliased || m.name === key);
  if (byName) return byName;
  const byApi = catalog.find((m) => m.modelName === aliased || m.modelName === key);
  if (byApi) return byApi;
  // Loose: starts with / includes for dated names
  const loose = catalog.find(
    (m) =>
      m.name.replace(/\(.*\)$/, "") === aliased.replace(/\(.*\)$/, "") ||
      m.modelName.startsWith(aliased) ||
      aliased.startsWith(m.modelName),
  );
  return loose ?? null;
}

export function resolveVlmInvokeKeys(input: {
  preferred?: string;
  primary?: string;
  fallbacks?: string[];
  vendorPrefix?: string;
  catalog?: VlmCatalogEntry[];
}): {
  keys: Array<{ display: string; apiModelName: string; invokeKey: string }>;
  missing: string[];
  tried: string[];
} {
  const vendorPrefix = input.vendorPrefix ?? "volcengine";
  const catalog = input.catalog ?? VOLCENGINE_VLM_CATALOG;
  const ordered = [...new Set([input.preferred, input.primary, ...(input.fallbacks ?? [])].filter(Boolean) as string[])];
  const keys: Array<{ display: string; apiModelName: string; invokeKey: string }> = [];
  const missing: string[] = [];
  const tried: string[] = [];
  for (const raw of ordered) {
    tried.push(raw);
    const hit = resolveVlmCatalogEntry(raw, catalog);
    if (!hit) {
      missing.push(raw);
      continue;
    }
    if (keys.some((k) => k.apiModelName === hit.modelName)) continue;
    keys.push({
      display: hit.name,
      apiModelName: hit.modelName,
      invokeKey: `${vendorPrefix}:${hit.modelName}`,
    });
  }
  return { keys, missing, tried };
}

/** Optional: merge fixture override catalog entries. */
export function loadVlmCatalogFromFixture(): VlmCatalogEntry[] {
  const cfg = readFixtureJson<{ vlmCatalog?: VlmCatalogEntry[] }>("still_visual_fidelity_loop.json", {});
  if (Array.isArray(cfg.vlmCatalog) && cfg.vlmCatalog.length) {
    return cfg.vlmCatalog;
  }
  return VOLCENGINE_VLM_CATALOG;
}
