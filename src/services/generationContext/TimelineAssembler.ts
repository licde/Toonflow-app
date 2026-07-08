import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import getPath from "@/utils/getPath";
import u from "@/utils";
import type { StructuredShot } from "../structuredScript/types";

function ossAbs(userRelPath: string): string {
  const trimmed = userRelPath.replace(/^[/\\]+/, "");
  return path.join(getPath("oss"), ...trimmed.split("/"));
}

export interface AssembleOptions {
  scriptId: number;
  projectId: number;
  includeSfx?: boolean;
  includeSubtitle?: boolean;
  skipConcat?: boolean;
}

export interface AssembleResult {
  manifestPath: string;
  finalPath?: string;
  shots: {
    镜号?: number;
    storyboardId: number;
    duration: string;
    imageUrl?: string;
    videoUrl?: string;
    trackId?: number;
    speedAdjust?: number;
  }[];
  concatSkipped?: boolean;
  concatError?: string;
}

async function ffmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
}

async function concatVideos(listPath: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath];
    const proc = spawn("ffmpeg", args, { stdio: "pipe" });
    let err = "";
    proc.stderr?.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.slice(-500) || `ffmpeg exit ${code}`));
    });
    proc.on("error", reject);
  });
}

/** L2 时间轴组装：manifest + 可选 ffmpeg 拼接 */
export async function assembleTimeline(opts: AssembleOptions): Promise<AssembleResult> {
  const { scriptId, projectId, skipConcat } = opts;
  const shots = await u
    .db("o_storyboard")
    .where({ scriptId, projectId })
    .whereNot("state", "archived")
    .orderBy("index", "asc");

  const manifest: AssembleResult["shots"] = [];
  const videoLocalPaths: string[] = [];

  for (const sb of shots) {
    let 镜号: number | undefined;
    let speedAdjust: number | undefined;
    if (sb.shotMeta) {
      try {
        const meta = JSON.parse(sb.shotMeta) as StructuredShot;
        镜号 = meta.镜号;
        const reason = sb.reason ? JSON.parse(sb.reason) : null;
        speedAdjust = reason?.compileLog?.speedAdjust;
      } catch {
        /* */
      }
    }
    const track = sb.trackId ? await u.db("o_videoTrack").where("id", sb.trackId).first() : null;
    let videoUrl = "";
    if (track?.videoId) {
      const vid = await u.db("o_video").where("id", track.videoId).first();
      if (vid?.filePath) {
        videoUrl = await u.oss.getSmallImageUrl(vid.filePath);
        const local = ossAbs(vid.filePath);
        if (fs.existsSync(local)) videoLocalPaths.push(local);
      }
    }
    manifest.push({
      镜号,
      storyboardId: sb.id!,
      duration: sb.duration ?? "3",
      imageUrl: sb.filePath ? await u.oss.getSmallImageUrl(sb.filePath) : "",
      videoUrl,
      trackId: sb.trackId ?? undefined,
      speedAdjust,
    });
  }

  const manifestPath = `/${projectId}/episodes/${scriptId}/timeline-manifest.json`;
  await u.oss.writeFile(manifestPath, Buffer.from(JSON.stringify({ scriptId, projectId, shots: manifest, assembledAt: Date.now(), options: opts }, null, 2), "utf8"));

  let finalPath: string | undefined;
  let concatSkipped = false;
  let concatError: string | undefined;

  if (!skipConcat && videoLocalPaths.length > 0 && (await ffmpegAvailable())) {
    try {
      const finalRel = `/${projectId}/episodes/${scriptId}/final.mp4`;
      const finalAbs = ossAbs(finalRel);
      const listRel = `/${projectId}/episodes/${scriptId}/concat-list.txt`;
      const listAbs = ossAbs(listRel);
      await fs.promises.mkdir(path.dirname(listAbs), { recursive: true });
      const listContent = videoLocalPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n");
      await fs.promises.writeFile(listAbs, listContent, "utf8");
      await concatVideos(listAbs, finalAbs);
      finalPath = finalRel;
    } catch (e) {
      concatError = u.error(e).message;
      concatSkipped = true;
    }
  } else {
    concatSkipped = true;
  }

  await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "assembleManifest" }).delete();
  await u.db("o_agentWorkData").insert({
    projectId,
    episodesId: scriptId,
    key: "assembleManifest",
    data: JSON.stringify({ manifestPath, finalPath, shotCount: manifest.length, concatSkipped }),
    createTime: Date.now(),
    updateTime: Date.now(),
  });

  return { manifestPath, finalPath, shots: manifest, concatSkipped, concatError };
}
