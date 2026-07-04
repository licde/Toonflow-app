import fg from "fast-glob";
import path from "path";
import { readFile, writeFile } from "fs/promises";
import crypto from "crypto";

function fileNameToRoutePath(fileName: string): string {
  let routePath = fileName.replace(/\.(ts)$/, "");
  routePath = routePath.split(path.sep).join("/");
  routePath = routePath.replace(/\[([^\]]+)\]/g, (_, p1: string) => (p1.startsWith("...") ? "*" : `:${p1}`));
  if (routePath === "index") return "/";
  routePath = routePath.replace(/\/index$/, "");
  routePath = "/" + routePath.replace(/\/+/g, "/").replace(/\/$/, "");
  return routePath;
}

type RouteModulePair = { routePath: string; varName: string; entry: string; importPath: string };

export default async function generateRouter(): Promise<void> {
  let entries: string[] = await fg(["src/routes/**/*.ts"]);
  entries = entries.sort((a, b) => a.localeCompare(b));

  const routeModulePairs: RouteModulePair[] = [];

  entries.forEach((entry: string, i: number) => {
    const varName = `route${i + 1}`;
    let importPath = path.relative("src", entry).replace(/\\/g, "/");
    if (!importPath.startsWith(".")) importPath = "./" + importPath;
    importPath = importPath.replace(/\.ts$/, "");
    const routeKey = path.relative("src/routes", entry).replace(/\\/g, "/");
    const routePath = fileNameToRoutePath(routeKey);
    routeModulePairs.push({ routePath, varName, entry, importPath });
  });

  const routerData = JSON.stringify(routeModulePairs.map(({ routePath, varName }) => ({ routePath, varName })));
  const hash = crypto.createHash("md5").update(routerData).digest("hex");

  let content = `// @routes-hash ${hash}\nimport { Express, Request, Response, NextFunction, Router } from "express";\n\n`;
  content += `type RouteLoader = () => Promise<{ default: Router }>;\n\n`;

  for (const { varName, importPath } of routeModulePairs) {
    content += `const ${varName}: RouteLoader = () => import("${importPath}");\n`;
  }

  content += `\nconst lazyRoute = (loader: RouteLoader) => {\n`;
  content += `  let router: Router | null = null;\n`;
  content += `  return async (req: Request, res: Response, next: NextFunction) => {\n`;
  content += `    try {\n`;
  content += `      if (!router) router = (await loader()).default;\n`;
  content += `      return router(req, res, next);\n`;
  content += `    } catch (e) {\n`;
  content += `      next(e);\n`;
  content += `    }\n`;
  content += `  };\n`;
  content += `};\n\n`;

  content += `export default async (app: Express) => {\n`;
  for (const { routePath, varName } of routeModulePairs) {
    content += `  app.use("/api${routePath}", lazyRoute(${varName}));\n`;
  }
  content += `}\n`;

  let needWrite = true;
  try {
    const current = await readFile("src/router.ts", "utf8");
    const match = current.match(/^\/\/\s*@routes-hash\s*([a-z0-9]+)\n/);
    const currentHash = match ? match[1] : null;
    if (currentHash === hash) needWrite = false;
  } catch {
    needWrite = true;
  }
  if (needWrite) await writeFile("src/router.ts", content, "utf8");
}
