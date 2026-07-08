import type { StructuredShot } from "../../structuredScript/types";
import type { CompileContext, CompilePatch, FieldHandler } from "../types";

const colorToneHandler: FieldHandler = {
  field: "colorTone",
  level: "G1",
  priority: 50,
  compile(ctx, shot) {
    if (!shot.colorTone) return {};
    const mapping = ctx.spec?.colorToneMapping as Record<string, { tone?: string }> | undefined;
    if (mapping?.[shot.colorTone]) {
      return { promptAppend: `mood: ${mapping[shot.colorTone].tone ?? shot.colorTone}`, compileLog: { colorTone: shot.colorTone } };
    }
    return { promptAppend: `mood: ${shot.colorTone}` };
  },
};

const visualIdHandler: FieldHandler = {
  field: "visualId",
  level: "G1",
  priority: 60,
  compile(ctx, shot) {
    if (!shot.visualId) return {};
    return { compileLog: { visualId: shot.visualId }, promptAppend: `visual: ${shot.visualId}` };
  },
};

const visualEffectHandler: FieldHandler = {
  field: "visualEffect",
  level: "G3",
  priority: 40,
  compile(_ctx, shot) {
    const vfx = shot.visualEffect as Record<string, unknown> | undefined;
    if (!vfx?.type) return {};
    return { promptAppend: `visual effect: ${vfx.type}`, compileLog: { visualEffect: vfx.type } };
  },
};

const transitionHandler: FieldHandler = {
  field: "transitionType",
  level: "G1",
  priority: 30,
  compile(_ctx, shot, target) {
    if (target !== "video" || !shot.transitionType) return {};
    const extra = shot.transitionType === "慢放" ? "slow motion" : shot.transitionType;
    return { promptAppend: `transition: ${extra}` };
  },
};

const sceneNameHandler: FieldHandler = {
  field: "sceneName",
  level: "G1",
  priority: 45,
  compile(ctx, shot) {
    if (!shot.sceneName) return {};
    const locks = ctx.spec?.sceneColorLock as { scene?: string; tone?: string; baseTemp?: number }[] | undefined;
    const code = shot.assetCodes?.find((c) => c.startsWith("SCENE-"));
    const lock = locks?.find((l) => l.scene === code || shot.sceneName?.includes(l.scene ?? ""));
    if (lock) {
      return { promptAppend: `scene ${shot.sceneName}, ${lock.tone ?? ""} ${lock.baseTemp ?? ""}K` };
    }
    return { promptAppend: `scene: ${shot.sceneName}` };
  },
};

const personalitySwitchHandler: FieldHandler = {
  field: "personalitySwitch",
  level: "G2",
  priority: 70,
  compile(_ctx, shot, target) {
    const sw = shot.personalitySwitch;
    if (!sw?.enabled || target !== "video") return {};
    if (sw.progress !== "100%") return { mode: "startEndRequired", compileLog: { personalitySwitch: sw } };
    return { compileLog: { personalitySwitch: sw } };
  },
};

export const fieldHandlers: FieldHandler[] = [
  colorToneHandler,
  visualIdHandler,
  visualEffectHandler,
  transitionHandler,
  sceneNameHandler,
  personalitySwitchHandler,
].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

export function applyFieldHandlers(
  ctx: CompileContext,
  shot: StructuredShot,
  target: "image" | "video",
): CompilePatch {
  const patch: CompilePatch = { compileLog: {} };
  for (const handler of fieldHandlers) {
    if (shot[handler.field as keyof StructuredShot] == null && handler.field !== "keyPrompts") continue;
    const p = handler.compile(ctx, shot, target);
    if (p.promptAppend) patch.promptAppend = [patch.promptAppend, p.promptAppend].filter(Boolean).join(", ");
    if (p.promptPrepend) patch.promptPrepend = [patch.promptPrepend, p.promptPrepend].filter(Boolean).join(", ");
    if (p.referenceAssetCodes) patch.referenceAssetCodes = p.referenceAssetCodes;
    if (p.duration != null) patch.duration = p.duration;
    if (p.mode) patch.mode = p.mode;
    if (p.audio != null) patch.audio = p.audio;
    if (p.aspectRatio) patch.aspectRatio = p.aspectRatio;
    if (p.compileLog) Object.assign(patch.compileLog!, p.compileLog);
  }
  return patch;
}

export type { FieldHandler };
