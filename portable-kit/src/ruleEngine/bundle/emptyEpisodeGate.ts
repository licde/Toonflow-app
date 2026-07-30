/**
 * Block generation / enter-production when episode has 0 materializable shots.
 */
export interface EmptyEpisodeResult {
  ok: boolean;
  shotCount: number;
  code?: "EMPTY_EPISODE" | "PARTIAL_NO_SHOTS";
  message?: string;
}

export function assertNonEmptyEpisode(input: {
  storyboardCount?: number;
  preDesignShotCount?: number;
  packageShotCount?: number;
}): EmptyEpisodeResult {
  const shotCount = Math.max(
    input.storyboardCount ?? 0,
    input.preDesignShotCount ?? 0,
    input.packageShotCount ?? 0,
  );
  if (shotCount <= 0) {
    return {
      ok: false,
      shotCount: 0,
      code: "EMPTY_EPISODE",
      message: "集无可用分镜，禁止生成",
    };
  }
  return { ok: true, shotCount };
}
