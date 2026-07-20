/**
 * cross-release-train: FE BURN_NEXT_STEPS must match BE.
 */
import assert from "assert";
import fs from "fs";
import path from "path";
import { BURN_NEXT_STEPS } from "../src/ruleEngine/compilers/burnGateEnvelope";

const fePath = path.resolve(process.cwd(), "../../Toonflow-web/src/constants/burnNextSteps.ts");
const alt = path.resolve(process.cwd(), "../Toonflow-web/src/constants/burnNextSteps.ts");
const file = fs.existsSync(fePath) ? fePath : alt;
assert.ok(fs.existsSync(file), `FE burnNextSteps missing at ${fePath} or ${alt}`);
const text = fs.readFileSync(file, "utf8");
for (const step of BURN_NEXT_STEPS) {
  assert.ok(text.includes(`"${step}"`), `FE missing nextStep ${step}`);
}
console.log("test-fe-burn-nextstep-parity: OK");
