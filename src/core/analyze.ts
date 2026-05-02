import { AnalysisResult, PackageData } from "../types";
import { computeRiskLevel, computeConfidence, detectAnomaly } from "./score";
import { fetchDependencies } from "./fetchDependencies";
import { runDetector as recency } from "../detectors/recency";
import { runDetector as maintainers } from "../detectors/maintainers";
import { runDetector as scripts } from "../detectors/scripts";
import { runDetector as downloads } from "../detectors/downloads";
import { runDetector as typosquat } from "../detectors/typosquat";

export async function analyze(pkgData: PackageData): Promise<AnalysisResult> {
  const results = [recency, maintainers, scripts, downloads, typosquat].map((fn) => fn(pkgData));

  // Anomaly detection
  const anomaly = detectAnomaly(pkgData);
  if (anomaly) results.push(anomaly);

  // Dependency scanning
  const depAnalysis = await fetchDependencies(pkgData.name);

  // Add dependency inherited risk
  if (depAnalysis.inheritedScore > 0) {
    results.push({
      name: "dependencies",
      score: depAnalysis.inheritedScore,
      message: `Inherited risk from deps (${depAnalysis.highRisk.length} high, ${depAnalysis.mediumRisk.length} medium)`,
      level: depAnalysis.inheritedScore >= 15 ? "danger" : "warn",
    });
  }

  const { totalScore, riskLevel } = computeRiskLevel(results);
  const confidence = computeConfidence(pkgData);

  // Build explanation — top contributing factors
  const topFactors = results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => `${r.name} (+${r.score})`);

  return { packageName: pkgData.name, totalScore, riskLevel, confidence, results, depAnalysis, topFactors };
}
