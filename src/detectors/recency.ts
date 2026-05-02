import { DetectorResult, PackageData } from "../types";

export function runDetector(pkgData: PackageData): DetectorResult {
  const modified = pkgData.time[pkgData.latestVersion];
  if (!modified) {
    return { name: "recency", score: 20, message: "No publish date found", level: "warn" };
  }

  const updateHours = (Date.now() - new Date(modified).getTime()) / 3_600_000;
  const updateDays = updateHours / 24;
  const created = pkgData.created;
  const ageDays = created ? (Date.now() - new Date(created).getTime()) / 86_400_000 : undefined;

  // Brand new package + very recent = highest risk
  if (updateHours < 24) {
    if (ageDays != null && ageDays < 7) {
      return { name: "recency", score: 40, message: `Brand new package — created ${Math.round(ageDays)} days ago, updated ${Math.round(updateHours)}h ago`, level: "danger" };
    }
    return { name: "recency", score: 10, message: `Created ${formatAge(ageDays)}, last updated ${Math.round(updateHours)}h ago`, level: "info" };
  }

  if (updateDays < 3) {
    if (ageDays != null && ageDays < 14) {
      return { name: "recency", score: 25, message: `New package — created ${Math.round(ageDays)} days ago, updated ${Math.round(updateDays)} days ago`, level: "warn" };
    }
    return { name: "recency", score: 0, message: `Created ${formatAge(ageDays)}, last updated ${Math.round(updateDays)} days ago`, level: "info" };
  }

  if (updateDays < 7) {
    if (ageDays != null && ageDays < 14) {
      return { name: "recency", score: 10, message: `New package — created ${Math.round(ageDays)} days ago, updated ${Math.round(updateDays)} days ago`, level: "warn" };
    }
    return { name: "recency", score: 0, message: `Created ${formatAge(ageDays)}, last updated ${Math.round(updateDays)} days ago`, level: "info" };
  }

  return { name: "recency", score: 0, message: `Created ${formatAge(ageDays)}, last updated ${Math.round(updateDays)} days ago`, level: "info" };
}

function formatAge(days: number | undefined): string {
  if (days == null) return "unknown";
  if (days > 365) return `${Math.round(days / 365)} years ago`;
  return `${Math.round(days)} days ago`;
}
