/**
 * Resolve VLM vendor invoke key with preflight + autofallback.
 * Cannot invent API keys; only reuse configured multimodal vendors.
 */
import type { Knex } from "knex";
import { loadVlmCatalogFromFixture, resolveVlmInvokeKeys } from "./vlmModelResolve";
import { readFixtureJson } from "../utils/fixturesPath";

export const VLM_API_KEY_MISSING = "VLM_API_KEY_MISSING";

export interface VlmVendorResolveResult {
  ok: boolean;
  invokeKey?: string;
  display?: string;
  vendorId?: string;
  source: "primary" | "fallback_vendor" | "agent_deploy" | "missing";
  errorCode?: typeof VLM_API_KEY_MISSING;
  errorMessage?: string;
  settingsDeepLink?: string;
  tried: string[];
}

interface LoopCfg {
  vlmModelKey?: string;
  vlmFallbackModels?: string[];
  vlmVendorPrefix?: string;
}

function parseApiKey(raw: unknown): string {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw || "{}") : (raw as Record<string, unknown>) ?? {};
    return String((obj as { apiKey?: string }).apiKey ?? "")
      .replace(/^Bearer\s+/i, "")
      .trim();
  } catch {
    return "";
  }
}

function looksMultimodalModel(name: string): boolean {
  const n = name.toLowerCase();
  return /vision|vl\b|gpt-4o|gpt-4\.1|gemini|qwen.*vl|seed-1-6-vision|doubao.*vision|claude.*sonnet|claude.*opus/i.test(
    n,
  );
}

/**
 * HQ-front preflight: prefer configured volcengine Vision; else any vendor with apiKey + vision model;
 * else agentDeploy stillVlm slot. Never invent keys.
 */
export async function resolveVlmVendorKey(input: {
  db: Knex;
  preferredModelKey?: string | null;
  vendorPrefix?: string | null;
}): Promise<VlmVendorResolveResult> {
  const cfg = readFixtureJson<LoopCfg>("still_visual_fidelity_loop.json", {});
  const vendorPrefix = input.vendorPrefix ?? cfg.vlmVendorPrefix ?? "volcengine";
  const catalog = loadVlmCatalogFromFixture();
  const resolved = resolveVlmInvokeKeys({
    preferred: input.preferredModelKey ?? undefined,
    primary: cfg.vlmModelKey ?? "Doubao-Seed-1.6-Vision",
    fallbacks: cfg.vlmFallbackModels ?? ["Doubao-1.5-Vision-Pro-32K"],
    vendorPrefix,
    catalog,
  });
  const tried: string[] = [...resolved.tried];

  // 1) Primary vendor (volcengine) with apiKey
  const primaryRow = await input.db("o_vendorConfig").where({ id: vendorPrefix }).first();
  const primaryKey = parseApiKey(primaryRow?.inputValues);
  if (primaryKey && resolved.keys[0]) {
    return {
      ok: true,
      invokeKey: resolved.keys[0].invokeKey,
      display: resolved.keys[0].display,
      vendorId: vendorPrefix,
      source: "primary",
      tried,
    };
  }

  // 2) Scan other vendors with apiKey + multimodal model in their model list / catalog
  const rows = await input.db("o_vendorConfig").select("id", "inputValues", "models");
  for (const row of rows as Array<{ id: string; inputValues?: string; models?: string }>) {
    if (row.id === vendorPrefix) continue;
    const key = parseApiKey(row.inputValues);
    if (!key) continue;
    let models: Array<{ modelName?: string; name?: string }> = [];
    try {
      models = JSON.parse(row.models || "[]");
    } catch {
      models = [];
    }
    const vision =
      models.find((m) => looksMultimodalModel(String(m.modelName ?? m.name ?? ""))) ??
      (looksMultimodalModel(row.id) ? { modelName: row.id } : null);
    if (!vision?.modelName && !models.length) {
      // Vendor has key but no listed vision — try catalog-style name if vendor is known multimodal host
      if (!/openai|agnes|azure|google|dashscope|bailian/i.test(row.id)) continue;
    }
    const modelName =
      vision?.modelName ||
      models.find((m) => looksMultimodalModel(String(m.modelName ?? "")))?.modelName ||
      models[0]?.modelName;
    if (!modelName || !looksMultimodalModel(modelName)) continue;
    const invokeKey = `${row.id}:${modelName}`;
    tried.push(invokeKey);
    return {
      ok: true,
      invokeKey,
      display: modelName,
      vendorId: row.id,
      source: "fallback_vendor",
      tried,
    };
  }

  // 3) agentDeploy stillVlm / still_vlm slot
  const agent =
    (await input.db("o_agentDeploy").where({ key: "stillVlm" }).first()) ||
    (await input.db("o_agentDeploy").where({ key: "still_vlm" }).first());
  if (agent?.modelName) {
    const invokeKey = String(agent.modelName);
    if (invokeKey.includes(":")) {
      const [vid] = invokeKey.split(/:(.+)/);
      const vrow = await input.db("o_vendorConfig").where({ id: vid }).first();
      if (parseApiKey(vrow?.inputValues)) {
        tried.push(invokeKey);
        return {
          ok: true,
          invokeKey,
          display: invokeKey,
          vendorId: vid,
          source: "agent_deploy",
          tried,
        };
      }
    }
  }

  return {
    ok: false,
    source: "missing",
    errorCode: VLM_API_KEY_MISSING,
    errorMessage:
      "缺少可用的视觉评审 API Key。请在供应商设置中配置火山引擎 Ark Key（与 Seedream 同 Key），或配置其他支持多模态的供应商。",
    settingsDeepLink: "/settings/vendor?focus=volcengine&field=apiKey",
    tried,
  };
}
