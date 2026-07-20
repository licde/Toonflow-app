/**
 * Golden: still description fidelity + identity binding (Untitled-1 class).
 * yarn tsx scripts/test-still-desc-fidelity-bind.ts
 */
import { resolveShotIdentityBinding, labelMatches } from "../src/ruleEngine/compilers/resolveShotIdentityBinding";
import { extractDescPredicates } from "../src/ruleEngine/compilers/extractDescPredicates";
import { assertStillDescCoverage } from "../src/ruleEngine/compilers/stillDescCoverage";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const DESC = "沈母端坐高位太师椅摩挲扳指，沈清瓷跪低位蒲团抄书，权力反差构图，烛火摇曳。";

// --- alias ---
ok("labelMatches 沈母⊂沈母周氏", labelMatches("沈母端坐太师椅", "沈母周氏"));
ok("labelMatches exact", labelMatches("沈清瓷跪蒲团", "沈清瓷"));

// --- binding with 沈母周氏 asset name ---
{
  const bind = resolveShotIdentityBinding({
    description: DESC,
    characters: [
      { code: "CHAR-SHENQINGCI", name: "沈清瓷" },
      { code: "CHAR-SHENMU", name: "沈母周氏" },
    ],
  });
  ok("high is 沈母周氏/CHAR-SHENMU", bind.orderedCodes[0] === "CHAR-SHENMU", bind.orderedCodes.join(","));
  ok("low is 清瓷", bind.orderedCodes[1] === "CHAR-SHENQINGCI", bind.orderedCodes.join(","));
  ok("binding distinct names", Boolean(bind.bindingLine && /站位绑定/.test(bind.bindingLine) && !/沈清瓷=高位.*沈清瓷=低位/.test(bind.bindingLine)), bind.bindingLine);
  ok("binding has 母 and 清瓷", Boolean(bind.bindingLine && /沈母|周氏/.test(bind.bindingLine!) && /清瓷/.test(bind.bindingLine!)), bind.bindingLine);
  ok("single cref high→low", bind.crefTail === "--cref CHAR-SHENMU CHAR-SHENQINGCI", bind.crefTail);
}

// --- cross-clause: 太师椅 then 清瓷 must NOT mark 清瓷 high ---
{
  const bind = resolveShotIdentityBinding({
    description: "祠堂太师椅已备好。沈清瓷走进来抄书。",
    characters: [
      { code: "CHAR-SHENQINGCI", name: "沈清瓷" },
      { code: "CHAR-SHENMU", name: "沈母" },
    ],
  });
  ok(
    "cross-clause 清瓷 not high",
    bind.highRole?.code !== "CHAR-SHENQINGCI" || !bind.bindingLine?.includes("站位绑定"),
    JSON.stringify(bind.highRole),
  );
}

// --- no seating invented ---
{
  const pack = extractDescPredicates({
    description: "祠堂烛火摇曳，二人相对无言。",
    characterNames: ["沈母", "沈清瓷"],
  });
  ok("no seating invented", !pack.hasSeatingOrKneel && !pack.predicates.some((p) => p.verb === "跪"), JSON.stringify(pack.predicates));
}

// --- predicates Untitled-1 ---
{
  const pack = extractDescPredicates({
    description: DESC,
    characterNames: ["沈母周氏", "沈清瓷"],
  });
  ok("has seating", pack.hasSeatingOrKneel);
  ok("must 端坐", pack.mustAppear.includes("端坐"), pack.mustAppear.join(","));
  ok("must 太师椅", pack.mustAppear.includes("太师椅"), pack.mustAppear.join(","));
  ok("must 跪", pack.mustAppear.includes("跪"), pack.mustAppear.join(","));
  ok("must 蒲团", pack.mustAppear.includes("蒲团"), pack.mustAppear.join(","));
  ok("must 抄书", pack.mustAppear.includes("抄书"), pack.mustAppear.join(","));
  ok("must 扳指", pack.mustAppear.includes("扳指"), pack.mustAppear.join(","));
  ok("hardConstraint", Boolean(pack.hardConstraintLine && /场面硬约束/.test(pack.hardConstraintLine)), pack.hardConstraintLine);
  ok("negativeBan", Boolean(pack.negativeBanLine && /香案|站立/.test(pack.negativeBanLine)), pack.negativeBanLine);
}

// --- compose full Untitled-1 ---
{
  const r = composeStillPrompt(
    {
      visualDescription: DESC,
      characters: [
        {
          code: "CHAR-SHENMU",
          name: "沈母周氏",
          hasImage: true,
          personality: "沈母周氏，沈家主母，45岁，女，脸型:圆脸，肤色:保养得当，发型:盘发，戴金簪，服装:深紫色绣金对襟褂，姿态:端坐，居高。",
        },
        { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true },
      ],
      rawPrompt: "旧 --cref CHAR-SHENQINGCI, --cref CHAR-SHENMU",
      qualityMode: "hq_update",
      dialogueDominantSpeaker: "沈母",
    },
    { mode: "fidelity" },
  );
  ok("compose ok", r.ok, r.blockReason);
  ok("hard constraint in prompt", /场面硬约束/.test(r.prompt) && /端坐/.test(r.prompt) && /蒲团/.test(r.prompt), r.prompt.slice(0, 280));
  ok("negative ban in prompt", /禁止.*香案|站立香案/.test(r.prompt), r.prompt.match(/禁止[^。]{0,40}/)?.[0]);
  ok("no same-person dual bind", !/站位绑定：沈清瓷=高位/.test(r.prompt), r.prompt.match(/站位绑定[^。]+/)?.[0]);
  ok("母 in binding or hard", /沈母|周氏/.test(r.prompt));
  ok(
    "single cref SHENMU then QINGCI",
    /--cref\s+CHAR-SHENMU\s+CHAR-SHENQINGCI/.test(r.prompt) && (r.prompt.match(/--cref/gi) ?? []).length === 1,
    r.prompt.match(/--cref[^\n]+/)?.[0],
  );
  ok("no full 45岁 L0 personality", !/45岁/.test(r.prompt), "should omit dual hq personality");
  ok("descCoverageOk", r.descCoverageOk === true, (r.descCoverageMissing ?? []).join(","));
  ok("orderedCrefCodes", r.orderedCrefCodes?.[0] === "CHAR-SHENMU" && r.orderedCrefCodes?.[1] === "CHAR-SHENQINGCI", String(r.orderedCrefCodes));
  ok("named power seat", /权力位：.*高位|沈母.*视觉重心|周氏.*视觉重心/.test(r.prompt), r.prompt.match(/权力位[^。]+/)?.[0]);
}

// --- coverage fail detects missing ---
{
  const cov = assertStillDescCoverage({
    prompt: "二人站立祠堂",
    description: DESC,
    characterNames: ["沈母", "沈清瓷"],
  });
  ok("coverage fails without predicates", !cov.ok && cov.missing.length > 0, cov.missing.join(","));
}

if (failed) {
  console.error(`test-still-desc-fidelity-bind: ${failed} failed`);
  process.exit(1);
}
console.log("test-still-desc-fidelity-bind: OK");
