import u from "@/utils";
import type { DramaPack } from "./schema";
import { parsePackExtensions, type PackExtensionsContext } from "./packExtensionsResolver";

export type ProjectPackContext = {
  productionSpec?: DramaPack["productionSpec"];
  extensions: PackExtensionsContext;
  artStyle: string;
};

export async function loadProjectPackContext(projectId: number): Promise<ProjectPackContext> {
  const project = await u.db("o_project").where("id", projectId).select("artStyle").first();
  const agentRow = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const agentData = agentRow?.data ? JSON.parse(agentRow.data) : {};
  let productionSpec: DramaPack["productionSpec"] | undefined;
  if (agentData.productionSpec) {
    try {
      productionSpec = JSON.parse(agentData.productionSpec);
    } catch {
      productionSpec = undefined;
    }
  }
  const extensions = parsePackExtensions(agentData);
  return {
    productionSpec,
    extensions,
    artStyle: project?.artStyle || agentData.artStyleHint || "",
  };
}
