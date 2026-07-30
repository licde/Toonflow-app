/**
 * Judge self-improve — corpus write + preference pair export (no GPU fine-tune).
 */
import fs from "fs";
import path from "path";
import { getFixturesRoot } from "../utils/fixturesPath";

export interface JudgeCorpusEntry {
  id: string;
  createdAt: string;
  imageHash?: string;
  description: string;
  items: Array<{ id: string; pass: boolean; evidence?: string; fixHint?: string; unknown?: boolean }>;
  modelKey?: string;
  /** Human or golden expected overrides */
  expected?: Array<{ id: string; pass: boolean }>;
  source: "converge" | "human_rejudge" | "golden";
  modality?: "still" | "audio";
}

function corpusDir(): string {
  return path.join(getFixturesRoot(), "golden", "still_judge_corpus");
}

export function ensureJudgeCorpusDir(): string {
  const dir = corpusDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJudgeCorpusEntry(entry: JudgeCorpusEntry): string {
  const dir = ensureJudgeCorpusDir();
  const file = path.join(dir, `${entry.id}.json`);
  fs.writeFileSync(file, JSON.stringify(entry, null, 2), "utf8");
  return file;
}

export function listJudgeCorpusEntries(): JudgeCorpusEntry[] {
  const dir = corpusDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as JudgeCorpusEntry);
}

/** Model vs expected disagreements — CI should fail when any. */
export function findJudgeDisagreements(entries?: JudgeCorpusEntry[]): Array<{
  id: string;
  itemId: string;
  modelPass: boolean;
  expectedPass: boolean;
}> {
  const out: Array<{ id: string; itemId: string; modelPass: boolean; expectedPass: boolean }> = [];
  for (const e of entries ?? listJudgeCorpusEntries()) {
    if (!e.expected?.length) continue;
    const byId = new Map(e.items.map((i) => [i.id, i]));
    for (const exp of e.expected) {
      const hit = byId.get(exp.id);
      if (!hit) continue;
      if (Boolean(hit.pass) !== Boolean(exp.pass)) {
        out.push({
          id: e.id,
          itemId: exp.id,
          modelPass: Boolean(hit.pass),
          expectedPass: Boolean(exp.pass),
        });
      }
    }
  }
  return out;
}

export function exportJudgePreferencePairs(entries?: JudgeCorpusEntry[]): Array<{
  corpusId: string;
  itemId: string;
  chosenPass: boolean;
  rejectedPass: boolean;
}> {
  const pairs: Array<{
    corpusId: string;
    itemId: string;
    chosenPass: boolean;
    rejectedPass: boolean;
  }> = [];
  for (const e of entries ?? listJudgeCorpusEntries()) {
    if (!e.expected?.length) continue;
    const byId = new Map(e.items.map((i) => [i.id, i]));
    for (const exp of e.expected) {
      const hit = byId.get(exp.id);
      if (!hit) continue;
      if (Boolean(hit.pass) === Boolean(exp.pass)) continue;
      pairs.push({
        corpusId: e.id,
        itemId: exp.id,
        chosenPass: Boolean(exp.pass),
        rejectedPass: Boolean(hit.pass),
      });
    }
  }
  return pairs;
}
