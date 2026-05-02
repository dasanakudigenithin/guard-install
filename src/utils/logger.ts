import chalk from "chalk";
import { AnalysisResult } from "../types";

export function logInfo(msg: string): void {
  console.log(chalk.blue(msg));
}

export function logWarn(msg: string): void {
  console.log(chalk.yellow(`⚠ ${msg}`));
}

export function logError(msg: string): void {
  console.log(chalk.red(`✗ ${msg}`));
}

export function logSuccess(msg: string): void {
  console.log(chalk.green(`✔ ${msg}`));
}

export function printReport(result: AnalysisResult): void {
  console.log("");
  for (const r of result.results) {
    if (r.level === "info") logSuccess(r.message);
    else if (r.level === "warn") logWarn(r.message);
    else logError(r.message);
  }

  // Dependency analysis section
  if (result.depAnalysis) {
    const dep = result.depAnalysis;
    console.log(chalk.bold("\n📦 Dependency Analysis\n"));
    console.log(`  ${dep.totalScanned} dependencies scanned`);
    if (dep.mediumRisk.length > 0) logWarn(`${dep.mediumRisk.length} flagged as medium risk`);
    if (dep.highRisk.length > 0) logError(`${dep.highRisk.length} flagged as high risk`);
    if (dep.tooManyDeps) logWarn(`Too many dependencies (${dep.totalScanned} > 50)`);
    if (dep.inheritedScore > 0) {
      console.log(chalk.yellow(`\n  ⚠ Inherited Risk: +${dep.inheritedScore}`));
    }
  }

  const riskColor = result.riskLevel === "HIGH" ? chalk.red : result.riskLevel === "MEDIUM" ? chalk.yellow : chalk.green;
  const confColor = result.confidence === "HIGH" ? chalk.green : result.confidence === "MEDIUM" ? chalk.yellow : chalk.red;

  console.log(`\nRisk Score: ${result.totalScore}/100 → ${riskColor(result.riskLevel)}`);
  console.log(`Confidence: ${confColor(result.confidence)}`);

  // Top risk factors explanation
  if (result.topFactors && result.topFactors.length > 0) {
    console.log(chalk.dim(`\nTop Risk Factors:`));
    for (const f of result.topFactors) {
      console.log(chalk.dim(`  - ${f}`));
    }
  }

  console.log("");
}
