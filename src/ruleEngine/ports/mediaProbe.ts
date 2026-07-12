/** MediaProbe 预留实现 — ffprobe 生成后检（§15.8） */
import type { MediaProbePort } from "./index";

export const mediaProbePortStub: MediaProbePort = {
  async probeDuration(_filePath: string): Promise<number> {
    return 0;
  },
  async probeHasAudio(_filePath: string): Promise<boolean> {
    return false;
  },
};
