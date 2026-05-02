import https from "https";
import { PackageData } from "../types";

function get(url: string, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeout);
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

export async function fetchPackage(packageName: string): Promise<PackageData> {
  const data = await get(`https://registry.npmjs.org/${packageName}`);
  const latestVersion = data["dist-tags"]?.latest ?? "0.0.0";
  const versionData = data.versions?.[latestVersion] ?? {};

  let downloads: number | undefined;
  try {
    const dlData = await get(`https://api.npmjs.org/downloads/point/last-week/${packageName}`);
    downloads = dlData.downloads;
  } catch {}

  return {
    name: data.name,
    latestVersion,
    time: data.time ?? {},
    created: data.time?.created,
    maintainers: data.maintainers ?? [],
    scripts: versionData.scripts ?? {},
    repository: versionData.repository,
    downloads,
  };
}
