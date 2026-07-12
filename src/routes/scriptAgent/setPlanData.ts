import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    agentType: z.enum(["scriptAgent"]),
    data: z.object({
      preCheck: z.string().optional(),
      adaptationMatrix: z.string().optional(),
      storyCore: z.string().optional(),
      postCheck: z.string().optional(),
      reinforcement: z.string().optional(),
      globalAnchors: z.string().optional(),
      storySkeleton: z.string(),
      adaptationStrategy: z.string(),
      script: z.union([z.string(), z.array(z.any())]).optional(),
    }),
  }),
  async (req, res) => {
    const { projectId, agentType, data } = req.body;
    await u
      .db("o_agentWorkData")
      .where({ projectId: projectId, key: agentType })
      .update({
        data: JSON.stringify(data),
      });
    const scriptItems = data.script;
    if (Array.isArray(scriptItems)) {
    await Promise.all(
      scriptItems.map(async (s: any) => {
        const row = await u.db("o_script").where({ projectId, name: s.name }).first();
        if (row) {
          await u.db("o_script").where({ id: row.id }).update({ content: s.content });
        } else {
          await u.db("o_script").insert({ projectId, name: s.name, content: s.content });
        }
      }),
    );
    }

    res.status(200).send(success());
  },
);
