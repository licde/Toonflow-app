/** 视频/润色 AI 载荷：性别、describe、prompt 片段 */

import { parseLockCode } from "./schema";
import { lookupLockDescription, lookupLockFace } from "./characterAssetUtils";
import type { PackExtensionsContext } from "./packExtensionsResolver";

export type AssetAiPayload = {
  id: number;
  type: string;
  name: string;
  gender?: string;
  describe: string;
  promptSnippet: string;
  lockCode?: string;
};

function genderFromEntry(entry: Record<string, unknown> | undefined): string | undefined {
  if (!entry) return undefined;
  const g = entry.gender as string | undefined;
  if (g) return g;
  const narrative = entry.narrative as { gender?: string } | undefined;
  return narrative?.gender;
}

function genderEn(g?: string): string {
  if (!g) return "";
  const lower = g.toLowerCase();
  if (lower === "male" || g === "男") return "male";
  if (lower === "female" || g === "女") return "female";
  return g;
}

export function formatAssetPayloadForAi(
  row: {
    id?: number;
    type?: string;
    name?: string;
    describe?: string;
    prompt?: string;
    remark?: string;
  },
  extensions?: PackExtensionsContext,
): AssetAiPayload {
  const lockCode = parseLockCode(row.remark);
  const charCode = lockCode?.startsWith("CHAR-") ? lockCode.split(":")[0] : undefined;
  const entry = charCode ? (extensions?.characterAssets?.[charCode] as Record<string, unknown> | undefined) : undefined;
  const gender = genderEn(genderFromEntry(entry));
  const lockDesc = lookupLockDescription(entry);
  const lockFace = lookupLockFace(entry);

  let describe = row.describe || "";
  if (row.type === "role" && gender) {
    const tag = gender === "male" ? "男性" : gender === "female" ? "女性" : gender;
    if (!describe.includes(tag) && !describe.toLowerCase().includes(gender)) {
      describe = [tag, lockFace, describe].filter(Boolean).join("，");
    }
  }

  const promptSnippet = (row.prompt || lockDesc || "").slice(0, 400);

  return {
    id: row.id!,
    type: row.type || "role",
    name: row.name || "",
    gender,
    describe,
    promptSnippet,
    lockCode,
  };
}

export function formatAssetsXmlForAi(assets: AssetAiPayload[]): string {
  return assets
    .map(
      (a) =>
        `<asset id="${a.id}" type="${a.type}" name="${a.name}" gender="${a.gender || ""}" describe="${(a.describe || "").replace(/"/g, "'")}" prompt="${(a.promptSnippet || "").replace(/"/g, "'")}" />`,
    )
    .join("\n");
}
