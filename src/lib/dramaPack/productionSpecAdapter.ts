import { DramaPack, VisualLockItem } from "./schema";

type RawRecord = Record<string, unknown>;

type ProductionCharacter = {
  name?: string;
  lockFace?: string;
  hair?: string;
  ageRange?: string;
  intensity?: Record<string, number | string>;
  wardrobe?: Record<string, string>;
};

type ProductionScene = {
  baseTemp?: number | string;
  tone?: string;
  desc?: string;
};

type ProductionProp = {
  desc?: string;
  size?: string;
  handle?: string;
};

export type ProductionSpec = {
  characterDesign?: Record<string, ProductionCharacter>;
  sceneDesign?: Record<string, ProductionScene>;
  propDesign?: Record<string, ProductionProp>;
  colorToneMapping?: Record<string, { colorTemp?: number | string; tone?: string; saturation?: number }>;
  performanceBaseline?: Record<string, string>;
  shotTypeRules?: Array<{ intensity?: number; recommended?: string[]; forbidden?: string[] }>;
  constraints?: Record<string, string>;
};

type RawShot = {
  visualId?: string;
  colorTone?: string;
  assetCodes?: string[];
};

function baseCharName(name: string): string {
  return name.split("（")[0].split("(")[0].trim();
}

function sceneNameFromDesc(code: string, desc: string): string {
  const first = desc.split(/[,，]/)[0]?.trim();
  if (first) return first;
  return code.replace(/^SCENE-/, "").replace(/_/g, " ");
}

function propNameFromDesc(desc: string): string {
  const m = desc.match(/[^,，]+/);
  return m ? m[0].trim() : "道具";
}

function buildCharacterPrompt(char: ProductionCharacter): string {
  const parts = [char.hair, char.ageRange ? `age ${char.ageRange}` : ""].filter(Boolean);
  const wardrobe = Object.values(char.wardrobe ?? {});
  if (wardrobe[0]) parts.push(wardrobe[0]);
  return parts.join(", ");
}

function buildCharacterDesc(char: ProductionCharacter): string {
  const parts = [char.hair, char.ageRange ? `年龄 ${char.ageRange}` : ""].filter(Boolean);
  if (char.intensity?.darkCircles != null) parts.push(`黑眼圈强度 ${char.intensity.darkCircles}/5`);
  return parts.join("；");
}

function buildScenePrompt(scene: ProductionScene): string {
  const parts = [scene.desc, scene.tone ? `${scene.tone} tone` : "", scene.baseTemp != null ? `color temperature ${scene.baseTemp}K` : ""];
  return parts.filter(Boolean).join(", ");
}

function buildPropPrompt(prop: ProductionProp): string {
  const parts = [prop.desc, prop.size, prop.handle ? `handle on ${prop.handle}` : ""].filter(Boolean);
  return parts.join(", ");
}

function inferStageVisualMark(stageName: string, colorTone: string | undefined, mapping: ProductionSpec["colorToneMapping"]): string {
  if (colorTone && mapping?.[colorTone]) {
    const m = mapping[colorTone];
    return [m.tone, m.colorTemp != null ? `色温 ${m.colorTemp}K` : "", m.saturation != null ? `饱和度 ${m.saturation}%` : ""]
      .filter(Boolean)
      .join("，");
  }
  return stageName;
}

function collectStagesFromStoryboard(
  charName: string,
  wardrobe: Record<string, string> | undefined,
  episodes: RawRecord[],
  colorToneMapping: ProductionSpec["colorToneMapping"],
): VisualLockItem["stages"] {
  const stageMap = new Map<string, string>();
  for (const [name, mark] of Object.entries(wardrobe ?? {})) {
    stageMap.set(name, mark);
  }

  const base = baseCharName(charName);
  for (const ep of episodes) {
    const storyboard = (ep.storyboard as RawShot[] | undefined) ?? [];
    for (const shot of storyboard) {
      const visualId = shot.visualId?.trim();
      if (!visualId?.startsWith(`${base}-`)) continue;
      const stageName = visualId.slice(base.length + 1);
      if (!stageName || stageMap.has(stageName)) continue;
      stageMap.set(stageName, inferStageVisualMark(stageName, shot.colorTone, colorToneMapping));
    }
  }

  return [...stageMap.entries()].map(([name, visualMark]) => ({ name, visualMark }));
}

function buildGlobalStyle(spec: ProductionSpec, metaTone?: string): NonNullable<DramaPack["plan"]["visualLock"]["globalStyle"]> {
  const tones = Object.values(spec.colorToneMapping ?? {})
    .map((m) => m.tone)
    .filter(Boolean);
  return {
    tone: metaTone || tones[0] || "",
    lighting: tones.join("；") || undefined,
    texture: undefined,
  };
}

/** sceneColorLock 数组 → sceneDesign 对象（不删除原字段） */
function syncSceneColorLockToSceneDesign(spec: ProductionSpec & RawRecord): void {
  const locks = spec.sceneColorLock as Array<{ scene?: string; baseTemp?: number | string; tone?: string }> | undefined;
  if (!locks?.length) return;
  const sceneDesign = (spec.sceneDesign ?? {}) as Record<string, ProductionScene>;
  for (const item of locks) {
    if (!item.scene || sceneDesign[item.scene]) continue;
    sceneDesign[item.scene] = {
      baseTemp: item.baseTemp,
      tone: item.tone,
      desc: item.tone || item.scene,
    };
  }
  spec.sceneDesign = sceneDesign;
}

export function visualLockFromProductionSpec(
  spec: ProductionSpec,
  meta?: { tone?: string },
  episodes: RawRecord[] = [],
): DramaPack["plan"]["visualLock"] {
  const characters: VisualLockItem[] = [];
  for (const [code, char] of Object.entries(spec.characterDesign ?? {})) {
    if (!char.name) continue;
    characters.push({
      code,
      name: char.name,
      lockFace: char.lockFace,
      desc: buildCharacterDesc(char),
      prompt: buildCharacterPrompt(char),
      stages: collectStagesFromStoryboard(char.name, char.wardrobe, episodes, spec.colorToneMapping),
    });
  }

  const scenes: VisualLockItem[] = [];
  for (const [code, scene] of Object.entries(spec.sceneDesign ?? {})) {
    const desc = scene.desc || "";
    scenes.push({
      code,
      name: sceneNameFromDesc(code, desc),
      desc,
      prompt: buildScenePrompt(scene),
    });
  }

  const props: VisualLockItem[] = [];
  for (const [code, prop] of Object.entries(spec.propDesign ?? {})) {
    const desc = prop.desc || "";
    props.push({
      code,
      name: propNameFromDesc(desc),
      desc: [desc, prop.size, prop.handle ? `把手${prop.handle}侧` : ""].filter(Boolean).join("，"),
      prompt: buildPropPrompt(prop),
    });
  }

  return {
    characters,
    scenes,
    props,
    globalStyle: buildGlobalStyle(spec, meta?.tone),
  };
}

function hasVisualLock(plan: unknown): boolean {
  if (!plan || typeof plan !== "object") return false;
  const lock = (plan as RawRecord).visualLock as RawRecord | undefined;
  if (!lock) return false;
  const total =
    ((lock.characters as unknown[] | undefined)?.length ?? 0) +
    ((lock.scenes as unknown[] | undefined)?.length ?? 0) +
    ((lock.props as unknown[] | undefined)?.length ?? 0);
  return total > 0;
}

export function normalizeDramaPack(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const raw = { ...(input as RawRecord) };
  const spec = raw.productionSpec as ProductionSpec | undefined;
  const episodes = (raw.episodes as RawRecord[] | undefined) ?? [];
  const meta = raw.meta as { tone?: string } | undefined;

  if (spec) {
    syncSceneColorLockToSceneDesign(spec as ProductionSpec & RawRecord);

    const existingPlan = (raw.plan as RawRecord | undefined) ?? {};
    const derivedLock = visualLockFromProductionSpec(spec, meta, episodes);
    const existingLock: DramaPack["plan"]["visualLock"] =
      (existingPlan.visualLock as DramaPack["plan"]["visualLock"] | undefined) ?? {
        characters: [],
        scenes: [],
        props: [],
      };

    raw.plan = {
      storySkeleton: existingPlan.storySkeleton ?? "",
      adaptationStrategy: existingPlan.adaptationStrategy ?? "",
      stylePosition: existingPlan.stylePosition ?? "",
      adaptationMatrix: existingPlan.adaptationMatrix ?? "",
      characterBible: existingPlan.characterBible ?? "",
      dialogueStyleAnchor: existingPlan.dialogueStyleAnchor ?? "",
      visualLock: hasVisualLock(existingPlan)
        ? existingLock
        : {
            characters: derivedLock.characters,
            scenes: derivedLock.scenes,
            props: derivedLock.props,
            globalStyle: existingLock.globalStyle ?? derivedLock.globalStyle,
          },
    };
  }

  if (!raw.plan) {
    raw.plan = {
      storySkeleton: "",
      adaptationStrategy: "",
      stylePosition: "",
      adaptationMatrix: "",
      characterBible: "",
      dialogueStyleAnchor: "",
      visualLock: { characters: [], scenes: [], props: [] },
    };
  }

  return raw;
}
