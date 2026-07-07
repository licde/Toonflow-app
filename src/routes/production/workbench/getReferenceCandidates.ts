import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { resolveStoryboardReference, resolveAssetReference } from "@/lib/dramaPack/resolveReference";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    const { projectId, scriptId } = req.body;
    const storyboards = await u
      .db("o_storyboard")
      .where({ projectId, scriptId })
      .orderBy("index", "asc")
      .select("id", "index", "filePath", "state", "trackId");

    const candidates = await Promise.all(
      storyboards.map(async (sb) => {
        let src = sb.filePath ? await u.oss.getSmallImageUrl(sb.filePath) : "";
        const fallbackAssetSrcs: string[] = [];
        if (!src) {
          const ref = await resolveStoryboardReference(sb.id!);
          if (ref?.path) {
            fallbackAssetSrcs.push(await u.oss.getSmallImageUrl(ref.path));
          }
        }
        return {
          id: sb.id,
          index: sb.index,
          trackId: sb.trackId,
          src,
          state: sb.state,
          fallbackAssetSrcs,
          canReference: Boolean(src || fallbackAssetSrcs.length),
        };
      }),
    );

    return res.status(200).send(success(candidates));
  },
);
