type CameraAnchorEntry = { name?: string; height?: string; anchor?: string };
type VisualFocusEntry = { 层级?: string; 说明?: string; 拍摄要求?: string };

const ANCHOR_EN: Record<string, string> = {
  "角色眼睛与镜头平齐，背景居中": "eye level with subject, centered background",
  "角色半侧面，视线方向留白1/3": "45-degree angle, subject in profile, negative space in gaze direction",
  "前景肩膀虚化，焦点在对方": "over-the-shoulder shot, blurred foreground shoulder, focus on subject",
  "角色头顶在画面1/3处，背景扩大": "15-degree high angle, head at upper third, expanded background",
  "面部占画面60%+，背景虚化": "close-up, face fills 60%+ of frame, shallow depth of field",
  "分别从两人肩后拍摄对方": "shot-reverse-shot, alternating over-shoulder angles",
};

const HEIGHT_EN: Record<string, string> = {
  齐眉: "eye level",
  齐肩: "shoulder level",
  高于头顶: "above head level",
  交替: "alternating height",
};

export function translateCameraAnchor(entry?: CameraAnchorEntry): string {
  if (!entry) return "";
  const parts: string[] = [];
  if (entry.anchor && ANCHOR_EN[entry.anchor]) parts.push(ANCHOR_EN[entry.anchor]);
  else if (entry.anchor) parts.push(entry.anchor);
  if (entry.height && HEIGHT_EN[entry.height]) parts.push(HEIGHT_EN[entry.height]);
  if (entry.name?.includes("特写")) parts.push("close-up framing");
  return parts.join(", ");
}

export function translateVisualFocus(focus?: VisualFocusEntry): string {
  if (!focus) return "";
  const req = focus["拍摄要求"] || "";
  const parts: string[] = [];
  const pct = req.match(/(\d+)\s*%/);
  if (/面部占|脸占/.test(req) && pct) {
    parts.push(`close-up, face fills ${pct[1]}% of frame, shallow depth of field`);
  } else if (/特写|大特写/.test(focus["层级"] || "") || /特写/.test(req)) {
    parts.push("close-up shot, shallow depth of field");
  }
  if (/空镜|无人物/.test(req)) parts.push("empty scene, no people");
  if (/上半身/.test(req)) parts.push("medium shot, upper body visible");
  if (/手部/.test(req)) parts.push("hands visible in frame");
  return parts.join(", ");
}

export function stripPromptTokens(prompt: string): string {
  return prompt
    .replace(/\s*--cref\s+\S+/gi, "")
    .replace(/\s*--sref\s+\S+/gi, "")
    .replace(/\s*--ar\s+\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}
