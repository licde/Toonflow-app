import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getAutoDesignJob } from "@/ruleEngine/bundle/autoDesign";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    jobId: z.string(),
  }),
  async (req, res) => {
    const { jobId } = req.body;
    const job = getAutoDesignJob(jobId);
    if (!job) return res.status(404).send(error("任务不存在"));
    return res.status(200).send(success(job));
  },
);
