/**
 * Run still vendor — Seedream-first handbook rebuild.
 * EN 7-field compiler is primary egress; Comfy only on explicit forceComfy.
 * Literary SSOT stays in DB. Soft-only: iso no-delta → heal salt continue (never block generate).
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
  vendorPromptUsed?: string;
  seedreamFields?: Record<string, string>;
  healedFields?: string[];
  missingSlots?: string[];
  blocksGenerate: false;
};

export async function runStillVendorWithActuatorCore(input: {
  vendorPrompt: string;
  referenceList: { type: "image"; base64: string }[];
  refsRoles?: string[];
  castNames?: string[];
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
  runSeedream: (promptOverride?: string) => Promise<{ url: string; savePath: string; imageBase64: string }>;
  prevGenFingerprint?: string | null;
  forceIsoSpend?: boolean;
  deltaHints?: string[] | null;
  visualDescription?: string | null;
  poseOccupancy?: string | null;
  primaryIntentSeal?: { poseOccupancy?: string; sealHash?: string } | null;
  stillPhase?: string | null;
  primaryName?: string | null;
  actionLine?: string | null;
  propName?: string | null;
  propLine?: string | null;
  shotSize?: string | null;
  sceneName?: string | null;
  colorTempK?: number | string | null;
  dialogueLines?: string[] | null;
  readableZhText?: string | null;
  forceComfy?: boolean | null;
  allowComfyAccel?: boolean | null;
  vendorSeed?: number | null;
}): Promise<StillVendorRunResult> {
  const {
    selectStillActuatorProfile,
    compressStillEgressForActuator,
    resolvePropPlateGrade,
  } = await import("@/ruleEngine/compilers/stillActuatorProfile");
  const { compileSeedreamVendorPrompt } = await import(
    "@/ruleEngine/compilers/seedreamPromptCompiler"
  );

  // Rebuild full @图N ledger + ZH handbook egress (Seedream multi-ref SSOT)
  let preferredBind = "";
  let preferredZh = "";
  const castNames =
    input.castNames?.map((n) => String(n ?? "").trim()).filter(Boolean) ||
    (input.primaryName ? [String(input.primaryName)] : undefined);
  const propNameGuess =
    String(input.propName ?? "").trim() ||
    String(input.propLine ?? "").trim() ||
    String(input.readableZhText ?? "").trim() ||
    (/休书|婚书|信笺/.exec(String(input.visualDescription ?? ""))?.[0] ?? "");
  try {
    const { buildEventRefOrdinalBinding } =
      require("@/ruleEngine/compilers/eventPlateReadiness") as typeof import("@/ruleEngine/compilers/eventPlateReadiness");
    preferredBind = buildEventRefOrdinalBinding({
      roles: (input.refsRoles ?? []) as Array<"identity" | "propSoft" | "softEnv">,
      propRequired: input.objectiveClass === "contact_geom" || Boolean(input.propPlateMissing) === false,
      softEnvBakedIntoIdentity: false,
      poseOccupancy: input.poseOccupancy ?? input.primaryIntentSeal?.poseOccupancy,
      stillPhase: input.stillPhase,
      castNames,
      propName: propNameGuess || null,
      sceneName: input.sceneName,
    });
    const { compileSeedreamAtTuZhPrompt } =
      require("@/ruleEngine/compilers/tunOrdinalBinding") as typeof import("@/ruleEngine/compilers/tunOrdinalBinding");
    preferredZh = compileSeedreamAtTuZhPrompt({
      refsRoles: input.refsRoles,
      castNames,
      propName: propNameGuess || null,
      primaryName: input.primaryName,
      visualDescription: input.visualDescription,
      actionLine: input.actionLine,
      shotSize: input.shotSize,
      sceneName: input.sceneName,
      poseOccupancy: input.poseOccupancy ?? input.primaryIntentSeal?.poseOccupancy,
      stillPhase: input.stillPhase,
      readableZhText: input.readableZhText,
      colorTempK: input.colorTempK,
      preferredBindingBlock: preferredBind,
    }).prompt;
  } catch {
    preferredBind = "";
    preferredZh = "";
  }

  // Bend + softEnv: blur altar pixels before Seedream (kneel contamination)
  let referenceList = input.referenceList;
  const roles = input.refsRoles ?? [];
  const softIdx = roles.indexOf("softEnv");
  const bendOcc =
    input.poseOccupancy === "bend_pickup" ||
    input.primaryIntentSeal?.poseOccupancy === "bend_pickup" ||
    /弯腰|捡起|捡拾/.test(String(input.visualDescription ?? ""));
  if (bendOcc && softIdx >= 0 && referenceList[softIdx]?.base64) {
    try {
      const { softenSoftEnvPlateForAtmosphere } = await import(
        "@/ruleEngine/compilers/eventPlateReadiness"
      );
      const soft = await softenSoftEnvPlateForAtmosphere(referenceList[softIdx]!.base64, {
        softEnvContinuity: input.softEnvContinuity === "must" ? "must" : "optional",
        sceneMust: input.softEnvContinuity === "must",
      });
      if (soft.base64) {
        referenceList = referenceList.map((r, i) =>
          i === softIdx ? { type: "image" as const, base64: soft.base64! } : r,
        );
      }
    } catch {
      /* optional */
    }
  }

  const compiled = compileSeedreamVendorPrompt({
    visualDescription: input.visualDescription ?? input.vendorPrompt,
    primaryName: input.primaryName,
    actionLine: input.actionLine ?? input.vendorPrompt,
    propLine: input.propLine,
    shotSize: input.shotSize,
    poseOccupancy: input.poseOccupancy ?? input.primaryIntentSeal?.poseOccupancy,
    stillPhase: input.stillPhase,
    objectiveClass: input.objectiveClass,
    colorTempK: input.colorTempK,
    sceneName: input.sceneName,
    dialogueLines: input.dialogueLines,
    readableZhText: input.readableZhText,
    refsRoles: input.refsRoles,
    zhPromptWithTun: input.vendorPrompt,
  });

  // Force Seedream ZH @图N handbook as vendor bytes — never EN-first / 图1= when refs hung
  const nRefs = input.refsRoles?.length ?? input.referenceList?.length ?? 0;
  let vendorEgress = preferredZh || compiled.promptVendor || "";
  let attuMissing: string[] = [];
  try {
    const {
      mergeTunBindingIntoVendorPrompt,
      assertAtTuHomology,
      stripLegacyStillVendorEgress,
      compileSeedreamAtTuZhPrompt,
    } = require("@/ruleEngine/compilers/tunOrdinalBinding") as typeof import("@/ruleEngine/compilers/tunOrdinalBinding");
    const merged = mergeTunBindingIntoVendorPrompt({
      promptEn: compiled.promptEn,
      refsRoles: input.refsRoles,
      castNames,
      propName: propNameGuess || null,
      sceneName: input.sceneName,
      primaryName: input.primaryName,
      poseOccupancy: input.poseOccupancy ?? input.primaryIntentSeal?.poseOccupancy,
      stillPhase: input.stillPhase,
      readableZhText: input.readableZhText,
      shotSize: input.shotSize,
      colorTempK: input.colorTempK,
      zhPromptWithTun: input.vendorPrompt,
      preferredBindingBlock: preferredBind || compiled.bindingBlock,
      preferredZhEgress: preferredZh || compiled.promptVendor,
    });
    vendorEgress = stripLegacyStillVendorEgress(merged.prompt);
    let homo = assertAtTuHomology(vendorEgress, nRefs);
    if (nRefs > 0 && !homo.ok) {
      const forced = preferredZh ||
        compileSeedreamAtTuZhPrompt({
          refsRoles: input.refsRoles,
          castNames,
          propName: propNameGuess || null,
          primaryName: input.primaryName,
          visualDescription: input.visualDescription,
          actionLine: input.actionLine,
          shotSize: input.shotSize,
          sceneName: input.sceneName,
          poseOccupancy: input.poseOccupancy ?? input.primaryIntentSeal?.poseOccupancy,
          stillPhase: input.stillPhase,
          readableZhText: input.readableZhText,
          colorTempK: input.colorTempK,
          preferredBindingBlock: preferredBind,
        }).prompt;
      vendorEgress = stripLegacyStillVendorEgress(forced);
      homo = assertAtTuHomology(vendorEgress, nRefs);
    }
    attuMissing = homo.missingSlots;
    // Last resort: never ship EN / 图1= with hung refs
    if (nRefs > 0 && (/参考绑定|图\d\s*[=＝]/.test(vendorEgress) || !/@图\d\s*为/.test(vendorEgress))) {
      vendorEgress = preferredZh || vendorEgress;
      attuMissing = [...new Set([...attuMissing, "ref.attu_format"])];
    }
  } catch {
    if (nRefs > 0 && preferredZh) vendorEgress = preferredZh;
    else if (!vendorEgress) vendorEgress = compiled.promptEn;
  }

  try {
    const { hashStillGenFingerprint, assertStillGenDeltaOrThrow, applyLiteraryRepairDeltaSalt } =
      await import("@/ruleEngine/quality/isoRegenHardDelta");
    let nextFp = hashStillGenFingerprint({
      promptUsed: vendorEgress,
      refsRoles: input.refsRoles,
      visualDescription: input.visualDescription,
      actuatorId: "seedream_multiref",
      vendorSeed: input.vendorSeed,
      seedreamFields: compiled.fields,
    });
    const hints = [
      ...(input.deltaHints ?? []),
      ...compiled.healedFields.map((f) => `heal.field:${f}`),
    ];
    if (hints.length > 0) {
      nextFp = applyLiteraryRepairDeltaSalt(nextFp, hints);
    }
    const delta = assertStillGenDeltaOrThrow({
      prevFingerprint: input.prevGenFingerprint,
      nextFingerprint: nextFp,
      force: input.forceIsoSpend,
      deltaHints: hints,
    });
    // Soft-only: isomorphic → auto salt and continue (never throw block generate)
    if (!delta.ok) {
      applyLiteraryRepairDeltaSalt(nextFp, ["heal.iso_soft_continue", `t:${Date.now()}`]);
    }
  } catch (e: unknown) {
    if (e && typeof e === "object" && (e as { code?: string }).code === "ISO_REGEN_NO_DELTA") {
      /* soft continue */
    } else if (e && typeof e === "object" && (e as { code?: string }).code) {
      /* optional */
    }
  }

  const decision = selectStillActuatorProfile({
    objectiveClass: input.objectiveClass,
    softEnvContinuity: input.softEnvContinuity,
    keepSoftEnvRef: input.keepSoftEnvRef,
    allowComfyAccel: input.allowComfyAccel,
    forceComfy: input.forceComfy,
    visualDescription: input.visualDescription,
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
  let vendorPromptUsed = vendorEgress;

  if (decision.preferComfy && !input.imageRunner && referenceList[0]?.base64) {
    const { runComfyContactSoftEnv } = await import("@/ruleEngine/actuators/comfyStillActuator");
    const compressed = compressStillEgressForActuator({
      prompt: input.vendorPrompt,
      objectiveClass: input.objectiveClass,
      propClassId: input.propClassId,
      poseOccupancy: input.poseOccupancy,
      primaryIntentSeal: input.primaryIntentSeal,
      stillPhase: input.stillPhase,
    });
    let identityB64 = referenceList[0].base64;
    const softIdxComfy = (input.refsRoles ?? []).indexOf("softEnv");
    let softB64 =
      softIdxComfy >= 0
        ? referenceList[softIdxComfy]?.base64
        : referenceList[referenceList.length - 1]?.base64;
    const propIdx = (input.refsRoles ?? []).indexOf("propSoft");
    try {
      const { softenSoftEnvPlateForAtmosphere } = await import(
        "@/ruleEngine/compilers/eventPlateReadiness"
      );
      if (softB64) {
        const soft = await softenSoftEnvPlateForAtmosphere(softB64, {
          softEnvContinuity: input.softEnvContinuity === "must" ? "must" : "optional",
          sceneMust: input.softEnvContinuity === "must",
        });
        if (soft.base64) softB64 = soft.base64;
      }
    } catch {
      /* optional */
    }
    const comfyOut = await runComfyContactSoftEnv({
      identityBase64: identityB64,
      softEnvBase64: softB64,
      propSoftBase64:
        propIdx >= 0 ? referenceList[propIdx]?.base64 : referenceList[1]?.base64,
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
        seedreamFields: compiled.fields,
        healedFields: compiled.healedFields,
        missingSlots: compiled.missingSlots,
        blocksGenerate: false,
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

  vendorPromptUsed = vendorEgress;
  const seed = await input.runSeedream(vendorEgress);
  return {
    ...seed,
    vendorCalled: true,
    vendorMs: Date.now() - t0,
    actuatorId,
    actuatorDegraded,
    actuatorDegradedReason,
    workflowHash,
    propPlateGrade,
    egressCompressed: true,
    vendorPromptUsed,
    seedreamFields: compiled.fields,
    healedFields: compiled.healedFields,
    missingSlots: [
      ...compiled.missingSlots,
      ...attuMissing,
      ...(input.propPlateMissing && input.objectiveClass === "contact_geom"
        ? ["propSoft", "contactGeom"]
        : []),
      ...(!compiled.bindingBlock && nRefs > 0 ? ["ref.ordinal_mismatch"] : []),
    ],
    blocksGenerate: false,
  };
}
