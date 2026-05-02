import { DetectorResult, PackageData } from "../types";

export function runDetector(pkgData: PackageData): DetectorResult {
  const created = pkgData.created;
  if (!created) {
    return { name: "age", score: 0, message: "No age data", level: "info" };
  }

  const days = (Date.now() - new Date(created).getTime()) / 86_400_000;

  if (days < 3) {
    return { name: "age", score: 30, message: `Very new package (created ${Math.round(days * 24)}h ago)`, level: "danger" };
  }
  if (days < 30) {
    return { name: "age", score: 15, message: `New package (created ${Math.round(days)} days ago)`, level: "warn" };
  }
  return { name: "age", score: 0, message: `Established package (${formatAge(days)})`, level: "info" };
}

function formatAge(days: number): string {
  if (days > 365) return `${Math.round(days / 365)} years ago`;
  return `${Math.round(days)} days ago`;
}
