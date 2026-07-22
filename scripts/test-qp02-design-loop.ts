/**
 * Golden: QP-02 design closed loop — designExit ≡ export; import salvage; reverse SB; no invent.
 * yarn test:qp02-design-loop
 */
import { readFileSync } from "fs";
import {
  checkQp02VisualDescription,
  qp02MinChars,
} from "../src/ruleEngine/bundle/visualQualityAudit";
import { runDesignExitGate } from "../src/ruleEngine/design/designExitGate";
import { healShortVisualDescriptionFromDesign } from "../src/ruleEngine/bundle/normalizePreDesignPack";
import { buildAggregatedChatRepairText } from "../src/ruleEngine/exportGate";
import { BLOCK_TO_TRIGGER_FOR_TEST } from "../src/ruleEngine/compilers/burnGateEnvelope";
import { buildChatRepairDeeplinks } from "../src/ruleEngine/design/chatRepairDeeplink";
import { trimToOneBeat } from "../src/ruleEngine/compilers/stillIdentitySsot";
import { AUTO_FIX } from "../src/ruleEngine/validators/autoFix";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean) {
  if (!cond) {
    console.error(`✗ ${name}`);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

const min = qp02MinChars();
ok("minChars floor from fixture", min === 8);

const seven = "一二三四五六七";
ok("len7 too_short", seven.length === 7);
const f7 = checkQp02VisualDescription({ visualDescription: seven, shotIndex: 26 });
ok("QP-02 BLOCK too_short", Boolean(f7 && f7.severity === "BLOCK" && f7.evidence?.reason === "too_short"));

const shootable = "铜镜中映出沈清漪苍白的脸，烛火摇曳";
ok("shootable passes", checkQp02VisualDescription({ visualDescription: shootable }) === null);

const exit = runDesignExitGate("SB", {
  preDesignPack: {
    shots: [{ shotIndex: 26, visualDescription: seven }],
  },
});
ok(
  "designExit DEX-QP-02 fails",
  exit.failedIds.includes("DEX-QP-02") || exit.warnings.some((w) => /DEX-QP-02|QP02:/.test(w)),
);

const bundle = {
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        visualDescription: seven,
        shotDesign: { picture: shootable },
      },
      {
        shotIndex: 2,
        visualDescription: seven,
        // no design source — must not invent
      },
      {
        shotIndex: 3,
        visualDescription: seven,
        sceneName: "沈府·祠堂",
        shotSize: "MS",
        // smart compose from scene+vd
      },
    ],
  },
} as ScriptBundle;
const salvage = healShortVisualDescriptionFromDesign(bundle);
ok("import salvage healed count", salvage.healed >= 2);
ok(
  "shot1 salvaged from picture",
  String(bundle.preDesignPack!.shots![0].visualDescription) === shootable,
);
ok(
  "shot2 not invented",
  String(bundle.preDesignPack!.shots![1].visualDescription) === seven,
);
ok("shot2 unsalvageable listed", salvage.unsalvageable.includes(2));
ok(
  "shot3 smart from scene+vd",
  String(bundle.preDesignPack!.shots![2].visualDescription).includes("沈府") &&
    String(bundle.preDesignPack!.shots![2].visualDescription).length >= min,
);

ok("envelope maps QP-02", BLOCK_TO_TRIGGER_FOR_TEST["QP-02"] === "qp02_visual_short");
ok("envelope maps DEX-QP-02", BLOCK_TO_TRIGGER_FOR_TEST["DEX-QP-02"] === "qp02_visual_short");

const routes = JSON.parse(readFileSync("data/fixtures/reverse_route_table.json", "utf8")) as {
  routes?: { trigger?: string; reverseTarget?: string }[];
};
ok(
  "reverse SB",
  (routes.routes ?? []).some((r) => r.trigger === "qp02_visual_short" && r.reverseTarget === "SB"),
);

const links = buildChatRepairDeeplinks(["QP-02"]);
ok("deeplink SB not INFRA", links[0]?.reverseTarget === "SB" && /qp02_visual_short/.test(links[0]?.deeplink ?? ""));

const chat = buildAggregatedChatRepairText(
  [
    { id: "RH-QP-02", ruleId: "QP-02", chatTemplate: "请补可拍描写" },
    { id: "RH-DC-16", ruleId: "DC-16", chatTemplate: "配角入册" },
  ],
  ["QP-02"],
);
ok("RH primary QP-02", /请补可拍描写/.test(chat));
ok("RH secondary demoted", /非本包主因|参考 RH/.test(chat));
ok("RH DC-16 not as primary noise only", chat.indexOf("请补可拍描写") < chat.indexOf("配角入册") || /参考 RH/.test(chat));

// trim guard: multi-beat long text; if trim would go below min, keep original
const longMulti =
  "沈清漪刺入。咬帕。包扎伤口露出匕首。勾起浅笑望向铜镜烛火。";
const trimmed = trimToOneBeat(longMulti);
ok(
  "trim not below minChars when original ok",
  trimmed.text.replace(/\s/g, "").length >= min || !trimmed.trimmed,
);

// autoFix refuse invent
const invented = AUTO_FIX["QP-02"]({});
ok("autoFix refuses bare invent", invented.refuseInvent === true || !invented.visualDescription);
const withDesc = AUTO_FIX["QP-02"]({ desc: shootable });
ok("autoFix accepts explicit desc", withDesc.visualDescription === shootable);

if (process.exitCode) {
  console.error("\n=== test:qp02-design-loop FAIL ===");
  process.exit(1);
}
console.log("\n=== test:qp02-design-loop OK ===");
