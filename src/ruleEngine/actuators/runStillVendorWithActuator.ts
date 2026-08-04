/**
 * Run still vendor with StillActuatorProfile — Comfy preferred for contact+softEnv must;
 * honest degrade to Seedream/imageRunner. Key never selects actuator.
 * Both actuators receive compressed egress (literary SSOT stays in DB).
 */
export type StillVendorRunResult = {
  url: string;
  savePath: string;
  imageBase64: string;
  vendorCalled: boolean;
  vendorMs: number;
  actuatorId: string;
  actuatorDegraded: boolean;
  actuatorDegradedReason?: string;
  workflowHash?: string;
  propPlateGrade: string;
  egressCompressed: boolean;
  /** Prompt actually sent to the winning actuator */
  vendorPromptUsed?: string;
};

export async function runStillVendorWithActuatorCore(input: {
  vendorPrompt: string;
  referenceList: { type: "image"; base64: string }[];
  refsRoles?: string[];
  objectiveClass?: string | null;
  softEnvContinuity?: string | null;
  keepSoftEnvRef?: boolean | null;
  propClassId?: string | null;
  propSource?: string | null;
  synthesizedProp?: boolean;
  propPlateMissing?: boolean;
  propPlateGrade?: string | null;
  projectId: number;
  uuid: () => string;
  ossWriteFile: (path: string, data: string | Buffer) => Promise<void>;
  getSmallImageUrl: (path: string) => Promise<string>;
  imageRunner?: unknown;
  /** Prefer promptOverride when provided (compressed Seedream path) */
  runSeedream: (promptOverride?: string) => Promise<{ url: string; savePath: string; imageBase64: string }>;
  /** Prior gen fingerprint — isomorphic spend refused without delta */
  prevGenFingerprint?: string | null;
  forceIsoSpend?: boolean;
  /** Literary / per-atom repair hints — allow spend when plates/seed changed */
  deltaHints?: string[] | null;
  visualDescription?: string | null;
  poseOccupancy?: string | null;
  primaryIntentSeal?: { poseOccupancy?: string; sealHash?: string } | null;
  /** LGIA stillPhase — must reach compress so approaching does not grip-lead */
  stillPhase?: string | null;
}): Promise<StillVendorRunResult> {
  const {
    selectStillActuatorProfile,
    compressStillEgressForActuator,
    compressStillEgressForSeedream,
    resolvePropPlateGrade,
  } = await import("@/ruleEngine/compilers/stillActuatorProfile");
  try {
    const { hashStillGenFingerprint, assertStillGenDeltaOrThrow, applyLiteraryRepairDeltaSalt } =
      await import("@/ruleEngine/quality/isoRegenHardDelta");
    let nextFp = hashStillGenFingerprint({
      promptUsed: input.vendorPrompt,
      refsRoles: input.refsRoles,
      visualDescription: input.visualDescription,
      actuatorId: "pending",
    });
    if ((input.deltaHints ?? []).length > 0) {
      nextFp = applyLiteraryRepairDeltaSalt(nextFp, input.deltaHints);
    }
    const delta = assertStillGenDeltaOrThrow({
      prevFingerprint: input.prevGenFingerprint,
      nextFingerprint: nextFp,
      force: input.forceIsoSpend,
      deltaHints: input.deltaHints,
    });
    if (!delta.ok) {
      throw Object.assign(new Error(delta.message), {
        code: delta.code,
        primaryNextStep: "chat_repair",
        ctaLabel: "增强设计并生成",
        blockSilentRegen: false,
      });
    }
  } catch (e: unknown) {
    if (e && typeof e === "object" && (e as { code?: string }).code === "ISO_REGEN_NO_DELTA") throw e;
    /* optional iso gate */
  }
  const decision = selectStillActuatorProfile({
    objectiveClass: input.objectiveClass,
    softEnvContinuity: input.softEnvContinuity,
    keepSoftEnvRef: input.keepSoftEnvRef,
  });
  const propPlateGrade =
    input.propPlateGrade ||
    resolvePropPlateGrade({
      propSource: input.propSource,
      synthesizedPropPlate: input.synthesizedProp,
      propPlateMissing: input.propPlateMissing,
    });
  const t0 = Date.now();
  let actuatorDegraded = false;
  let actuatorDegradedReason: string | undefined;
  let workflowHash: string | undefined;
  let actuatorId: string = decision.preferComfy ? "comfy_contact_softenv" : "seedream_multiref";
  let egressCompressed = false;
  let vendorPromptUsed = input.vendorPrompt;

  if (decision.preferComfy && !input.imageRunner && input.referenceList[0]?.base64) {
    const { runComfyContactSoftEnv } = await import("@/ruleEngine/actuators/comfyStillActuator");
    const compressed = compressStillEgressForActuator({
      prompt: input.vendorPrompt,
      objectiveClass: input.objectiveClass,
      propClassId: input.propClassId,
      poseOccupancy: input.poseOccupancy,
      primaryIntentSeal: input.primaryIntentSeal,
      stillPhase: input.stillPhase,
    });
    egressCompressed = true;
    let identityB64 = input.referenceList[0].base64;
    try {
      const { cropIdentityPlateToFaceBias, resolveIdentityCropTopRatio } = await import(
        "@/ruleEngine/compilers/eventPlateReadiness"
      );
      const topRatio = resolveIdentityCropTopRatio({
        objectiveClass: input.objectiveClass,
        keepSoftEnvRef: input.keepSoftEnvRef,
        softEnvContinuity: input.softEnvContinuity,
        preferCostume: true,
        poseOccupancy: (input as { poseOccupancy?: string }).poseOccupancy,
        primaryObjective: input.objectiveClass === "action_primary" ? "action_primary" : undefined,
      });
      const upper = await cropIdentityPlateToFaceBias(identityB64, { topRatio });
      if (upper.base64) identityB64 = upper.base64;
    } catch {
      /* optional */
    }
    const roles = input.refsRoles ?? [];
    const softIdx = roles.indexOf("softEnv");
    const propIdx = roles.indexOf("propSoft");
    let softB64 =
      softIdx >= 0 ? input.referenceList[softIdx]?.base64 : input.referenceList[2]?.base64;
    if (softB64 && input.keepSoftEnvRef) {
      try {
        const { softenSoftEnvPlateForAtmosphere } = await import(
          "@/ruleEngine/compilers/eventPlateReadiness"
        );
        const soft = await softenSoftEnvPlateForAtmosphere(softB64, {
          softEnvContinuity: input.softEnvContinuity,
          sceneMust: input.softEnvContinuity === "must" || input.keepSoftEnvRef === true,
        });
        if (soft.base64) softB64 = soft.base64;
      } catch {
        /* optional */
      }
    }
    const comfyOut = await runComfyContactSoftEnv({
      identityBase64: identityB64,
      softEnvBase64: softB64,
      propSoftBase64:
        propIdx >= 0 ? input.referenceList[propIdx]?.base64 : input.referenceList[1]?.base64,
      positive: compressed.positive,
      negative: compressed.negative,
      objectiveClass: input.objectiveClass ?? undefined,
      propClassId: input.propClassId,
    });
    if (comfyOut.ok) {
      const savePath = `/${input.projectId}/workFlow/${input.uuid()}.jpg`;
      const b64 = comfyOut.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      await input.ossWriteFile(savePath.replace(/^\//, ""), b64);
      const url = await input.getSmallImageUrl(savePath.replace(/^\//, ""));
      return {
        url,
        savePath,
        imageBase64: b64,
        vendorCalled: true,
        vendorMs: comfyOut.ms || Date.now() - t0,
        actuatorId: "comfy_contact_softenv",
        actuatorDegraded: false,
        workflowHash: comfyOut.workflowHash,
        propPlateGrade,
        egressCompressed: true,
        vendorPromptUsed: compressed.positive,
      };
    }
    actuatorDegraded = true;
    actuatorDegradedReason = comfyOut.reason;
    actuatorId = "seedream_multiref";
  } else if (decision.preferComfy) {
    actuatorDegraded = true;
    actuatorDegradedReason = input.imageRunner ? "stub_runner_skip_comfy" : "comfy_skipped";
    actuatorId = "seedream_multiref";
  }

  const softEnvHung =
    (input.refsRoles ?? []).includes("softEnv") && input.keepSoftEnvRef !== false;
  const seedCompressed = compressStillEgressForSeedream({
    prompt: input.vendorPrompt,
    objectiveClass: input.objectiveClass,
    propClassId: input.propClassId,
    poseOccupancy: input.poseOccupancy,
    primaryIntentSeal: input.primaryIntentSeal,
    keepSoftEnvRef: input.keepSoftEnvRef === true,
    softEnvHung,
    bgSceneMust: input.softEnvContinuity === "must",
    stillPhase: input.stillPhase,
  });
  egressCompressed = true;
  vendorPromptUsed = seedCompressed.prompt;
  const seed = await input.runSeedream(seedCompressed.prompt);
  return {
    ...seed,
    vendorCalled: true,
    vendorMs: Date.now() - t0,
    actuatorId,
    actuatorDegraded,
    actuatorDegradedReason,
    workflowHash,
    propPlateGrade,
    egressCompressed,
    vendorPromptUsed,
  };
}
