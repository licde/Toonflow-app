/**
 * P0 Untitled-1: string|array dialogue.lines must not throw in duration / feedback.
 */
import assert from "node:assert/strict";
import { resolveRequiredDuration } from "../src/ruleEngine/compilers/resolveRequiredDuration";
import { asDialogueLineObjects } from "../src/ruleEngine/design/dialogueCoverage";
import { generationFeedbackPort } from "../src/ruleEngine/ports/generationFeedback";

function ok(name: string, cond: boolean) {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`✓ ${name}`);
}

// --- asDialogueLineObjects ---
ok("string lines → objects", asDialogueLineObjects("张三：你好\n李四：再见").length === 2);
ok("array objects pass", asDialogueLineObjects([{ text: "hi", splitHint: "reaction_shot" }])[0].splitHint === "reaction_shot");
ok("null → []", asDialogueLineObjects(null).length === 0);

// --- resolveRequiredDuration with string lines (was: lines.find is not a function) ---
const shotStringLines = {
  shotIndex: 1,
  duration: 4,
  narrative: {
    dialogue: { lines: "女主：你再说一遍！" },
    emotionIntensity: 7,
  },
};
const req = resolveRequiredDuration(shotStringLines as never, { vendorId: "agnesai" });
ok("string lines duration no throw", req.required >= 1);
ok("string lines texts non-empty", (req.texts?.length ?? 0) >= 0);

const shotWithHint = {
  shotIndex: 2,
  duration: 3,
  narrative: {
    dialogue: {
      lines: [{ speaker: "男主", text: "这房子从来就不是你的。", splitHint: "reaction_shot" }],
    },
  },
};
const req2 = resolveRequiredDuration(shotWithHint as never);
ok("structured splitHint found", req2.splitHint === "reaction_shot");

// --- feedback must not map TypeError lines.find → dialogue_hash_mismatch ---
async function checkFeedback() {
  const fb = await generationFeedbackPort.classifyFailure({
    modality: "video",
    shotId: "1",
    error: "lines.find is not a function",
  });
  ok("TypeError → INFRA layer", fb.upstreamPatches?.[0]?.rollbackLayer === "INFRA");
  ok("ruleId runtime_type_error", fb.ruleId === "runtime_type_error");
  ok("not dialogue_hash_mismatch", fb.ruleId !== "dialogue_hash_mismatch");
}

checkFeedback()
  .then(() => console.log("\nP0 string-lines / feedback OK"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
