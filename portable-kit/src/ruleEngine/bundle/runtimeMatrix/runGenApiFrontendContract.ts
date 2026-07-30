import { z } from "zod";
import { resolveGeneratePrompt } from "../../compilers/resolveGeneratePrompt";
import { parsePromptRefs } from "../../compilers/vendorPromptAdapter";
import { RuntimeGapCollector } from "../runtimeGapRegistry";

/** Dimension C + D: API schema + FE prompt helpers (no live HTTP required). */
export function runGenApiAndFrontendContracts(gaps: RuntimeGapCollector): void {
  const generateFlowImageBody = z.object({
    model: z.string(),
    references: z.array(z.string()).optional(),
    quality: z.string(),
    ratio: z.string(),
    prompt: z.string(),
    projectId: z.number(),
    storyboardId: z.number().optional(),
  });

  const bad = generateFlowImageBody.safeParse({
    model: "agnesai:agnes-image-2.1-flash",
    quality: "1K",
    ratio: "9:16",
    prompt: { isTrusted: true, _vts: 1 },
    projectId: 1,
  });
  if (bad.success) {
    gaps.push("C", "API-PROMPT-TYPE", "Event-shaped prompt 不应通过 schema");
  }

  const good = generateFlowImageBody.safeParse({
    model: "agnesai:agnes-image-2.1-flash",
    quality: "1K",
    ratio: "9:16",
    prompt: "清瓷跪于祠堂 --cref CHAR-QINGCI CHAR-LIUSHI --ar 9:16",
    projectId: 1,
    references: ["http://localhost/oss/x.jpg"],
  });
  if (!good.success) {
    gaps.push("C", "API-PROMPT-TYPE", `合法 string prompt 未通过: ${good.error.message}`);
  }

  const eventLike = { isTrusted: true, _vts: Date.now() };
  const recovered = resolveGeneratePrompt(eventLike, "真实提示词");
  if (recovered !== "真实提示词") {
    gaps.push("D", "FE-PROMPT-EVENT", `Event 未回退到 data.prompt got=${JSON.stringify(recovered)}`);
  }
  if (resolveGeneratePrompt("override", "base") !== "override") {
    gaps.push("D", "FE-PROMPT-EVENT", "string override 未优先");
  }

  const refs = parsePromptRefs("x --cref CHAR-QINGCI CHAR-LIUSHI --ar 9:16");
  if (refs.crefs.length !== 2) {
    gaps.push("D", "FE-CREF-FALSE", `前端同源多 cref 解析失败 ${refs.crefs.join(",")}`);
  }
}
