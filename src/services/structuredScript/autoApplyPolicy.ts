import u from "@/utils";

export type AutoApplyScope = "dirtyOnly" | "all";

export interface AutoApplyPolicy {
  enabled: boolean;
  scope: AutoApplyScope;
  autoApplyOnSync: boolean;
  phases: ("variants" | "images" | "videos" | "assemble")[];
  qualityProfileId: string;
  concurrency: number;
  retry: number;
  includeArchived: boolean;
  audioOverride?: boolean;
}

export const DEFAULT_AUTO_APPLY_POLICY: AutoApplyPolicy = {
  enabled: false,
  scope: "dirtyOnly",
  autoApplyOnSync: false,
  phases: ["variants", "images", "videos"],
  qualityProfileId: "prod",
  concurrency: 3,
  retry: 1,
  includeArchived: false,
};

const POLICY_KEY = "structuredAutoApplyPolicy";

export async function getAutoApplyPolicy(projectId: number, scriptId: number): Promise<AutoApplyPolicy> {
  const row = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: POLICY_KEY }).first();
  if (!row?.data) return { ...DEFAULT_AUTO_APPLY_POLICY };
  try {
    return { ...DEFAULT_AUTO_APPLY_POLICY, ...JSON.parse(row.data) };
  } catch {
    return { ...DEFAULT_AUTO_APPLY_POLICY };
  }
}

export async function setAutoApplyPolicy(projectId: number, scriptId: number, policy: Partial<AutoApplyPolicy>) {
  const current = await getAutoApplyPolicy(projectId, scriptId);
  const merged = { ...current, ...policy };
  const row = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: POLICY_KEY }).first();
  const payload = JSON.stringify(merged);
  if (row?.id) {
    await u.db("o_agentWorkData").where("id", row.id).update({ data: payload, updateTime: Date.now() });
  } else {
    await u.db("o_agentWorkData").insert({
      projectId,
      episodesId: scriptId,
      key: POLICY_KEY,
      data: payload,
      createTime: Date.now(),
      updateTime: Date.now(),
    });
  }
  return merged;
}
