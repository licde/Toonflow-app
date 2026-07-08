import u from "@/utils";
import type { StructuredScriptJson, StructuredShot } from "./types";
import { selectVariantPrompt } from "../generationContext/VariantSelector";
import type { AssetCodeMap } from "./importPipeline";

export interface DeriveVariantMeta {
  code: string;
  parentCode: string;
  name: string;
  prompt: string;
  lazy: boolean;
}

/** 从 visualId 提炼 derive 变体元数据（懒加载，生成时按需出图） */
export function collectDeriveVariants(
  json: StructuredScriptJson,
  shots: StructuredShot[],
): DeriveVariantMeta[] {
  const variants = new Map<string, DeriveVariantMeta>();
  const charAssets = json.characterAssets ?? {};

  for (const shot of shots) {
    const { charCode, deriveCode, layerPrompt } = selectVariantPrompt(shot, charAssets);
    if (!charCode || !deriveCode || deriveCode === charCode) continue;
    if (variants.has(deriveCode)) continue;

    const baseName = String(charAssets[charCode]?.name ?? charCode);
    let prompt = layerPrompt;
    if (shot.imagePrompt && shot.type?.startsWith("CHAR")) {
      prompt = stripDerivePrompt(shot.imagePrompt);
    }
    if (!prompt) prompt = layerPrompt;

    variants.set(deriveCode, {
      code: deriveCode,
      parentCode: charCode,
      name: `${baseName}-${deriveCode.split("-").slice(-1)[0]}`,
      prompt,
      lazy: true,
    });
  }

  return [...variants.values()];
}

function stripDerivePrompt(p: string) {
  return p.replace(/\s*--cref\s+\S+/gi, "").replace(/\s*--sref\s+\S+/gi, "").trim().slice(0, 500);
}

async function upsertDeriveAsset(
  projectId: number,
  scriptId: number,
  meta: DeriveVariantMeta,
  parentId: number,
  codeMap: AssetCodeMap,
): Promise<number> {
  const existing = await u.db("o_assets").where({ projectId, remark: meta.code }).first();
  if (existing?.id) {
    await u.db("o_assets").where("id", existing.id).update({
      prompt: meta.prompt,
      name: meta.name,
      assetsId: parentId,
      describe: `derive:${meta.parentCode}`,
    });
    codeMap.set(meta.code, existing.id);
    return existing.id;
  }
  const [id] = await u.db("o_assets").insert({
    projectId,
    scriptId,
    assetsId: parentId,
    name: meta.name,
    describe: `derive:${meta.parentCode}`,
    type: "role",
    remark: meta.code,
    prompt: meta.prompt,
    startTime: Date.now(),
  });
  codeMap.set(meta.code, id);
  return id;
}

/** 导入/sync 时写入 derive 元数据；按镜生成前可再次 ensure */
export async function registerDeriveVariants(
  projectId: number,
  scriptId: number,
  json: StructuredScriptJson,
  shots: StructuredShot[],
  codeMap: AssetCodeMap,
): Promise<number> {
  const metas = collectDeriveVariants(json, shots);
  let count = 0;
  for (const meta of metas) {
    const parentId = codeMap.get(meta.parentCode);
    if (!parentId) continue;
    await upsertDeriveAsset(projectId, scriptId, meta, parentId, codeMap);
    count++;
  }
  return count;
}

/** 生成前：确保当前镜 visualId 对应 derive 行存在 */
export async function ensureDeriveVariants(
  projectId: number,
  json: StructuredScriptJson,
  storyboardIds: number[],
): Promise<void> {
  const codeMap: AssetCodeMap = new Map();
  const assets = await u.db("o_assets").where({ projectId }).whereNotNull("remark");
  for (const a of assets) {
    if (a.remark) codeMap.set(a.remark, a.id!);
  }

  for (const sbId of storyboardIds) {
    const sb = await u.db("o_storyboard").where("id", sbId).first();
    if (!sb?.shotMeta || !sb.scriptId) continue;
    const shot = JSON.parse(sb.shotMeta) as StructuredShot;
    const metas = collectDeriveVariants(json, [shot]);
    for (const meta of metas) {
      const parentId = codeMap.get(meta.parentCode);
      if (parentId) await upsertDeriveAsset(projectId, sb.scriptId, meta, parentId, codeMap);
    }
  }
}
