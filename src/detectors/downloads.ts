import { DetectorResult, PackageData } from "../types";

export function runDetector(pkgData: PackageData): DetectorResult {
  const dl = pkgData.downloads;
  if (dl == null) {
    return { name: "downloads", score: 20, message: "Download count unavailable", level: "warn" };
  }
  if (dl > 1_000_000) {
    return { name: "downloads", score: 0, message: `${dl.toLocaleString()} weekly downloads`, level: "info" };
  }
  if (dl > 100_000) {
    return { name: "downloads", score: 5, message: `${dl.toLocaleString()} weekly downloads`, level: "info" };
  }
  if (dl > 10_000) {
    return { name: "downloads", score: 10, message: `${dl.toLocaleString()} weekly downloads`, level: "info" };
  }
  if (dl > 1_000) {
    return { name: "downloads", score: 15, message: `${dl.toLocaleString()} weekly downloads`, level: "warn" };
  }
  return { name: "downloads", score: 25, message: `Very low weekly downloads (${dl.toLocaleString()})`, level: "danger" };
}
