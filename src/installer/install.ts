import { execSync } from "child_process";

export function safeInstall(packageName: string): void {
  execSync(`npm install ${packageName} --ignore-scripts`, { stdio: "inherit" });
}
