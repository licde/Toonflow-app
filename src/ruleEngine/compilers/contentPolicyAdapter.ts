import { readFixtureJson } from "../utils/fixturesPath";

interface LexiconEntry {
  term: string;
  replacement: string;
  category?: string;
  severity?: "WARN" | "BLOCK";
}

interface ContentPolicyLexicon {
  version?: string;
  entries: LexiconEntry[];
}

let lexiconCache: ContentPolicyLexicon | null = null;

function loadLexicon(): ContentPolicyLexicon {
  if (!lexiconCache) {
    lexiconCache = readFixtureJson<ContentPolicyLexicon>("content_policy_lexicon.json", { entries: [] });
  }
  return lexiconCache;
}

export interface ContentPolicyResult {
  softenedPrompt: string;
  replacements: { term: string; replacement: string }[];
  warnings: string[];
  hasSensitiveTerms: boolean;
}

export function applyContentPolicy(prompt: string): ContentPolicyResult {
  const lex = loadLexicon();
  let result = prompt;
  const replacements: { term: string; replacement: string }[] = [];
  const warnings: string[] = [];

  for (const entry of lex.entries) {
    if (!entry.term || !result.includes(entry.term)) continue;
    result = result.split(entry.term).join(entry.replacement);
    replacements.push({ term: entry.term, replacement: entry.replacement });
    warnings.push(`「${entry.term}」→「${entry.replacement}」`);
  }

  return {
    softenedPrompt: result,
    replacements,
    warnings,
    hasSensitiveTerms: replacements.length > 0,
  };
}

export function isContentPolicyError(error: string): boolean {
  return /unable to generate|content.?policy|内容策略|血腥|violat|safety|nsfw|policy rejection|moderation/i.test(error);
}

export function precheckContentPolicy(prompt: string): ContentPolicyResult {
  return applyContentPolicy(prompt);
}
