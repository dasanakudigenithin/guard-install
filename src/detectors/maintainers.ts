import { DetectorResult, PackageData } from "../types";

export function runDetector(pkgData: PackageData): DetectorResult {
  const count = pkgData.maintainers.length;
  if (count === 0) {
    return { name: "maintainers", score: 20, message: "No maintainers listed", level: "danger" };
  }
  if (count === 1) {
    return { name: "maintainers", score: 15, message: "Single maintainer", level: "warn" };
  }
  if (count === 2) {
    return { name: "maintainers", score: 5, message: "2 maintainers", level: "info" };
  }
  return { name: "maintainers", score: 0, message: `Multiple maintainers (${count})`, level: "info" };
}
