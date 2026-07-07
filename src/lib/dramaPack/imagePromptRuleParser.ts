/** 解析 productionSpec.imagePromptRules 模板文本 */

export type ParsedImagePromptRule = {
  mustInclude: string[];
  mustNot: string[];
  requireCodePrefixes: string[];
};

export function parseImagePromptRuleText(text: string): ParsedImagePromptRule {
  const mustInclude: string[] = [];
  const mustNot: string[] = [];
  const requireCodePrefixes: string[] = [];

  const mustMatch = text.match(/必须包含[:：]\s*([^；;]+)/);
  if (mustMatch) {
    mustInclude.push(
      ...mustMatch[1]
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  const forbidParts = text.match(/禁止[^；;]*/g) ?? [];
  for (const part of forbidParts) {
    const inner = part.replace(/^禁止[^:：]*[:：]\s*/, "");
    mustNot.push(
      ...inner
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  const refs = text.match(/(CHAR|SCENE|PROP)-[A-Z0-9-]+/gi) ?? [];
  for (const r of refs) {
    const prefix = r.replace(/-.*$/, "").toUpperCase();
    if (!requireCodePrefixes.includes(prefix)) requireCodePrefixes.push(prefix);
  }

  return { mustInclude, mustNot, requireCodePrefixes };
}

export function getImagePromptRuleForType(
  spec: Record<string, unknown> | undefined,
  shotType: string | undefined,
): ParsedImagePromptRule | null {
  if (!shotType || !spec) return null;
  const rules = spec.imagePromptRules as Record<string, string> | undefined;
  const text = rules?.[shotType];
  if (!text) return null;
  return parseImagePromptRuleText(text);
}
