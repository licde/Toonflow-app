import { buildStoryboardItemXml } from "./resolveGenerationModeRules";
import type { RefSlot } from "./compileOrGenerateVideoPrompt";
import { formatIdentityBlock, buildIdentitySlots } from "../kernels/promptKernel";

export function buildVideoPromptUserContent(input: {
  modelData: string;
  assets: { id?: number; type?: string; name?: string; filePath?: string | null; audioTag?: string; code?: string }[];
  storyboard: {
    videoDesc?: string | null;
    prompt?: string | null;
    track?: string | number | null;
    duration?: string | number | null;
    associateAssetsIds?: unknown;
    shouldGenerateImage?: unknown;
    audioPrompt?: string | null;
    fxPrompt?: string | null;
    charCodes?: string[];
    sceneCode?: string;
  }[];
  orderedSlots?: RefSlot[];
  charCodes?: string[];
  sceneCode?: string | null;
  propCodes?: string[];
}): string {
  const assetLine = input.assets
    .filter((i) => i.filePath || i.name)
    .map((i) => `[${i.id},${i.type},${i.name}${i.code ? ` ${i.code}` : ""}${i.audioTag ? ` ${i.audioTag}` : ""} ] `)
    .join("，");
  const sbXml = input.storyboard.map((i) => buildStoryboardItemXml(i)).join("\n");
  const slotLine =
    input.orderedSlots?.length
      ? input.orderedSlots.map((s, i) => `${i + 1}.${s.role}:${s.sources}#${s.id}${s.label ? `(${s.label})` : ""}`).join(" | ")
      : "";
  const fromSb = input.storyboard.flatMap((s) => s.charCodes ?? []);
  const sceneFromSb = input.storyboard.map((s) => s.sceneCode).find(Boolean);
  const identity = buildIdentitySlots({
    charCodes: [...(input.charCodes ?? []), ...fromSb],
    sceneCode: input.sceneCode ?? sceneFromSb,
    propCodes: input.propCodes,
    associateCodes: input.assets.map((a) => a.code).filter(Boolean) as string[],
  });
  const identityLine = formatIdentityBlock(identity);
  return `
          **模型名称**：${input.modelData},
          **语言政策**：AUD=源语言台词；视频运镜壳可用 EN；禁止把中文台词译进 video 正文,
          **身份槽（必填）**：${identityLine || "（缺 CHAR/SCENE/PROP — 必须从分镜/资产补码）"},
          **输出硬约束**：提示词必须保留 --cref/--sref 或 identity[CHAR-…|SCENE-…]；首尾帧须含 START_FRAME/END_FRAME,
          ${slotLine ? `**有序参考槽**：${slotLine},` : ""}
          **资产信息**（角色、场景、道具、音频):${assetLine},
          **分镜信息**：${sbXml},
          `;
}
