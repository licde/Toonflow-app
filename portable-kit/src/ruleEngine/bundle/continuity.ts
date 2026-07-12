import type { Knex } from "knex";
import type { ScriptBundleContinuity } from "./types";

function tailSummary(text: string, maxLen = 500): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(-maxLen);
}

export async function generateContinuityFromPrev(
  db: Knex,
  projectId: number,
  scriptId: number,
): Promise<{ continuity: ScriptBundleContinuity; source: "db" | "llm" }> {
  const scripts = await db("o_script").where({ projectId }).orderBy("createTime", "asc").select("id", "content", "name");
  const idx = scripts.findIndex((s) => s.id === scriptId);
  const prev = idx > 0 ? scripts[idx - 1] : scripts.find((s) => s.id !== scriptId);
  if (!prev?.content) {
    return { continuity: { prevEpisodeSummary: "", unresolvedHooks: [] }, source: "db" };
  }
  const summary = tailSummary(prev.content);
  const hooks: string[] = [];
  const hookMatch = prev.content.match(/\[集末钩子[：:]\s*([^\]]+)\]/);
  if (hookMatch) hooks.push(hookMatch[1].trim());
  return {
    continuity: {
      prevEpisodeSummary: summary,
      recapHint: `承接「${prev.name}」末尾：${summary.slice(-120)}`,
      unresolvedHooks: hooks,
    },
    source: "db",
  };
}
