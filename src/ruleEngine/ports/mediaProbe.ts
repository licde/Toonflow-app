/** MediaProbe — ffprobe 生成后检（GC-06/07） */
import { execFile } from "child_process";
import { promisify } from "util";
import type { MediaProbePort } from "./index";

const execFileAsync = promisify(execFile);

async function ffprobeField(filePath: string, entries: string): Promise<string> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    entries,
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return stdout.trim();
}

export const mediaProbePort: MediaProbePort = {
  async probeDuration(filePath: string): Promise<number> {
    try {
      const raw = await ffprobeField(filePath, "format=duration");
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  },
  async probeHasAudio(filePath: string): Promise<boolean> {
    try {
      const raw = await ffprobeField(filePath, "stream=codec_type");
      return raw.split("\n").some((line) => line.trim() === "audio");
    } catch {
      return false;
    }
  },
};

/** @deprecated use mediaProbePort */
export const mediaProbePortStub = mediaProbePort;
