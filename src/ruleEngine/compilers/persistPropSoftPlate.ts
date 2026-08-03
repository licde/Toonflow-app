/**
 * Persist synthesized PROP soft plate → o_assets + o_image + OSS + optional storyboard link.
 * Enables warehouse reuse (not ephemeral base64-only).
 */
import type { Knex } from "knex";
import { v4 as uuid } from "uuid";

export type PersistPropSoftPlateInput = {
  db: Knex;
  /** Local OSS writer: (relPath, base64|Buffer) => Promise */
  writeFile: (relPath: string, data: Buffer | string) => Promise<void>;
  projectId: number;
  storyboardId?: number | null;
  base64: string;
  propClassId?: string | null;
  canonical?: string | null;
  glyphText?: string | null;
  plateMode?: string | null;
  /** Occupancy key so bend_pickup plates do not reuse hold-card soft plates */
  poseOccupancy?: string | null;
};

export type PersistPropSoftPlateResult = {
  assetId: number;
  imageId: number;
  filePath: string;
  created: boolean;
  linkedStoryboard: boolean;
};

function stripDataUrl(b64: string): string {
  return String(b64 ?? "").replace(/^data:image\/\w+;base64,/, "").trim();
}

/** Prefer reuse by assetCode / name before inserting a new synth row. */
export async function persistSynthesizedPropPlate(
  input: PersistPropSoftPlateInput,
): Promise<PersistPropSoftPlateResult | null> {
  const raw = stripDataUrl(input.base64);
  if (!raw || !input.projectId) return null;
  const cls = String(input.propClassId ?? "generic").slice(0, 24);
  const label = String(input.glyphText || input.canonical || "道具").slice(0, 12);
  const occ = String(input.poseOccupancy ?? "").trim();
  const mode = String(input.plateMode ?? "readable_doc").trim();
  const baseCode = `PROP-SYNTH-${cls.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "GEN"}`;
  const occSuffix = occ && occ !== "other" ? `-${occ}` : mode && mode !== "readable_doc" ? `-${mode}` : "";
  const code = `${baseCode}${occSuffix}`;
  const name = `软板·${label}`.slice(0, 40);
  const remark = `assetCode:${code}|synthPlate:1|plateMode:${mode}|propClass:${cls}${occ ? `|poseOccupancy:${occ}` : ""}`;

  const existing = await input.db("o_assets").where({ projectId: input.projectId }).select("id", "name", "remark", "imageId");
  const byCode = (existing as { id: number; name?: string; remark?: string; imageId?: number }[]).find(
    (a) => a.remark && String(a.remark).includes(`assetCode:${code}`),
  );
  if (byCode?.id && byCode.imageId) {
    let linked = false;
    if (input.storyboardId) {
      const link = await input.db("o_assets2Storyboard")
        .where({ assetId: byCode.id, storyboardId: input.storyboardId })
        .first();
      if (!link) {
        await input.db("o_assets2Storyboard").insert({ assetId: byCode.id, storyboardId: input.storyboardId });
        linked = true;
      } else {
        linked = true;
      }
    }
    const img = await input.db("o_image").where({ id: byCode.imageId }).select("filePath").first();
    return {
      assetId: byCode.id,
      imageId: byCode.imageId,
      filePath: String(img?.filePath ?? ""),
      created: false,
      linkedStoryboard: linked,
    };
  }

  const savePath = `/${input.projectId}/assets/tool/${uuid()}.jpg`;
  await input.writeFile(savePath, Buffer.from(raw, "base64"));
  const [assetId] = await input.db("o_assets").insert({
    projectId: input.projectId,
    name,
    type: "tool",
    prompt: `${label}道具软板 ${cls} ${input.plateMode ?? ""}`.slice(0, 500),
    describe: label,
    remark,
    startTime: Date.now(),
  });
  const [imageId] = await input.db("o_image").insert({
    filePath: savePath,
    type: "tool",
    assetsId: assetId,
    state: "已完成",
  });
  await input.db("o_assets").where({ id: assetId }).update({ imageId });
  let linkedStoryboard = false;
  if (input.storyboardId) {
    await input.db("o_assets2Storyboard").insert({ assetId, storyboardId: input.storyboardId });
    linkedStoryboard = true;
  }
  return { assetId, imageId, filePath: savePath, created: true, linkedStoryboard };
}
