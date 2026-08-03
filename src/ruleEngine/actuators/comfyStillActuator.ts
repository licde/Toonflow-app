/**
 * ComfyUI still actuator — HTTP queue + poll history.
 * Env: COMFY_URL (e.g. http://127.0.0.1:8000). Optional COMFY_WORKFLOW_PATH.
 * Optional COMFY_CKPT / COMFY_CLIP_VISION / COMFY_IPADAPTER / COMFY_CONTROLNET override filenames.
 * Vendor `comfyui` baseUrl in o_vendorConfig bridges into COMFY_URL when env unset.
 * Never throws for missing server — returns degraded so caller can fall back honestly.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";

export type ComfyStillInput = {
  identityBase64: string;
  softEnvBase64?: string;
  propSoftBase64?: string;
  positive: string;
  negative: string;
  objectiveClass?: string;
  propClassId?: string | null;
  contactLocus?: string | null;
  seed?: number;
};

export type ComfyStillResult =
  | {
      ok: true;
      imageBase64: string;
      workflowHash: string;
      actuatorId: "comfy_contact_softenv";
      ms: number;
    }
  | {
      ok: false;
      degraded: true;
      reason: string;
      actuatorId: "comfy_contact_softenv";
      ms: number;
    };

const DEFAULT_WORKFLOW = "data/fixtures/comfy_workflows/contact_softenv_v1b.json";
const COMFY_VENDOR_IDS = ["comfyui", "ComfyUI"] as const;

let cachedVendorUrl: string | null | undefined;

export function getComfyBaseUrl(): string {
  const fromEnv = String(process.env.COMFY_URL ?? process.env.COMFYUI_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (cachedVendorUrl) return cachedVendorUrl;
  return "";
}

/** Sync vendor UI baseUrl → process.env.COMFY_URL (and in-memory cache). Pass empty to clear. */
export function applyComfyVendorBaseUrl(baseUrl: string | null | undefined): string {
  const cleaned = String(baseUrl ?? "")
    .trim()
    .replace(/\/$/, "");
  if (!cleaned) {
    cachedVendorUrl = null;
    return String(process.env.COMFY_URL ?? process.env.COMFYUI_URL ?? "")
      .trim()
      .replace(/\/$/, "");
  }
  cachedVendorUrl = cleaned;
  if (!String(process.env.COMFY_URL ?? "").trim() && !String(process.env.COMFYUI_URL ?? "").trim()) {
    process.env.COMFY_URL = cleaned;
  }
  return cleaned;
}

/** Load Comfy vendor baseUrl from DB when env unset. Safe no-op outside app. */
export async function syncComfyUrlFromVendorConfig(): Promise<string> {
  const existing = getComfyBaseUrl();
  if (existing) return existing;
  try {
    const u = (await import("@/utils")).default;
    for (const id of COMFY_VENDOR_IDS) {
      const row = await u.db("o_vendorConfig").where("id", id).first();
      if (!row) continue;
      const values = JSON.parse(String(row.inputValues ?? "{}")) as Record<string, string>;
      const base = String(values.baseUrl ?? values.COMFY_URL ?? "").trim();
      if (base) return applyComfyVendorBaseUrl(base);
    }
  } catch {
    /* db / utils unavailable in pure unit contexts */
  }
  return getComfyBaseUrl();
}

export async function checkComfyHealth(timeoutMs = 2500): Promise<{ ok: boolean; reason?: string }> {
  await syncComfyUrlFromVendorConfig();
  const base = getComfyBaseUrl();
  if (!base) return { ok: false, reason: "COMFY_URL_unset" };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${base}/system_stats`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return { ok: false, reason: `health_http_${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "health_fail" };
  }
}

function loadWorkflowTemplate(): { graph: Record<string, unknown>; hash: string } {
  const rel = String(process.env.COMFY_WORKFLOW_PATH ?? DEFAULT_WORKFLOW).trim();
  const abs = path.isAbsolute(rel) ? rel : path.join(process.cwd(), rel);
  const raw = fs.readFileSync(abs, "utf8");
  const graph = JSON.parse(raw) as Record<string, unknown>;
  const hash = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
  return { graph, hash };
}

function stripDataUrl(b64: string): string {
  return String(b64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
}

/** Upload image to Comfy input folder via /upload/image */
async function uploadImage(base: string, b64: string, filename: string): Promise<string> {
  const buf = Buffer.from(stripDataUrl(b64), "base64");
  const form = new FormData();
  form.append("image", new Blob([buf], { type: "image/jpeg" }), filename);
  form.append("overwrite", "true");
  const res = await fetch(`${base}/upload/image`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`comfy_upload_${res.status}`);
  const json = (await res.json()) as { name?: string };
  return String(json.name ?? filename);
}

function applyModelEnvOverrides(graph: Record<string, unknown>): void {
  const ckpt = String(process.env.COMFY_CKPT ?? "").trim();
  const clipVision = String(process.env.COMFY_CLIP_VISION ?? "").trim();
  const ipa = String(process.env.COMFY_IPADAPTER ?? "").trim();
  const cn = String(process.env.COMFY_CONTROLNET ?? "").trim();
  for (const node of Object.values(graph) as Array<Record<string, unknown>>) {
    const classType = String(node.class_type ?? "");
    const inputs = (node.inputs ?? {}) as Record<string, unknown>;
    if (ckpt && classType === "CheckpointLoaderSimple") inputs.ckpt_name = ckpt;
    if (clipVision && classType === "CLIPVisionLoader") inputs.clip_name = clipVision;
    if (ipa && classType === "IPAdapterModelLoader") inputs.ipadapter_file = ipa;
    if (cn && classType === "ControlNetLoader") inputs.control_net_name = cn;
    node.inputs = inputs;
  }
}

function patchWorkflow(
  graph: Record<string, unknown>,
  slots: { identity: string; softEnv?: string; propSoft?: string; positive: string; negative: string; seed: number },
): Record<string, unknown> {
  const next = JSON.parse(JSON.stringify(graph)) as Record<string, Record<string, unknown>>;
  applyModelEnvOverrides(next);
  for (const [id, node] of Object.entries(next)) {
    const classType = String(node.class_type ?? "");
    const inputs = (node.inputs ?? {}) as Record<string, unknown>;
    if (classType === "LoadImage") {
      const title = String((node as { _meta?: { title?: string } })._meta?.title ?? "");
      if (/identity|cref|face/i.test(title) || id === "10") inputs.image = slots.identity;
      else if (/scene|softenv|sref|env/i.test(title) || id === "11") inputs.image = slots.softEnv ?? slots.identity;
      else if (/prop/i.test(title) || id === "12") inputs.image = slots.propSoft ?? slots.identity;
    }
    if (classType === "CLIPTextEncode") {
      const title = String((node as { _meta?: { title?: string } })._meta?.title ?? "");
      if (/neg/i.test(title) || id === "21") inputs.text = slots.negative;
      else inputs.text = slots.positive;
    }
    if (classType === "KSampler" || classType === "KSamplerAdvanced") {
      inputs.seed = slots.seed;
    }
    node.inputs = inputs;
    next[id] = node;
  }
  return next;
}

function summarizePromptError(status: number, body: string): string {
  try {
    const json = JSON.parse(body) as {
      error?: { message?: string; type?: string };
      node_errors?: Record<string, { class_type?: string; errors?: Array<{ message?: string; details?: string }> }>;
    };
    const parts: string[] = [`prompt_http_${status}`];
    if (json.error?.message) parts.push(String(json.error.message).slice(0, 180));
    if (json.node_errors) {
      for (const [nid, ne] of Object.entries(json.node_errors)) {
        const msg = ne.errors?.[0]?.message || ne.errors?.[0]?.details || ne.class_type || "node_error";
        parts.push(`n${nid}:${String(msg).slice(0, 120)}`);
      }
    }
    return parts.join("|").slice(0, 480);
  } catch {
    return `prompt_http_${status}|${body.slice(0, 200)}`;
  }
}

async function pollHistory(
  base: string,
  promptId: string,
  timeoutMs: number,
): Promise<string | undefined> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 1200));
    const res = await fetch(`${base}/history/${promptId}`);
    if (!res.ok) continue;
    const hist = (await res.json()) as Record<
      string,
      {
        outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }>;
        status?: { status_str?: string; messages?: unknown[] };
      }
    >;
    const entry = hist[promptId];
    if (!entry?.outputs) continue;
    for (const out of Object.values(entry.outputs)) {
      const img = out.images?.[0];
      if (!img?.filename) continue;
      const q = new URLSearchParams({
        filename: img.filename,
        subfolder: img.subfolder ?? "",
        type: img.type ?? "output",
      });
      const imgRes = await fetch(`${base}/view?${q}`);
      if (!imgRes.ok) continue;
      const ab = await imgRes.arrayBuffer();
      return Buffer.from(ab).toString("base64");
    }
  }
  return undefined;
}

/**
 * Run Comfy still. On any failure returns degraded (never throw to brick Generate).
 */
export async function runComfyContactSoftEnv(input: ComfyStillInput): Promise<ComfyStillResult> {
  const t0 = Date.now();
  await syncComfyUrlFromVendorConfig();
  const base = getComfyBaseUrl();
  if (!base) {
    return { ok: false, degraded: true, reason: "COMFY_URL_unset", actuatorId: "comfy_contact_softenv", ms: 0 };
  }
  const health = await checkComfyHealth();
  if (!health.ok) {
    return {
      ok: false,
      degraded: true,
      reason: health.reason ?? "comfy_unhealthy",
      actuatorId: "comfy_contact_softenv",
      ms: Date.now() - t0,
    };
  }
  try {
    const { graph, hash } = loadWorkflowTemplate();
    const identityName = await uploadImage(base, input.identityBase64, `tf_id_${Date.now()}.jpg`);
    const softName = input.softEnvBase64
      ? await uploadImage(base, input.softEnvBase64, `tf_env_${Date.now()}.jpg`)
      : undefined;
    const propName = input.propSoftBase64
      ? await uploadImage(base, input.propSoftBase64, `tf_prop_${Date.now()}.jpg`)
      : undefined;
    const seed = Number.isFinite(input.seed) ? Number(input.seed) : Math.floor(Math.random() * 1e9);
    const prompt = patchWorkflow(graph, {
      identity: identityName,
      softEnv: softName,
      propSoft: propName,
      positive: input.positive,
      negative: input.negative,
      seed,
    });
    const qRes = await fetch(`${base}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!qRes.ok) {
      const body = await qRes.text().catch(() => "");
      return {
        ok: false,
        degraded: true,
        reason: summarizePromptError(qRes.status, body),
        actuatorId: "comfy_contact_softenv",
        ms: Date.now() - t0,
      };
    }
    const qJson = (await qRes.json()) as { prompt_id?: string; node_errors?: unknown; error?: unknown };
    const promptId = String(qJson.prompt_id ?? "");
    if (!promptId) {
      const reason =
        qJson.node_errors || qJson.error
          ? summarizePromptError(200, JSON.stringify(qJson))
          : "no_prompt_id";
      return {
        ok: false,
        degraded: true,
        reason,
        actuatorId: "comfy_contact_softenv",
        ms: Date.now() - t0,
      };
    }
    if (qJson.node_errors && Object.keys(qJson.node_errors as object).length) {
      return {
        ok: false,
        degraded: true,
        reason: summarizePromptError(200, JSON.stringify(qJson)),
        actuatorId: "comfy_contact_softenv",
        ms: Date.now() - t0,
      };
    }
    const timeoutMs = Math.max(30_000, Number(process.env.COMFY_TIMEOUT_MS ?? 2_700_000));
    const imageBase64 = await pollHistory(base, promptId, timeoutMs);
    if (!imageBase64) {
      return {
        ok: false,
        degraded: true,
        reason: "poll_timeout",
        actuatorId: "comfy_contact_softenv",
        ms: Date.now() - t0,
      };
    }
    return {
      ok: true,
      imageBase64,
      workflowHash: hash,
      actuatorId: "comfy_contact_softenv",
      ms: Date.now() - t0,
    };
  } catch (e) {
    return {
      ok: false,
      degraded: true,
      reason: e instanceof Error ? e.message : "comfy_error",
      actuatorId: "comfy_contact_softenv",
      ms: Date.now() - t0,
    };
  }
}
