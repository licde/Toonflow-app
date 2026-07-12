/**
 * QP catalog ↔ repair_hint ↔ IC-01 cross audit
 * yarn audit:qp-coverage
 */
import fs from "fs";
import path from "path";

function main() {
  const fixtures = path.join(process.cwd(), "data/fixtures");
  const qp = JSON.parse(fs.readFileSync(path.join(fixtures, "qp_catalog.json"), "utf-8"));
  const hints = JSON.parse(fs.readFileSync(path.join(fixtures, "repair_hint_catalog.json"), "utf-8")).hints ?? [];
  const qpIds = (qp.items ?? qp.qp ?? []).map((i: { id?: string; qpId?: string }) => i.id ?? i.qpId).filter(Boolean);

  let missing = 0;
  for (const id of qpIds) {
    const has = hints.some((h: { qpId?: string; ruleId?: string }) => h.qpId === id || h.ruleId === id);
    if (!has) {
      console.log(`MISSING repairHint for ${id}`);
      missing++;
    }
  }
  if (missing) {
    console.error(`\n${missing} QP without repairHint`);
    process.exit(1);
  }
  console.log(`=== qp coverage OK (${qpIds.length} QPs) ===`);
}

main();
