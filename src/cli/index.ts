#!/usr/bin/env node
import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";
import { fetchPackage } from "../core/fetchPackage";
import { analyze } from "../core/analyze";
import { printReport } from "../utils/logger";
import { confirmInstall } from "../utils/prompt";
import { safeInstall } from "../installer/install";

const program = new Command();

program
  .name("guard-install")
  .description("Analyze npm packages for risk before installation")
  .argument("<package>", "package name to analyze")
  .option("-y, --yes", "skip confirmation prompt")
  .option("--dry-run", "analyze only, do not install")
  .option("--json", "output machine-readable JSON")
  .action(async (packageName: string, opts: { yes?: boolean; dryRun?: boolean; json?: boolean }) => {
    const silent = opts.json;

    if (!silent) console.log(chalk.cyan(`\n🔍 Analyzing: ${packageName}\n`));
    const spinner = silent ? null : ora("Fetching package metadata...").start();

    try {
      const pkgData = await fetchPackage(packageName);
      if (spinner) spinner.text = "Scanning dependencies...";

      const result = await withTimeout(analyze(pkgData), 30_000);
      if (spinner) spinner.succeed("Analysis complete");

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

      printReport(result);

      if (opts.dryRun) {
        process.exit(0);
      }

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
