/**
 * Unit checks for vendor prompt touch + content policy + cref parsing.
 * Run: yarn test:prompt-touch
 */
import { parsePromptRefs, stripVendorTokens, touchPromptForVendor } from "../src/ruleEngine/compilers/vendorPromptAdapter";
import { applyContentPolicy } from "../src/ruleEngine/compilers/contentPolicyAdapter";
import { generationFeedbackPort } from "../src/ruleEngine/ports/generationFeedback";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const raw = "李似锦拥住温如瓷, 祠堂内景 --cref CHAR-LISHIJIN --ar 16:9";
  const touched = touchPromptForVendor(raw, "9:16");
  assert(!touched.vendorPrompt.includes("--cref"), "cref stripped");
  assert(!touched.vendorPrompt.includes("--ar"), "ar stripped");
  assert(touched.aspectRatio === "9:16", "project aspectRatio preferred over prompt --ar");
  assert(touched.crefs.includes("CHAR-LISHIJIN"), "cref parsed");

  const touchedNoProject = touchPromptForVendor(raw);
  assert(touchedNoProject.aspectRatio === "16:9", "prompt --ar used when no project ratio");

  const { resolveAspectRatio } = await import("../src/ruleEngine/compilers/vendorPromptAdapter");
  assert(resolveAspectRatio("16:9", "9:16") === "16:9", "resolveAspectRatio project-first");
  assert(resolveAspectRatio(undefined, "9:16") === "9:16", "resolveAspectRatio prompt fallback");

  const refs = parsePromptRefs("a --cref CHAR-A, --cref CHAR-B --sref SCENE-1");
  assert(refs.crefs.length === 2, "dual cref");

  const multiCref = parsePromptRefs("scene --cref CHAR-QINGCI CHAR-LIUSHI --ar 9:16");
  assert(multiCref.crefs.length === 2, "space-separated multi cref");
  assert(multiCref.crefs.includes("CHAR-QINGCI") && multiCref.crefs.includes("CHAR-LIUSHI"), "multi cref codes");
  assert(refs.srefs.includes("SCENE-001") || refs.srefs.includes("SCENE-1"), "sref parsed");

  const policy = applyContentPolicy("衣料渗血破损");
  assert(policy.softenedPrompt.includes("暗红破损"), "渗血 softened");
  assert(!policy.softenedPrompt.includes("渗血"), "渗血 removed");

  const feedback = await generationFeedbackPort.classifyFailure({
    modality: "image",
    shotId: "1",
    error: "Unable to generate due to content policy",
    prompt: "衣料渗血破损",
  });
  assert(feedback.category === "content_policy", "content_policy category");
  assert(Boolean(feedback.suggestedPrompt), "suggestedPrompt present");

  console.log("test:prompt-touch OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
