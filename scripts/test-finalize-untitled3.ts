/**
 * yarn test:finalize-untitled3 — Untitled-3 dirty five-section goldens
 */
import { finalizeFiveSectionPrompt, hasFiveSectionPlaceholders } from "@/ruleEngine/compilers/finalizeFiveSectionPrompt";
import { isVideoPromptStub } from "@/ruleEngine/compilers/sanitizeVideoPrompt";
import { decideVideoQuality } from "@/ruleEngine/compilers/qualityDecision";
import { applyDesignFieldRegistry } from "@/ruleEngine/design/designFieldRegistry";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const untitled3 = `[Visual]
MS, slow pan, 3s, 中景 static, duration 3s, motion-from-frame, 烛火摇曳, , slow pan, , singleImage reference

[Motion]
0s-Ns: readable action beats from seed.

[Camera]
medium shot, subtle camera, duration Ns, single continuous take., duration 3s

[Audio]
(dialogue/SFX filled from design when present).

[Narrative]
singleImage reference. subtle camera follow., --cref CHAR-SHENQINGCI, --cref CHAR-SHENMU, --sref SCENE-001
identity[CHAR:CHAR-SHENQINGCI | CHAR:CHAR-SHENMU | SCENE:SCENE-001], clear emotional beat, warm color temperature, fg:沈母居高临下, bg:沈清瓷跪影+祖训匾额, micro-expression:低垂/neutral_closed, FX:F1, "---" (dialogue), lip-sync active, voice:default character timbre
`;

ok("detects placeholders", hasFiveSectionPlaceholders(untitled3));
ok("is stub", isVideoPromptStub(untitled3));

const lines = ["跪下。", "天命在我。"];
const fin = finalizeFiveSectionPrompt({
  prompt: untitled3,
  dialogueLines: lines,
  durationSec: 6,
  preferStaticOnDialogue: true,
  narrativePeak: "烛火摇曳",
});

ok("no duration Ns", !/duration\s*Ns/i.test(fin.prompt));
ok("no 0s-Ns", !/0s-Ns/i.test(fin.prompt));
ok("no filled placeholder", !/\(dialogue\s*\/\s*SFX\s*filled/i.test(fin.prompt));
ok("no --- dialogue", !/["']---["']\s*\(dialogue\)/i.test(fin.prompt));
ok("has Chinese lines", /跪下|天命/.test(fin.prompt));
ok("no cref in body", !/--cref|--sref/i.test(fin.prompt));
ok("duration 6 in camera", /duration\s*6s|时长\s*6s/i.test(fin.prompt), fin.prompt.match(/\[Camera\][\s\S]*?(?=\[|$)/i)?.[0]);
ok("no singleImage in Visual clutter or stripped", !/\[Visual\][\s\S]*singleImage reference/i.test(fin.prompt) || !/singleImage reference/i.test(fin.prompt));

// Registry section inject must not dump dialogue into Narrative
const injected = applyDesignFieldRegistry(
  `[Visual]\nv\n[Camera]\nc\n[Audio]\na\n[Narrative]\nn`,
  { dialogue: "测试台词一行", duration: 5, shotSize: "CU" },
  { modality: "video" },
);
ok("dialogue in Audio section", /\[Audio\][\s\S]*测试台词/.test(injected.prompt));
ok("duration in Camera", /\[Camera\][\s\S]*duration|5/.test(injected.prompt));

const split = decideVideoQuality({
  shot: {
    duration: 2,
    narrative: {
      dialogue: {
        lines: [
          { text: "这是一句非常非常长的台词用来触发口型拆镜建议并且没有splitHint。" },
          { text: "第二句也对。" },
        ],
      },
    },
  },
  vendorId: "klingai",
  videoPrompt: fin.prompt,
});
ok("split decision when over budget", split.burnAllowed === false && (split.decision === "split_shot" || split.decision === "soft_defer"));
ok("has splitHint", Boolean(split.splitHint));

if (failed) {
  console.error(`\n${failed} finalize-untitled3 failed`);
  process.exit(1);
}
console.log("\n=== test:finalize-untitled3 OK ===");
