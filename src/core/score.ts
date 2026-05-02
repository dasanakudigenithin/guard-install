import { DetectorResult, RiskLevel, Confidence, Weight, PackageData } from "../types";

const WEIGHTS: Record<string, Weight> = {
  recency: { max: 40, weight: 1 },
  age: { max: 30, weight: 1 },
  maintainers: { max: 20, weight: 1 },
  scripts: { max: 80, weight: 1 },
  downloads: { max: 25, weight: 1 },
  typosquat: { max: 60, weight: 1.5 },
  metadata: { max: 15, weight: 1 },
  dependencies: { max: 30, weight: 1 },
  anomaly: { max: 10, weight: 1 },
};

export function computeRiskLevel(results: DetectorResult[]): { totalScore: number; riskLevel: RiskLevel } {
  let total = 0;
  for (const r of results) {
    const w = WEIGHTS[r.name] ?? { max: 100, weight: 1 };
    const capped = Math.min(r.score, w.max);
    total += capped * w.weight;
  }
  const finalScore = Math.min(100, Math.round(total));
  const riskLevel: RiskLevel = finalScore >= 61 ? "HIGH" : finalScore >= 31 ? "MEDIUM" : "LOW";
  return { totalScore: finalScore, riskLevel };
}

export function computeConfidence(pkgData: PackageData): Confidence {
  let signals = 0;
  if (pkgData.downloads != null) signals++;
  if (pkgData.time[pkgData.latestVersion]) signals++;
  if (pkgData.maintainers.length > 0) signals++;
  if (pkgData.downloads != null && pkgData.downloads > 10000) signals++;
  if (pkgData.repository) signals++;

  if (signals >= 4) return "HIGH";
  if (signals >= 2) return "MEDIUM";
  return "LOW";
}

export function detectAnomaly(pkgData: PackageData): DetectorResult | null {
  const modified = pkgData.time[pkgData.latestVersion];
  if (!modified || pkgData.downloads == null) return null;

  const hoursSinceUpdate = (Date.now() - new Date(modified).getTime()) / 3_600_000;
  const isHighDownloads = pkgData.downloads > 1_000_000;
  const isVeryRecent = hoursSinceUpdate < 24;

  if (isHighDownloads && isVeryRecent) {
    return { name: "anomaly", score: 10, message: "New version on high-download package (verify changelog)", level: "warn" };
  }
  return null;
}
