import type { EpisodePackage, EpisodeShot } from "../types";
import { buildZ110TimelineTransitions } from "../compilers/z110TimelineTransitions";
import { buildEdlStubFromTransitions } from "../compilers/edlStubFromTransitions";
import { buildFcpXmlStubFromTransitions } from "../compilers/fcpXmlStubFromTransitions";
import { buildPremiereXmlStubFromTransitions } from "../compilers/premiereXmlStubFromTransitions";
import { buildOtioStubFromTransitions } from "../compilers/otioStubFromTransitions";
import { buildResolveXmlStubFromTransitions } from "../compilers/resolveXmlStubFromTransitions";
import { buildZ110AxisAudit } from "../compilers/z110AxisAudit";
import { buildZ110HandoffManifest, stringifyZ110HandoffManifest } from "../compilers/z110HandoffManifest";
import { buildZ110FramingAudit } from "../compilers/z110FramingAudit";
import { buildSrtStubFromShots } from "../compilers/srtStubFromShots";

export function buildZ107(pkg: EpisodePackage) {
  return { episodeId: pkg.scriptId, shots: pkg.shots.length, meta: pkg.scriptMeta };
}

export function buildZ108(pkg: EpisodePackage) {
  return {
    scriptId: pkg.scriptId,
    prompts: pkg.shots.map((s: EpisodeShot) => {
      let image = s.generation?.compiled?.image;
      try {
        const { peelCompiledAgainstSsot, readStillSsotFromShot } =
          require("../compilers/stillSsotRead") as typeof import("../compilers/stillSsotRead");
        const bag = readStillSsotFromShot(s as unknown as Record<string, unknown>);
        const reasonPu = String(
          (s as { reason?: { promptUsed?: string } }).reason?.promptUsed ??
            (s.generation as { promptUsed?: string } | undefined)?.promptUsed ??
            "",
        ).trim();
        // Prefer resealed promptUsed; peel compiler IR when exporting imagePrompt
        if (reasonPu && !/CHAR-SCENE|指尖捏紧/.test(reasonPu)) {
          image = reasonPu;
        } else if (image) {
          image = peelCompiledAgainstSsot(String(image), bag.stillPhase);
        }
      } catch {
        /* keep compiled */
      }
      return {
        shotId: s.id,
        image,
        video: s.generation?.compiled?.video,
        audio: s.generation?.compiled?.audio,
        stillPhase:
          (s.narrative as { stillPhase?: string } | undefined)?.stillPhase ??
          (s as { stillPhase?: string }).stillPhase ??
          null,
      };
    }),
  };
}

export function buildZ109(pkg: EpisodePackage) {
  return {
    tracks: {
      video: pkg.shots.map((s: EpisodeShot, i: number) => ({
        shotId: s.id,
        index: i,
        duration: s.narrative?.duration,
      })),
      audio: pkg.shots.map((s: EpisodeShot) => ({
        shotId: s.id,
        sfx: s.narrative?.sound?.sfx,
        bgm: s.narrative?.sound?.bgm,
      })),
      subtitle: pkg.shots
        .filter((s: EpisodeShot) => s.narrative?.dialogue?.lines)
        .map((s: EpisodeShot) => ({
          shotId: s.id,
          text: s.narrative?.dialogue?.lines,
          type: s.narrative?.dialogue?.type,
        })),
    },
  };
}

export function buildZ110(pkg: EpisodePackage) {
  const shotRecords = (pkg.shots ?? []).map((s) => s as unknown as Record<string, unknown>);
  const timeline = buildZ110TimelineTransitions(shotRecords);
  const durationsSec = shotRecords.map((s) => {
    const n = (s.narrative as { duration?: number } | undefined)?.duration;
    return Number(n ?? s.duration ?? 3) || 3;
  });
  const title = `Toonflow ${String(pkg.scriptId ?? "episode")}`;
  const edlStub = buildEdlStubFromTransitions({
    title,
    transitions: timeline.transitions,
    durationsSec,
  });
  const fcpXmlStub = buildFcpXmlStubFromTransitions({
    title,
    transitions: timeline.transitions,
    durationsSec,
  });
  const premiereXmlStub = buildPremiereXmlStubFromTransitions({
    title,
    transitions: timeline.transitions,
    durationsSec,
  });
  const otioStub = buildOtioStubFromTransitions({
    title,
    transitions: timeline.transitions,
    durationsSec,
  });
  const resolveXmlStub = buildResolveXmlStubFromTransitions({
    title,
    transitions: timeline.transitions,
    durationsSec,
  });
  const axisAudit = buildZ110AxisAudit(shotRecords);
  const framingAudit = buildZ110FramingAudit(shotRecords);
  const srtStub = buildSrtStubFromShots(shotRecords);
  const z110Partial = {
    timeline: { transitions: timeline.transitions, axisAudit, framingAudit },
    edlStub,
    fcpXmlStub,
    premiereXmlStub,
    otioStub,
    resolveXmlStub,
    srtStub,
  };
  const handoffManifestObj = buildZ110HandoffManifest({
    z110: z110Partial,
    scriptId: pkg.scriptId,
  });
  const handoffManifest = stringifyZ110HandoffManifest(handoffManifestObj);
  return {
    preview: buildZ109(pkg),
    timeline: { transitions: timeline.transitions, axisAudit, framingAudit },
    edlStub,
    fcpXmlStub,
    premiereXmlStub,
    otioStub,
    resolveXmlStub,
    srtStub,
    handoffManifest,
    exportReady: false as const,
    nleFormat: timeline.nleFormat,
    note: "Wave-17 stubs + axis/framing audit + SRT — not production NLE / not CV 180",
  };
}

export function exportPackage(pkg: EpisodePackage) {
  const Z110 = buildZ110(pkg);
  return {
    Z107: buildZ107(pkg),
    Z108: buildZ108(pkg),
    Z109: buildZ109(pkg),
    Z110,
    handoff: {
      transitionCount: Z110.timeline.transitions.length,
      hasEdl: Boolean(Z110.edlStub),
      hasFcpXml: Boolean(Z110.fcpXmlStub),
      hasPremiereXml: Boolean(Z110.premiereXmlStub),
      hasOtio: Boolean(Z110.otioStub && Z110.otioStub.includes("OTIO_SCHEMA")),
      hasResolveXml: Boolean(Z110.resolveXmlStub && Z110.resolveXmlStub.includes("resolveProject")),
      hasManifest: Boolean(Z110.handoffManifest && String(Z110.handoffManifest).includes("formats")),
      hasSrt: Boolean(Z110.srtStub && String(Z110.srtStub).length > 12),
      axisPairFindings: Number(Z110.timeline.axisAudit?.pairCount ?? 0),
      framingTight: Number(
        (Z110.timeline.framingAudit?.headroomTight ?? 0) +
          (Z110.timeline.framingAudit?.lookingRoomTight ?? 0),
      ),
      exportReady: false as const,
      nleFormat: Z110.nleFormat,
    },
  };
}
