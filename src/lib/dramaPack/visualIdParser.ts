/** 解析 my-pack V42 visualId：CHAR-CODE-阶段_动作 / SCENE-* / PROP-* / 旧版角色名-阶段 */

export type ParsedVisualId = {
  charCode?: string;
  stage?: string;
  action?: string;
  sceneOrPropCode?: string;
  raw: string;
};

const CHAR_V2 = /^(CHAR-[A-Z0-9]+)-([^_]+)_(.+)$/;
const CHAR_STAGE = /^(CHAR-[A-Z0-9]+)-(.+)$/;
const SCENE_PROP = /^(SCENE|PROP)-([A-Z0-9-]+)(?:_(.+))?$/i;

export function parseVisualId(visualId: string | undefined): ParsedVisualId | null {
  if (!visualId?.trim()) return null;
  const raw = visualId.trim();

  const v2 = raw.match(CHAR_V2);
  if (v2) {
    return { charCode: v2[1], stage: v2[2], action: v2[3], raw };
  }

  const charStage = raw.match(CHAR_STAGE);
  if (charStage) {
    const rest = charStage[2];
    const us = rest.indexOf("_");
    if (us >= 0) {
      return { charCode: charStage[1], stage: rest.slice(0, us), action: rest.slice(us + 1), raw };
    }
    return { charCode: charStage[1], stage: rest, raw };
  }

  const sp = raw.match(SCENE_PROP);
  if (sp) {
    const prefix = sp[1].toUpperCase();
    const code = `${prefix}-${sp[2]}`;
    return { sceneOrPropCode: code, action: sp[3], raw };
  }

  const dash = raw.lastIndexOf("-");
  if (dash > 0) {
    return { stage: raw.slice(dash + 1), action: raw, raw };
  }
  return { raw };
}

export function wardrobeStageFromVisualId(visualId: string | undefined, charCode: string): string | null {
  const parsed = parseVisualId(visualId);
  if (parsed?.charCode === charCode && parsed.stage) return parsed.stage;
  if (!parsed?.stage) return null;
  const allowed = ["日常", "白天", "夜晚", "潜入", "落魄"];
  if (allowed.includes(parsed.stage)) return parsed.stage;
  return null;
}
