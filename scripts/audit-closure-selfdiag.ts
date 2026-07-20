/**
 * yarn audit:closure-selfdiag
 * Attribute closure gaps to kernels / registry rows — does NOT rewrite business code.
 */
import fs from "fs";
import path from "path";
import { loadDesignFieldRegistry } from "@/ruleEngine/design/designFieldRegistry";
import { resolveDepthPolicy } from "@/ruleEngine/kernels/reverseKernel";
import { generationFeedbackPort } from "@/ruleEngine/ports/generationFeedback";
import { routeFeedback } from "@/ruleEngine/validators/autoFix";

type Gap = { kernel: string; id: string; detail: string };

async function main() {
  const gaps: Gap[] = [];
  const registry = loadDesignFieldRegistry();
  const expectedIds = [
    "emotion",
    "colorTemp",
    "spatial",
    "duration",
    "shotSize",
    "camera",
    "fx",
    "dialogue",
    "lipSync",
    "voice",
    "sfx",
    "exprGuard",
    "debutBeat",
    "endHook",
  ];
  for (const id of expectedIds) {
    if (!registry.some((f) => f.id === id)) {
      gaps.push({ kernel: "PromptKernel/DesignFieldRegistry", id, detail: "missing registry row" });
    }
  }

  const routes = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/fixtures/reverse_route_table.json"), "utf-8"),
  ).routes as { trigger: string; reverseTarget: string; ruleIds?: string[] }[];
  const tls = routes.find((r) => r.trigger === "tls_socket");
  if (!tls || tls.reverseTarget !== "INFRA") {
    gaps.push({ kernel: "ReverseKernel", id: "tls_socket", detail: "TLS route missing or not INFRA" });
  }

  for (const dual of [
    ["PR-09", "SB"],
    ["PR-14", "SB"],
    ["PR-15", "EN"],
    ["PR-16", "W3"],
    ["QP-19", "W3"],
  ] as const) {
    const hit = resolveDepthPolicy(dual[0]);
    const routed = routeFeedback(dual[0]);
    if (hit.reverseTarget !== dual[1] && routed !== dual[1]) {
      gaps.push({
        kernel: "ReverseKernel",
        id: dual[0],
        detail: `expected ${dual[1]} got depth=${hit.reverseTarget} route=${routed}`,
      });
    }
  }

  const tlsErr = await generationFeedbackPort.classifyFailure({
    modality: "image",
    shotId: "selfdiag",
    error: "Client network socket disconnected before secure TLS connection was established",
  });
  if (tlsErr.upstreamPatches?.[0]?.rollbackLayer !== "INFRA") {
    gaps.push({
      kernel: "ReverseKernel/generationFeedback",
      id: "tls_socket",
      detail: `classify → ${tlsErr.upstreamPatches?.[0]?.rollbackLayer} / ${tlsErr.ruleId}`,
    });
  }

  const templates = [
    "data/modelPrompt/video/universalTextMode.md",
    "data/modelPrompt/video/universalSingleImageMode.md",
    "data/modelPrompt/video/universalFirstAndLastFrameMode.md",
    "data/modelPrompt/video/universalMulti-parameterMode.md",
  ];
  for (const t of templates) {
    const p = path.join(process.cwd(), t);
    if (!fs.existsSync(p)) {
      gaps.push({ kernel: "CompileKernel", id: path.basename(t), detail: "template file missing" });
      continue;
    }
    const body = fs.readFileSync(p, "utf-8");
    if (t.includes("Text") || t.includes("SingleImage")) {
      if (!/\[Visual\]/.test(body) || !/输出格式/.test(body)) {
        gaps.push({ kernel: "CompileKernel", id: path.basename(t), detail: "thin template — missing 输出格式 / [Visual]" });
      }
    }
  }

  const feContract = path.join(process.cwd(), "scripts/test-fe-integration-contract.ts");
  if (fs.existsSync(feContract)) {
    const fe = fs.readFileSync(feContract, "utf-8");
    if (!/slotFingerprint|trackId::/.test(fe) && !fs.existsSync(path.join(process.cwd(), "Toonflow-web"))) {
      // FE fingerprint checked via packaged web or sibling repo note
    }
  }

  console.log("# Closure self-diagnostics (attribute only)\n");
  if (!gaps.length) {
    console.log("✓ no structural gaps attributed");
    console.log("\n=== audit:closure-selfdiag OK ===");
    return;
  }
  for (const g of gaps) {
    console.log(`GAP [${g.kernel}] ${g.id}: ${g.detail}`);
  }
  console.error(`\n${gaps.length} gap(s) — selfdiag does not auto-patch business code`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
