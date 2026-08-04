import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { exportPackage } from "@/ruleEngine/packager/zPackager";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    stubFormat: z
      .enum(["edl", "fcp", "premiere", "json", "otio", "resolve", "manifest", "srt", "all"])
      .optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, stubFormat } = req.body;
    try {
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) return res.status(404).send(error("EpisodePackage 不存在"));
      const data = exportPackage(pkg);
      if (stubFormat) {
        const { pickZ110HandoffStub, listZ110HandoffStubs } =
          await import("@/ruleEngine/compilers/handoffStubSelect");
        const z110 = (data as { Z110?: Parameters<typeof pickZ110HandoffStub>[0] }).Z110;
        if (stubFormat === "all") {
          const stubs = listZ110HandoffStubs(z110, scriptId);
          if (!stubs.length) return res.status(404).send(error("无可用交接草稿"));
          return res.status(200).send(
            success({
              stubs,
              handoff: (data as { handoff?: unknown }).handoff,
              note: "Wave-17 handoff stub list — not production NLE",
            }),
          );
        }
        const pick = pickZ110HandoffStub(z110, stubFormat, scriptId);
        if (!pick) return res.status(404).send(error(`stubFormat=${stubFormat} 无可用草稿`));
        return res.status(200).send(
          success({
            stub: pick,
            handoff: (data as { handoff?: unknown }).handoff,
            note: "Wave-17 handoff stub — not production NLE",
          }),
        );
      }
      // Wave-9: handoff summary always present; stubs on Z110
      return res.status(200).send(
        success({
          ...data,
          handoff: (data as { handoff?: unknown }).handoff ?? {
            transitionCount: (data as { Z110?: { timeline?: { transitions?: unknown[] } } }).Z110?.timeline
              ?.transitions?.length ?? 0,
            hasEdl: Boolean((data as { Z110?: { edlStub?: string } }).Z110?.edlStub),
            hasFcpXml: Boolean((data as { Z110?: { fcpXmlStub?: string } }).Z110?.fcpXmlStub),
            exportReady: false,
          },
        }),
      );
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
