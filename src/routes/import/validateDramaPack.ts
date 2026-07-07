import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { validateDramaPack } from "@/lib/dramaPack/validate";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    pack: z.any(),
  }),
  async (req, res) => {
    const result = validateDramaPack(req.body.pack);
    return res.status(200).send(success(result));
  },
);
