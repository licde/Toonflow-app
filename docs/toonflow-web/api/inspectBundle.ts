import type {
  DryRunImportResponse,
  ExportGateSummary,
  ImportScriptResult,
  InspectBundleResult,
} from "../types/closure";
import { unwrapApi } from "../types/closure";

const BASE =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE
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
  return unwrapApi<InspectBundleResult>(res);
}

export async function dryRunImport(
  bundle: Record<string, unknown>,
  opts: { projectId: number; targetScriptId?: number; mergeStrategy?: string; importMode?: string },
): Promise<DryRunImportResponse> {
  const res = await fetch(`${BASE}/api/ruleEngine/dryRunImport`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle, ...opts }),
  });
  const data = await unwrapApi<
    DryRunImportResponse & {
      preImport?: InspectBundleResult;
      exportGate?: ExportGateSummary;
      chatRepairText?: string;
      repairChangelog?: ExportGateSummary["repairChangelog"];
      industryResidualDebts?: string[];
    }
  >(res);
  const exportGate = data.exportGate;
  const chatRepairText =
    exportGate?.chatRepairText ?? data.chatRepairText ?? data.preImport?.chatRepairText;
  const previewStatusLine =
    exportGate?.previewStatusLine ?? (data as { previewStatusLine?: string }).previewStatusLine;
  const repairChangelog =
    exportGate?.repairChangelog ??
    data.repairChangelog ??
    (data as { meta?: { repairChangelog?: ExportGateSummary["repairChangelog"] } }).meta
      ?.repairChangelog;
  const industryResidualDebts =
    exportGate?.industryResidualDebts ??
    data.industryResidualDebts ??
    (data as { meta?: { industryResidualDebts?: string[] } }).meta?.industryResidualDebts;
  return {
    ...data.preImport,
    ...data,
    preImport: data.preImport,
    exportGate,
    chatRepairText,
    previewStatusLine,
    repairChangelog,
    industryResidualDebts,
  };
}

export async function importScript(
  bundle: Record<string, unknown>,
  opts: {
    projectId: number;
    targetScriptId?: number;
    importMode?: string;
    mergeStrategy?: string;
    validateOnly?: boolean;
    includeValidationReport?: boolean;
  },
): Promise<ImportScriptResult> {
  const res = await fetch(`${BASE}/api/ruleEngine/importScript`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bundle, ...opts }),
  });
  const data = await unwrapApi<ImportScriptResult>(res);
  const exportGate = data.exportGate;
  const repairChangelog =
    exportGate?.repairChangelog ?? data.repairChangelog ?? data.dryRun?.repairChangelog;
  const industryResidualDebts =
    exportGate?.industryResidualDebts ??
    data.industryResidualDebts ??
    data.dryRun?.industryResidualDebts;
  return {
    ...data,
    repairChangelog,
    industryResidualDebts,
  };
}
