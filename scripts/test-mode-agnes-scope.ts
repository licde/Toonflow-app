/**
 * yarn tsx scripts/test-mode-agnes-scope.ts
 * MODE-AGNES must only scan storyboardIds when provided (singleImage scope).
 */
import { validatePackage } from "@/ruleEngine/validators";
import type { EpisodePackage, ResolvedConfig } from "@/ruleEngine/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const config: ResolvedConfig = {
  imageModel: "",
  videoModel: "",
  videoRatio: "9:16",
  artStyle: "",
  imageVendor: "",
  videoVendor: "Agnes",
  speechSpeed: 4,
  platformProfile: { vertical: true },
  ruleEngineEnabled: true,
  ttsDubbing: false,
};

const pkg: EpisodePackage = {
  version: 1,
  projectId: 1,
  scriptId: 1,
  shots: [
    { id: "s1", index: 0, storyboardId: 101, narrative: { type: "CHAR-SCENE", duration: 3 }, generation: {} },
    { id: "s2", index: 1, storyboardId: 102, narrative: { type: "CHAR-SCENE", duration: 3 }, generation: {} },
    { id: "s3", index: 2, storyboardId: 103, narrative: { type: "CHAR-SCENE", duration: 3 }, generation: {} },
  ],
  rulePackVersion: "2.0.1",
  updatedAt: Date.now(),
};

const rows = [
  { id: 101, filePath: null, shouldGenerateImage: 1 },
  { id: 102, filePath: "/ok.jpg", shouldGenerateImage: 1 },
  { id: 103, filePath: null, shouldGenerateImage: 1 },
];

const full = validatePackage(pkg, config, "", rows);
ok(
  "full scan blocks empty shots 1 and 3",
  full.issues.filter((i) => i.ruleId === "MODE-AGNES").length >= 2,
  `got ${full.issues.filter((i) => i.ruleId === "MODE-AGNES").length}`,
);

const scopedOk = validatePackage(pkg, config, "", rows, { storyboardIds: [102] });
ok(
  "singleImage scope on framed shot: no MODE-AGNES",
  !scopedOk.issues.some((i) => i.ruleId === "MODE-AGNES"),
  scopedOk.issues.map((i) => i.message).join("; "),
);

const scopedEmpty = validatePackage(pkg, config, "", rows, { storyboardIds: [101] });
ok(
  "singleImage scope on empty shot: one MODE-AGNES",
  scopedEmpty.issues.filter((i) => i.ruleId === "MODE-AGNES").length === 1
    && scopedEmpty.issues.some((i) => i.message.includes("镜 1")),
  scopedEmpty.issues.map((i) => i.message).join("; "),
);

const emptyIds = validatePackage(pkg, config, "", rows, { storyboardIds: [] });
ok(
  "empty storyboardIds skips MODE-AGNES (not full scan)",
  !emptyIds.issues.some((i) => i.ruleId === "MODE-AGNES"),
  emptyIds.issues.map((i) => i.message).join("; "),
);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
