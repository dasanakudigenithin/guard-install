#!/usr/bin/env node
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import fs from "fs";
import path from "path";
import os from "os";
import { fetchPackage } from "../core/fetchPackage";
import { analyze } from "../core/analyze";
import { auditProject } from "../core/audit";
import { scanRepo } from "../core/repoScan";
import { printReport } from "../utils/logger";
import { confirmInstall } from "../utils/prompt";
import { safeInstall } from "../installer/install";
import { AnalysisResult } from "../types";

const CACHE_DIR = path.join(os.homedir(), ".guard-install");
const CACHE_FILE = path.join(CACHE_DIR, "cache.json");
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

function readCache(pkg: string): AnalysisResult | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    const entry = data[pkg];
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.result;
  } catch {}
  return null;
}

function writeCache(pkg: string, result: AnalysisResult): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    let data: Record<string, any> = {};
    try { data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")); } catch {}
    data[pkg] = { result, timestamp: Date.now() };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {}
}

type Opts = {
  yes?: boolean;
  dryRun?: boolean;
  json?: boolean;
  explain?: boolean;
  strict?: boolean;
  paranoid?: boolean;
  ci?: boolean;
};

function shouldBlock(result: AnalysisResult, opts: Opts): boolean {
  if (opts.paranoid && (result.riskLevel === "HIGH" || result.riskLevel === "MEDIUM")) return true;
  if (opts.strict && result.riskLevel === "HIGH") return true;
  return false;
}

const program = new Command();

program
  .name("guard-install")
  .version("0.1.0", "-v, --version")
  .description("Analyze npm packages for risk before installation")
  .argument("[package]", "package name to analyze")
  .option("-y, --yes", "skip confirmation prompt")
  .option("--dry-run", "analyze only, do not install")
  .option("--json", "output machine-readable JSON")
  .option("--explain", "show detailed score breakdown")
  .option("--strict", "block HIGH risk packages")
  .option("--paranoid", "block MEDIUM and HIGH risk packages")
  .option("--audit", "scan all dependencies in current project")
  .option("--repo <url>", "scan a git repository for risky patterns")
  .option("--ci", "CI mode: JSON output, exit 1 on HIGH risk")
  .action(async (packageName: string | undefined, opts: Opts & { audit?: boolean; repo?: string }) => {
    // Repo scan mode
    if (opts.repo) {
      await scanRepo(opts.repo);
      return;
    }

    // Audit mode
    if (opts.audit) {
      await auditProject(process.cwd(), opts.json || opts.ci);
      return;
    }

    if (!packageName) {
      console.log(chalk.red("Error: package name required (or use --audit)"));
      process.exit(1);
    }

    // CI mode = JSON + strict exit codes
    if (opts.ci) {
      opts.json = true;
    }
    const silent = opts.json;
    const modeLabel = opts.paranoid ? chalk.red(" [PARANOID]") : opts.strict ? chalk.yellow(" [STRICT]") : "";

    // Check cache first
    const cached = readCache(packageName);
    if (cached && silent) {
      const output = {
        package: cached.packageName,
        score: cached.totalScore,
        risk: cached.riskLevel,
        confidence: cached.confidence,
        results: cached.results.map((r) => ({ name: r.name, score: r.score, level: r.level, message: r.message })),
        dependencies: cached.depAnalysis ? {
          scanned: cached.depAnalysis.totalScanned,
          highRisk: cached.depAnalysis.highRisk,
          mediumRisk: cached.depAnalysis.mediumRisk,
        } : undefined,
      };
      console.log(JSON.stringify(output, null, 2));
      process.exit(cached.riskLevel === "HIGH" ? 1 : 0);
    }
    if (cached && !silent) {
      console.log(chalk.cyan(`\n🔍 Analyzing: ${packageName}`) + chalk.dim(" (cached)") + modeLabel + "\n");
      printReport(cached, opts.explain);
      if (opts.dryRun) process.exit(0);
      if (shouldBlock(cached, opts)) {
        console.log(chalk.red.bold(`\n🚫 Blocked — ${cached.riskLevel} risk package not allowed in ${opts.paranoid ? "paranoid" : "strict"} mode\n`));
        process.exit(1);
      }
      const proceed = opts.yes || await confirmInstall(packageName);
      if (proceed) {
        safeInstall(packageName);
        console.log(chalk.green(`\n✔ ${packageName} installed safely with --ignore-scripts`));
      } else {
        console.log(chalk.yellow("\nInstallation cancelled."));
      }
      return;
    }

    if (!silent) console.log(chalk.cyan(`\n🔍 Analyzing: ${packageName}`) + modeLabel + "\n");
    const spinner = silent ? null : ora("Fetching package metadata...").start();

    try {
      const pkgData = await fetchPackage(packageName);
      if (spinner) spinner.text = "Scanning dependencies...";

      const result = await withTimeout(analyze(pkgData), 30_000);
      if (spinner) spinner.succeed("Analysis complete");

      writeCache(packageName, result);

      if (silent) {
        const output = {
          package: result.packageName,
          score: result.totalScore,
          risk: result.riskLevel,
          confidence: result.confidence,
          results: result.results.map((r) => ({ name: r.name, score: r.score, level: r.level, message: r.message })),
          dependencies: result.depAnalysis ? {
            scanned: result.depAnalysis.totalScanned,
            highRisk: result.depAnalysis.highRisk,
            mediumRisk: result.depAnalysis.mediumRisk,
          } : undefined,
        };
        console.log(JSON.stringify(output, null, 2));
        process.exit(result.riskLevel === "HIGH" ? 1 : 0);
      }

      printReport(result, opts.explain);

      if (shouldBlock(result, opts)) {
        console.log(chalk.red.bold(`\n🚫 Blocked — ${result.riskLevel} risk package not allowed in ${opts.paranoid ? "paranoid" : "strict"} mode\n`));
        process.exit(1);
      }

      if (opts.dryRun) process.exit(0);

      const proceed = opts.yes || await confirmInstall(packageName);
      if (proceed) {
        safeInstall(packageName);
        console.log(chalk.green(`\n✔ ${packageName} installed safely with --ignore-scripts`));
      } else {
        console.log(chalk.yellow("\nInstallation cancelled."));
      }
    } catch (err: any) {
      if (spinner) spinner.fail(err.message);
      else console.error(JSON.stringify({ error: err.message }));
      process.exit(1);
    }
  });

program.parse();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Analysis timed out")), ms)),
  ]);
}
