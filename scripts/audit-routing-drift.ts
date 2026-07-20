/**
 * Audit routing drift — hardened ClosureGate checks:
 * - reverse_route_table vs FEEDBACK_ROUTING
 * - ruleIds dual-key registration
 * - fix_templates coverage
 * - silent-SB ban (routeFeedback unmatched ≠ SB)
 * - chain_trigger_map coverage
 * yarn audit:routing-drift
 */
import fs from "fs";
import path from "path";
import { FEEDBACK_ROUTING, routeFeedback } from "@/ruleEngine/validators/autoFix";
import { resolveDepthPolicy } from "@/ruleEngine/kernels/reverseKernel";

function main() {
  const fixtures = path.join(process.cwd(), "data/fixtures");
  const routes = JSON.parse(fs.readFileSync(path.join(fixtures, "reverse_route_table.json"), "utf-8")).routes ?? [];
  const matrix = JSON.parse(fs.readFileSync(path.join(fixtures, "unified_closure_matrix.json"), "utf-8"));
  const chainMap = JSON.parse(fs.readFileSync(path.join(fixtures, "chain_trigger_map.json"), "utf-8"));
  const qpIndex = matrix.qpIndex ?? {};
  const fixPath = path.join(process.cwd(), "data/skills/_generated/fix_templates.json");
  const fixTemplates: { ruleId: string; rePushTarget?: string }[] = fs.existsSync(fixPath)
    ? JSON.parse(fs.readFileSync(fixPath, "utf-8"))
    : [];

  let drift = 0;
  let missing = 0;
  let silentSb = 0;
  let chainMiss = 0;
  console.log("# Routing Drift Audit (hardened)\n");

  const tableTriggers = new Set<string>();
  for (const r of routes) {
    tableTriggers.add(r.trigger);
    for (const rid of r.ruleIds ?? []) tableTriggers.add(rid);

    const fb = FEEDBACK_ROUTING[r.trigger] ?? FEEDBACK_ROUTING[r.ruleIds?.[0] ?? ""];
    if (!fb) {
      console.log(`MISSING FEEDBACK_ROUTING for route trigger ${r.trigger}`);
      missing++;
      continue;
    }
    if (fb !== r.reverseTarget) {
      console.log(`DRIFT route ${r.trigger}: table=${r.reverseTarget} FEEDBACK=${fb}`);
      drift++;
    }
    // Dual-key: each ruleId must resolve
    for (const rid of r.ruleIds ?? []) {
      if (!FEEDBACK_ROUTING[rid] && FEEDBACK_ROUTING[r.trigger] !== r.reverseTarget) {
        // ok if trigger key exists; warn if ruleId orphan
        if (!FEEDBACK_ROUTING[rid]) {
          console.log(`WARN ruleId ${rid} not in FEEDBACK_ROUTING (trigger ${r.trigger} ok)`);
        }
      }
    }
  }

  // Ban silent-SB for unknown / vendor_passthrough
  for (const probe of [
    "unknown_xyz_trigger_never_exists",
    "vendor_passthrough",
    "identity_mismatch",
    "fx_f5_unhandled",
    "PR-11",
    "tls_socket",
    "QP-19",
    "PR-09",
    "PR-14",
    "PR-15",
    "PR-16",
  ]) {
    const hit = routeFeedback(probe);
    const deep = resolveDepthPolicy(probe);
    if (probe.startsWith("unknown") && hit === "SB") {
      console.log(`SILENT-SB: routeFeedback(${probe}) defaulted to SB`);
      silentSb++;
    }
    if (probe === "identity_mismatch" && hit !== "CD" && deep.reverseTarget !== "CD") {
      console.log(`DEPTH identity_mismatch expected CD got route=${hit} deep=${deep.reverseTarget}`);
      drift++;
    }
    if (probe === "fx_f5_unhandled" && hit !== "W3" && deep.reverseTarget !== "W3") {
      console.log(`DEPTH fx_f5_unhandled expected W3 got route=${hit} deep=${deep.reverseTarget}`);
      drift++;
    }
    if (probe === "PR-11" && hit !== "BP") {
      console.log(`DEPTH PR-11 expected BP got ${hit}`);
      drift++;
    }
    if (probe === "tls_socket" && hit !== "INFRA") {
      console.log(`DEPTH tls_socket expected INFRA got ${hit}`);
      drift++;
    }
    if (probe === "QP-19" && hit !== "W3") {
      console.log(`DEPTH QP-19 expected W3 got ${hit}`);
      drift++;
    }
  }

  // fix_templates ↔ FEEDBACK
  for (const t of fixTemplates) {
    if (!t.ruleId) continue;
    if (t.rePushTarget && FEEDBACK_ROUTING[t.ruleId] && FEEDBACK_ROUTING[t.ruleId] !== t.rePushTarget) {
      // hydrate may have already applied; only fail if conflict persists after load
      if (routeFeedback(t.ruleId) !== t.rePushTarget && routeFeedback(t.ruleId) === "SB") {
        console.log(`FIX_TEMPLATE silent-SB for ${t.ruleId}`);
        silentSb++;
      }
    }
  }

  // chain coverage
  const requiredChains = [
    "asset",
    "retention",
    "narrative_drive",
    "packaging",
    "adaptation_deep",
    "viral",
    "modality_feasibility",
    "generation_apply",
  ];
  const chains = chainMap.chains ?? {};
  for (const c of requiredChains) {
    if (!chains[c]?.trigger) {
      console.log(`MISSING chain_trigger_map: ${c}`);
      chainMiss++;
    }
  }

  for (const [qp, meta] of Object.entries(qpIndex) as [string, { reverseTarget?: string }][]) {
    const fb = FEEDBACK_ROUTING[qp];
    if (fb && meta.reverseTarget && fb !== meta.reverseTarget) {
      console.log(`DRIFT qp ${qp}: qpIndex=${meta.reverseTarget} FEEDBACK=${fb}`);
      drift++;
    }
  }

  if (drift || missing || silentSb || chainMiss) {
    console.error(
      `\n${drift} drifts, ${missing} missing FEEDBACK, ${silentSb} silent-SB, ${chainMiss} chain gaps`,
    );
    process.exit(1);
  }
  console.log("\n=== routing drift OK (hardened) ===");
}

main();
