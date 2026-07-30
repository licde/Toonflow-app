import type { ScriptMeta } from "../types";
import { stableHash } from "../utils/hash";

export function extractScriptMeta(script: string): ScriptMeta {
  const lines = script.split(/\n+/).filter(Boolean);
  const characters = new Set<string>();
  for (const line of lines) {
    const m = line.match(/^([^：:（(]{1,8})[：:]/);
    if (m) characters.add(m[1].trim());
  }
  const dialogueLines = lines.filter((l) => /[：:][「"']/.test(l) || /^[^：:]+[：:]/.test(l));
  const actionLines = lines.filter((l) => !/^[A-Za-z\u4e00-\u9fff]{1,6}[：:]/.test(l));

  return {
    density: {
      dialogue: dialogueLines.length,
      action: actionLines.length,
      emotion: Math.min(10, Math.ceil(dialogueLines.length / Math.max(1, lines.length) * 10)),
    },
    goldenFormula: "3-15-45",
    characters: [...characters].slice(0, 20),
    hook: lines[0]?.slice(0, 80),
    hash: stableHash(script),
  };
}
