/**
 * yarn test:asset-code-contract
 */
import {
  ASSET_CODE_TEST_VECTORS,
  normalizeAssetCode,
  normalizeAssetCodes,
  splitCodeTokens,
} from "../src/ruleEngine/codes/assetCodeContract";
import { parsePromptRefs } from "../src/ruleEngine/compilers/vendorPromptAdapter";

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failed++;
    console.error("FAIL:", msg);
  } else {
    console.log("OK:", msg);
  }
}

for (const v of ASSET_CODE_TEST_VECTORS) {
  if (v.input.includes(",")) {
    const parts = splitCodeTokens(v.input);
    const norms = normalizeAssetCodes(parts);
    assert(norms.includes("CHAR-001") && norms.includes("CHAR-005"), `split ${v.input} → ${JSON.stringify(norms)}`);
    continue;
  }
  const got = normalizeAssetCode(v.input);
  assert(got === v.expect, `${JSON.stringify(v.input)} → ${got} expect ${v.expect}`);
}

const multi = parsePromptRefs("foo --cref CHAR-001,CHAR-005 --ar 9:16");
assert(multi.crefs.includes("CHAR-001") && multi.crefs.includes("CHAR-005"), `parse comma crefs ${JSON.stringify(multi.crefs)}`);

const spaced = parsePromptRefs("x --cref CHAR005 CHAR 002 --sref SCENE1");
assert(spaced.crefs.includes("CHAR-005") && spaced.crefs.includes("CHAR-002"), `alias crefs ${JSON.stringify(spaced.crefs)}`);
assert(spaced.srefs.includes("SCENE-001"), `alias sref ${JSON.stringify(spaced.srefs)}`);

if (failed) {
  console.error(`asset-code-contract: ${failed} failed`);
  process.exit(1);
}
console.log("asset-code-contract: all passed");
