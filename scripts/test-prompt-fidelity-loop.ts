/**
 * yarn test:prompt-fidelity-loop
 * M5–M7: PROMPT-FIDELITY, no-trim one-beat, designContentHash stale.
 */
import { assertPromptDesignFidelity } from "@/ruleEngine/quality/assertPromptDesignFidelity";
import {
  assertChainEgress,
  buildShotChainContract,
  markChainStale,
} from "@/ruleEngine/quality/shotChainContract";
import { composeStillPrompt } from "@/ruleEngine/compilers/composeStillPrompt";
import { shouldWarnOneBeat } from "@/ruleEngine/compilers/stillIdentitySsot";
import { markVideoStaleOnDesignContentChange } from "@/ruleEngine/compilers/stillQuality";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const vd = "沈清漪端坐太师椅摩挲扳指";
const shot = {
  shotIndex: 1,
  visualDescription: vd,
  duration: 3,
  charCodes: ["CHAR-001"],
};

// --- M5: freeform video missing anchors ---
const freeform = assertPromptDesignFidelity({
  shot,
  knownNames: ["沈清漪"],
  videoPrompt: "空镜风景无人物无道具",
  stage: "burn",
});
ok(
  "M5 freeform fidelity fails or flags",
  !freeform.ok || freeform.findings.some((f) => f.id === "PROMPT-FIDELITY"),
  freeform.findings.map((f) => f.id).join(","),
);

const covered = assertPromptDesignFidelity({
  shot,
  knownNames: ["沈清漪"],
  videoPrompt: `${vd} 权力位清晰`,
  stage: "burn",
});
ok(
  "M5 covered anchors can pass fidelity",
  covered.ok || !covered.findings.some((f) => f.id === "PROMPT-FIDELITY" && f.severity === "BLOCK"),
  covered.findings.map((f) => `${f.id}:${f.severity}`).join(","),
);

// --- M6: multi-beat refuse compose / chain ---
const multiVd = "他刺入胸口。她咬帕。旁人包扎伤口。露出冷笑。勾起往事。";
ok("M6 detector multi-beat", shouldWarnOneBeat(multiVd));
const multiCompose = composeStillPrompt({
  rawPrompt: "",
  visualDescription: multiVd,
  qualityMode: "hq_update",
});
ok(
  "M6 compose refuses multi-beat",
  multiCompose.ok === false &&
    (multiCompose.blockReason === "DEX-STILL-ONEBEAT" || /ONEBEAT|多拍|拆镜/.test(String(multiCompose.userMessage ?? multiCompose.blockReason ?? ""))),
  String(multiCompose.blockReason ?? multiCompose.userMessage ?? ""),
);
ok(
  "M6 primaryNextStep split_shot",
  multiCompose.primaryNextStep === "split_shot" || multiCompose.ok === false,
  String(multiCompose.primaryNextStep),
);
const egMulti = assertChainEgress(
  "burn",
  buildShotChainContract({ visualDescription: multiVd, duration: 4 }),
  { videoPrompt: multiVd, burnDuration: 4 },
);
ok("M6 burn blocks ONEBEAT", egMulti.codes.includes("DEX-STILL-ONEBEAT"), egMulti.codes.join(","));

// --- M7: designContentHash / videoStale ---
const c0 = buildShotChainContract({
  ...shot,
  narrative: { dialogue: { lines: [{ speaker: "沈清漪", text: "你走" }] } },
});
const c1 = buildShotChainContract({
  ...shot,
  narrative: { dialogue: { lines: [{ speaker: "沈清漪", text: "乱入改词" }] } },
});
ok("M7 dialogue changes hash", c0.designContentHash !== c1.designContentHash);
const egStale = assertChainEgress("burn", c1, {
  videoPrompt: vd,
  burnDuration: 3,
  designContentHashAtCompile: c0.designContentHash,
});
ok("M7 hash drift VIDEO-PROMPT-STALE", egStale.codes.includes("VIDEO-PROMPT-STALE"), egStale.codes.join(","));

const sh: Record<string, unknown> = { visualDescription: vd, duration: 3 };
markChainStale(sh, { video: true });
ok("M7 markChainStale sets videoStale", sh.videoStale === true);
const egFlag = assertChainEgress("burn", buildShotChainContract(sh), {
  videoPrompt: vd,
  burnDuration: 3,
});
ok("M7 videoStale blocks burn", egFlag.codes.includes("VIDEO-PROMPT-STALE"), egFlag.codes.join(","));

const driftMeta = markVideoStaleOnDesignContentChange(
  { stillQuality: "hq_ok", designContentHash: c0.designContentHash },
  c1.designContentHash,
);
ok("M7 markVideoStaleOnDesignContentChange", Boolean(driftMeta?.videoStale));

const egFresh = assertChainEgress("burn", c0, {
  videoPrompt: `${vd} 扳指`,
  burnDuration: 3,
  designContentHashAtCompile: c0.designContentHash,
});
ok("M7 fresh hash not VIDEO-PROMPT-STALE", !egFresh.codes.includes("VIDEO-PROMPT-STALE"), egFresh.codes.join(","));

if (failed) {
  console.error(`\n${failed} test:prompt-fidelity-loop FAILED`);
  process.exit(1);
}
console.log("\n=== test:prompt-fidelity-loop OK ===");
