#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

const target = path.join(process.cwd(), "observability.config.json");
if (fs.existsSync(target)) {
  console.log("observability.config.json already exists");
  process.exit(0);
}
fs.copyFileSync(path.join(__dirname, "../../observability.config.example.json"), target);
console.log("Created observability.config.json — profile: balanced");
