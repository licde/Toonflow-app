import { generationFeedbackPort } from "../ports/generationFeedback";
import type { GenerationFeedbackInput, GenerationFeedbackResult } from "../ports/index";
import { applyContentPolicy, isContentPolicyError } from "../compilers/contentPolicyAdapter";
import { stripVendorTokens } from "../compilers/vendorPromptAdapter";

export type GenerationFailureFeedback = GenerationFeedbackResult;

export async function classifyGenerationFailure(
  input: GenerationFeedbackInput & { prompt?: string },
): Promise<GenerationFailureFeedback> {
  const classified = await generationFeedbackPort.classifyFailure(input);
  let suggestedPrompt: string | undefined;
  let category = classified.category;
  let contentPolicyWarnings: string[] | undefined;

  if (input.prompt && isContentPolicyError(input.error)) {
    category = "content_policy";
    const policy = applyContentPolicy(stripVendorTokens(input.prompt));
    if (policy.replacements.length) {
      suggestedPrompt = policy.softenedPrompt;
      contentPolicyWarnings = policy.warnings;
    }
  } else if (/首位帧|first.?frame|reference.?image|singleImage/i.test(input.error)) {
    category = category ?? "missing_reference";
  } else if (/service\s*busy|rate\s*limit|too many requests|429|503|queue\s*full/i.test(input.error)) {
    category = "vendor_busy";
  }

  return {
    ...classified,
    category,
    suggestedPrompt: suggestedPrompt ?? classified.suggestedPrompt,
    contentPolicyWarnings: contentPolicyWarnings ?? classified.contentPolicyWarnings,
  };
}

export async function runWithGenerationRetry<T>(
  run: (prompt: string) => Promise<T>,
  prompt: string,
  input: Omit<GenerationFeedbackInput, "error"> & { prompt?: string },
): Promise<{ result: T; promptUsed: string; feedback?: GenerationFailureFeedback }> {
  try {
    const result = await run(prompt);
    return { result, promptUsed: prompt };
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    const feedback = await classifyGenerationFailure({ ...input, error: errMsg, prompt });
    if (feedback.suggestedPrompt && feedback.suggestedPrompt !== prompt) {
      try {
        const result = await run(feedback.suggestedPrompt);
        return {
          result,
          promptUsed: feedback.suggestedPrompt,
          feedback: { ...feedback, category: "content_policy_retry" },
        };
      } catch {
        throw Object.assign(new Error(errMsg), { feedback });
      }
    }
    throw Object.assign(new Error(errMsg), { feedback });
  }
}
