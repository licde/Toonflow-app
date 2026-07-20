import fs from "fs";
import path from "path";
import {
  buildStoryboardItemXml,
  preflightGenerationMedia,
  resolveGenerationModeRules,
} from "../../compilers/resolveGenerationModeRules";
import { classifyGenerationFailure } from "../generationFailureHelper";
import { buildRePushPlan } from "../../design/reverseRouteEngine";
import { generationJobQueue } from "../../ports/jobQueue";
import { RuntimeGapCollector } from "../runtimeGapRegistry";
import { resolveGeneratePrompt } from "../../compilers/resolveGeneratePrompt";

const MODE_GOLDENS: {
  modality: "image" | "video";
  mode: string;
  modelName?: string;
  expectTemplateIncludes: string;
  expectMinRefs: number;
  expectMaxRefs: number;
}[] = [
  { modality: "image", mode: "text", expectTemplateIncludes: "image/universalTextMode.md", expectMinRefs: 0, expectMaxRefs: 0 },
  { modality: "image", mode: "singleImage", expectTemplateIncludes: "image/universalSingleImageMode.md", expectMinRefs: 1, expectMaxRefs: 1 },
  { modality: "image", mode: "multiReference", expectTemplateIncludes: "image/universalMultiReferenceMode.md", expectMinRefs: 2, expectMaxRefs: 8 },
  { modality: "video", mode: "text", expectTemplateIncludes: "video/universalTextMode.md", expectMinRefs: 0, expectMaxRefs: 99 },
  { modality: "video", mode: "singleImage", expectTemplateIncludes: "video/universalSingleImageMode.md", expectMinRefs: 1, expectMaxRefs: 1 },
  { modality: "video", mode: "startEndRequired", expectTemplateIncludes: "universalFirstAndLastFrameMode.md", expectMinRefs: 2, expectMaxRefs: 2 },
  { modality: "video", mode: "endFrameOptional", expectTemplateIncludes: "universalFirstAndLastFrameMode.md", expectMinRefs: 1, expectMaxRefs: 2 },
  { modality: "video", mode: "startFrameOptional", expectTemplateIncludes: "universalFirstAndLastFrameMode.md", expectMinRefs: 1, expectMaxRefs: 2 },
  {
    modality: "video",
    mode: '["imageReference:2","videoReference:1"]',
    expectTemplateIncludes: "universalMulti-parameterMode.md",
    expectMinRefs: 3,
    expectMaxRefs: 3,
  },
];

/** Dimension M (+ Q/R/D′ gates that are pure). */
export async function runModeMatrix(gaps: RuntimeGapCollector): Promise<void> {
  const templates = new Set<string>();

  for (const g of MODE_GOLDENS) {
    const rules = resolveGenerationModeRules({
      modality: g.modality,
      mode: g.mode,
      modelName: g.modelName ?? "agnes-image-2.1-flash",
    });
    templates.add(rules.templatePath);
    const frag = g.expectTemplateIncludes.replace(/^.*\//, "");
    if (!rules.templatePath.endsWith(frag) && !rules.templatePath.includes(frag.replace(".md", ""))) {
      gaps.push("M", "MODE-TEMPLATE", `${g.modality}/${g.mode} → ${rules.templatePath} 未含 ${g.expectTemplateIncludes}`);
    }
    if (rules.mediaContract.minRefs !== g.expectMinRefs) {
      gaps.push("M", "MODE-MEDIA", `${g.modality}/${g.mode} minRefs=${rules.mediaContract.minRefs} expect ${g.expectMinRefs}`);
    }
    if (rules.mediaContract.maxRefs !== g.expectMaxRefs) {
      gaps.push("M", "MODE-MEDIA", `${g.modality}/${g.mode} maxRefs=${rules.mediaContract.maxRefs} expect ${g.expectMaxRefs}`);
    }

    // wrong ref count → preflight fail
    if (g.expectMinRefs > 0) {
      const bad = preflightGenerationMedia({
        rules,
        referenceCount: Math.max(0, g.expectMinRefs - 1),
        hasStoryboardContext: true,
        hasAssetContext: true,
      });
      if (bad.ok) {
        gaps.push("M", "MODE-PREFLIGHT", `${g.modality}/${g.mode} 缺 media 应失败`);
      }
    }

    // template file exists
    const full = path.join(process.cwd(), "data/modelPrompt", rules.templatePath);
    if (!fs.existsSync(full)) {
      gaps.push("M", "MODE-TEMPLATE", `模板文件不存在: ${rules.templatePath}`);
    }
  }

  const imgText = resolveGenerationModeRules({ modality: "image", mode: "text" }).templatePath;
  const imgSingle = resolveGenerationModeRules({ modality: "image", mode: "singleImage" }).templatePath;
  const imgMulti = resolveGenerationModeRules({ modality: "image", mode: "multiReference" }).templatePath;
  if (imgText === imgSingle || imgSingle === imgMulti || imgText === imgMulti) {
    gaps.push("M", "MODE-TEMPLATE", "图像三模式 templatePath 必须互不相同");
  }
  const vidText = resolveGenerationModeRules({ modality: "video", mode: "text" }).templatePath;
  const vidSingle = resolveGenerationModeRules({ modality: "video", mode: "singleImage" }).templatePath;
  if (vidText === vidSingle) {
    gaps.push("M", "MODE-TEMPLATE", "视频 text 与 singleImage templatePath 必须不同");
  }

  // storyboardItem full fields
  const xml = buildStoryboardItemXml({
    videoDesc: "desc",
    prompt: "p",
    track: 1,
    duration: 3,
    associateAssetsIds: [1, 2],
    shouldGenerateImage: true,
  });
  for (const key of ["videoDesc", "prompt", "track", "duration", "associateAssetsIds", "shouldGenerateImage"]) {
    if (!xml.includes(key)) gaps.push("M", "PROMPT-SB-ITEM-THIN", `XML 缺 ${key}`);
  }

  // Q: local job queue never emits queue full
  try {
    await generationJobQueue.enqueue({
      id: "q-test-1",
      shotId: "shot-1",
      modality: "image",
      priority: 0,
    });
  } catch (e: any) {
    if (/queue is full/i.test(String(e?.message))) {
      gaps.push("Q", "GEN-QUEUE-LOCAL", "本地 jobQueue 不应抛 queue is full");
    }
  }

  const qFb = await classifyGenerationFailure({
    modality: "image",
    shotId: "1",
    error: "Image queue is full, please retry later",
    prompt: "keep me",
  });
  if (qFb.category !== "vendor_passthrough") {
    gaps.push("Q", "GEN-QUEUE-CLASSIFY", `queue full 应分类为 vendor_passthrough got=${qFb.category}`);
  }
  if (qFb.suggestedPrompt) {
    gaps.push("Q", "GEN-QUEUE-CLASSIFY", "vendor_passthrough 不应改写 prompt");
  }
  const qPlan = buildRePushPlan(["vendor_passthrough"]);
  if (qPlan[0]?.reverseTarget && qPlan[0].reverseTarget !== "INFRA") {
    gaps.push("R", "RV-VENDOR-PASS", `vendor_passthrough reverseTarget=${qPlan[0].reverseTarget}`);
  }

  // R: new reverse triggers
  for (const [trigger, target] of [
    ["mode_rules_mismatch", "MD"],
    ["prompt_gen_media_missing", "AS"],
    ["derive_parent_ref_missing", "AS"],
    ["image_mode_ref_mismatch", "EN"],
  ] as const) {
    const plan = buildRePushPlan([trigger]);
    if (plan[0]?.reverseTarget !== target) {
      gaps.push("R", "RV-MODE", `${trigger} → ${plan[0]?.reverseTarget} expect ${target}`);
    }
  }

  // D′ BundleGate — prefer deployed web; if stale, also accept Toonflow-web source as wired
  const webDirs = ["data/web_new/assets", "data/web/assets"].map((p) => path.join(process.cwd(), p));
  let hasResolve = false;
  for (const dir of webDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) {
      const txt = fs.readFileSync(path.join(dir, f), "utf-8");
      if (txt.includes("resolveGeneratePrompt")) hasResolve = true;
    }
  }
  const webSrc = path.join(process.cwd(), "../Toonflow-web/src/utils/resolveGeneratePrompt.ts");
  const webSrcAlt = path.join(process.cwd(), "../../Toonflow-web/src/utils/resolveGeneratePrompt.ts");
  const srcHas =
    (fs.existsSync(webSrc) && fs.readFileSync(webSrc, "utf-8").includes("resolveGeneratePrompt")) ||
    (fs.existsSync(webSrcAlt) && fs.readFileSync(webSrcAlt, "utf-8").includes("resolveGeneratePrompt"));
  if (!hasResolve && !srcHas) {
    gaps.push("D", "FE-BUNDLE-PROMPT", "部署包与 Toonflow-web 均缺少 resolveGeneratePrompt，请 yarn build:integrate");
  }
  if (resolveGeneratePrompt({ isTrusted: true }, "kept") !== "kept") {
    gaps.push("D", "FE-PROMPT-EVENT", "resolveGeneratePrompt 回归失败");
  }
}
