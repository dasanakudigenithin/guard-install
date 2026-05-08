import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { execSync } from "child_process";
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

type ScanEntry = { name: string; score: number; risk: RiskLevel; reason: string };

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

export async function scanAndInstall(cwd: string, opts: { yes?: boolean; dryRun?: boolean; strict?: boolean; paranoid?: boolean }): Promise<void> {
  const pkgPath = path.join(cwd, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  const depNames = Object.keys(allDeps);

  if (depNames.length === 0) {
    console.log(chalk.yellow("\nNo dependencies found in package.json\n"));
    return;
  }

  console.log(chalk.cyan(`\n📦 Found ${depNames.length} dependencies\n`));
  const spinner = ora(`Scanning packages...`).start();

  const high: ScanEntry[] = [];
  const medium: ScanEntry[] = [];
  let low = 0;
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
      else low++;
      scanned++;
    } catch {
      scanned++;
      low++;
    }
  });

  await runWithLimit(tasks, CONCURRENCY);
  spinner.succeed(`${scanned} packages scanned`);

  // Summary
  console.log("");
  console.log(`${chalk.green("🟢")} ${low} low risk`);
  if (medium.length > 0) console.log(`${chalk.yellow("🟡")} ${medium.length} medium risk`);
  if (high.length > 0) console.log(`${chalk.red("🔴")} ${high.length} high risk`);

  // Details for risky packages
  if (high.length > 0) {
    console.log(chalk.red.bold("\nHigh risk:"));
    for (const entry of high) {
      console.log(`  ${chalk.red("•")} ${chalk.bold(entry.name)}`);
      console.log(chalk.dim(`    → ${entry.reason}`));
    }
  }

  if (medium.length > 0) {
    console.log(chalk.yellow.bold("\nMedium risk:"));
    for (const entry of medium.slice(0, 3)) {
      console.log(`  ${chalk.yellow("•")} ${chalk.bold(entry.name)}`);
      console.log(chalk.dim(`    → ${entry.reason}`));
    }
    if (medium.length > 3) console.log(chalk.dim(`  ... and ${medium.length - 3} more`));
  }

  console.log("");

  // Block in strict/paranoid modes
  if (opts.paranoid && (high.length > 0 || medium.length > 0)) {
    console.log(chalk.red.bold("🚫 Blocked — risky packages detected in paranoid mode\n"));
    process.exit(1);
  }
  if (opts.strict && high.length > 0) {
    console.log(chalk.red.bold("🚫 Blocked — high risk packages detected in strict mode\n"));
    process.exit(1);
  }

  if (opts.dryRun) return;

  // Prompt for safe install
  const proceed = opts.yes || await askInstall(high.length > 0);
  if (proceed) {
    console.log("");
    execSync("npm install --ignore-scripts", { stdio: "inherit", cwd });
    console.log(chalk.green("\n✔ Installed safely with --ignore-scripts\n"));
  } else {
    console.log(chalk.yellow("\nInstallation cancelled.\n"));
  }
}

async function askInstall(hasHighRisk: boolean): Promise<boolean> {
  const message = hasHighRisk
    ? "⚠ High risk packages detected. Proceed with safe install (--ignore-scripts)?"
    : "Proceed with safe install (--ignore-scripts)?";

  const { proceed } = await inquirer.prompt([
    { type: "confirm", name: "proceed", message, default: !hasHighRisk },
  ]);
  return proceed;
}
