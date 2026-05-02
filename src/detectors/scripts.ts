import { DetectorResult, PackageData } from "../types";

const DANGEROUS_KEYWORDS = ["curl", "wget", "bash", "sh ", "/bin/sh", "powershell", "nc ", "node -e", "eval(", "exec("];

export function runDetector(pkgData: PackageData): DetectorResult {
  const hasPostinstall = "postinstall" in pkgData.scripts;
  const hasPreinstall = "preinstall" in pkgData.scripts;

  if (!hasPostinstall && !hasPreinstall) {
    return { name: "scripts", score: 0, message: "No risky install scripts", level: "info" };
  }

  let score = 0;
  const details: string[] = [];

  if (hasPostinstall) {
    score += 35;
    details.push(`postinstall: "${pkgData.scripts["postinstall"]}"`);
  }
  if (hasPreinstall) {
    score += 25;
    details.push(`preinstall: "${pkgData.scripts["preinstall"]}"`);
  }

  // Keyword content scanning — each hit adds +15
  let keywordExtra = 0;
  const flaggedKeywords: string[] = [];
  for (const hook of ["postinstall", "preinstall"]) {
    const cmd = pkgData.scripts[hook];
    if (!cmd) continue;
    for (const kw of DANGEROUS_KEYWORDS) {
      if (cmd.toLowerCase().includes(kw) && !flaggedKeywords.includes(kw)) {
        keywordExtra += 15;
        flaggedKeywords.push(kw);
      }
    }
  }

  if (flaggedKeywords.length > 0) {
    score += keywordExtra;
    details.push(`  ⚡ dangerous keywords: ${flaggedKeywords.join(", ")}`);
  }

  const message = `Install scripts detected:\n     ${details.join("\n     ")}`;
  return { name: "scripts", score, message, level: "danger" };
}
