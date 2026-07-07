#!/usr/bin/env tsx
/**
 * 一次性补丁：my-pack.json 补齐 videoPrompt、同步 characterAssets、修正雪辞镜、连续性烘焙
 */
import fs from "fs";
import path from "path";

const PACK_PATH = path.resolve(__dirname, "../my-pack.json");

const VIDEO_PROMPTS: string[] = [
  "Slow tilt down from glass curtain wall to empty office cubicles, morning dust particles in golden sunlight",
  "Slow zoom in on face, yawn with eyes watering slightly, blink once, subtle mouse hand movement",
  "Holographic blue panel pops up from screen, red text appearing letter by letter, soft electronic glow",
  "Static hold, fingers clicking mouse rapidly, eyes tracking popup dismiss, indifferent micro-expressions",
  "Alert panel pulses with red bold text expanding, glowing border intensifying at 1.5s intervals",
  "Slow motion shock, pupils dilate gradually, mouth opens slowly, blue screen light washes face",
  "Deep breath, stands half-up from chair, picks up coffee mug with right hand, scans colleagues left to right",
  "Hesitation outside tea room door, body sways slightly, gripping mug tighter, pushes door handle",
  "Hand trembles on metal door handle, subtle reflections, fingers tighten, door begins to open",
  "Woman turns head from water cooler, cold gaze shifts toward door, water flow stops",
  "Nervous twitch at mouth corner, eyes dart away and back, shallow rapid breathing",
  "Walks unsteady toward her, coffee ripples in mug, shallow hesitant steps",
  "Cold scan from head to toe, sets down paper cup, arms cross over chest",
  "Stammering lips, tense shoulders, grips coffee cup white-knuckled, voice tight",
  "Raises one eyebrow slightly, minimal head tilt, waiting patiently",
  "Slow motion coffee spill, liquid arcs mid-air onto pants, shock on face, words cut off mid-sentence",
  "Looks down at wet pants, despair spreads across face, long exhale, empty mug drops to side",
  "Calmly wipes sleeve with tissue twice, indifferent expression unchanged",
  "Looks up with last trace of hope, lips part slightly, breath held waiting",
  "Walks past without turning head, delivers line over shoulder, steady heel steps fading",
  "Frozen in place, unfocused stare, slight lip tremble, heartbeat pause then resume",
  "Countdown numbers pulse on holographic panel, red border flashes each second",
  "Colleagues peek over cubicles, phones buzz repeatedly, protagonist slumps deeper at desk",
  "Face buries into desk, hands cross on head, shoulders drop in defeat",
  "Dissolve from building exterior at night to empty CEO office, color shift from blue to purple",
  "Stands at floor-to-ceiling window, moonlight on face, scrolls phone slowly, loose hair in silk robe",
  "Phone screen glow on face, slow subtle zoom, loose hair, pre-transformation calm before shift",
  "Slow zoom into eye, green spiderweb veins spread slowly from sclera to pupil, thumb strokes phone screen, lips curl into smirk",
  "Slumped on sofa, holographic mission panel fades in above, eyes roll then focus on screen, confused expression",
];

type Pack = Record<string, unknown>;

function main() {
  const pack = JSON.parse(fs.readFileSync(PACK_PATH, "utf8")) as Pack;
  const meta = pack.meta as Record<string, unknown>;
  meta.episodeCount = 1;

  const plan = pack.plan as Record<string, unknown>;
  const visualLock = plan.visualLock as Record<string, unknown>;
  const characters = visualLock.characters as Array<Record<string, unknown>>;
  const charAssets = pack.characterAssets as Record<string, Record<string, unknown>>;

  for (const ch of characters) {
    const code = ch.code as string;
    const ca = charAssets[code];
    if (!ca) continue;

    const stagePrompts = Object.entries(ca)
      .filter(([k]) => k.startsWith("分镜引用prompt_"))
      .map(([k, v]) => ({ name: k.replace("分镜引用prompt_", ""), prompt: v as string }));

    if (stagePrompts.length && ch.stages) {
      const stages = ch.stages as Array<Record<string, unknown>>;
      for (const st of stages) {
        const sp = stagePrompts.find((p) => p.name === st.name);
        if (sp) {
          const mark = sp.prompt
            .replace(/^CHAR-\w+,\s*/i, "")
            .split(",")
            .slice(0, 4)
            .join(", ")
            .trim();
          st.visualMark = mark;
        }
      }
    }

    const fourView = ca["四视图"] as { 完整提示词?: string } | undefined;
    if (fourView?.完整提示词 && code.startsWith("CHAR-")) {
      ch.prompt = fourView.完整提示词.replace(/,?\s*four-view character sheet.*$/i, "").slice(0, 280);
    }
  }

  const episodes = pack.episodes as Array<Record<string, unknown>>;
  const ep = episodes[0];
  const storyboard = ep.storyboard as Array<Record<string, unknown>>;

  for (let i = 0; i < storyboard.length; i++) {
    const shot = storyboard[i];
    shot.videoPrompt = VIDEO_PROMPTS[i] || shot.videoPrompt || "";

    if (i === 6) {
      const ip = shot.imagePrompt as string;
      if (!/full coffee mug|1cm below rim/i.test(ip)) {
        shot.imagePrompt = ip.replace(
          "holding white ceramic coffee mug",
          "holding full white ceramic coffee mug (liquid 1cm below rim, right hand on handle)",
        );
      }
    }
    if (i === 11) {
      shot.imagePrompt = (shot.imagePrompt as string).replace(
        "visible ripples",
        "visible ripples, coffee level near rim",
      );
    }
    if (i === 15) {
      shot.content =
        "温如珏闭眼：'我其实一直——'话未说完，咖啡泼了自己一裤裆（右手满杯→洒出，液面倾斜45°）";
    }
    if (i === 16) {
      shot.imagePrompt = (shot.imagePrompt as string).replace(
        "right hand empty cup",
        "empty coffee mug in right hand, 1cm residue at bottom",
      );
      if (!(shot.imagePrompt as string).includes("empty")) {
        shot.imagePrompt =
          "Close-up of CHAR-WRJ, young Chinese male, looking down at wet pants, empty coffee mug in right hand with 1cm residue, despair in eyes, tiny mole below left eye, 9:16 aspect ratio --ar 9:16 --cref CHAR-WRJ --sref SCENE-TEA";
      }
    }
  }

  const nightShot = storyboard[25];
  nightShot.visualId = "雪辞-夜晚";
  nightShot.assetCodes = ["CHAR-XC", "PROP-PHONE", "SCENE-CEO"];
  nightShot.colorTone = "雪辞出现";
  nightShot.imagePrompt =
    "Mid-shot of CHAR-XC, same face as CHAR-LZH, young Chinese female, standing at window, moonlight on face, looking at phone, loose wavy hair (left side tucked behind ear), dark green silk robe, deep brown pupils (no green veins yet), reflected city lights, purple and blue tones, color temperature 3200K, 9:16 aspect ratio --ar 9:16 --cref CHAR-XC --sref SCENE-CEO";

  fs.writeFileSync(PACK_PATH, JSON.stringify(pack, null, 2), "utf8");
  console.log(`Patched ${PACK_PATH}: ${storyboard.length} videoPrompts, meta.episodeCount=1, shot 26→CHAR-XC`);
}

main();
