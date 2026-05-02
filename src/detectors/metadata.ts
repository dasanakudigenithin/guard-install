import { DetectorResult, PackageData } from "../types";

export function runDetector(pkgData: PackageData): DetectorResult {
  let score = 0;
  const issues: string[] = [];

  // Missing repository
  if (!pkgData.repository) {
    score += 5;
    issues.push("no repository URL");
  }

  // Version churn: many versions in short time
  const versions = Object.keys(pkgData.time).filter((k) => k !== "created" && k !== "modified");
  if (versions.length >= 3) {
    const recent = versions
      .map((v) => new Date(pkgData.time[v]).getTime())
      .sort((a, b) => b - a)
      .slice(0, 10);

    // Check if 5+ versions in last 24h
    const oneDayAgo = Date.now() - 86_400_000;
    const recentCount = recent.filter((t) => t > oneDayAgo).length;
    if (recentCount >= 5) {
      score += 10;
      issues.push(`${recentCount} versions published in last 24h`);
    }
  }

  if (score === 0) {
    return { name: "metadata", score: 0, message: "Package metadata looks normal", level: "info" };
  }

  return { name: "metadata", score, message: issues.join(", "), level: score >= 10 ? "danger" : "warn" };
}
