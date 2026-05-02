export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export type DetectorResult = {
  name: string;
  score: number;
  message: string;
  level: "info" | "warn" | "danger";
};

export type DependencyAnalysis = {
  totalScanned: number;
  highRisk: string[];
  mediumRisk: string[];
  tooManyDeps: boolean;
  deeplyNested: boolean;
  inheritedScore: number;
};

export type AnalysisResult = {
  packageName: string;
  totalScore: number;
  riskLevel: RiskLevel;
  confidence: Confidence;
  results: DetectorResult[];
  depAnalysis?: DependencyAnalysis;
  topFactors?: string[];
};

export type PackageData = {
  name: string;
  latestVersion: string;
  time: Record<string, string>;
  created?: string;
  maintainers: { name: string; email?: string }[];
  scripts: Record<string, string>;
  repository?: { type?: string; url?: string };
  downloads?: number;
};

export type Weight = {
  max: number;
  weight: number;
};
