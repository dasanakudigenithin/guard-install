import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { fetchPackage } from "./fetchPackage";
import { computeRiskLevel } from "./score";
import { runDetector as recency } from "../detectors/recency";
import { runDetector as age } from "../detectors/age";
import { runDetector as maintainers } from "../detectors/maintainers";
import { runDetector as scripts } from "../detectors/scripts";
import { runDetector as downloads } from "../detectors/downloads";
import { runDetector as typosquat } from "../detectors/typosquat";
import { RiskLevel } from "../types";

const CONCURRENCY = 5;
const FETCH_TIMEOUT = 3000;

type AuditEntry = { name: string; score: number; risk: RiskLevel; reason: string };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function runWithLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: Promise<T>[] = [];
  const executing: Promise<any>[] = [];
  for (const task of tasks) {
    const p = task().then((r) => { executing.splice(executing.indexOf(p), 1); return r; });
    results.push(p);
    executing.push(p);
    if (executing.length >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}

export async function auditProject(cwd: string, jsonMode = false): Promise<void> {
  // Read dependencies from package.json and lockfile
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.log(chalk.red("No package.json found in current directory"));
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const depNames = Object.keys(allDeps);
  if (depNames.length === 0) {
    console.log(chalk.yellow("No dependencies found"));
    return;
  }

  if (!jsonMode) {
    console.log(chalk.cyan("\n🔍 Project Audit\n"));
  }

  const spinner = jsonMode ? null : ora(`Scanning ${depNames.length} dependencies...`).start();

  const high: AuditEntry[] = [];
  const medium: AuditEntry[] = [];
  let scanned = 0;

  const tasks = depNames.map((name) => async () => {
    try {
      const pkgData = await withTimeout(fetchPackage(name), FETCH_TIMEOUT);
      const results = [recency, age, maintainers, scripts, downloads, typosquat].map((fn) => fn(pkgData));
      const { totalScore, riskLevel } = computeRiskLevel(results);

      const topFactor = results.filter((r) => r.score > 0).sort((a, b) => b.score - a.score)[0];
      const reason = topFactor ? topFactor.message : "";

      if (riskLevel === "HIGH") high.push({ name, score: totalScore, risk: riskLevel, reason });
      else if (riskLevel === "MEDIUM") medium.push({ name, score: totalScore, risk: riskLevel, reason });
      scanned++;
    } catch {
      scanned++;
    }
  });

  await runWithLimit(tasks, CONCURRENCY);

  if (spinner) spinner.succeed(`${scanned} dependencies scanned`);

  if (jsonMode) {
    console.log(JSON.stringify({ scanned, high, medium }, null, 2));
    process.exit(high.length > 0 ? 1 : 0);
  }

  console.log(`\n  ${chalk.green("✔")} ${scanned} dependencies scanned`);
  if (high.length > 0) console.log(`  ${chalk.red("✗")} ${high.length} HIGH risk packages`);
  if (medium.length > 0) console.log(`  ${chalk.yellow("⚠")} ${medium.length} MEDIUM risk packages`);
  if (high.length === 0 && medium.length === 0) {
    console.log(chalk.green("\n  All dependencies look safe ✔\n"));
    return;
  }

  // Top risks
  const topRisks = [...high, ...medium].sort((a, b) => b.score - a.score).slice(0, 5);
  console.log(chalk.bold("\n  Top risks:\n"));
  for (const entry of topRisks) {
    const color = entry.risk === "HIGH" ? chalk.red : chalk.yellow;
    console.log(`  ${color("•")} ${chalk.bold(entry.name)} ${chalk.dim(`(${entry.reason})`)}`);
  }

  console.log("");
}
