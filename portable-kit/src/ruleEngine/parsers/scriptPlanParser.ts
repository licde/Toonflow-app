import type { EpisodeBeat } from "../types";

/** scriptPlan Markdown → EpisodeBeat（GB 阶段） */
export function parseScriptPlan(scriptPlan: string): EpisodeBeat {
  const emotionCurve: number[] = [];
  const scenes: { name: string; transition?: string }[] = [];
  const recapSlots: number[] = [];
  const previewSlots: number[] = [];

  const lines = scriptPlan.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const emoMatch = line.match(/情绪[：:]?\s*(\d+)/);
    if (emoMatch) emotionCurve.push(parseInt(emoMatch[1], 10));

    const sceneMatch = line.match(/第?[一二三四五六七八九十\d]+场[：:]?\s*(.+)/);
    if (sceneMatch) scenes.push({ name: sceneMatch[1].trim() });

    if (/前情|回顾|recap/i.test(line)) recapSlots.push(1, 2);
    if (/预告|preview/i.test(line)) previewSlots.push(-2, -1);
  }

  if (!emotionCurve.length) emotionCurve.push(3, 4, 5, 4, 3);

  return {
    emotionCurve,
    markers: { recapSlots, previewSlots },
    scenes,
  };
}
