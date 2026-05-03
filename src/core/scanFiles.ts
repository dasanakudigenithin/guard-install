import fs from "fs";
import path from "path";

const MAX_FILE_SIZE = 1_000_000;
const MAX_FILES = 200;
const MAX_DEPTH = 6;
const MAX_TIME = 2000;
const CONTENT_SLICE = 5000;

const SCAN_EXTENSIONS = /\.(js|ts|mjs|cjs|sh|json|py)$/;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "vendor"]);

export type ScannedFile = { path: string; content: string };

function isProbablyText(content: string): boolean {
  return !content.includes("\0");
}

export function scanFiles(dir: string, results: ScannedFile[] = [], depth = 0, startTime = Date.now()): ScannedFile[] {
  if (depth > MAX_DEPTH) return results;
  if (results.length >= MAX_FILES) return results;
  if (Date.now() - startTime > MAX_TIME) return results;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (results.length >= MAX_FILES) break;
    if (Date.now() - startTime > MAX_TIME) break;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      scanFiles(fullPath, results, depth + 1, startTime);
    } else if (entry.isFile() && SCAN_EXTENSIONS.test(entry.name)) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > MAX_FILE_SIZE) continue;

        const content = fs.readFileSync(fullPath, "utf-8").slice(0, CONTENT_SLICE);
        if (!isProbablyText(content)) continue;

        results.push({ path: fullPath, content });
      } catch (e) {
        if (process.env.DEBUG) console.warn("Scan error:", fullPath);
      }
    }
  }

  return results;
}
