/**
 * yarn test:storyboard-image-ir
 */
import { buildPromptIR, isImagePromptStub } from "@/ruleEngine/compilers/promptIR";
import type { PreDesignShot } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

ok("empty is stub", isImagePromptStub(""));
ok("short static stub", isImagePromptStub("中景 static"));

const shot: PreDesignShot = {
  shotIndex: 1,
  sceneName: "祠堂",
  visualDescription: "沈母居高临下，沈清瓷跪影",
  charCodes: ["CHAR-SHENMU", "CHAR-SHENQINGCI"],
  generation: { imagePrompt: "中景 static" },
  shotDesign: {
    composition: { foreground: "沈母", background: "祖训匾额", anchor: "跪影" },
    cameraAnchor: { shotSize: "MS" },
  },
};

const ir = buildPromptIR(shot, {
  implementationPlanItem: {
    avCausality: { visualPeak: "烛火摇曳" },
    promptAnchors: { img: ["warm candlelight"] },
  },
});

ok("rebuilt image", (ir.notes ?? []).some((n) => n.includes("image_rebuilt")));
ok("has peak or composition", /烛火|沈母|跪影/.test(ir.imagePrompt ?? ""));
ok("has cref after inject", /--cref\s+CHAR-/i.test(ir.imagePrompt ?? ""));

if (failed) {
  console.error(`\n${failed} storyboard-image-ir failed`);
  process.exit(1);
}
console.log("\n=== test:storyboard-image-ir OK ===");
