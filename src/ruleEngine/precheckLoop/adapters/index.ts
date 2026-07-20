import type { CheckAdapter } from "../types";
import { dc01Adapter } from "./dc01";
import { dc13Adapter } from "./dc13";
import { lang01Adapter } from "./lang01";
import { cam01Adapter, dc09Adapter } from "./cam01";
import { fx01Adapter } from "./fx01";
import { lip01Adapter } from "./lip01";
import { camSpeakAdapter } from "./camSpeak";
import { vpConflictAdapter } from "./vpConflict";
import { loadQualityMatrix } from "../../qualityGate";

const adapters = new Map<string, CheckAdapter>();

/** Matrix softPatch entries that must have a PrecheckLoop adapter. */
const MATRIX_SOFT_PATCH_ADAPTERS: CheckAdapter[] = [
  dc01Adapter,
  lang01Adapter,
  cam01Adapter,
  dc09Adapter,
  fx01Adapter,
  lip01Adapter,
  camSpeakAdapter,
];

export function registerAdapter(adapter: CheckAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function ensureDefaultAdapters(): void {
  if (!adapters.has("DC-01")) registerAdapter(dc01Adapter);
  if (!adapters.has("DC-13")) registerAdapter(dc13Adapter);
  if (!adapters.has("LANG-01")) registerAdapter(lang01Adapter);
  if (!adapters.has("LANG-AUD-01")) {
    // LANG-AUD diagnosed inside LANG-01; register alias for matrix softPatch coverage
    registerAdapter({ ...lang01Adapter, id: "LANG-AUD-01" });
  }
  if (!adapters.has("PR-CAM-01")) registerAdapter(cam01Adapter);
  if (!adapters.has("DC-09")) registerAdapter(dc09Adapter);
  if (!adapters.has("FX-GRADE-01")) registerAdapter(fx01Adapter);
  if (!adapters.has("LIP-01")) registerAdapter(lip01Adapter);
  if (!adapters.has("CAM-SPEAK")) registerAdapter(camSpeakAdapter);
  if (!adapters.has("VP-CONFLICT")) registerAdapter(vpConflictAdapter);
}

/** Soft-patchable matrix ids that lack adapters (for CI). */
export function missingSoftPatchAdapters(): string[] {
  ensureDefaultAdapters();
  const matrix = loadQualityMatrix().filter((e) => e.softPatch);
  return matrix.map((e) => e.id).filter((id) => !adapters.has(id));
}

export function getAdapter(id: string): CheckAdapter | undefined {
  ensureDefaultAdapters();
  return adapters.get(id);
}

export function listAdapters(ids?: string[]): CheckAdapter[] {
  ensureDefaultAdapters();
  if (!ids?.length) return [...adapters.values()];
  return ids.map((id) => adapters.get(id)).filter(Boolean) as CheckAdapter[];
}

export { MATRIX_SOFT_PATCH_ADAPTERS };
