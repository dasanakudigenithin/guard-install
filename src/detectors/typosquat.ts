import { DetectorResult, PackageData } from "../types";

const POPULAR = ["react", "axios", "lodash", "express", "next", "vue", "chalk", "moment", "webpack", "eslint", "prettier", "jquery", "underscore", "babel", "typescript"];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function runDetector(pkgData: PackageData): DetectorResult {
  const name = pkgData.name.replace(/^@[^/]+\//, "");

  let bestMatch: string | null = null;
  let bestDist = Infinity;

  for (const p of POPULAR) {
    if (p === name) continue;
    const dist = levenshtein(p, name);
    if (dist <= 3 && dist < bestDist) {
      bestDist = dist;
      bestMatch = p;
    }
  }

  if (bestMatch && bestDist <= 2) {
    const score = bestDist === 1 ? 60 : 40;
    return { name: "typosquat", score, message: `Name is similar to popular package "${bestMatch}" (distance: ${bestDist})`, level: "danger" };
  }
  if (bestMatch && bestDist === 3) {
    return { name: "typosquat", score: 30, message: `Name loosely resembles "${bestMatch}" (distance: ${bestDist})`, level: "warn" };
  }
  return { name: "typosquat", score: 0, message: "No typosquat risk detected", level: "info" };
}
