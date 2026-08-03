import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { stillApiFieldsFromReason } from "@/ruleEngine/compilers/stillQuality";
import {
  flattenQcDebtForFe,
  mapVideoStateForFe,
  parseVideoErrorReason,
  isSoftDeliveredVideoRow,
} from "@/ruleEngine/qc/qcSoftDeliver";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
const router = express.Router();

interface VideoItem {
  id: number;
  src: string;
  state: "未生成" | "生成中" | "已完成" | "生成失败";
}

interface TrackMedia {
  src: string;
  id?: number;
  fileType: "image" | "video" | "audio";
  videoDesc?: string;
}

interface DesignIntentFidelityFe {
  pass?: boolean;
  items?: Array<{ id: string; label: string; pass: boolean; expected?: string; actual?: string }>;
  repairs?: string[];
  virdFindings?: Array<{ id: string; severity: "BLOCK" | "WARN"; message: string }>;
}

interface TrackItem {
  id?: number;
  prompt: string;
  /** 需完善 = prompt landed but not burnable */
  state: "未生成" | "生成中" | "已完成" | "生成失败" | "需完善";
  reason?: string;
  /** Enriched from reason / state — FE burn gate */
  burnAllowed?: boolean;
  duration?: number;
  selectVideoId?: number;
  /** Burn-time design intent fidelity (from track.reason) */
  designIntentFidelity?: DesignIntentFidelityFe;
  virdFindings?: DesignIntentFidelityFe["virdFindings"];
  burnDurationSec?: number;
  promptHash?: string;
  medias: TrackMedia[];
  videoList: VideoItem[];
  /** SSOT 镜号 from o_storyboard.index+1 — not trackList array order */
  displayNo?: number;
  storyboardIndexMin?: number | null;
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    const { projectId, scriptId } = req.body;
    const projectData = await u.db("o_project").where("id", projectId).select("id", "videoModel", "mode").first();

    if (!projectData?.videoModel) {
      return res.status(400).json(success("项目未配置视频模型"));
    }
    let videoMode = "";
    try {
      videoMode = JSON.parse(projectData?.mode ?? "");
    } catch (e) {
      videoMode = projectData?.mode ?? "";
    }
    const isRef = Array.isArray(videoMode) ? true : false;

    const storyboardList = await u.db("o_storyboard").where({ scriptId, projectId }).orderBy("index", "asc");
    // Heal: one panel = one track — never collapse empty/"1"; split shared trackIds
    try {
      const usedKeys = new Set<string>();
      const trackIdOwners = new Map<number, number>();
      for (const sb of storyboardList) {
        if (sb.id == null) continue;
        let trackKey = String(sb.track ?? "").trim();
        const collapse = !trackKey || trackKey === "1";
        if (collapse || usedKeys.has(trackKey)) {
          trackKey = String(sb.index ?? sb.id);
          if (usedKeys.has(trackKey)) trackKey = `${trackKey}-${sb.id}`;
        }
        usedKeys.add(trackKey);

        let trackId =
          sb.trackId != null && Number.isFinite(Number(sb.trackId)) ? Number(sb.trackId) : undefined;
        if (trackId != null) {
          const owner = trackIdOwners.get(trackId);
          if (owner != null && owner !== sb.id) trackId = undefined;
          else trackIdOwners.set(trackId, sb.id);
        }

        if (trackId == null) {
          trackId = Date.now() + Math.floor(Math.random() * 1000);
          await u.db("o_videoTrack").insert({
            id: trackId,
            scriptId,
            projectId,
            duration: Number(sb.duration) || 3,
            prompt: String(sb.videoDesc ?? ""),
          });
          trackIdOwners.set(trackId, sb.id);
        }

        const patch: Record<string, unknown> = {};
        if (sb.trackId !== trackId) patch.trackId = trackId;
        if (String(sb.track ?? "") !== trackKey) patch.track = trackKey;
        if (Object.keys(patch).length) {
          await u.db("o_storyboard").where({ id: sb.id }).update(patch);
          (sb as { trackId?: number; track?: string }).trackId = trackId;
          (sb as { track?: string }).track = trackKey;
        }
      }
    } catch (e) {
      console.warn("[getGenerateData] trackId heal failed", u.error(e).message);
    }
    await Promise.all(
      storyboardList.map(async (i) => {
        i.filePath = i.filePath ? await u.oss.getSmallImageUrl(i.filePath) : "";
      }),
    );
    const storyboardTrackRecord: Record<number, any[]> = {};
    storyboardList.forEach((i) => {
      const tid = i.trackId != null ? Number(i.trackId) : NaN;
      if (!Number.isFinite(tid)) return; // skip still-unbound (should be healed above)
      const stillFields = stillApiFieldsFromReason(i.reason);
      const media = {
        src: i.filePath,
        fileType: "image",
        sources: "storyboard",
        ...(i.videoDesc != null ? { videoDesc: i.videoDesc } : {}),
        ...(i.id != null ? { id: i.id } : {}),
        index: i.index,
        ...stillFields,
      };
      if (!storyboardTrackRecord[tid]) storyboardTrackRecord[tid] = [];
      storyboardTrackRecord[tid].push(media);
    });
    // 按 storyboardId 分组的资产数据，key 为 storyboardId
    const otherDataMap: Record<number, any[]> = {};
    // 解析 videoMode 中 audioReference 的数量，例如 'audioReference:3' => 3
    const audioReferenceCount = (() => {
      if (!Array.isArray(videoMode)) return 0;
      const item = (videoMode as string[]).find((v) => v.toLowerCase().startsWith("audioreference:"));
      if (!item) return 0;
      const num = parseInt(item.split(":")[1], 10);
      return isNaN(num) ? 0 : num;
    })();
    if (isRef) {
      const storyIds = storyboardList.map((s) => s.id);

      const assetDatas = await u
        .db("o_assets2Storyboard")
        .leftJoin("o_assets", "o_assets2Storyboard.assetId", "o_assets.id")
        .leftJoin("o_image", "o_image.id", "o_assets.imageId")
        .whereIn("o_assets2Storyboard.storyboardId", storyIds as number[])
        .select("o_assets.*", "o_image.filePath", "o_assets2Storyboard.storyboardId");

      const queryAudioIds = [...assetDatas.map((i) => i.id!), ...assetDatas.map((i) => i.assetsId!)].filter(Boolean);
      const assets2AudioData = await u
        .db("o_assetsRole2Audio")
        .leftJoin("o_assets", "o_assets.assetsId", "o_assetsRole2Audio.assetsAudioId")
        .leftJoin("o_image", "o_image.id", "o_assets.imageId")
        .whereIn("o_assetsRole2Audio.assetsRoleId", queryAudioIds)
        .select(
          "o_assets.id",
          "o_assets.name",
          "o_assetsRole2Audio.assetsRoleId",
          "o_assets.describe",
          "o_assets.type",
          "o_assets.prompt",
          "o_image.filePath",
        );
      const audioRecord: Record<string, any> = {};
      await Promise.all(
        assets2AudioData.map(async (i) => {
          if (!audioRecord[i.assetsRoleId]) audioRecord[i.assetsRoleId] = [];
          audioRecord[i.assetsRoleId].push({
            id: i.id,
            name: i.name,
            describe: i.describe,
            type: i.type,
            fileType: "audio" as const,
            sources: "assets",
            prompt: i.prompt,
            src: i.filePath ? await u.oss.getFileUrl(i.filePath) : "",
          });
        }),
      );

      await Promise.all(
        assetDatas.map(async (i) => {
          const item = {
            id: i.id,
            name: i.name,
            describe: i.describe,
            type: i.type,
            fileType: "image" as const,
            sources: "assets",
            src: i.filePath ? await u.oss.getSmallImageUrl(i.filePath) : "",
          };
          const sid = i.storyboardId as number;
          if (!otherDataMap[sid]) otherDataMap[sid] = [];
          otherDataMap[sid].push(item);
          if (audioRecord[i.id]) otherDataMap[sid].push(...audioRecord[i.id]);
          if (audioRecord[i.assetsId]) otherDataMap[sid].push(...audioRecord[i.assetsId]);
        }),
      );
    }

    const trackData = await u.db("o_videoTrack").where({ projectId, scriptId });
    // Only tracks still bound to ≥1 storyboard — orphans (re-sync leftover) poison regen with false「缺画面」
    const linkedTrackIds = new Set(
      storyboardList.map((s) => s.trackId).filter((id): id is number => id != null && Number.isFinite(Number(id))),
    );
    const liveTracks = linkedTrackIds.size
      ? trackData.filter((t) => linkedTrackIds.has(Number(t.id)))
      : trackData;
    const videoList = await u.db("o_video").whereIn(
      "videoTrackId",
      liveTracks.map((t) => t.id),
    );
    const trackList: TrackItem[] = [];
    const trackIdMap = [...new Set<number>(liveTracks.map((t) => t.id!))];
    const pkg = await loadEpisodePackage(u.db, projectId, scriptId).catch(() => null);
    for (const trackId of trackIdMap) {
      const item = liveTracks.find((t) => t.id === trackId);
      const trackStoryboards = storyboardList.filter((s) => s.trackId === trackId);
      const seedVideoPrompt = trackStoryboards.find((s) => s.videoDesc?.trim())?.videoDesc?.trim() ?? "";
      const rawState = String(item?.state ?? "未生成");
      let burnAllowed: boolean | undefined;
      let designIntentFidelity: DesignIntentFidelityFe | undefined;
      let virdFindings: DesignIntentFidelityFe["virdFindings"];
      let burnDurationSec: number | undefined;
      let promptHash: string | undefined;
      try {
        const r =
          typeof item?.reason === "string" && String(item.reason).trim().startsWith("{")
            ? JSON.parse(item.reason)
            : null;
        if (r && typeof r.burnAllowed === "boolean") burnAllowed = r.burnAllowed;
        if (r?.designIntentFidelity) designIntentFidelity = r.designIntentFidelity as DesignIntentFidelityFe;
        if (Array.isArray(r?.virdFindings)) virdFindings = r.virdFindings;
        else if (designIntentFidelity?.virdFindings) virdFindings = designIntentFidelity.virdFindings;
        if (r?.burnDurationSec != null && Number.isFinite(Number(r.burnDurationSec))) {
          burnDurationSec = Number(r.burnDurationSec);
        }
        if (r?.promptHash) promptHash = String(r.promptHash);
      } catch {
        /* ignore */
      }
      if (rawState === "需完善") burnAllowed = false;
      // 已完成 without explicit meta: default permissive only when still is burn-ready
      if (rawState === "已完成" && burnAllowed === undefined) {
        const primarySb = trackStoryboards[0];
        let stillBurnReady = false;
        if (primarySb?.reason) {
          try {
            const sm =
              typeof primarySb.reason === "string" && primarySb.reason.trim().startsWith("{")
                ? JSON.parse(primarySb.reason)
                : null;
            stillBurnReady =
              sm?.stillQuality === "hq_ok" &&
              sm?.visualPass === true &&
              !sm?.sheetLeak &&
              sm?.i2vReady !== false;
          } catch {
            stillBurnReady = false;
          }
        }
        burnAllowed = stillBurnReady;
      }

      const trackPrompt = String(item?.prompt || seedVideoPrompt || "").trim();
      // Multi-panel track: pick storyboard whose package VD matches prompt (not arbitrary [0])
      let primarySbId = trackStoryboards[0]?.id as number | undefined;
      if (pkg?.shots?.length && trackStoryboards.length > 1 && trackPrompt) {
        const hit = trackStoryboards.find((sb) => {
          const shot = pkg.shots?.find((s) => s.storyboardId === sb.id);
          const vd = String((shot as { visualDescription?: string } | undefined)?.visualDescription ?? "").trim();
          return vd.length >= 8 && trackPrompt.includes(vd.slice(0, 12));
        });
        if (hit?.id != null) primarySbId = hit.id as number;
      }
      const pkgShot =
        primarySbId != null ? pkg?.shots?.find((s) => s.storyboardId === primarySbId) : undefined;
      if (trackPrompt && pkgShot) {
        try {
          const { liveDesignIntentFidelityForTrack } = await import(
            "@/ruleEngine/compilers/videoDesignIntentFidelity"
          );
          const live = liveDesignIntentFidelityForTrack({
            prompt: trackPrompt,
            shotMeta: pkgShot as unknown as Record<string, unknown>,
            trackId,
            storyboardId: primarySbId,
          });
          designIntentFidelity = {
            pass: live.pass,
            items: live.items,
            virdFindings: live.virdFindings,
          };
          virdFindings = live.virdFindings;
          if (live.pass) {
            // Live OK → enable burn (clear stale burnAllowed=false left in FE/DB reason)
            if (rawState === "已完成" || rawState === "生成失败") {
              burnAllowed = true;
            }
          } else {
            // Trust fresh stamp when promptHash still matches — avoid false-disable on wrong sb pick
            const hashNow = require("crypto").createHash("sha1").update(trackPrompt).digest("hex").slice(0, 12);
            const stamped =
              typeof item?.reason === "string" && item.reason.trim().startsWith("{")
                ? (() => {
                    try {
                      return JSON.parse(item.reason) as Record<string, unknown>;
                    } catch {
                      return null;
                    }
                  })()
                : null;
            const hashMatch = stamped?.promptHash && String(stamped.promptHash) === hashNow;
            if (!(stamped?.burnAllowed === true && hashMatch)) {
              burnAllowed = false;
            }
          }
        } catch {
          /* optional live rescore */
        }
      }

      trackList.push({
        id: trackId,
        duration: burnDurationSec ?? item?.duration ?? 0,
        prompt: trackPrompt,
        state: (rawState as TrackItem["state"]) || "未生成",
        reason: item?.reason ?? "",
        burnAllowed,
        designIntentFidelity,
        virdFindings,
        burnDurationSec: burnDurationSec ?? (item?.duration != null ? Number(item.duration) : undefined),
        promptHash,
        selectVideoId: Number(item?.videoId)!,
        /** SSOT 镜号 — never trackList array order */
        displayNo: (() => {
          try {
            const { storyboardDisplayNo } = require("@/ruleEngine/compilers/storyboardDisplaySsot") as typeof import("@/ruleEngine/compilers/storyboardDisplaySsot");
            const idxs = trackStoryboards
              .map((s) => (s.index != null ? Number(s.index) : null))
              .filter((n): n is number => n != null && Number.isFinite(n));
            const minIdx = idxs.length ? Math.min(...idxs) : null;
            const pkgSi = (pkgShot as { shotIndex?: number } | undefined)?.shotIndex;
            return storyboardDisplayNo({ index: minIdx, packageShotIndex: pkgSi });
          } catch {
            return trackStoryboards[0]?.index != null ? Number(trackStoryboards[0].index) + 1 : 1;
          }
        })(),
        storyboardIndexMin: (() => {
          const idxs = trackStoryboards
            .map((s) => (s.index != null ? Number(s.index) : null))
            .filter((n): n is number => n != null && Number.isFinite(n));
          return idxs.length ? Math.min(...idxs) : null;
        })(),
        medias: (() => {
          const storyboardMedias = storyboardTrackRecord[trackId] ?? [];
          const assetMedias = storyboardMedias.flatMap((s) => otherDataMap[s.id] ?? []);

          const seenAssetIds = new Set<number>();
          const uniqueAssets = assetMedias.filter((a) => {
            if (seenAssetIds.has(a.id)) return false;
            seenAssetIds.add(a.id);
            return true;
          });

          // 有 audioReference 时，按数量截取 audio 类型资产
          const audioCountMap: Record<string, number> = {};
          const filteredAssets = uniqueAssets.filter((a) => {
            if (a.fileType !== "audio" || audioReferenceCount === 0) return true;
            const key = String(a.id);
            audioCountMap[key] = (audioCountMap[key] ?? 0) + 1;
            // 统计当前 track 内 audio 总数，超过上限则过滤
            const totalAudio = Object.values(audioCountMap).reduce((s, n) => s + n, 0);
            return totalAudio <= audioReferenceCount;
          });

          const hasImageAssetData = filteredAssets.filter((i) => i.src);
          const notHasImageAssetData = filteredAssets.filter((i) => !i.src);
          // Prefer storyboard stills with pixels first (empty placeholders last)
          const sbWithSrc = storyboardMedias.filter((m) => m.src);
          const sbEmpty = storyboardMedias.filter((m) => !m.src);

          return [...sbWithSrc, ...hasImageAssetData, ...sbEmpty, ...notHasImageAssetData];
        })(),
        videoList: await Promise.all(
          videoList
            .filter((v) => v.videoTrackId === trackId)
            .map(async (v) => {
              const parsed0 = parseVideoErrorReason(v?.errorReason);
              const { reconcileLegacyContactQc } = await import("@/ruleEngine/qc/qcSoftDeliver");
              const parsed = reconcileLegacyContactQc(parsed0);
              const softDeliver = isSoftDeliveredVideoRow({
                ...v,
                errorReason: parsed ? JSON.stringify(parsed) : v?.errorReason,
              });
              return {
                id: v.id!,
                src: v.filePath ? await u.oss.getFileUrl(v.filePath) : "",
                state: mapVideoStateForFe(v),
                errorReason: v?.errorReason ?? "",
                ...(softDeliver ? flattenQcDebtForFe(parsed) : {}),
              };
            }),
        ),
      });
    }
    // Sort tracks by panel index SSOT — 「第N段」follows displayNo, not insert order
    try {
      const { sortTracksByStoryboardIndex } =
        require("@/ruleEngine/compilers/storyboardDisplaySsot") as typeof import("@/ruleEngine/compilers/storyboardDisplaySsot");
      const sorted = sortTracksByStoryboardIndex(
        trackList as Array<{ storyboardIndexMin?: number | null; displayNo?: number; id?: number }>,
      );
      trackList.length = 0;
      trackList.push(...(sorted as typeof trackList));
    } catch {
      trackList.sort((a, b) => {
        const ai = (a as { storyboardIndexMin?: number }).storyboardIndexMin ?? 9999;
        const bi = (b as { storyboardIndexMin?: number }).storyboardIndexMin ?? 9999;
        return ai - bi;
      });
    }
    res.status(200).send(
      success({
        storyboardList: await Promise.all(
          storyboardList.map(async (s) => {
            let displayNo = s.index != null ? Number(s.index) + 1 : 1;
            try {
              const { storyboardDisplayNo, formatStoryboardBadge } =
                require("@/ruleEngine/compilers/storyboardDisplaySsot") as typeof import("@/ruleEngine/compilers/storyboardDisplaySsot");
              displayNo = storyboardDisplayNo({ index: s.index });
              return {
                ...s,
                src: s.filePath,
                displayNo,
                badge: formatStoryboardBadge(displayNo),
                ...stillApiFieldsFromReason(s.reason),
              };
            } catch {
              return {
                ...s,
                src: s.filePath,
                displayNo,
                ...stillApiFieldsFromReason(s.reason),
              };
            }
          }),
        ),
        trackList,
      }),
    );
  },
);
