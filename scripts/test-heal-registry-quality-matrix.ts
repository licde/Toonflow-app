/**
 * Golden: HealRegistry silent soft patches + identity binding SSOT.
 * yarn tsx scripts/test-heal-registry-quality-matrix.ts
 */
import { decideVideoQuality } from "../src/ruleEngine/compilers/qualityDecision";
import { applySilentSoftPatches } from "../src/ruleEngine/heal/applySilentSoftPatches";
import { clearHealersForTest, listHealers } from "../src/ruleEngine/heal/healRegistry";
import { registerCoreHealers } from "../src/ruleEngine/heal/registerCoreHealers";
import { resolveRequiredDuration } from "../src/ruleEngine/compilers/resolveRequiredDuration";
import {
  resolveShotIdentityBinding,
  slimEntityAnchors,
} from "../src/ruleEngine/compilers/resolveShotIdentityBinding";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { createHealBudget } from "../src/ruleEngine/heal/healBudgetLedger";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  clearHealersForTest();
  registerCoreHealers();
  ok("core healers registered", listHealers().length >= 4, `got ${listHealers().length}`);

  // --- canSilentRaise → heal → burnAllowed ---
  {
    const shot = {
      shotIndex: 1,
      duration: 3,
      narrative: {
        duration: 3,
        dialogue: {
          lines: [{ text: "这是一句比较长的中文对白用来测试口型时长是否足够抬升。", splitHint: "hold" }],
        },
      },
    };
    const req = resolveRequiredDuration(shot, { vendorId: "agnesai" });
    ok("canSilentRaise", req.canSilentRaise, `required=${req.required}`);

    let qd = decideVideoQuality({
      videoPrompt: "[Visual]\nok\n[Motion]\nhold\n[Camera]\nstatic\n[Audio]\nambient\n[Narrative]\nbeat",
      shot: shot as never,
      vendorId: "agnesai",
    });
    ok(
      "L2.5 soft_patch raise",
      qd.decision === "soft_patch" || qd.nextStep === "raise_duration",
      `decision=${qd.decision} next=${qd.nextStep}`,
    );
    ok("suggestedValue set", qd.envelope.suggestedValue === req.required, `got ${qd.envelope.suggestedValue}`);
    ok("no empty soft_patch copy", !/提示词有可自动修复的问题/.test(qd.envelope.userMessage || ""), qd.envelope.userMessage);

    const heal = await applySilentSoftPatches({
      shot,
      prompt:
        "[Visual]\nok\n[Motion]\n0s-Ns: readable action beats from seed.\n[Camera]\nstatic\n[Audio]\nambient\n[Narrative]\nbeat",
      decision: qd,
      vendorId: "agnesai",
      budget: createHealBudget(),
    });
    ok("autoHealed raise_duration", heal.autoHealed.includes("raise_duration"), heal.autoHealed.join(","));
    ok("duration raised", Number(shot.duration) >= req.required, `dur=${shot.duration}`);

    qd = decideVideoQuality({
      videoPrompt: heal.prompt ?? "",
      shot: shot as never,
      vendorId: "agnesai",
    });
    ok("after heal burnAllowed", qd.burnAllowed, `decision=${qd.decision} reasons=${qd.reasons.join(",")}`);
  }

  // --- already sufficient ---
  {
    const shot = {
      shotIndex: 1,
      duration: 12,
      narrative: {
        duration: 12,
        dialogue: { lines: [{ text: "天命在我。", splitHint: "hold" }] },
      },
    };
    const qd = decideVideoQuality({
      videoPrompt: "[Visual]\nok\n[Motion]\nhold\n[Camera]\nstatic\n[Audio]\nambient\n[Narrative]\nbeat",
      shot: shot as never,
      vendorId: "agnesai",
    });
    ok("already sufficient duration → burnAllowed", qd.burnAllowed, `reasons=${qd.reasons.join(",")}`);
  }

  // --- over vendor / split: no silent raise ---
  {
    const shot = {
      shotIndex: 1,
      duration: 2,
      narrative: {
        duration: 2,
        dialogue: {
          lines: [
            { text: "第一句很长很长很长很长很长很长很长很长很长很长很长很长很长很长。" },
            { text: "第二句也很长很长很长很长很长很长很长很长很长很长很长很长很长。" },
          ],
        },
      },
    };
    const req = resolveRequiredDuration(shot, { vendorId: "agnesai" });
    ok(
      "needsSplit or overVendor blocks silent",
      !req.canSilentRaise,
      JSON.stringify({ canSilentRaise: req.canSilentRaise, needsSplit: req.needsSplit, overVendorMax: req.overVendorMax }),
    );
  }

  // --- identity binding high/low ---
  {
    const bind = resolveShotIdentityBinding({
      description: "沈母端坐太师椅高位，沈清瓷跪在蒲团低位，祠堂对峙。",
      characters: [
        { code: "CHAR-SHENQINGCI", name: "沈清瓷" },
        { code: "CHAR-SHENMU", name: "沈母" },
      ],
    });
    ok("high is 沈母 first", bind.orderedCodes[0] === "CHAR-SHENMU", bind.orderedCodes.join(","));
    ok("low is 清瓷 second", bind.orderedCodes[1] === "CHAR-SHENQINGCI", bind.orderedCodes.join(","));
    ok("bindingLine present", Boolean(bind.bindingLine && /站位绑定|高位/.test(bind.bindingLine)), bind.bindingLine);
    ok("crefTail ordered", bind.crefTail === "--cref CHAR-SHENMU CHAR-SHENQINGCI", bind.crefTail);
  }

  // --- slim anchors ---
  {
    const slim = slimEntityAnchors(["沈清瓷", "位太师椅摩挲扳指", "祠堂", "扳指", "跪地"]);
    ok("slim drops verb-object bloat", !slim.some((a) => /摩挲/.test(a)), slim.join(","));
    ok("slim keeps nouns", slim.includes("沈清瓷") && slim.includes("祠堂"), slim.join(","));
  }

  // --- compose still uses binding ---
  {
    const r = composeStillPrompt(
      {
        visualDescription: "沈母端坐太师椅，沈清瓷跪在蒲团，祠堂烛火。",
        characters: [
          { code: "CHAR-SHENMU", name: "沈母", hasImage: true },
          { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true },
        ],
        rawPrompt: "旧文 --cref CHAR-SHENQINGCI CHAR-SHENMU",
        qualityMode: "hq_update",
      },
      { mode: "fidelity" },
    );
    ok("compose ok", r.ok, r.blockReason);
    ok("binding in prompt", /站位绑定|身份顺序/.test(r.prompt), r.prompt.slice(0, 200));
    ok(
      "cref at tail ordered",
      /--cref\s+CHAR-SHENMU\s+CHAR-SHENQINGCI/.test(r.prompt),
      r.prompt.match(/--cref[^\n]+/)?.[0],
    );
    ok("no mid duplicate cref spam", (r.prompt.match(/--cref/gi) ?? []).length <= 1, String((r.prompt.match(/--cref/gi) ?? []).length));
    ok("anchors slimmed", !(r.entityAnchors ?? []).some((a) => a.length > 10), (r.entityAnchors ?? []).join(","));
  }

  // --- finalize placeholder heal ---
  {
    const dirty =
      "[Visual]\nscene\n[Motion]\n0s-Ns: readable action beats from seed.\n[Camera]\nslow pan\n[Audio]\n(dialogue / SFX filled from design when present).\n[Narrative]\npeak";
    const shot = {
      shotIndex: 1,
      duration: 8,
      narrative: { duration: 8, dialogue: { lines: [{ text: "天命在我。" }] } },
    };
    let qd = decideVideoQuality({ videoPrompt: dirty, shot: shot as never, vendorId: "agnesai" });
    ok(
      "placeholder blocks",
      !qd.burnAllowed && qd.reasons.includes("five_section_placeholder"),
      qd.reasons.join(","),
    );
    const heal = await applySilentSoftPatches({
      shot,
      prompt: dirty,
      decision: qd,
      vendorId: "agnesai",
    });
    ok("finalize healer ran", heal.autoHealed.includes("finalize_five_section"), heal.autoHealed.join(","));
    qd = decideVideoQuality({ videoPrompt: heal.prompt!, shot: shot as never, vendorId: "agnesai" });
    ok(
      "after finalize no placeholder reason",
      qd.burnAllowed || !qd.reasons.includes("five_section_placeholder"),
      qd.reasons.join(","),
    );
  }

  if (failed) {
    console.error(`test-heal-registry-quality-matrix: ${failed} failed`);
    process.exit(1);
  }
  console.log("test-heal-registry-quality-matrix: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
