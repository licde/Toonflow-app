import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
    items: z.array(z.object({ id: z.number(), index: z.number() })),
  }),
  async (req, res) => {
    const { items } = req.body;
    for (const item of items) {
      await u.db("o_storyboard").where("id", item.id).update({ index: item.index });
    }
    return res.status(200).send(success({ updated: items.length }));
  },
);
