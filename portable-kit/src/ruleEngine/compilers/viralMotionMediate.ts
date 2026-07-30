/**
 * Viral motion mediation — retention intent → vendor-legal camera/motion words.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type ViralMotionMediateResult = {
  ok: boolean;
  vendorId: string;
  original: string;
  mediated: string;
  intentId?: string;
  changed: boolean;
  unmappable: boolean;
  confirmRequired: boolean;
  message?: string;
};

type MediateFixture = {
  passThroughIfAllowed?: boolean;
  intentPatterns?: Array<{
    id: string;
    match: string;
    mediate: Record<string, string>;
  }>;
  vendorAllow?: Record<string, string[]>;
  contactEventPassThrough?: {
    preserveMotionTokens?: string[];
  };
};

function normVendor(vendorId?: string | null): string {
  const v = String(vendorId ?? "default").toLowerCase();
  if (/agnes/.test(v)) return "agnesai";
  if (/wan|seedance|volc/.test(v)) return /seedance|volc/.test(v) ? "seedance" : "wan";
  if (/kling/.test(v)) return "klingai";
  if (/minimax|hailuo/.test(v)) return "minimax";
  if (/vidu/.test(v)) return "vidu";
  return "default";
}

export function loadViralMotionMediateFixture(): MediateFixture {
  return readFixtureJson<MediateFixture>("viral_motion_mediate.json", {
    intentPatterns: [],
    vendorAllow: {},
  });
}

/** Map motion/camera text to vendor-allowed phrasing; never silent-drop retention intent. */
export function mediateViralMotion(input: {
  text: string;
  vendorId?: string | null;
}): ViralMotionMediateResult {
  const original = String(input.text ?? "").trim();
  const vendorId = normVendor(input.vendorId);
  const fix = loadViralMotionMediateFixture();
  const allow = fix.vendorAllow?.[vendorId] ?? fix.vendorAllow?.default ?? [];

  if (!original) {
    return {
      ok: true,
      vendorId,
      original,
      mediated: allow[0] ?? "轻微运镜",
      changed: false,
      unmappable: false,
      confirmRequired: false,
    };
  }

  // Contact-event motion phrases: never mediate/delete literary contact verbs (Camera-only path)
  const preserve = fix.contactEventPassThrough?.preserveMotionTokens ?? [];
  if (preserve.some((t) => t && original.includes(t))) {
    return {
      ok: true,
      vendorId,
      original,
      mediated: original,
      changed: false,
      unmappable: false,
      confirmRequired: false,
    };
  }

  // Already allowed substring
  if (fix.passThroughIfAllowed !== false && allow.some((a) => a && original.includes(a))) {
    return {
      ok: true,
      vendorId,
      original,
      mediated: original,
      changed: false,
      unmappable: false,
      confirmRequired: false,
    };
  }

  for (const pat of fix.intentPatterns ?? []) {
    let re: RegExp;
    try {
      re = new RegExp(pat.match, "i");
    } catch {
      continue;
    }
    if (!re.test(original)) continue;
    const mapped = pat.mediate[vendorId] ?? pat.mediate.default ?? allow[0] ?? "轻微运镜";
    const allowed = !allow.length || allow.includes(mapped);
    if (!allowed) {
      return {
        ok: false,
        vendorId,
        original,
        mediated: original,
        intentId: pat.id,
        changed: false,
        unmappable: true,
        confirmRequired: true,
        message: `运镜意图「${pat.id}」无法调解到 ${vendorId} 白名单；请 Confirm`,
      };
    }
    return {
      ok: true,
      vendorId,
      original,
      mediated: mapped,
      intentId: pat.id,
      changed: mapped !== original,
      unmappable: false,
      confirmRequired: false,
    };
  }

  // Aggressive motion tokens without pattern hit
  if (/急推|猛|甩切|whip|crash/i.test(original)) {
    return {
      ok: false,
      vendorId,
      original,
      mediated: original,
      changed: false,
      unmappable: true,
      confirmRequired: true,
      message: `运镜含冲击词且无调解映射（${vendorId}）；请 Confirm 降级或拆镜`,
    };
  }

  return {
    ok: true,
    vendorId,
    original,
    mediated: original,
    changed: false,
    unmappable: false,
    confirmRequired: false,
  };
}

/** Replace Camera/Motion aggressive phrases in five-section prompt. */
export function applyViralMotionMediateToPrompt(input: {
  prompt: string;
  vendorId?: string | null;
}): { prompt: string; changes: string[]; confirmRequired: boolean; message?: string } {
  const changes: string[] = [];
  let prompt = String(input.prompt ?? "");
  let confirmRequired = false;
  let message: string | undefined;

  prompt = prompt.replace(/\[(Motion|Camera)\]\s*([\s\S]*?)(?=\n\[|$)/gi, (full, name: string, body: string) => {
    const r = mediateViralMotion({ text: body, vendorId: input.vendorId });
    if (r.confirmRequired) {
      confirmRequired = true;
      message = r.message;
      return full;
    }
    if (r.changed) {
      changes.push(`${name}:${r.intentId ?? "mediate"}`);
      return `[${name}]\n${String(body).replace(r.original, r.mediated)}`;
    }
    // If body is only thin default + punch elsewhere — rewrite short cam lines
    if (r.mediated && r.mediated !== body.trim() && body.trim().length < 40 && r.changed) {
      changes.push(`${name}:rewrite`);
      return `[${name}]\n${r.mediated}`;
    }
    return full;
  });

  return { prompt, changes, confirmRequired, message };
}
