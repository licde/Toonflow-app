/**
 * Cross-shot video prompt scrub + stub + sidecar scope golden.
 * yarn test:video-prompt-cross-shot
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  sanitizeVideoPrompt,
  isVideoPromptStub,
  stripXmlAskStub,
} from "../src/ruleEngine/compilers/sanitizeVideoPrompt";
import {
  appendViralSidecarToPrompt,
  bindViralSidecarForCompile,
  formatIntentLine,
  stripCrossShotViralSidecar,
} from "../src/ruleEngine/design/bindViralSidecarForCompile";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

const SAMPLE_SHOT1 =
  "[Visual]\n, 禁止夸张. 请提供具体的分镜信息（XML格式或文本描述），以便我为您生成视频提示词。, 锁定脸型身份，禁止夸张 [Motion]\n-: 可读动作拍点。 [Camera]\n中景，轻微运镜，时长 Ns，单次连续镜头。, 时长, duration 5s[Audio]\n无对白。仅环境音效。 [Narrative]\n设计连贯；锁定脸型身份。, debutBeat:沈清瓷跪祠堂抄《女诫》，腕间红痕隐约，沈母高位压迫, anchor:天命书/丹方遗物, 无字幕无水印无Logo。锁定脸型上的细微微表情（禁止/）；表情细节属分镜静帧\n\n【设计意图 sidecar 续读·禁重发明爆点】\n[intent ] 开篇强冲突，建立沈母高位压迫与清瓷困境 | 画面=沈母高位摔杯，烛火骤灭，清瓷跪于阴影中 | 景别=中景 | 剪=开场强刺激切入 | 声=undefined | 20s | peak=PEAK-sc1-fall";

const SAMPLE_SHOT2 =
  "[Visual]\n, 禁止夸张. 请提供具体的分镜 XML 数据（包含 `videoDesc`, `prompt`, `track`, `duration` 及 `associateAssetsIds`），以便我为您生成符合单图参考模式约束的视频提示词。, 锁定脸型身份，禁止夸张 [Motion]\n-: 可读动作拍点。 [Camera]\n中景，轻微运镜，时长 Ns，单次连续镜头。, 时长, duration 5s[Audio]\n无对白。仅环境音效。 [Narrative]\n设计连贯；锁定脸型身份。, debutBeat:沈清瓷跪祠堂抄《女诫》，腕间红痕隐约，沈母高位压迫, anchor:天命书/丹方遗物, 无字幕无水印无Logo。锁定脸型上的细微微表情（禁止/）；表情细节属分镜静帧\n\n【设计意图 sidecar 续读·禁重发明爆点】\n[intent ] 开篇强冲突，建立沈母高位压迫与清瓷困境 | 画面=沈母高位摔杯，烛火骤灭，清瓷跪于阴影中 | 景别=中景 | 剪=开场强刺激切入 | 声=undefined | 20s | peak=PEAK-sc1-fall";

ok("shot1 is stub", isVideoPromptStub(SAMPLE_SHOT1));
ok("shot2 is stub", isVideoPromptStub(SAMPLE_SHOT2));
ok("strip xml ask shot1", stripXmlAskStub(SAMPLE_SHOT1).stripped);
ok("strip xml ask shot2", stripXmlAskStub(SAMPLE_SHOT2).stripped);

for (const [name, sample] of [
  ["shot1", SAMPLE_SHOT1],
  ["shot2", SAMPLE_SHOT2],
] as const) {
  const san = sanitizeVideoPrompt({ prompt: sample, durationSec: 5 });
  ok(`${name} scrub no 请提供分镜`, !/请提供[^。]{0,40}分镜/.test(san.prompt), san.prompt.slice(0, 160));
  ok(`${name} scrub no PEAK-sc1-fall`, !/PEAK-sc1-fall/.test(san.prompt), san.prompt.slice(0, 160));
  ok(`${name} scrub no sidecar header`, !/设计意图 sidecar/.test(san.prompt));
  ok(`${name} scrub no 声=undefined`, !/声=undefined/.test(san.prompt));
  ok(`${name} scrub no 时长 Ns`, !/时长\s*Ns/.test(san.prompt));
}

const plan = {
  planData: {
    shotDesignIntent: [
      {
        intentId: "intent-1",
        purpose: "开篇强冲突",
        emotionGoal: "压",
        picture: "沈母高位摔杯",
        shotSizeIntent: "中景",
        cutIntent: "开场强刺激切入",
        audioIntent: undefined as unknown as string,
        durationSec: 20,
        peakId: "PEAK-sc1-fall",
        sceneRef: 0,
        shotIndex: 0,
      },
      {
        intentId: "intent-2",
        purpose: "权力座次",
        emotionGoal: "压",
        picture: "端坐太师椅摩挲扳指",
        shotSizeIntent: "中景",
        cutIntent: "切",
        audioIntent: "说教",
        durationSec: 8,
        peakId: "PEAK-sc2-seat",
        sceneRef: 1,
        shotIndex: 1,
      },
    ],
  },
} as Record<string, unknown>;

const bind0 = bindViralSidecarForCompile(plan, { shotIndex: 0, maxIntentLines: 1, durationCapSec: 5 });
ok("shot0 sidecar is sc1", bind0.promptLines.length === 1 && /PEAK-sc1-fall/.test(bind0.promptLines[0]!));
ok("shot0 duration capped ≤5", !/20s/.test(bind0.promptLines[0]!) && /5s/.test(bind0.promptLines[0]!));
ok("shot0 no 声=undefined", !/声=undefined/.test(bind0.promptLines[0]!));

const bind1 = bindViralSidecarForCompile(plan, { shotIndex: 1, maxIntentLines: 1, durationCapSec: 5 });
ok("shot1 sidecar is sc2 not sc1", bind1.promptLines.length === 1 && /PEAK-sc2-seat/.test(bind1.promptLines[0]!));
ok("shot1 no PEAK-sc1", !bind1.promptLines.some((l) => /PEAK-sc1-fall/.test(l)));

const bindMiss = bindViralSidecarForCompile(plan, { shotIndex: 9, maxIntentLines: 1 });
ok("unmatched shotIndex → empty (no fallback [0])", bindMiss.promptLines.length === 0);

const noScope = appendViralSidecarToPrompt("[Visual]\nx", plan);
ok("no shotIndex → no sidecar inject", !/sidecar|PEAK-sc1/.test(noScope));

const line = formatIntentLine({
  purpose: "测",
  emotionGoal: "",
  picture: "画面",
  shotSizeIntent: "中景",
  cutIntent: "",
  audioIntent: undefined as unknown as string,
  durationSec: 12,
  peakId: "P1",
} as never, { durationCapSec: 5 });
ok("formatIntentLine omits undefined audio", !/声=/.test(line) && /5s/.test(line), line);

const cross = stripCrossShotViralSidecar(SAMPLE_SHOT2);
ok("stripCross removes peak block", !/PEAK-sc1-fall/.test(cross.prompt) && cross.stripped);

const out = {
  version: "1.0.0",
  shot1Stub: isVideoPromptStub(SAMPLE_SHOT1),
  shot2Stub: isVideoPromptStub(SAMPLE_SHOT2),
  bind0: bind0.promptLines[0],
  bind1: bind1.promptLines[0],
};
const dir = join(process.cwd(), "data/fixtures/golden");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "video-prompt-cross-shot.json"), JSON.stringify(out, null, 2), "utf8");
console.log("OK video-prompt-cross-shot");
process.exit(process.exitCode ?? 0);
