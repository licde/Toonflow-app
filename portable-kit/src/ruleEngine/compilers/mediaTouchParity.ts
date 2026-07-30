/**
 * Shared image/video/oss preflight — one failure model for both modalities.
 */
export interface MediaTouchCheck {
  ok: boolean;
  code?: string;
  message?: string;
  reverseTrigger?: string;
}

export function requirePublicOssUrl(url?: string | null): MediaTouchCheck {
  if (!url?.trim()) {
    return { ok: false, code: "OSS_URL_MISSING", message: "缺 ossURL / 公网地址", reverseTrigger: "oss_ref_missing" };
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(url)) {
    return { ok: false, code: "OSS_LOCALHOST", message: "厂商不可达 localhost URL", reverseTrigger: "oss_ref_missing" };
  }
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
    return { ok: false, code: "OSS_URL_INVALID", message: `非法资源地址: ${url.slice(0, 40)}`, reverseTrigger: "oss_ref_missing" };
  }
  return { ok: true };
}

export function sharedMediaPreflight(input: {
  paths: (string | null | undefined)[];
  forceAudio?: boolean;
  nativeAudio?: boolean;
  requireAtLeastOne?: boolean;
}): MediaTouchCheck[] {
  const checks: MediaTouchCheck[] = [];
  const present = input.paths.filter((p) => p?.trim());
  if (input.requireAtLeastOne !== false && present.length === 0) {
    checks.push({ ok: false, code: "MEDIA_EMPTY", message: "参考媒资空集", reverseTrigger: "prompt_gen_media_missing" });
  }
  for (const p of present) {
    checks.push(requirePublicOssUrl(p));
  }
  if (input.forceAudio && input.nativeAudio === false) {
    checks.push({
      ok: false,
      code: "AUDIO_FORCE_MISMATCH",
      message: "forceAudio 与 nativeAudio 不一致",
      reverseTrigger: "audio_force_mismatch",
    });
  }
  return checks;
}

export function mediaPreflightBlocked(checks: MediaTouchCheck[]): boolean {
  return checks.some((c) => !c.ok);
}
