/**
 * yarn test:smart-proposal-merge
 * W93: build → confirm(+fork) → mergeConfirmed → patches applied; pending blocks IC-02.
 * V5-10: stampSmartDesignProposals preserves applied + adds pending debt.
 */
import {
  buildSmartProposalsFromTriggers,
  confirmSmartProposal,
  hasUnconfirmedProposals,
  mergeConfirmedProposals,
  stampSmartDesignProposals,
  type SmartProposal,
} from "@/ruleEngine/design/smartProposalMerger";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const triggers = [
  { trigger: "still_cu_cast", reverseTarget: "SB", reason: "群像 CU 须拆或改 spatial" },
  { trigger: "intent_pic", reverseTarget: "SB", ruleId: "DEX-INTENT-PIC" },
];

const built = buildSmartProposalsFromTriggers(triggers);
ok("build ≥2 proposals", built.length >= 2, String(built.length));
ok("pending status", built.every((p) => p.status === "pending_user_confirm"));
ok("has forks", (built[0]?.presentationFork?.length ?? 0) >= 2);
ok("IC-02 unconfirmed", hasUnconfirmedProposals(built));

let proposals = confirmSmartProposal(built, built[0]!.id!, "confirmed", "fork-B");
ok("first confirmed", proposals[0]?.status === "confirmed");
ok("still unconfirmed siblings", hasUnconfirmedProposals(proposals));

proposals = proposals.map((p) =>
  p.status === "pending_user_confirm" ? { ...p, status: "confirmed" as const } : p,
);

const bundle = {
  meta: { episodeIndex: 1 },
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        visualDescription: "旧 VD",
        generation: { videoPrompt: "old" },
      },
    ],
  },
  planData: {},
} as unknown as ScriptBundle;

const withPatch: SmartProposal[] = proposals.map((p, i) =>
  i === 0
    ? {
        ...p,
        shotIndex: 1,
        patch: { videoPrompt: "0s-2s: hand reaches for seal, contact at locus" },
      }
    : p,
);

const merged = mergeConfirmedProposals(bundle, withPatch);
ok("merged count", merged.merged >= 2, String(merged.merged));
ok("status applied", merged.proposals.every((p) => p.status === "applied"));
ok("no pending after merge", !hasUnconfirmedProposals(merged.proposals));
const vp = String(
  (merged.bundle.preDesignPack?.shots?.[0] as { generation?: { videoPrompt?: string } })?.generation
    ?.videoPrompt ?? "",
);
ok("patch wrote videoPrompt", /contact at locus/.test(vp), vp.slice(0, 80));
ok("fixPlan items", merged.fixPlanItems.length >= 2);

// V5-10: stamp from failedIds preserves applied + adds pending
const planStamp: Record<string, unknown> = {
  smartDesignProposals: merged.proposals,
  planData: { smartDesignProposals: merged.proposals },
};
const stamped = stampSmartDesignProposals(planStamp, ["DEX-LIT-CONTACT", "IRD-CONFIRM"]);
ok("stamp keeps applied", stamped.some((p) => p.status === "applied"));
ok(
  "stamp adds pending debt",
  stamped.some((p) => p.trigger === "DEX-LIT-CONTACT" && p.status === "pending_user_confirm"),
);
ok(
  "stamp mirrored planData",
  Array.isArray((planStamp.planData as { smartDesignProposals?: unknown[] }).smartDesignProposals),
);

if (failed) {
  console.error(`\n${failed} test:smart-proposal-merge FAILED`);
  process.exit(1);
}
console.log("\ntest:smart-proposal-merge OK");
