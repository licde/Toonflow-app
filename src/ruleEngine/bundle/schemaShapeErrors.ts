import { ZodError } from "zod";

export interface SchemaShapeIssue {
  path: string;
  code: string;
  expected?: string;
  received?: string;
  message: string;
  repairHintId?: string;
}

export interface SchemaShapeBlockPayload {
  code: "SCHEMA_SHAPE_BLOCK";
  issues: SchemaShapeIssue[];
  repairHints: { id: string; message: string }[];
  chatRepairText: string;
}

const FIELD_REPAIR: Record<string, { id: string; template: string }> = {
  visualEffect: {
    id: "RH-MOD-01",
    template: '将 shots[].visualEffect 改为 string，如 "F1: 烛火摇曳，微光闪烁"；可选同镜 fxLevel: "F1"。禁止 object {level,desc}。',
  },
  audioCue: {
    id: "RH-MOD-AV",
    template: '将 shots[].audioCue 改为 string（如 "茶盏碎裂声骤停"），禁止 object {beat,type}。',
  },
  spatialRelation: {
    id: "RH-SPATIAL-OBJ",
    template:
      '将 shots[].spatialRelation / narrative.spatialRelation 改为站位 string，例如 "axis=女主-男主；anchors=女主左|男主右"。禁止直接贴 B13 对象 {axis,anchors}。',
  },
  beats: {
    id: "RH-B12-BEATS",
    template:
      'designBrief.B12[].beats 必须为节拍数量 number（如 2）；叙事说明写入 summary（如 "自残取佩，立下决意"），禁止把叙事串写进 beats。',
  },
};

const PATH_REPAIR: { test: (path: string) => boolean; id: string; template: string }[] = [
  {
    test: (p) => /\.B12(\.|$)/.test(p) || p.includes("designBrief.B12"),
    id: "RH-B12-BEATS",
    template: FIELD_REPAIR.beats!.template,
  },
  {
    test: (p) => p.includes("spatialRelation"),
    id: "RH-SPATIAL-OBJ",
    template: FIELD_REPAIR.spatialRelation!.template,
  },
];

function pathTail(path: (string | number)[]): string {
  const last = path[path.length - 1];
  return typeof last === "string" ? last : path.join(".");
}

function issueRepairHint(path: (string | number)[], pathStr: string, expected?: string, received?: string): SchemaShapeIssue["repairHintId"] {
  const tail = pathTail(path);
  if (tail in FIELD_REPAIR) return FIELD_REPAIR[tail]!.id;
  for (const rule of PATH_REPAIR) {
    if (rule.test(pathStr)) return rule.id;
  }
  if (expected === "string" && received === "object") return "RH-SHAPE-STRING";
  return undefined;
}

export function formatSchemaShapeBlock(err: ZodError): SchemaShapeBlockPayload {
  const issues: SchemaShapeIssue[] = err.issues.map((iss) => {
    const path = iss.path.map(String).join(".");
    const expected = "expected" in iss ? String(iss.expected) : undefined;
    const received = "received" in iss ? String((iss as { received?: unknown }).received) : undefined;
    const repairHintId = issueRepairHint(
      iss.path.filter((p): p is string | number => typeof p === "string" || typeof p === "number"),
      path,
      expected,
      received,
    );
    return {
      path,
      code: iss.code,
      expected,
      received,
      message: iss.message,
      repairHintId,
    };
  });

  const hintIds = new Set<string>();
  const repairHints: { id: string; message: string }[] = [];

  const pushHint = (id: string, message: string) => {
    if (hintIds.has(id)) return;
    hintIds.add(id);
    repairHints.push({ id, message });
  };

  for (const iss of issues) {
    const tail = iss.path.split(".").pop() ?? "";
    const spec = FIELD_REPAIR[tail];
    if (spec) pushHint(spec.id, spec.template);
    for (const rule of PATH_REPAIR) {
      if (rule.test(iss.path)) pushHint(rule.id, rule.template);
    }
    if (iss.repairHintId === "RH-SHAPE-STRING") {
      pushHint("RH-SHAPE-STRING", `字段 ${iss.path} 期望 string，收到 object — 请改为 canonical string 或省略 key。`);
    }
  }

  const lines = [
    "【形态错误 SCHEMA_SHAPE_BLOCK — 请修正 JSON 形状后再导入】",
    ...issues.slice(0, 12).map((i) => `- ${i.path}: ${i.message}`),
    "",
    ...repairHints.map((h) => `[${h.id}] ${h.message}`),
  ];

  return {
    code: "SCHEMA_SHAPE_BLOCK",
    issues,
    repairHints,
    chatRepairText: lines.join("\n"),
  };
}

export class SchemaShapeBlockError extends Error {
  readonly payload: SchemaShapeBlockPayload;

  constructor(err: ZodError) {
    const payload = formatSchemaShapeBlock(err);
    super(JSON.stringify(payload));
    this.name = "SchemaShapeBlockError";
    this.payload = payload;
  }
}

/** Parse scriptBundleSchema with structured shape block on failure. */
export function parseScriptBundleOrThrowShape(bundle: Record<string, unknown>, schema: { parse: (v: unknown) => unknown }) {
  try {
    return schema.parse(bundle);
  } catch (e) {
    if (e instanceof ZodError) throw new SchemaShapeBlockError(e);
    throw e;
  }
}
