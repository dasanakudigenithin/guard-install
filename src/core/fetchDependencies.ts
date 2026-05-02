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
const REQUEST_TIMEOUT = 2500;

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
  let totalRiskScore = 0;

  await scan(pkg, 0, visited, highRisk, mediumRisk, (d) => { maxDepthReached = Math.max(maxDepthReached, d); }, (s) => { totalRiskScore += s; });

  return {
    totalScanned: visited.size,
    highRisk,
    mediumRisk,
    tooManyDeps: visited.size > 50,
    deeplyNested: maxDepthReached >= MAX_DEPTH,
    inheritedScore: Math.min(30, Math.round(totalRiskScore * 0.4)),
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

  // Parallel lightweight risk checks
  await Promise.all(depNames.map(async (dep) => {
    if (visited.has(dep) || visited.size >= MAX_NODES) return;
    try {
      const pkgData = await fetchPackage(dep);
      const results = [recency(pkgData), maintainers(pkgData), scripts(pkgData)];
      const { totalScore, riskLevel } = computeRiskLevel(results);
      if (riskLevel === "HIGH") { highRisk.push(dep); onScore(totalScore); }
      else if (riskLevel === "MEDIUM") { mediumRisk.push(dep); onScore(totalScore); }
    } catch {}
  }));

  // Recurse into top deps (sequential)
  for (const dep of depNames.slice(0, 5)) {
    if (visited.size >= MAX_NODES) break;
    await scan(dep, depth + 1, visited, highRisk, mediumRisk, onDepth, onScore);
  }
}
