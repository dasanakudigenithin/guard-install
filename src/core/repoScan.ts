import ora from "ora";
import chalk from "chalk";
import { cloneRepo, cleanup } from "./cloneRepo";
import { scanFiles } from "./scanFiles";
import { analyzeRepo, RepoRiskResult } from "../detectors/repoRisk";
import { buildExplanations, buildSummary } from "./repoExplainer";

export async function scanRepo(repoUrl: string): Promise<void> {
  console.log(chalk.cyan(`\n🔍 Scanning repository: ${repoUrl}\n`));
  const spinner = ora("Cloning repository (shallow)...").start();

  let repoDir: string | null = null;

  try {
    repoDir = await cloneRepo(repoUrl);
    spinner.text = "Scanning files...";

    const files = scanFiles(repoDir);
    spinner.text = `Analyzing ${files.length} files...`;

    const result = analyzeRepo(files, repoDir);
    spinner.succeed(`${files.length} files scanned`);

    printRepoResult(result);
  } catch (err: any) {
    spinner.fail(err.message);
    process.exit(1);
  } finally {
    if (repoDir) cleanup(repoDir);
  }
}

function printRepoResult(result: RepoRiskResult): void {
  const isLibraryContext = result.score < 30 || result.risk === "LOW";
  const explanations = buildExplanations({
    secrets: result.signals.secrets,
    crypto: result.signals.crypto,
    network: result.signals.network,
    exec: result.signals.exec,
    obfuscation: result.signals.obfuscation,
    isLibrary: isLibraryContext,
  });

  console.log("");

  if (explanations.length === 0) {
    console.log(chalk.green("  ✔ No suspicious patterns detected"));
  } else {
    for (const exp of explanations) {
      const color = exp.severity === "danger" ? chalk.red : exp.severity === "warning" ? chalk.yellow : chalk.dim;
      console.log(`  ${exp.icon} ${color(exp.title)}`);
      console.log(`    ${chalk.dim("→")} ${chalk.dim(exp.description)}`);
      console.log("");
    }
  }

  const riskColor = result.risk === "HIGH" ? chalk.red : result.risk === "MEDIUM" ? chalk.yellow : chalk.green;
  const badge = result.risk === "HIGH" ? "🔴 Risky" : result.risk === "MEDIUM" ? "🟡 Needs review" : "🟢 Clean";
  const confColor = result.confidence === "HIGH" ? chalk.green : result.confidence === "MEDIUM" ? chalk.yellow : chalk.dim;

  console.log(`  Risk: ${riskColor(result.risk)} — ${result.message}`);
  console.log(`  Verdict: ${riskColor(badge)}`);
  console.log(`  Confidence: ${confColor(result.confidence)}`);

  // Flagged files (only meaningful ones)
  if (result.flaggedFiles.length > 0 && result.risk !== "LOW") {
    console.log(chalk.dim(`\n  Flagged files:`));
    for (const f of result.flaggedFiles.slice(0, 5)) {
      console.log(chalk.dim(`    - ${f}`));
    }
    if (result.flaggedFiles.length > 5) {
      console.log(chalk.dim(`    ... and ${result.flaggedFiles.length - 5} more`));
    }
  }

  // Why this matters summary
  const summary = buildSummary(result.signals, result.risk);
  if (summary && result.risk !== "LOW") {
    console.log(chalk.dim(`\n  🧠 Why this matters:`));
    console.log(chalk.dim(`    ${summary}`));
  }

  if (result.risk === "HIGH") {
    console.log(chalk.red.bold("\n  ⚠ Do NOT run this code locally without review\n"));
  } else {
    console.log("");
  }
}
