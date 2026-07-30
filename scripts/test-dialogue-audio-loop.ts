/**
 * yarn test:dialogue-audio-loop
 * M1–M4: missing/extra dialogue, audio missing, orphan speech, NO-LIP.
 */
import { dialogueCoverageReport } from "@/ruleEngine/design/dialogueCoverage";
import { auditChatPromptGaps } from "@/ruleEngine/bundle/chatPromptAudit";
import { sanitizeVideoPrompt } from "@/ruleEngine/compilers/sanitizeVideoPrompt";
import {
  assertChainEgress,
  buildShotChainContract,
} from "@/ruleEngine/quality/shotChainContract";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const planLines = [
  { speaker: "沈清瓷", text: "你走", lineId: "L1" },
  { speaker: "沈母", text: "跪下", lineId: "L2" },
];

// --- M1: missing ---
const miss = dialogueCoverageReport({
  script: "沈清瓷：你走\n沈母：跪下\n",
  planData: { dialoguePlan: { lines: planLines } },
  shots: [
    {
      shotIndex: 1,
      narrative: { dialogue: { lines: [{ speaker: "沈清瓷", text: "你走", lineId: "L1" }] } },
    },
  ],
});
ok("M1 missing line", miss.missingCount >= 1 && !miss.ok, `missing=${miss.missingCount}`);

// --- M1: extra ---
const extra = dialogueCoverageReport({
  script: "沈清瓷：你走\n沈母：跪下\n",
  planData: { dialoguePlan: { lines: planLines } },
  shots: [
    {
      shotIndex: 1,
      narrative: {
        dialogue: {
          lines: [
            { speaker: "沈清瓷", text: "你走", lineId: "L1" },
            { speaker: "沈母", text: "跪下", lineId: "L2" },
            { speaker: "旁人", text: "乱入多一句" },
          ],
        },
      },
    },
  ],
});
ok("M1 extra line", extra.extraCount >= 1 && !extra.ok, `extra=${extra.extraCount}`);

// --- M1 clean ---
const clean = dialogueCoverageReport({
  script: "沈清瓷：你走\n沈母：跪下\n",
  planData: { dialoguePlan: { lines: planLines } },
  shots: [
    {
      shotIndex: 1,
      narrative: { dialogue: { lines: [{ speaker: "沈清瓷", text: "你走", lineId: "L1" }] } },
    },
    {
      shotIndex: 2,
      narrative: { dialogue: { lines: [{ speaker: "沈母", text: "跪下", lineId: "L2" }] } },
    },
  ],
});
ok("M1 clean coverage", clean.ok && clean.missingCount === 0 && clean.extraCount === 0);

// --- M2: CHAT-AUD-01 BLOCK ---
const audGaps = auditChatPromptGaps(
  {
    bundleType: "script",
    script: "沈清瓷：你走",
    preDesignPack: {
      scriptPlan: "",
      shots: [
        {
          shotIndex: 1,
          visualDescription: "沈清瓷站在廊桥上望雨",
          narrative: { dialogue: { lines: [{ speaker: "沈清瓷", text: "你走" }] } },
          generation: { imagePrompt: "廊桥望雨", videoPrompt: "[Audio]\n无对白" },
        },
      ],
    },
  } as never,
  "T3",
);
ok(
  "M2 CHAT-AUD-01 BLOCK",
  audGaps.some((g) => g.id === "CHAT-AUD-01" && g.severity === "BLOCK"),
  audGaps.map((g) => g.id).join(","),
);

// --- M3: design-confirmed silent strips orphan CJK ---
const orphan = sanitizeVideoPrompt({
  prompt: `[Visual]\n廊桥\n\n[Audio]\n"乱入口播"\nlip-sync active\n\n[Camera]\nstatic`,
  dialogueLines: [],
});
ok(
  "M3 orphan strip",
  orphan.conflicts.includes("AUD-ORPHAN-SPEECH") || orphan.changes.includes("audio_strip_orphan_speech"),
  orphan.changes.join(","),
);
ok("M3 no orphan quote left", !/乱入口播/.test(orphan.prompt), orphan.prompt.slice(0, 120));

// --- M4: NO-LIP on-camera ---
const noLip = auditChatPromptGaps(
  {
    bundleType: "script",
    script: "沈清瓷：你走",
    preDesignPack: {
      scriptPlan: "",
      shots: [
        {
          shotIndex: 2,
          visualDescription: "沈清瓷侧脸特写",
          lipSyncPolicy: "none",
          narrative: { dialogue: { lines: [{ speaker: "沈清瓷", text: "你走", type: "dialogue" }] } },
          generation: {
            imagePrompt: "侧脸",
            videoPrompt: "no lip sync",
            audioPrompt: "沈清瓷，你走",
          },
        },
      ],
    },
  } as never,
  "T3",
);
ok(
  "M4 NO-LIP-DIALOGUE BLOCK",
  noLip.some((g) => g.id === "NO-LIP-DIALOGUE" && g.severity === "BLOCK"),
  noLip.map((g) => g.id).join(","),
);

const shot = {
  shotIndex: 1,
  visualDescription: "沈清瓷站在廊桥上望雨",
  duration: 4,
  narrative: { dialogue: { lines: [{ speaker: "沈清瓷", text: "你走" }] } },
};
const c = buildShotChainContract(shot);
const eg = assertChainEgress("burn", c, {
  videoPrompt: "沈清瓷站在廊桥上望雨 你走",
  burnDuration: 4,
  designContentHashAtCompile: c.designContentHash,
});
ok("dialogue+hash fresh burn ok", eg.ok || !eg.codes.includes("VIDEO-PROMPT-STALE"), eg.codes.join(","));

if (failed) {
  console.error(`\n${failed} test:dialogue-audio-loop FAILED`);
  process.exit(1);
}
console.log("\n=== test:dialogue-audio-loop OK ===");
