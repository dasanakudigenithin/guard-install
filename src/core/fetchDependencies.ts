import https from "https";
import { PackageData } from "../types";
import { fetchPackage } from "./fetchPackage";
import { computeRiskLevel } from "./score";
import { runDetector as recency } from "../detectors/recency";
import { runDetector as maintainers } from "../detectors/maintainers";
import { runDetector as scripts } from "../detectors/scripts";

const MAX_DEPTH = 2;
const MAX_NODES = 50;
const MAX_FANOUT = 10;
const CONCURRENCY_LIMIT = 5;
const REQUEST_TIMEOUT = 2500;
const FETCH_TIMEOUT = 2000;

function getJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), REQUEST_TIMEOUT);
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        clearTimeout(timer);
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        resolve(JSON.parse(data));
      });
    }).on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// Controlled parallelism to avoid npm rate limits
async function runWithLimit<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: Promise<T>[] = [];
  const executing: Promise<any>[] = [];

  for (const task of tasks) {
    const p = task().then((r) => {
      executing.splice(executing.indexOf(p), 1);
      return r;
    });
    results.push(p);
    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

export type DepScanResult = {
  totalScanned: number;
  highRisk: string[];
  mediumRisk: string[];
  tooManyDeps: boolean;
  deeplyNested: boolean;
  inheritedScore: number;
};

export async function fetchDependencies(pkg: string): Promise<DepScanResult> {
  const visited = new Set<string>();
  const highRisk: string[] = [];
  const mediumRisk: string[] = [];
  let maxDepthReached = 0;
  let normalizedRiskSum = 0;

  await scan(pkg, 0, visited, highRisk, mediumRisk, (d) => { maxDepthReached = Math.max(maxDepthReached, d); }, (s) => { normalizedRiskSum += s; });

  return {
    totalScanned: visited.size,
    highRisk,
    mediumRisk,
    tooManyDeps: visited.size > 50,
    deeplyNested: maxDepthReached >= MAX_DEPTH,
    inheritedScore: Math.min(30, Math.round(normalizedRiskSum * 20)),
  };
}

async function scan(
  pkg: string,
  depth: number,
  visited: Set<string>,
  highRisk: string[],
  mediumRisk: string[],
  onDepth: (d: number) => void,
  onScore: (s: number) => void
): Promise<void> {
  if (depth > MAX_DEPTH || visited.size >= MAX_NODES || visited.has(pkg)) return;
  visited.add(pkg);
  onDepth(depth);

  let deps: Record<string, string> = {};
  try {
    const data = await getJson(`https://registry.npmjs.org/${pkg}/latest`);
    deps = data.dependencies ?? {};
  } catch {
    return;
  }

  const depNames = Object.keys(deps).slice(0, MAX_FANOUT);

  // Controlled parallelism for risk checks
  const tasks = depNames
    .filter((dep) => !visited.has(dep) && visited.size < MAX_NODES)
    .map((dep) => async () => {
      try {
        const pkgData = await withTimeout(fetchPackage(dep), FETCH_TIMEOUT);
        const results = [recency(pkgData), maintainers(pkgData), scripts(pkgData)];
        const { totalScore, riskLevel } = computeRiskLevel(results);
        if (riskLevel === "HIGH") { highRisk.push(dep); onScore(totalScore / 100); }
        else if (riskLevel === "MEDIUM") { mediumRisk.push(dep); onScore(totalScore / 100); }
      } catch {}
    });

  await runWithLimit(tasks, CONCURRENCY_LIMIT);

  // Parallel recursion (also limited)
  const recurseTasks = depNames.slice(0, 5)
    .filter(() => visited.size < MAX_NODES)
    .map((dep) => () => scan(dep, depth + 1, visited, highRisk, mediumRisk, onDepth, onScore));

  await runWithLimit(recurseTasks, CONCURRENCY_LIMIT);
}
