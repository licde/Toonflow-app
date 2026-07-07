import express from "express";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { importDramaPack } from "@/lib/dramaPack/importDramaPack";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    pack: z.any(),
    merge: z.boolean().optional(),
    skipValidation: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, pack, merge, skipValidation } = req.body;
    const result = await importDramaPack(pack, { projectId, merge, skipValidation });
    if (!result.success) {
      return res.status(400).send(error(result.message, result));
    }
    return res.status(200).send(success(result));
  },
);
