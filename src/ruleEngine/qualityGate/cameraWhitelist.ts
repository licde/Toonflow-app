/**
 * Camera / transition / motion whitelist SSOT loader.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export interface CameraMotionWhitelist {
  version?: string;
  transitions: string[];
  motions: string[];
  defaultTransition: string;
  defaultMotion: string;
  forbiddenMotions: string[];
}

const FALLBACK: CameraMotionWhitelist = {
  transitions: ["切", "淡入", "淡出", "叠化", "快切", "慢放", "cut", "fade", "dissolve"],
  motions: ["static", "slow pan", "slow zoom", "gentle push", "subtle drift", "slow push", "tracking"],
  defaultTransition: "切",
  defaultMotion: "slow pan",
  forbiddenMotions: ["rapid zoom", "face morph", "expression change", "camera roll", "whip pan", "crash zoom"],
};

export function loadCameraMotionWhitelist(): CameraMotionWhitelist {
  const loaded = readFixtureJson<CameraMotionWhitelist | null>("camera_motion_whitelist.json", null);
  if (!loaded?.transitions?.length) return FALLBACK;
  return { ...FALLBACK, ...loaded };
}

export function normalizeMotionToken(raw: string): string {
  return String(raw ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAllowedTransition(raw: string, wl = loadCameraMotionWhitelist()): boolean {
  const t = String(raw ?? "").trim();
  if (!t) return true; // empty = compile default; not illegal-present
  const lower = t.toLowerCase();
  return wl.transitions.some((x) => x.toLowerCase() === lower || x === t);
}

export function isAllowedMotion(raw: string, wl = loadCameraMotionWhitelist()): boolean {
  const n = normalizeMotionToken(raw);
  if (!n) return true;
  if (wl.forbiddenMotions.some((f) => n.includes(normalizeMotionToken(f)))) return false;
  return wl.motions.some((m) => n === normalizeMotionToken(m) || n.includes(normalizeMotionToken(m)));
}

export function extractMotionFromPrompt(prompt: string): string | undefined {
  const p = prompt ?? "";
  const m =
    p.match(/\b(static|slow\s+pan|slow\s+zoom|gentle\s+push|subtle\s+drift|slow\s+push|tracking|whip\s+pan|rapid\s+zoom|crash\s+zoom)\b/i) ??
    p.match(/运镜[：:]\s*([^\n,，]+)/);
  return m?.[1]?.trim() || m?.[0]?.trim();
}

export function promptHasForbiddenMotion(prompt: string, wl = loadCameraMotionWhitelist()): string | undefined {
  const p = normalizeMotionToken(prompt);
  return wl.forbiddenMotions.find((f) => p.includes(normalizeMotionToken(f)));
}

/** If prompt mentions a known motion family token, it must be on whitelist. */
export function promptMotionWhitelistViolation(prompt: string, wl = loadCameraMotionWhitelist()): string | undefined {
  const forbidden = promptHasForbiddenMotion(prompt, wl);
  if (forbidden) return forbidden;
  const extracted = extractMotionFromPrompt(prompt);
  if (!extracted) return undefined;
  if (!isAllowedMotion(extracted, wl)) return extracted;
  return undefined;
}
