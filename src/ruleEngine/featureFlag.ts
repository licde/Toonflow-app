import type { Knex } from "knex";
import { resolveConfig } from "./resolveConfig";

export async function isRuleEngineEnabled(db: Knex, projectId?: number): Promise<boolean> {
  const row = await db("o_setting").where("key", "ruleEngineEnabled").first();
  if (row?.value === "0") return false;
  if (projectId) {
    const config = await resolveConfig(db as never, projectId);
    return config.ruleEngineEnabled;
  }
  return true;
}
