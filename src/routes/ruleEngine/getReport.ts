import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { dryRun } from "@/ruleEngine/facade";
import { exportPackage } from "@/ruleEngine/packager/zPackager";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    script: z.string().optional(),
    includeExport: z.boolean().optional(),
    includeHandoff: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, script, includeExport, includeHandoff } = req.body;
    try {
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) return res.status(404).send(error("EpisodePackage 不存在"));
      const dry = await dryRun(u.db, pkg, script ?? "");
      const payload: Record<string, unknown> = { report: dry.report, coverage: dry.report.ruleCoverage, stageStatus: dry.report.stageStatus };
      const cov = dry.report.ruleCoverage;
      payload.coverageDetail = {
        executed: cov.executed ?? cov.hit,
        registered: cov.registered ?? cov.total,
        skipped: cov.skipped ?? Math.max(0, (cov.registered ?? cov.total) - (cov.executed ?? cov.hit)),
      };
      if (includeExport) payload.export = exportPackage(pkg);
      else if (includeHandoff !== false) {
        // Wave-10: light Z110 handoff without full export pack
        try {
          const { buildZ110 } = await import("@/ruleEngine/packager/zPackager");
          const z110 = buildZ110(pkg);
          payload.z110Handoff = {
            timeline: z110.timeline,
            edlStub: z110.edlStub,
            fcpXmlStub: (z110 as { fcpXmlStub?: string }).fcpXmlStub,
            premiereXmlStub: (z110 as { premiereXmlStub?: string }).premiereXmlStub,
            otioStub: (z110 as { otioStub?: string }).otioStub,
            resolveXmlStub: (z110 as { resolveXmlStub?: string }).resolveXmlStub,
            handoffManifest: (z110 as { handoffManifest?: string }).handoffManifest,
            srtStub: (z110 as { srtStub?: string }).srtStub,
            exportReady: false,
            nleFormat: z110.nleFormat,
            note: z110.note,
          };
          payload.handoff = {
            transitionCount: z110.timeline.transitions.length,
            hasEdl: Boolean(z110.edlStub),
            hasFcpXml: Boolean((z110 as { fcpXmlStub?: string }).fcpXmlStub),
            hasPremiereXml: Boolean((z110 as { premiereXmlStub?: string }).premiereXmlStub),
            hasOtio: Boolean(
              (z110 as { otioStub?: string }).otioStub &&
                String((z110 as { otioStub?: string }).otioStub).includes("OTIO_SCHEMA"),
            ),
            hasResolveXml: Boolean(
              (z110 as { resolveXmlStub?: string }).resolveXmlStub &&
                String((z110 as { resolveXmlStub?: string }).resolveXmlStub).includes("resolveProject"),
            ),
            hasSrt: Boolean((z110 as { srtStub?: string }).srtStub),
            axisPairFindings: Number(
              (z110.timeline as { axisAudit?: { pairCount?: number } }).axisAudit?.pairCount ?? 0,
            ),
            framingTight: Number(
              ((z110.timeline as { framingAudit?: { headroomTight?: number; lookingRoomTight?: number } })
                .framingAudit?.headroomTight ?? 0) +
                ((z110.timeline as { framingAudit?: { lookingRoomTight?: number } }).framingAudit
                  ?.lookingRoomTight ?? 0),
            ),
            exportReady: false,
          };
        } catch {
          /* optional */
        }
      }
      return res.status(200).send(success(payload));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);
