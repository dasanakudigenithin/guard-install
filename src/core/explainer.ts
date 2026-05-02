import { AnalysisResult } from "../types";

export function explain(result: AnalysisResult): string[] {
  const messages: string[] = [];
  const r = (name: string) => result.results.find((x) => x.name === name);

  const recency = r("recency");
  if (recency && recency.score >= 25) {
    messages.push("This package was published very recently, a common pattern in malicious packages");
  }

  const age = r("age");
  if (age && age.score >= 15) {
    messages.push("This is a brand new package with no established track record");
  }

  const maint = r("maintainers");
  if (maint && maint.score >= 15) {
    messages.push("It has very few maintainers, increasing compromise risk");
  } else if (maint && maint.score > 0) {
    messages.push("It has only 1 maintainer — single point of failure for account takeover");
  }

  const scripts = r("scripts");
  if (scripts && scripts.score >= 50) {
    messages.push("It contains install scripts with dangerous commands (curl, wget, bash)");
  } else if (scripts && scripts.score > 0) {
    messages.push("It contains a postinstall script that runs automatically on install");
  }

  const dl = r("downloads");
  if (dl && dl.score >= 20) {
    messages.push("It has very few downloads, suggesting it's untested or unknown");
  }

  const typo = r("typosquat");
  if (typo && typo.score > 0) {
    messages.push("Its name is suspiciously similar to a popular package (possible typosquat)");
  }

  const meta = r("metadata");
  if (meta && meta.score >= 10) {
    messages.push("It shows suspicious publish patterns (rapid version churn)");
  } else if (meta && meta.score > 0) {
    messages.push("It's missing standard metadata (no repository URL)");
  }

  if (result.depAnalysis) {
    if (result.depAnalysis.highRisk.length > 0) {
      messages.push("Some of its dependencies are flagged as high risk");
    } else if (result.depAnalysis.mediumRisk.length > 0) {
      messages.push("Some dependencies show medium risk signals");
    }
  }

  // Add closing context for high-risk packages
  if (result.riskLevel === "HIGH" && messages.length >= 2) {
    messages.push("This combination of signals is common in malicious packages");
  }

  return messages;
}
