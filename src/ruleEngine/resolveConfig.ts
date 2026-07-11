import fs from "fs";
import path from "path";
import type { ResolvedConfig } from "./types";

interface ProjectRow {
  imageModel?: string;
  videoModel?: string;
  videoRatio?: string;
  artStyle?: string;
}

export async function resolveConfig(
  db: { (table: string): { where: (k: string, v: unknown) => { select: (cols: string) => { first: () => Promise<unknown> } } } },
  projectId: number,
): Promise<ResolvedConfig> {
  const project = (await db("o_project").where("id", projectId).select("*").first()) as ProjectRow | undefined;
  const settings = await db("o_setting").where("key", "ruleEngineEnabled").select("value").first().catch(() => null);
  const ttsSetting = await db("o_setting").where("key", "ttsDubbing").select("value").first().catch(() => null);

  const baseSpecPath = path.join(process.cwd(), "data/base-spec/base.config.json");
  let speechSpeed = 4;
  if (fs.existsSync(baseSpecPath)) {
    try {
      const base = JSON.parse(fs.readFileSync(baseSpecPath, "utf-8")) as { speechSpeed?: number };
      speechSpeed = base.speechSpeed ?? 4;
    } catch {}
  }

  const imageModel = project?.imageModel ?? "";
  const videoModel = project?.videoModel ?? "";
  const videoRatio = project?.videoRatio ?? "16:9";

  return {
    imageModel,
    videoModel,
    videoRatio,
    artStyle: project?.artStyle ?? "",
    imageVendor: imageModel.split(":")[0] ?? "agnesai",
    videoVendor: videoModel.split(":")[0] ?? "agnesai",
    speechSpeed,
    platformProfile: { vertical: videoRatio === "9:16" },
    ruleEngineEnabled: (settings as { value?: string } | null)?.value !== "0",
    ttsDubbing: (ttsSetting as { value?: string } | null)?.value === "1",
  };
}
