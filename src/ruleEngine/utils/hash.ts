import crypto from "crypto";

export function stableHash(input: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

export function extractDialogueLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^[#\s|:-]+/, "").trim())
    .filter((l) => l.length > 0 && !/^镜|^类型|^---/.test(l));
}

export function dialogueCharCount(text: string): number {
  const cleaned = text.replace(/[，。！？、；：""''（）]/g, "");
  const ellipsis = (text.match(/……/g) || []).length;
  const cn = (cleaned.match(/[\u4e00-\u9fff]/g) || []).length;
  return cn + ellipsis * 2;
}
