import { DetectorResult, PackageData } from "../types";

const DANGEROUS_KEYWORDS = ["curl", "wget", "bash", "sh ", "/bin/sh", "powershell", "eval(", "exec("];

export function runDetector(pkgData: PackageData): DetectorResult {
  const hasPostinstall = "postinstall" in pkgData.scripts;
  const hasPreinstall = "preinstall" in pkgData.scripts;

  if (!hasPostinstall && !hasPreinstall) {
    return { name: "scripts", score: 0, message: "No risky install scripts", level: "info" };
  }

  let score = 0;
  const details: string[] = [];
  let hasDangerous = false;

  if (hasPostinstall) {
    score += 35;
    const cmd = pkgData.scripts["postinstall"];
    details.push(`postinstall: "${cmd}"`);
    const flagged = DANGEROUS_KEYWORDS.filter((kw) => cmd.toLowerCase().includes(kw));
    if (flagged.length > 0) {
      hasDangerous = true;
      details.push(`  ⚡ dangerous keywords: ${flagged.join(", ")}`);
    }
  }

  if (hasPreinstall) {
    score += 25;
    const cmd = pkgData.scripts["preinstall"];
    details.push(`preinstall: "${cmd}"`);
    const flagged = DANGEROUS_KEYWORDS.filter((kw) => cmd.toLowerCase().includes(kw));
    if (flagged.length > 0) {
      hasDangerous = true;
      details.push(`  ⚡ dangerous keywords: ${flagged.join(", ")}`);
    }
  }

  if (hasDangerous) score += 20;

  const message = `Install scripts detected:\n     ${details.join("\n     ")}`;
  return { name: "scripts", score, message, level: "danger" };
}
