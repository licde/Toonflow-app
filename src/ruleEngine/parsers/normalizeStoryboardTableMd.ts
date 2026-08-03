/**
 * Normalize GFM storyboard table markdown so each shot is one physical row.
 * Fixes LLM paste that glues "| 1 | ... || 2 | ..." onto one line.
 */
export function normalizeStoryboardTableMd(markdown: string): string {
  const raw = String(markdown ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";

  // Split glued rows: "... |Xs || N |" or "... |Xs | | N |" → newline before shot N
  let s = raw.replace(/\|\s*(\d+(?:\.\d+)?s)\s*\|\s*\|\s*(\d+)\s*\|/gi, "|$1 |\n| $2 |");
  s = s.replace(/\|\s*(\d+(?:\.\d+)?s)\s*\|\s+(\d+)\s*\|/gi, "|$1 |\n| $2 |");
  // Also: end of row without duration then next shot index after double pipe
  s = s.replace(/\|\s*\|\s*(\d+)\s*\|\s*(CHAR-SCENE|PURE-SCENE|PURE-PROP|CHAR-PROP)\b/gi, "|\n| $1 | $2");

  const lines = s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const HEADER = "| 镜 | 类型 | 场景 | 画面描写 | 景别 | 表演 | 台词 | 时长 |";
  const SEP = "| --- | --- | --- | --- | --- | --- | --- | --- |";

  const isSep = (line: string) => {
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    return cells.length >= 2 && cells.every((c) => /^:?-+:?$/.test(c));
  };
  const isHeader = (line: string) =>
    /镜号|^\s*镜\s*$|类型|画面描写|景别|表演/i.test(line) &&
    line.includes("|") &&
    !/CHAR-SCENE|PURE-SCENE|PURE-PROP|CHAR-PROP|\d+\s*s/i.test(line);

  const body: string[] = [];
  for (const line of lines) {
    if (isSep(line) || isHeader(line)) continue;
    if (!line.includes("|")) {
      body.push(line);
      continue;
    }
    // Escape bare pipes inside cells is hard after split; ensure leading/trailing pipes
    let row = line;
    if (!row.startsWith("|")) row = `| ${row}`;
    if (!row.endsWith("|")) row = `${row} |`;
    body.push(row);
  }

  if (!body.length) return raw;
  return [HEADER, SEP, ...body].join("\n");
}
