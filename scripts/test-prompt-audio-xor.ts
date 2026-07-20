/**
 * yarn test:prompt-audio-xor — dirty five-section cleans to XOR audio + no seed motion + lip duration
 */
import { finalizeFiveSectionPrompt, hasAudioDialogueContradiction, hasFiveSectionPlaceholders } from "@/ruleEngine/compilers/finalizeFiveSectionPrompt";
import { sanitizeVideoPrompt } from "@/ruleEngine/compilers/sanitizeVideoPrompt";
import { applyDesignFieldRegistry } from "@/ruleEngine/design/designFieldRegistry";
import { resolveLipDuration } from "@/ruleEngine/compilers/promptIR";
import { snapDurationToVendorMap, VENDOR_DURATION_BUCKETS } from "@/ruleEngine/vendor-packs/videoVendorPack";
import { decideVideoQuality } from "@/ruleEngine/compilers/qualityDecision";
import { ensureFiveSections } from "@/ruleEngine/compilers/compileOrGenerateVideoPrompt";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const longLine = "春日宴上，萧二公子与顾家那位说笑了三句，你可知？";

const dirty = `[Visual]
CU, slow pan, 5.3s

[Motion]
0s-4s: readable action beats from seed.

[Camera]
close-up, duration 5s

[Audio]
No spoken dialogue. ambient/SFX only., 沈母 says "${longLine}" (dialogue), lip-sync active

[Narrative]
continuity from design.`;

ok("dirty has contradiction", hasAudioDialogueContradiction(dirty));
ok("dirty has seed placeholder", hasFiveSectionPlaceholders(dirty));

const san = sanitizeVideoPrompt({
  prompt: dirty,
  dialogueLines: [longLine],
  durationSec: 8,
  preferStaticOnDialogue: true,
});
ok(
  "sanitize strips silence when dialogue",
  !/no spoken dialogue/i.test(san.prompt) || !hasAudioDialogueContradiction(san.prompt),
  san.prompt.slice(0, 200),
);

const fin = finalizeFiveSectionPrompt({
  prompt: dirty,
  dialogueLines: [longLine],
  durationSec: 8,
  preferStaticOnDialogue: true,
});
ok("finalize no contradiction", !hasAudioDialogueContradiction(fin.prompt), fin.prompt.match(/\[Audio\][\s\S]*?(?=\[|$)/i)?.[0]?.slice(0, 180));
ok("finalize no seed motion", !/from seed/i.test(fin.prompt), fin.prompt.match(/\[Motion\][\s\S]*?(?=\[|$)/i)?.[0]);
ok("finalize motion uses 8s", /0s-8s:/i.test(fin.prompt), fin.prompt.match(/\[Motion\][\s\S]*?(?=\[|$)/i)?.[0]);
ok("finalize camera duration 8s", /duration\s*8s/i.test(fin.prompt));
ok("finalize not placeholder-dirty", !hasFiveSectionPlaceholders(fin.prompt), fin.prompt.slice(0, 240));

const qd = decideVideoQuality({
  vendorId: "agnesai",
  videoPrompt: fin.prompt,
  shot: {
    duration: 8,
    narrative: { dialogue: { lines: [{ text: longLine, splitHint: "reaction_shot" }] } },
  },
});
ok(
  "clean prompt allows burn (no placeholder/audio reasons)",
  qd.burnAllowed || (!qd.reasons.includes("five_section_placeholder") && !qd.reasons.includes("audio_dialogue_contradiction")),
  qd.reasons.join(","),
);

// Registry: silence + inject dialogue
const scaffold = `[Visual]\nx\n\n[Motion]\n0s-Ns: readable action beats from seed.\n\n[Camera]\nduration Ns\n\n[Audio]\nNo spoken dialogue. ambient/SFX only.\n\n[Narrative]\nok`;
const reg = applyDesignFieldRegistry(scaffold, {
  dialogue: longLine,
  dialogueSpeaker: "沈母",
  lipSync: "active",
} as never);
ok("registry does not keep silence with dialogue", !hasAudioDialogueContradiction(reg.prompt), reg.prompt.match(/\[Audio\][\s\S]*?(?=\[|$)/i)?.[0]);
ok("registry injects says", /沈母 says/i.test(reg.prompt) || /says/i.test(reg.prompt));

const lip = resolveLipDuration({
  duration: 5.3,
  narrative: { dialogue: { lines: [{ text: longLine }] } },
} as never);
ok("lipMin >= 6 for ~22+ CJK chars", lip.lipMin >= 6, String(lip.lipMin));
ok("lip durationSec >= lipMin", lip.durationSec >= lip.lipMin, String(lip.durationSec));
const snap = snapDurationToVendorMap(5.3, VENDOR_DURATION_BUCKETS.agnesai, { lipMin: lip.lipMin });
ok("agnes snap > design 5s when lip raises", snap.duration >= lip.lipMin && snap.duration >= 6, String(snap.duration));

// ensureFiveSections uses Ns scaffold (finalize-friendly)
const wrapped = ensureFiveSections("subject speaking", "keep face identity.");
ok("ensureFiveSections uses 0s-Ns seed", /0s-Ns:.*from seed/i.test(wrapped));
const wrappedFin = finalizeFiveSectionPrompt({
  prompt: wrapped,
  dialogueLines: [longLine],
  durationSec: snap.duration,
});
ok("wrapped+finalize clears seed", !/from seed/i.test(wrappedFin.prompt));
ok("wrapped+finalize no audio contradiction", !hasAudioDialogueContradiction(wrappedFin.prompt));

if (failed) {
  console.error(`\n${failed} test:prompt-audio-xor failed`);
  process.exit(1);
}
console.log("\n=== test:prompt-audio-xor OK ===");
