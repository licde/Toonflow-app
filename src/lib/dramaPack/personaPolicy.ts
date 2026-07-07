/** 一体双魂角色：人格=换 CHAR 码；T1 服化衍生可选跳过 */

export const PERSONA_SPLIT_CHAR_CODES = new Set(["CHAR-LZH", "CHAR-XC"]);

/** 同脸 secondary reference：生图时 XC 镜应同时关联 LZH T0 */
export const SAME_FACE_SECONDARY_REF: Record<string, string> = {
  "CHAR-XC": "CHAR-LZH",
};

export function isPersonaSplitChar(charCode: string): boolean {
  return PERSONA_SPLIT_CHAR_CODES.has(charCode);
}

/** 单服化人格角色（L4/分镜引用仅 1 套）→ 不建 T1 lockCode 资产 */
export function shouldSkipT1ForChar(charCode: string, entry: Record<string, unknown> | undefined): boolean {
  if (!entry || !isPersonaSplitChar(charCode)) return false;
  const l4 = entry["L4-outerwear"] as Record<string, unknown> | undefined;
  const l4Count = l4 ? Object.keys(l4).length : 0;
  const promptCount = Object.keys(entry).filter((k) => k.startsWith("分镜引用prompt_")).length;
  return l4Count <= 1 && promptCount <= 1;
}

export type PersonalitySwitch = {
  enabled?: boolean;
  from?: string;
  to?: string;
  progress?: string;
  visualMark?: string;
};

export function readPersonalitySwitch(shot: Record<string, unknown>): PersonalitySwitch | undefined {
  const ps = shot.personalitySwitch;
  if (!ps || typeof ps !== "object") return undefined;
  const switchObj = ps as PersonalitySwitch;
  if (!switchObj.enabled) return undefined;
  return switchObj;
}

export function isNightCeoShot(shot: Record<string, unknown>): boolean {
  const sceneName = String(shot.sceneName || "");
  const colorTone = String(shot.colorTone || "");
  const visualId = String(shot.visualId || "");
  return (
    /CEO|总裁|夜景|night/i.test(sceneName) ||
    /雪辞|CEO_0[23]/i.test(visualId) ||
    colorTone === "雪辞出现" ||
    /2800|night|夜晚/i.test(String(shot.imagePrompt || ""))
  );
}
