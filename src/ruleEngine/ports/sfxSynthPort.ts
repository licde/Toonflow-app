/**
 * SFX synthesis port — optional adapter. Without adapter, literal sfx:<> ≠ full audio score.
 */
export type SfxSynthRequest = {
  audioCue?: string | null;
  sfxIntent?: string[];
  shotIndex?: number;
};

export type SfxSynthResult = {
  ok: boolean;
  delivered: boolean;
  unknown: boolean;
  message?: string;
  adapterPresent: boolean;
};

export interface SfxSynthPort {
  synthesize(req: SfxSynthRequest): Promise<SfxSynthResult> | SfxSynthResult;
}

let _port: SfxSynthPort | null = null;

export function setSfxSynthPort(port: SfxSynthPort | null): void {
  _port = port;
}

export function getSfxSynthPort(): SfxSynthPort | null {
  return _port;
}

/** Score policy: literal sfx tags without adapter → unknown, not pass. */
export function evaluateSfxDelivery(input: {
  prompt?: string | null;
  audioCue?: string | null;
  sfxIntent?: string[];
  adapterPresent?: boolean;
}): {
  backed: boolean;
  unknown: boolean;
  fail: boolean;
  code?: "SFX-UNBACKED";
  message?: string;
} {
  const prompt = String(input.prompt ?? "");
  const literal = /sfx\s*:\s*<[^>]*>/i.test(prompt) || /sfx\s*:\s*\S+/i.test(prompt);
  const cue = String(input.audioCue ?? "").trim();
  const intents = (input.sfxIntent ?? []).filter(Boolean);
  const hasDesignSource = Boolean(cue || intents.length);
  const adapter = input.adapterPresent ?? Boolean(_port);

  if (!literal && !hasDesignSource) {
    return { backed: true, unknown: false, fail: false };
  }
  if (literal && !adapter && !hasDesignSource) {
    return {
      backed: false,
      unknown: true,
      fail: false,
      code: "SFX-UNBACKED",
      message: "字面 sfx:<> 无设计源/无 adapter，音效维记 unknown≠满分",
    };
  }
  if (literal && hasDesignSource && !adapter) {
    return {
      backed: false,
      unknown: true,
      fail: false,
      code: "SFX-UNBACKED",
      message: "有 audioCue/intent 但无 SfxSynthPort，不得计音效满分",
    };
  }
  if (adapter && (literal || hasDesignSource)) {
    return { backed: true, unknown: false, fail: false };
  }
  return { backed: hasDesignSource, unknown: false, fail: false };
}

export async function trySynthSfx(req: SfxSynthRequest): Promise<SfxSynthResult> {
  if (!_port) {
    return {
      ok: true,
      delivered: false,
      unknown: true,
      adapterPresent: false,
      message: "no SfxSynthPort",
    };
  }
  return _port.synthesize(req);
}
