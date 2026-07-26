/**
 * L1 VLM judge — per StillFidelityItem pass/fail against generated still.
 * Infra failure ≠ literary fail: surfaces vlmError; callers must not burn Edit on throw.
 */
import u from "@/utils";
import {
  formatVlmJudgePrompt,
  type StillFidelityItem,
} from "../compilers/literaryFidelityChecklist";
import { readFixtureJson } from "../utils/fixturesPath";
import { emitHealObs } from "../heal/obsHealBridge";
import { loadVlmCatalogFromFixture, resolveVlmInvokeKeys } from "./vlmModelResolve";

export interface VlmItemResult {
  id: string;
  pass: boolean;
  evidence?: string;
  unknown?: boolean;
  fixHint?: string;
}

export interface StillLiteraryVlmJudgeResult {
  ok: boolean;
  items: VlmItemResult[];
  error?: string;
  /** Truncated transport/model error for API/reason */
  vlmError?: string;
  modelKey?: string;
  /** True when failure is infrastructure (throw/parse), not content */
  infraFailure?: boolean;
  /** Display/API keys attempted (for diagnostics) */
  triedModels?: string[];
}

interface LoopCfg {
  vlmModelKey?: string;
  vlmFallbackModels?: string[];
  failClosedOnVlmError?: boolean;
  vlmVendorPrefix?: string;
}

export type VlmJudgeFn = (input: {
  imageBase64: string;
  description: string;
  items: StillFidelityItem[];
  modelKey: string;
}) => Promise<StillLiteraryVlmJudgeResult>;

function parseJudgeJson(text: string): VlmItemResult[] | null {
  const raw = String(text ?? "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(raw.slice(start, end + 1)) as {
      items?: Array<{
        id?: string;
        pass?: boolean;
        evidence?: string;
        fixHint?: string;
        unknown?: boolean;
      }>;
    };
    if (!Array.isArray(obj.items)) return null;
    return obj.items.map((it) => {
      const evidence = it.evidence ? String(it.evidence).slice(0, 80) : undefined;
      const uncertain =
        Boolean(it.unknown) ||
        /uncertain|unknown|不确定|无法判断/i.test(String(it.evidence ?? ""));
      return {
        id: String(it.id ?? ""),
        pass: uncertain ? false : Boolean(it.pass),
        evidence,
        unknown: uncertain || undefined,
        fixHint: it.fixHint ? String(it.fixHint).slice(0, 60) : undefined,
      };
    });
  } catch {
    return null;
  }
}

function dataUrl(b64: string): string {
  if (/^data:image\//i.test(b64)) return b64;
  return `data:image/jpeg;base64,${b64.replace(/^data:image\/\w+;base64,/, "")}`;
}

async function invokeVisionOnce(input: {
  invokeKey: string;
  prompt: string;
  imageDataUrl: string;
}): Promise<string> {
  const key = input.invokeKey as `${string}:${string}`;
  const attempts: Array<{ content: unknown }> = [
    {
      content: [
        { type: "text", text: input.prompt },
        { type: "image", image: input.imageDataUrl },
      ],
    },
    {
      content: [
        { type: "text", text: input.prompt },
        { type: "image_url", image_url: { url: input.imageDataUrl } },
      ],
    },
  ];
  let lastErr: unknown;
  for (const body of attempts) {
    try {
      const { text } = await u.Ai.Text(key).invoke({
        messages: [{ role: "user", content: body.content }],
      } as never);
      return String(text ?? "");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr ?? "vlm_invoke_failed"));
}

function infraUnknownItems(
  items: StillFidelityItem[],
  evidence: string,
): VlmItemResult[] {
  // Normalize to vlm_infra so callers never treat as literary pass:false
  const ev =
    evidence === "vlm_parse_fail" || evidence === "missing_id" ? evidence : "vlm_infra";
  return items.map((it) => ({
    id: it.id,
    pass: false,
    unknown: true,
    evidence: ev,
  }));
}

/** Default judge via multimodal text model. */
export async function stillLiteraryVlmJudge(input: {
  imageBase64: string;
  description: string;
  items: StillFidelityItem[];
  modelKey?: string;
  judgeFn?: VlmJudgeFn;
  /** Optional DB for Key preflight + autofallback (gen/vlm vendor decouple) */
  db?: import("knex").Knex;
  /** Pre-resolved invoke keys (skip catalog-only path) */
  invokeKeys?: Array<{ invokeKey: string; display: string }>;
}): Promise<StillLiteraryVlmJudgeResult> {
  const cfg = readFixtureJson<LoopCfg>("still_visual_fidelity_loop.json", {});
  const vendorPrefix = cfg.vlmVendorPrefix ?? "volcengine";
  const catalog = loadVlmCatalogFromFixture();
  const resolved = resolveVlmInvokeKeys({
    preferred: input.modelKey,
    primary: cfg.vlmModelKey ?? "Doubao-Seed-1.6-Vision",
    fallbacks: cfg.vlmFallbackModels ?? ["Doubao-1.5-Vision-Pro-32K"],
    vendorPrefix,
    catalog,
  });

  if (!input.items.length) {
    return { ok: true, items: [], modelKey: resolved.keys[0]?.display, triedModels: resolved.tried };
  }
  if (input.judgeFn) {
    try {
      return await input.judgeFn({
        imageBase64: input.imageBase64,
        description: input.description,
        items: input.items,
        modelKey: resolved.keys[0]?.display ?? cfg.vlmModelKey ?? "Doubao-Seed-1.6-Vision",
      });
    } catch (e) {
      const vlmError = (e instanceof Error ? e.message : String(e)).slice(0, 240);
      emitHealObs("still_fidelity_vlm_error", {
        reason: vlmError,
        modelKey: resolved.keys[0]?.display,
        via: "judgeFn",
      });
      return {
        ok: false,
        items: infraUnknownItems(input.items, "vlm_error"),
        error: vlmError || "vlm_error",
        vlmError,
        modelKey: resolved.keys[0]?.display,
        infraFailure: true,
        triedModels: resolved.tried,
      };
    }
  }

  let keysToTry = input.invokeKeys?.length
    ? input.invokeKeys
    : resolved.keys.map((k) => ({ invokeKey: k.invokeKey, display: k.display }));

  if (input.db && !input.invokeKeys?.length) {
    const { resolveVlmVendorKey, VLM_API_KEY_MISSING } = await import("./vlmKeyResolve");
    const keyRes = await resolveVlmVendorKey({
      db: input.db,
      preferredModelKey: input.modelKey,
      vendorPrefix,
    });
    if (!keyRes.ok || !keyRes.invokeKey) {
      const vlmError = `${VLM_API_KEY_MISSING}: ${keyRes.errorMessage ?? "缺少API Key"}`.slice(0, 240);
      emitHealObs("still_fidelity_vlm_error", { reason: vlmError, tried: keyRes.tried });
      return {
        ok: false,
        items: infraUnknownItems(input.items, "vlm_error"),
        error: vlmError,
        vlmError,
        infraFailure: true,
        triedModels: keyRes.tried,
      };
    }
    keysToTry = [{ invokeKey: keyRes.invokeKey, display: keyRes.display ?? keyRes.invokeKey }];
  }

  if (!keysToTry.length) {
    const vlmError = `未找到可用 VLM 模型（tried: ${resolved.tried.join(", ") || "none"}）`;
    emitHealObs("still_fidelity_vlm_error", { reason: vlmError, missing: resolved.missing });
    return {
      ok: false,
      items: infraUnknownItems(input.items, "vlm_error"),
      error: vlmError,
      vlmError,
      infraFailure: true,
      triedModels: resolved.tried,
    };
  }

  const prompt = formatVlmJudgePrompt(input.items, input.description);
  const imageDataUrl = dataUrl(input.imageBase64);
  let lastError = "";
  let usedModel = keysToTry[0]!.display;
  const triedModels = keysToTry.map((k) => k.display);

  for (const entry of keysToTry) {
    usedModel = entry.display;
    try {
      const text = await invokeVisionOnce({
        invokeKey: entry.invokeKey,
        prompt,
        imageDataUrl,
      });
      const parsed = parseJudgeJson(text);
      if (!parsed) {
        lastError = "vlm_parse_fail";
        emitHealObs("still_fidelity_vlm_error", { reason: "parse_fail", modelKey: entry.display });
        continue;
      }
      const byId = new Map(parsed.map((p) => [p.id, p]));
      const items: VlmItemResult[] = input.items.map((it) => {
        const hit = byId.get(it.id);
        if (!hit) return { id: it.id, pass: false, unknown: true, evidence: "missing_id" };
        const unknown = Boolean(hit.unknown);
        return {
          id: it.id,
          pass: unknown ? false : hit.pass,
          evidence: hit.evidence,
          unknown: unknown || undefined,
          fixHint: hit.fixHint,
        };
      });
      const ok = items.every((i) => i.pass && !i.unknown);
      return { ok, items, modelKey: usedModel, triedModels };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      emitHealObs("still_fidelity_vlm_error", {
        reason: lastError,
        modelKey: entry.display,
      });
      // Missing key: stop early with stable code
      if (/缺少API\s*Key|api\s*key/i.test(lastError)) {
        const { VLM_API_KEY_MISSING } = await import("./vlmKeyResolve");
        const vlmError = `${VLM_API_KEY_MISSING}: ${lastError}`.slice(0, 240);
        return {
          ok: false,
          items: infraUnknownItems(input.items, "vlm_error"),
          error: vlmError,
          vlmError,
          modelKey: usedModel,
          infraFailure: true,
          triedModels,
        };
      }
    }
  }

  const triedNote = ` tried=[${triedModels.join("|")}]`;
  const vlmError = `${(lastError || "vlm_error").slice(0, 180)}${triedNote}`.slice(0, 240);
  return {
    ok: false,
    items: infraUnknownItems(input.items, lastError === "vlm_parse_fail" ? "vlm_parse_fail" : "vlm_error"),
    error: lastError === "vlm_parse_fail" ? "vlm_parse_fail" : vlmError,
    vlmError,
    modelKey: usedModel,
    infraFailure: true,
    triedModels,
  };
}

/** True when every item is infra unknown (vlm_error / vlm_parse_fail). */
export function isAllVlmInfraFailure(items: VlmItemResult[]): boolean {
  if (!items.length) return false;
  return items.every(
    (i) =>
      i.unknown &&
      (i.evidence === "vlm_infra" ||
        i.evidence === "vlm_error" ||
        i.evidence === "vlm_parse_fail" ||
        i.evidence === "missing_id"),
  );
}

export function failedItemsFromVlm(
  checklist: StillFidelityItem[],
  results: VlmItemResult[],
): StillFidelityItem[] {
  const failIds = new Set(results.filter((r) => !r.pass || r.unknown).map((r) => r.id));
  return checklist.filter((c) => failIds.has(c.id));
}
