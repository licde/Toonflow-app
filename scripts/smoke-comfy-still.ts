/**
 * Manual / CI-opt-in Comfy gold sample for contact_softenv_v1b.
 * Requires: Comfy Desktop on COMFY_URL (default http://127.0.0.1:8000), weights present.
 * yarn tsx scripts/smoke-comfy-still.ts
 */
import { checkComfyHealth, runComfyContactSoftEnv } from "../src/ruleEngine/actuators/comfyStillActuator";

const tinyJpeg =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z";

async function main() {
  process.env.COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8000";
  // CPU Desktop often needs 30–45+ min for contact_softenv_v1b
  process.env.COMFY_TIMEOUT_MS = process.env.COMFY_TIMEOUT_MS || "3600000";
  const health = await checkComfyHealth(5000);
  console.log("health", health);
  if (!health.ok) process.exit(2);
  const out = await runComfyContactSoftEnv({
    identityBase64: tinyJpeg,
    softEnvBase64: tinyJpeg,
    propSoftBase64: tinyJpeg,
    positive: "cheek contact thin paper soft interior upper body, soft candlelight",
    negative: "grey studio, white seamless, holding card, collage, denim",
    objectiveClass: "contact_geom",
    propClassId: "paper_doc",
  });
  console.log(
    JSON.stringify(
      {
        ok: out.ok,
        actuatorId: out.actuatorId,
        reason: "reason" in out ? out.reason : undefined,
        workflowHash: "workflowHash" in out ? out.workflowHash : undefined,
        ms: out.ms,
        pixels: out.ok ? out.imageBase64.length : 0,
      },
      null,
      2,
    ),
  );
  process.exit(out.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
