/**
 * cross-skill-sync: flag skill-only rule ids not present in quality_matrix (warn).
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const matrixPath = path.join(root, "data/fixtures/quality_matrix.json");
const skillsDir = path.join(root, "data/skills/browser_chat");

const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as { entries: { id: string }[] };
const matrixIds = new Set(matrix.entries.map((e) => e.id));

const RULE_RE = /\b([A-Z]{2,12}-(?:\d{2}|[A-Z]+-\d{2}|EXPR-\d{2}|STILL-QA|[A-Z0-9]+))\b/g;
const skillOnly = new Map<string, string[]>();

function walk(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.md$/i.test(name)) {
      const text = fs.readFileSync(p, "utf8");
      let m: RegExpExecArray | null;
      const re = new RegExp(RULE_RE.source, "g");
      while ((m = re.exec(text))) {
        const id = m[1]!;
        if (!matrixIds.has(id) && /^(QF-|IMG-|VIR-|RET-|NAR-|LIP-|FX-|DC-|PR-|LANG-|CUT-|GEN-|MOD-)/.test(id)) {
          const arr = skillOnly.get(id) ?? [];
          arr.push(path.relative(root, p));
          skillOnly.set(id, arr);
        }
      }
    }
  }
}

walk(skillsDir);

// Known intentional / non-matrix narrative ids are OK as WARN list
const allowedSkillOnly = new Set(["GEN-05", "GEN-07", "MOD-05", "CUT-02"]);
const bad = [...skillOnly.entries()].filter(([id]) => !allowedSkillOnly.has(id) && !matrixIds.has(id));

console.log(`matrix ids: ${matrixIds.size}; skill-only candidates: ${skillOnly.size}`);
if (bad.length) {
  console.warn("WARN skill-only rule ids (not failing CI yet):");
  for (const [id, files] of bad.slice(0, 30)) {
    console.warn(`  ${id} @ ${files[0]}`);
  }
}

// Hard fail only if QF-EXPR / IMG-STILL missing from matrix while referenced in skills
for (const must of ["QF-EXPR-01", "IMG-STILL-QA"]) {
  if (!matrixIds.has(must)) {
    console.error(`FAIL: ${must} missing from quality_matrix`);
    process.exit(1);
  }
}

console.log("audit-skill-matrix-sync: OK");

// Hard fail: importSalvageRegistry contract (Chat/Import dual-track)
{
  const matrixPath2 = path.join(root, "data/fixtures/semantic_gate_dual_track_matrix.json");
  const dual = JSON.parse(fs.readFileSync(matrixPath2, "utf8")) as {
    importSalvageRegistry?: { ruleId: string; demoteAfterHeal?: boolean; healClass?: string }[];
    mustEditBlockIds?: string[];
  };
  const reg = dual.importSalvageRegistry ?? [];
  const dup = reg.find((e) => e.ruleId === "DEX-DUP-VD");
  if (!dup || dup.demoteAfterHeal !== false) {
    console.error("FAIL: DEX-DUP-VD must have demoteAfterHeal=false in importSalvageRegistry");
    process.exit(1);
  }
  if (dup.healClass !== "confirm_only") {
    console.error("FAIL: DEX-DUP-VD healClass must be confirm_only");
    process.exit(1);
  }
  for (const must of ["DEX-DUP-VD", "DEX-DIRTY-STILL-PROMPT", "DEX-HAND-LIP", "LIP-01"]) {
    if (!(dual.mustEditBlockIds ?? []).includes(must)) {
      console.error(`FAIL: ${must} missing from mustEditBlockIds`);
      process.exit(1);
    }
  }
  const corridor = path.join(skillsDir, "corridor/corridor_SB.md");
  if (fs.existsSync(corridor)) {
    const text = fs.readFileSync(corridor, "utf8");
    for (const needle of ["一镜一画面", "diagnose-only", "importOk≠designExitPass", "forceExpand", "expandProvenance"]) {
      if (!text.includes(needle)) {
        console.error(`FAIL: corridor_SB.md missing contract phrase: ${needle}`);
        process.exit(1);
      }
    }
  }
  console.log("audit-skill-matrix-sync: importSalvageRegistry + corridor OK");
}