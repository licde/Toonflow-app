import fs from "fs/promises";
import path from "path";
import {
  resolveGenerationModeRules,
  type ResolveGenerationModeInput,
  type GenerationModeRules,
} from "./resolveGenerationModeRules";

/** Resolve mode rules and load template text from data/modelPrompt. */
export async function loadModePromptTemplate(
  getModelPromptRoot: () => string,
  input: ResolveGenerationModeInput,
): Promise<{ rules: GenerationModeRules; template: string; usedBoundPath: boolean }> {
  const rules = resolveGenerationModeRules(input);
  const root = getModelPromptRoot();
  let usedBoundPath = false;
  let template = "";

  if (input.boundModelPromptPath) {
    const boundFull = path.isAbsolute(input.boundModelPromptPath)
      ? input.boundModelPromptPath
      : path.join(root, input.boundModelPromptPath);
    try {
      template = await fs.readFile(boundFull, "utf-8");
      usedBoundPath = true;
      if (!rules.boundTemplateCompatible) {
        // Prefer mode-correct template when bound path is wrong family
        const modeFull = path.join(root, rules.templatePath);
        try {
          template = await fs.readFile(modeFull, "utf-8");
          usedBoundPath = false;
        } catch {
          /* keep bound */
        }
      }
    } catch {
      /* fall through */
    }
  }

  if (!template) {
    const modeFull = path.join(root, rules.templatePath);
    try {
      template = await fs.readFile(modeFull, "utf-8");
    } catch {
      template = "";
    }
  }

  return { rules, template, usedBoundPath };
}
