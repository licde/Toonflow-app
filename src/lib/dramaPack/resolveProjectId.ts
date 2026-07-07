import u from "@/utils";

export type ResolvedProjectId = {
  projectId: number;
  /** 用户传入的原始 ID */
  inputId: number;
  resolvedFrom?: "script";
  scriptName?: string;
};

/** 将 projectId 或 scriptId 解析为 o_project.id */
export async function resolveProjectId(inputId: number): Promise<ResolvedProjectId | null> {
  const project = await u.db("o_project").where("id", inputId).first();
  if (project) {
    return { projectId: inputId, inputId };
  }

  const script = await u.db("o_script").where("id", inputId).first();
  if (script?.projectId) {
    const parent = await u.db("o_project").where("id", script.projectId).first();
    if (parent) {
      return {
        projectId: script.projectId,
        inputId,
        resolvedFrom: "script",
        scriptName: script.name,
      };
    }
  }

  return null;
}

export async function buildProjectNotFoundMessage(inputId: number): Promise<string> {
  const script = await u.db("o_script").where("id", inputId).first();
  if (script) {
    return `ID ${inputId} 是剧本 scriptId（${script.name}），所属项目 ID 为 ${script.projectId}。请使用: yarn drama-pack sync ${script.projectId} ./my-pack.json`;
  }

  const scripts = await u.db("o_script").where("projectId", inputId).select("id", "name");
  if (scripts.length) {
  const list = scripts.map((s) => `${s.id}=${s.name}`).join(", ");
    return `项目 ${inputId} 不存在。若你输入的是剧本 ID，请查 status 输出；已知剧本: ${list}`;
  }

  const projects = await u.db("o_project").select("id", "name").limit(5);
  const list = projects.map((p) => `${p.id}=${p.name}`).join(", ");
  return `项目 ${inputId} 不存在。可用项目: ${list || "(无)"}`;
}
