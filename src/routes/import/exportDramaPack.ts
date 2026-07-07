import express from "express";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { exportDramaPack } from "@/lib/dramaPack/exportDramaPack";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptIds: z.array(z.number()).optional(),
  }),
  async (req, res) => {
    const { projectId, scriptIds } = req.body;
    try {
      const pack = await exportDramaPack({ projectId, scriptIds });
      return res.status(200).send(success(pack));
    } catch (e: any) {
      return res.status(400).send(error(e?.message || "导出失败"));
    }
  },
);
