/**
 * Audit routing drift — reverse_route_table vs FEEDBACK_ROUTING vs qpIndex
 * yarn audit:routing-drift
 */
import fs from "fs";
import path from "path";
import { FEEDBACK_ROUTING } from "@/ruleEngine/validators/autoFix";

function main() {
  const fixtures = path.join(process.cwd(), "data/fixtures");
  const routes = JSON.parse(fs.readFileSync(path.join(fixtures, "reverse_route_table.json"), "utf-8")).routes ?? [];
  const matrix = JSON.parse(fs.readFileSync(path.join(fixtures, "unified_closure_matrix.json"), "utf-8"));
  const qpIndex = matrix.qpIndex ?? {};

  let drift = 0;
  console.log("# Routing Drift Audit\n");
  for (const r of routes) {
    const fb = FEEDBACK_ROUTING[r.trigger] ?? FEEDBACK_ROUTING[r.ruleIds?.[0] ?? ""];
    if (fb && fb !== r.reverseTarget) {
      console.log(`DRIFT route ${r.trigger}: table=${r.reverseTarget} FEEDBACK=${fb}`);
      drift++;
    }
  }
  for (const [qp, meta] of Object.entries(qpIndex) as [string, { reverseTarget?: string }][]) {
    const fb = FEEDBACK_ROUTING[qp];
    if (fb && meta.reverseTarget && fb !== meta.reverseTarget) {
      console.log(`DRIFT qp ${qp}: qpIndex=${meta.reverseTarget} FEEDBACK=${fb}`);
      drift++;
    }
  }
  if (drift) {
    console.error(`\n${drift} routing drifts`);
    process.exit(1);
  }
  console.log("\n=== routing drift OK ===");
}

main();
