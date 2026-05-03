import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs";

const execAsync = promisify(exec);

export function validateRepoUrl(url: string): void {
  if (!url.startsWith("https://") && !url.startsWith("git@")) {
    throw new Error("Invalid repository URL. Please provide an HTTPS or SSH git URL.");
  }
  if (url.includes("/topics/") || url.includes("/search") || url.includes("/explore")) {
    throw new Error("Invalid repository URL. Please provide a direct repo link, not a GitHub page.");
  }
}

export async function cloneRepo(repoUrl: string): Promise<string> {
  validateRepoUrl(repoUrl);

  const tempDir = path.join(os.tmpdir(), `guard-install-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    await execAsync(`git clone --depth 1 ${repoUrl} ${tempDir}`, { timeout: 30_000 });
    return tempDir;
  } catch (err: any) {
    cleanup(tempDir);
    const msg = err.stderr?.includes("not found")
      ? "Repository not found. Check the URL or ensure it's not private."
      : err.killed
        ? "Clone timed out. The repository may be too large or the network is slow."
        : "Failed to clone repository. Ensure the URL is correct and accessible.";
    throw new Error(msg);
  }
}

export function cleanup(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}
