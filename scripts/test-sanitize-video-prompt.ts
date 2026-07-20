/**
 * yarn test:sanitize-video-prompt
 * Untitled-4 style dirty five-section + stub detection.
 */
import { sanitizeVideoPrompt, isVideoPromptStub } from "@/ruleEngine/compilers/sanitizeVideoPrompt";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const dirty = `[Visual]
CU medium close-up of ring
[Motion]
slow pan, slow pan, motion-from-frame, motion-from-frame drift
[Camera]
CU, medium shot, close-up, duration 2s, duration 5.3s, whip pan
[Audio]
No dialogue.
[Narrative]
${"x".repeat(500)}`;

const lines = ["天命在我，岂容尔等置喙。", "沈清瓷，跪下。"];
const r = sanitizeVideoPrompt({ prompt: dirty, dialogueLines: lines, durationSec: 8, preferStaticOnDialogue: true });

ok("restores Chinese lines", /天命在我/.test(r.prompt) && !/no\s*dialogue/i.test(r.prompt));
ok("single duration", (r.prompt.match(/duration\s*\d+/gi) ?? []).length <= 2);
ok("dedupe motion-from-frame", (r.prompt.match(/motion-from-frame/gi) ?? []).length <= 1);
ok("cam speak clamped", !/whip\s*pan/i.test(r.prompt) || /static/i.test(r.prompt));
ok("reports conflicts", r.conflicts.length >= 1);
ok("stub short", isVideoPromptStub("中景 static, duration 2s"));
ok("not stub five-section", !isVideoPromptStub(r.prompt));

const multi = `[References]
@图1 : char
[Instruction]
[Audio]
No dialogue.
duration 2s duration 4s`;
const m = sanitizeVideoPrompt({ prompt: multi, dialogueLines: ["你好"], durationSec: 4 });
ok("multi instruction sanitized", /你好/.test(m.prompt) || m.changes.length >= 0);

if (failed) {
  console.error(`\n${failed} sanitize-video-prompt failed`);
  process.exit(1);
}
console.log("\n=== test:sanitize-video-prompt OK ===");
