/** 视频提示词生成：mode 路由、user 载荷拼装、输出净化 */

import fs from "fs/promises";
import path from "path";
import u from "@/utils";

export type VideoPromptRoute = {
  fileName: string | null;
  modeLabel: string;
  isMultiParam: boolean;
};

const REASONING_PATTERNS = [
  /路由规则/,
  /让我们检查/,
  /通常如果未指定/,
  /匹配模式/,
  /Let's re-examine/i,
  /Wait, let's/i,
  /题目中输入/,
  /Given that assets/,
];

export function resolveVideoPromptRoute(modelData: string, mode: string): VideoPromptRoute {
  const modelLower = (modelData ?? "").toLowerCase();
  const isJsonArrayMode = typeof mode === "string" && mode.startsWith('["') && mode.endsWith('"]');

  if (modelLower.includes("wan") && modelLower.includes("2.6")) {
    return { fileName: "wan2.6Single-imageFirstFrameMode.md", modeLabel: "Wan2.6 单图首帧", isMultiParam: false };
  }
  if (/seedance.*2[.\-]0/i.test(modelLower)) {
    return { fileName: "seedance2Multi-parameterMode.md", modeLabel: "Seedance2.0 多参", isMultiParam: true };
  }
  if (mode === "startEndRequired" || mode === "endFrameOptional" || mode === "startFrameOptional") {
    return { fileName: "universalFirstAndLastFrameMode.md", modeLabel: "通用首尾帧", isMultiParam: false };
  }
  if (mode === "singleImage") {
    if (modelLower.includes("wan")) {
      return { fileName: "wan2.6Single-imageFirstFrameMode.md", modeLabel: "Wan2.6 单图首帧", isMultiParam: false };
    }
    return { fileName: "universalFirstAndLastFrameMode.md", modeLabel: "通用单图首帧", isMultiParam: false };
  }
  if (mode === "text") {
    return { fileName: "universalMulti-parameterMode.md", modeLabel: "通用多参（纯文本）", isMultiParam: true };
  }
  if (isJsonArrayMode) {
    return { fileName: "universalMulti-parameterMode.md", modeLabel: "通用多参", isMultiParam: true };
  }
  // Fallback 策略（质量模式优先）：无法从 mode 推断时，
  // 1）Wan 系列默认走单图首帧；2）其他模型默认走通用多参，避免让 LLM 自行路由。
  if (modelLower.includes("wan")) {
    return { fileName: "wan2.6Single-imageFirstFrameMode.md", modeLabel: "Wan2.6 单图首帧（fallback）", isMultiParam: false };
  }
  return { fileName: "universalMulti-parameterMode.md", modeLabel: "通用多参（fallback）", isMultiParam: true };
}

export async function loadVideoPromptSkill(
  vendorId: string,
  modelData: string,
  mode: string,
): Promise<string | undefined> {
  const modelPromptData = await u.db("o_modelPrompt").where("vendorId", vendorId).where("model", modelData).first();
  if (modelPromptData?.path) {
    try {
      const fullPath = path.join(u.getPath(["modelPrompt"]), modelPromptData.path);
      return await fs.readFile(fullPath, "utf-8");
    } catch {
      /* fall through */
    }
  }

  const route = resolveVideoPromptRoute(modelData, mode);
  if (route.fileName) {
    try {
      const fullPath = path.join(u.getPath(["modelPrompt"]), "video", route.fileName);
      return await fs.readFile(fullPath, "utf-8");
    } catch {
      /* fall through */
    }
  }

  const videoPrompt = await u.db("o_prompt").where("type", "videoPromptGeneration").first();
  if (videoPrompt?.useData) return videoPrompt.useData;
  return videoPrompt?.data ?? undefined;
}

export function buildStoryboardXml(
  items: Array<{
    videoDesc?: string | null;
    videoPrompt?: string | null;
    prompt?: string | null;
    track?: string | null;
    duration?: string | null;
    associateAssetsIds?: number[];
    shouldGenerateImage?: boolean | number | null;
  }>,
): string {
  return items
    .map(
      (i) => `<storyboardItem
  videoDesc='${String(i.videoDesc ?? "").replace(/'/g, "&#39;")}'
  videoPrompt='${String(i.videoPrompt ?? "").replace(/'/g, "&#39;")}'
  duration='${i.duration ?? ""}'
  track='${i.track ?? ""}'
  associateAssetsIds='${(i.associateAssetsIds ?? []).join(",")}'
  shouldGenerateImage='${i.shouldGenerateImage ? "true" : "false"}'
></storyboardItem>`,
    )
    .join("\n");
}

export function buildVideoPromptUserContent(opts: {
  modelData: string;
  mode: string;
  modeLabel: string;
  isMultiParam: boolean;
  assetsBlock: string;
  storyboardXml: string;
  dialogueBlock?: string;
  refSlotsBlock?: string;
  episodeDirectorBlock?: string;
  keyPromptsBlock?: string;
}): string {
  const dialogueSection = opts.dialogueBlock?.trim()
    ? `\n**台词**（保持台词原始语言，严禁翻译；仅标注 (dialogue)/(inner monologue, OS)/(voiceover, VO)）：\n${opts.dialogueBlock}\n`
    : "";
  const refSection = opts.refSlotsBlock?.trim()
    ? `\n**参考图槽位**（@图N 必须严格对应以下 slot，禁止自行编号）：\n${opts.refSlotsBlock}\n`
    : "";
  const directorSection = opts.episodeDirectorBlock?.trim() ? `\n**本集导演意图**：\n${opts.episodeDirectorBlock}\n` : "";
  const keyPromptSection = opts.keyPromptsBlock?.trim() ? `\n**关键场景提示**：\n${opts.keyPromptsBlock}\n` : "";
  return `**模型名称**：${opts.modelData}
**模式**：${opts.modeLabel}
**多参**：${opts.isMultiParam ? "是" : "否"}
**原始 mode 参数**：${opts.mode}
${directorSection}${keyPromptSection}${dialogueSection}${refSection}
**关联资产**（含性别与描述）:
${opts.assetsBlock}

**分镜信息**：
${opts.storyboardXml}`;
}

export type DialogueLine = {
  index: number;
  text: string;
  type: "dialogue" | "OS" | "VO" | "none";
  speaker?: string;
};

export function classifyDialogueType(text: string): DialogueLine["type"] {
  if (!text?.trim() || text === "—" || text === "无台词") return "none";
  if (/独白|OS|内心|画外/.test(text)) return "OS";
  if (/VO|旁白/.test(text)) return "VO";
  return "dialogue";
}

export function extractDialogueFromVideoDesc(videoDesc: string): { text: string; type: DialogueLine["type"] } | null {
  if (!videoDesc?.trim()) return null;
  const parts = videoDesc.replace(/^（|）$/g, "").split("、");
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed || trimmed === "无台词") continue;
    if (/独白|OS|内心|画外|VO|台词|说：|道：|：/.test(trimmed) || /[「」""]/.test(trimmed)) {
      const type = classifyDialogueType(trimmed);
      if (type !== "none") return { text: trimmed, type };
    }
    if (trimmed.length >= 4 && trimmed.length <= 80 && /[\u4e00-\u9fa5]/.test(trimmed)) {
      if (!/秒|景|镜|运镜|rule:|L6:|persona:/.test(trimmed)) {
        return { text: trimmed, type: classifyDialogueType(trimmed) };
      }
    }
  }
  return null;
}

export function buildDialogueXml(
  boards: Array<{ index?: number; videoDesc?: string | null; shotMeta?: string | null }>,
): string {
  const lines: DialogueLine[] = [];
  boards.forEach((b, i) => {
    let dialogueText = "";
    try {
      if (b.shotMeta) {
        const meta = JSON.parse(b.shotMeta);
        if (meta.dialogue?.trim()) dialogueText = meta.dialogue.trim();
      }
    } catch {
      /* ignore */
    }
    const fromDesc = extractDialogueFromVideoDesc(b.videoDesc || "");
    const text = dialogueText || fromDesc?.text || "";
    if (!text || text === "无台词") return;
    lines.push({
      index: b.index ?? i,
      text,
      type: fromDesc?.type ?? classifyDialogueType(text),
    });
  });
  if (!lines.length) return "";
  return lines
    .map(
      (l) =>
        `<dialogue index="${l.index}" type="${l.type}">${l.text.replace(/</g, "&lt;")}</dialogue>`,
    )
    .join("\n");
}

export function detectChineseDialogueInEnglishPrompt(prompt: string, isEnglishMode: boolean): boolean {
  if (!isEnglishMode || !prompt?.trim()) return false;
  const chineseDialogue = /[「「""][\u4e00-\u9fa5，。！？、]{2,}/.test(prompt);
  const hasEnglishMarker = /\(dialogue\)|\(inner monologue|\(OS\)|\(VO\)/i.test(prompt);
  return chineseDialogue && !hasEnglishMarker;
}

export function sanitizeVideoPromptOutput(text: string): string {
  let result = text.trim().replace(/^```[\w]*\n?/m, "").replace(/\n?```$/m, "").trim();

  const blockMarkers = [/\[References\]/i, /\[Instruction\]/i, /\[Visual\]/i, /^Based on the storyboard/im, /^画面风格和类型:/m];
  for (const marker of blockMarkers) {
    const match = result.match(marker);
    if (match?.index != null && match.index > 0) {
      const preamble = result.slice(0, match.index);
      if (REASONING_PATTERNS.some((p) => p.test(preamble))) {
        result = result.slice(match.index).trim();
        break;
      }
    }
  }

  if (REASONING_PATTERNS.some((p) => p.test(result.slice(0, 200)))) {
    for (const marker of blockMarkers) {
      const idx = result.search(marker);
      if (idx > 0) {
        result = result.slice(idx).trim();
        break;
      }
    }
  }

  return result;
}

/** 当 fallback skill 输出仍然包含明显路由/说明性文本时，尝试裁剪到第一个有效块，避免把路由推理写入 track.prompt。 */
export function hardTrimReasoningIfNeeded(text: string): string {
  if (!detectVideoPromptReasoningLeak(text)) return text;
  const markers = [/\[References\]/i, /\[Instruction\]/i, /\[Visual\]/i, /^Based on the storyboard/im];
  for (const marker of markers) {
    const idx = text.search(marker);
    if (idx > 0) {
      return text.slice(idx).trim();
    }
  }
  return text;
}

export function dialogueBlockHasChinese(dialogueBlock: string): boolean {
  return /[\u4e00-\u9fa5]/.test(dialogueBlock);
}

/** 输入含中文台词但输出被翻成纯英文对白 */
export function detectDialogueTranslationLeak(prompt: string, dialogueBlock: string): boolean {
  if (!dialogueBlock?.trim() || !dialogueWasChinese(dialogueBlock)) return false;
  const instr = prompt.match(/\[Instruction\]([\s\S]*?)(?:\[Visual\]|$)/i)?.[1] ?? prompt;
  const hasChineseInOutput = /[\u4e00-\u9fa5]{2,}/.test(instr);
  if (hasChineseInOutput) return false;
  const hasEnglishDialogue = /\(dialogue\)|\(inner monologue|\(OS\)|\(VO\)|said:|whispers:/i.test(instr);
  return hasEnglishDialogue || /[「""][A-Za-z]/.test(instr);
}

function dialogueWasChinese(dialogueBlock: string): boolean {
  return /[\u4e00-\u9fa5]/.test(dialogueBlock);
}

export type VideoPromptGenInput = {
  vendorId: string;
  modelData: string;
  mode: string;
  artStyle: string;
  assetsBlock: string;
  storyboardXml: string;
  dialogueBlock?: string;
  refSlotsBlock?: string;
  episodeDirectorBlock?: string;
  keyPromptsBlock?: string;
};

export async function invokeVideoPromptGeneration(input: VideoPromptGenInput): Promise<string> {
  const route = resolveVideoPromptRoute(input.modelData, input.mode);
  const systemPrompt = await loadVideoPromptSkill(input.vendorId, input.modelData, input.mode);
  if (!systemPrompt) throw new Error("未配置视频提示词 skill");

  const visualManual = u.getArtPrompt(input.artStyle, "art_skills", "art_storyboard_video") || "";
  const content = buildVideoPromptUserContent({
    modelData: input.modelData,
    mode: input.mode,
    modeLabel: route.modeLabel,
    isMultiParam: route.isMultiParam,
    assetsBlock: input.assetsBlock,
    storyboardXml: input.storyboardXml,
    dialogueBlock: input.dialogueBlock,
    refSlotsBlock: input.refSlotsBlock,
    episodeDirectorBlock: input.episodeDirectorBlock,
    keyPromptsBlock: input.keyPromptsBlock,
  });

  const messages = [
    { role: "assistant" as const, content: visualManual },
    { role: "user" as const, content },
  ];

  let lastText = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryHint =
      attempt > 0
        ? "\n\n【重试】上次输出将中文台词翻译成了英文。请严格保持 dialogue XML 中的原始中文台词，仅追加 (dialogue)/(OS)/(VO) 标注。"
        : "";
    const { text } = await u.Ai.Text("universalAi").invoke({
      system: systemPrompt,
      messages: [{ ...messages[0] }, { role: "user", content: content + retryHint }],
    });
    lastText = hardTrimReasoningIfNeeded(sanitizeVideoPromptOutput(text));
    if (!input.dialogueBlock || !detectDialogueTranslationLeak(lastText, input.dialogueBlock)) {
      return lastText;
    }
  }
  // 二次重试后仍侦测到翻译泄漏时，强制附加原始 dialogueBlock，确保最终提示词中保留未被模型改写的台词文本。
  if (input.dialogueBlock?.trim()) {
    const safeAppend = `\n\n[Dialogue]\n${input.dialogueBlock.trim()}`;
    return `${lastText}\n${safeAppend}`.trim();
  }
  return lastText;
}

export function detectVideoPromptReasoningLeak(prompt: string): boolean {
  if (!prompt?.trim()) return false;
  const head = prompt.slice(0, 400);
  if (REASONING_PATTERNS.some((p) => p.test(head))) return true;
  const hasValidBlock = /\[References\]|\[Instruction\]|\[Visual\]|Based on the storyboard/i.test(prompt);
  const hasReasoning = /步骤[:：]|解析资产|Asset \d|@图\d.*编号/i.test(head);
  return hasReasoning && !hasValidBlock;
}
