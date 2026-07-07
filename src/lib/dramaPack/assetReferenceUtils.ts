/** T0/T1 资产生图 reference 解析 */

import u from "@/utils";
import { parseLockCode } from "./schema";
import { SAME_FACE_SECONDARY_REF } from "./personaPolicy";

export async function resolveT0ReferenceBase64(projectId: number, remark?: string | null): Promise<string | null> {
  const code = parseLockCode(remark ?? "");
  if (!code || !code.includes(":")) return null;
  const baseCode = code.split(":")[0];
  const t0 = await u
    .db("o_assets")
    .leftJoin("o_image", "o_image.id", "o_assets.imageId")
    .where({ projectId })
    .where("o_assets.remark", `lockCode:${baseCode}`)
    .whereNotNull("o_image.filePath")
    .select("o_image.filePath")
    .first();
  if (!t0?.filePath) return null;
  return u.oss.getImageBase64(t0.filePath);
}

export async function resolveSecondaryFaceReferenceBase64(
  projectId: number,
  charCode: string,
): Promise<string | null> {
  const secondary = SAME_FACE_SECONDARY_REF[charCode];
  if (!secondary) return null;
  const row = await u
    .db("o_assets")
    .leftJoin("o_image", "o_image.id", "o_assets.imageId")
    .where({ projectId })
    .where("o_assets.remark", `lockCode:${secondary}`)
    .whereNotNull("o_image.filePath")
    .select("o_image.filePath")
    .first();
  if (!row?.filePath) return null;
  return u.oss.getImageBase64(row.filePath);
}

export async function buildRoleReferenceList(
  projectId: number,
  remark?: string | null,
  clientBase64?: string | null,
): Promise<Array<{ base64: string; type: "image" }>> {
  const refs: Array<{ base64: string; type: "image" }> = [];
  if (clientBase64) {
    refs.push({ base64: clientBase64, type: "image" });
    return refs;
  }
  const code = parseLockCode(remark ?? "");
  if (code?.includes(":")) {
    const t0 = await resolveT0ReferenceBase64(projectId, remark);
    if (t0) refs.push({ base64: t0, type: "image" });
  } else if (code && SAME_FACE_SECONDARY_REF[code]) {
    const sec = await resolveSecondaryFaceReferenceBase64(projectId, code);
    if (sec) refs.push({ base64: sec, type: "image" });
  }
  return refs;
}

export async function requireT1ReferenceOrThrow(projectId: number, remark?: string | null): Promise<void> {
  const code = parseLockCode(remark ?? "");
  if (!code?.includes(":")) return;
  const t0 = await resolveT0ReferenceBase64(projectId, remark);
  if (!t0) {
    throw new Error(`T1 服化资产 ${code} 缺少 T0 底模参考图，请先生成 ${code.split(":")[0]} 四视图`);
  }
}
