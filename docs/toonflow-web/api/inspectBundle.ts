import type { DryRunImportResponse, InspectBundleResult } from "../types/closure";

const BASE = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE
  : "";

export async function inspectBundle(
  bundle: Record<string, unknown>,
  opts?: { tier?: "T1" | "T2" | "T3"; genError?: string; sfRound?: number },
): Promise<InspectBundleResult> {
  const res = await fetch(`${BASE}/api/ruleEngine/inspectBundle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle, ...opts }),
  });
  if (!res.ok) throw new Error(`inspectBundle ${res.status}`);
  return res.json();
}

export async function dryRunImport(
  bundle: Record<string, unknown>,
  opts: { projectId: number; validateOnly?: boolean },
): Promise<DryRunImportResponse> {
  const res = await fetch(`${BASE}/api/ruleEngine/dryRunImport`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle, ...opts, validateOnly: true }),
  });
  if (!res.ok) throw new Error(`dryRunImport ${res.status}`);
  return res.json();
}
