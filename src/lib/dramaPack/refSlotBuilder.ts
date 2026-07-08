/**

 * 视频工作台 Reference Registry：统一 @图N 编号与 resolvedSrc

 */



import u from "@/utils";

import { parseLockCode } from "./schema";

import { detectAssetTier } from "./assetTierUtils";



export type RefMediaSource = "assets" | "storyboard";



export type RefMediaInput = {

  id?: number;

  sources?: RefMediaSource | string;

  src?: string;

  fallbackAssetSrc?: string;

  fileType?: "image" | "video" | "audio" | string;

  name?: string;

  type?: string;

  index?: number;

  remark?: string;

};



export type RefSlot = {

  slot: number;

  source: RefMediaSource;

  id: number;

  lockCode?: string;

  label: string;

  resolvedSrc: string;

  fileType: "image" | "video" | "audio";

  tier?: "t0" | "t1" | "scene" | "prop";

};



export function resolveMediaSrc(item: RefMediaInput): string {
  // 参考条带的真实引用应优先使用本体 src。
  // storyboard 的 fallbackAssetSrc 仅用于兜底展示，不作为正式引用源，避免“分镜图被资产图替代”造成引用漂移。
  if (item.sources === "storyboard") {
    return (item.src || "").trim();
  }
  return (item.src || item.fallbackAssetSrc || "").trim();

}



function mediaPriority(item: RefMediaInput): number {

  const src = resolveMediaSrc(item);

  if (!src) return 2;

  if (item.sources === "assets" || item.type === "role" || item.type === "scene" || item.type === "tool") {

    return item.sources === "assets" ? 0 : 1;

  }

  if (item.sources === "storyboard") return 1;

  return 0;

}



function inferSource(item: RefMediaInput): RefMediaSource {

  if (item.sources === "assets" || item.sources === "storyboard") return item.sources;

  if (item.type === "role" || item.type === "scene" || item.type === "tool") return "assets";

  return "storyboard";

}



function inferLabel(item: RefMediaInput): string {

  if (item.name) return item.name;

  if (item.sources === "storyboard" || item.index != null) {

    return `分镜${item.index ?? item.id ?? "?"}`;

  }

  const code = parseLockCode(item.remark ?? "");

  return code || `资产${item.id ?? "?"}`;

}



function inferTier(item: RefMediaInput): RefSlot["tier"] {

  const tier = detectAssetTier(item.remark, null);

  if (item.type === "scene") return "scene";

  if (item.type === "tool") return "prop";

  if (tier === "t1_wardrobe") return "t1";

  if (tier === "t0_base") return "t0";

  return undefined;

}



export function sortMediasForRef(medias: RefMediaInput[]): RefMediaInput[] {

  const seen = new Set<string>();

  const deduped: RefMediaInput[] = [];

  for (const m of medias) {

    if (m.id == null) continue;

    const key = `${inferSource(m)}:${m.id}`;

    if (seen.has(key)) continue;

    seen.add(key);

    deduped.push(m);

  }

  return [...deduped].sort((a, b) => mediaPriority(a) - mediaPriority(b));

}



export function enrichMediasWithResolved(medias: RefMediaInput[]): Array<RefMediaInput & { resolvedSrc: string; label: string; lockCode?: string }> {

  return sortMediasForRef(medias).map((m) => ({

    ...m,

    sources: inferSource(m),

    resolvedSrc: resolveMediaSrc(m),

    label: inferLabel(m),

    lockCode: parseLockCode(m.remark ?? "") ?? undefined,

  }));

}



export function buildRefSlots(medias: RefMediaInput[]): RefSlot[] {

  const enriched = enrichMediasWithResolved(medias);

  const slots: RefSlot[] = [];

  let slotNum = 0;

  for (const m of enriched) {

    const resolvedSrc = m.resolvedSrc;

    if (!resolvedSrc) continue;

    const fileType = (m.fileType === "video" || m.fileType === "audio" ? m.fileType : "image") as RefSlot["fileType"];

    if (fileType !== "image") continue;

    slotNum++;

    slots.push({

      slot: slotNum,

      source: inferSource(m),

      id: m.id!,

      lockCode: m.lockCode,

      label: m.label,

      resolvedSrc,

      fileType,

      tier: inferTier(m),

    });

  }

  return slots;

}



export function refSlotsToUploadInfo(slots: RefSlot[]): Array<{ id: number; sources: RefMediaSource }> {

  return slots.map((s) => ({ id: s.id, sources: s.source }));

}



export function refSlotsToReferences(slots: RefSlot[]): Array<{ type: "image"; src: string; label: string; lockCode?: string }> {

  return slots.map((s) => ({ type: "image" as const, src: s.resolvedSrc, label: s.label, lockCode: s.lockCode }));

}



export function findOrphanRefIndices(prompt: string, slotCount: number): number[] {

  const orphans: number[] = [];

  const regex = /@(?:图|图片)(\d+)/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(prompt)) !== null) {

    const n = Number(match[1]);

    if (n < 1 || n > slotCount) orphans.push(n);

  }

  return [...new Set(orphans)];

}



export function formatStableRef(lockCode: string): string {

  return `@资产:${lockCode}`;

}



export function buildReferencesBlock(slots: RefSlot[]): string {

  if (!slots.length) return "";

  const lines = slots.map((s) => {

    const stable = s.lockCode ? ` ${formatStableRef(s.lockCode)}` : "";

    return `@图${s.slot}:${stable} [${s.label}]`;

  });

  return `[References]\n${lines.join("\n")}`;

}



export function buildPromptHint(slots: RefSlot[]): string {

  if (!slots.length) return "";

  return `参考条带已就绪（${slots.length} 张图）。点击「生成提示词」将写入 @图N 引用。${slots.map((s) => `@图${s.slot}=${s.label}`).join("；")}`;

}



export function findOrphanStableRefs(prompt: string, slots: RefSlot[]): string[] {

  const known = new Set(slots.filter((s) => s.lockCode).map((s) => s.lockCode!));

  const orphans: string[] = [];

  const regex = /@资产:([A-Za-z0-9_-]+(?::[\u4e00-\u9fa5A-Za-z0-9_-]+)?)/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(prompt)) !== null) {

    if (!known.has(match[1])) orphans.push(match[1]);

  }

  return [...new Set(orphans)];

}



export function findAllOrphanRefs(prompt: string, slotCount: number, slots: RefSlot[]): string[] {

  const orphans = findOrphanRefIndices(prompt, slotCount).map((n) => `@图${n}`);

  return [...orphans, ...findOrphanStableRefs(prompt, slots)];

}



export async function loadTrackRefSlots(trackId: number): Promise<RefSlot[]> {

  const track = await u.db("o_videoTrack").where("id", trackId).select("medias").first();

  if (!track?.medias) return [];

  try {

    const medias = JSON.parse(track.medias as string) as RefMediaInput[];

    if (!Array.isArray(medias)) return [];

    return buildRefSlots(enrichMediasWithResolved(medias));

  } catch {

    return [];

  }

}



export function buildRefSlotsXml(slots: RefSlot[]): string {

  if (!slots.length) return "";

  return slots

    .map(

      (s) =>

        `<ref slot="${s.slot}" source="${s.source}" id="${s.id}" label="${s.label.replace(/"/g, "'")}"${s.lockCode ? ` lockCode="${s.lockCode}"` : ""} stableRef="${s.lockCode ? formatStableRef(s.lockCode) : ""}" />`,

    )

    .join("\n");

}


