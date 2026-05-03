import { ScannedFile } from "../core/scanFiles";

// High-risk secrets only (not generic env)
const HIGH_RISK_SECRETS = ["PRIVATE_KEY", "MNEMONIC", "SEED_PHRASE", "SECRET_KEY", "WALLET_KEY"];
const CRYPTO_LIBS = ["ethers", "web3", "bitcoinjs", "@solana/web3", "bip39", "hdkey", "secp256k1"];

// Strict exec: only actual shell execution
const EXEC_PATTERNS = [
  "child_process",
  "execSync(",
  "spawnSync(",
  'exec("', "exec('", "exec(`",
  "spawn(",
  "| bash",
  "| sh",
];

// Network: outbound data sending only
const NETWORK_SEND_PATTERNS = [".post(", ".put(", "http.request(", "https.request(", "net.connect(", "WebSocket("];

// Context: skip test/example/doc files
const SKIP_PATHS = ["test", "spec", "example", "__test__", "__mock__", "fixture", ".test.", ".spec.", "docs", "doc"];

// Low-signal files that shouldn't be flagged
const LOW_SIGNAL_FILES = [".eslintrc", "jest.config", "tsconfig", "package.json", "package-lock", ".prettierrc", "babel.config", "webpack.config", "rollup.config", "vite.config", "cypress.config"];

export type RepoRiskResult = {
  risk: "LOW" | "MEDIUM" | "HIGH";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  score: number;
  signals: { secrets: boolean; crypto: boolean; network: boolean; exec: boolean; obfuscation: boolean };
  reasons: string[];
  flaggedFiles: string[];
  note?: string;
};

function detectObfuscation(content: string): boolean {
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.length > 2000 && /[A-Za-z0-9+/=]{100,}/.test(line)) return true;
  }
  if (/eval\(.*atob\(/.test(content)) return true;
  if (/eval\(.*fromCharCode/.test(content)) return true;
  return false;
}

function isLowSignalFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return LOW_SIGNAL_FILES.some((f) => lower.includes(f));
}

function isLikelyLibrary(files: ScannedFile[], repoDir: string): boolean {
  const relativePaths = files.map((f) => f.path.replace(repoDir + "/", ""));
  const dirs = new Set(relativePaths.map((p) => p.split("/")[0]));
  const hasPackageJson = relativePaths.some((p) => p === "package.json");
  const hasMultipleDirs = dirs.size >= 3;
  const hasStructuredSrc = relativePaths.some((p) => p.startsWith("src/") || p.startsWith("lib/"));
  return hasPackageJson && hasMultipleDirs && hasStructuredSrc && files.length > 20;
}

export function analyzeRepo(files: ScannedFile[], repoDir: string): RepoRiskResult {
  let hasSecrets = false;
  let hasCrypto = false;
  let hasNetwork = false;
  let hasExec = false;
  let hasObfuscation = false;
  const flaggedFiles: Set<string> = new Set();
  const reasons: string[] = [];

  const relevantFiles = files.filter((f) => {
    const rel = f.path.replace(repoDir + "/", "").toLowerCase();
    return !SKIP_PATHS.some((skip) => rel.includes(skip));
  });

  for (const file of relevantFiles) {
    const relativePath = file.path.replace(repoDir + "/", "");
    const content = file.content;

    if (HIGH_RISK_SECRETS.some((k) => content.includes(k))) {
      hasSecrets = true;
      if (!isLowSignalFile(relativePath)) flaggedFiles.add(relativePath);
    }

    if (CRYPTO_LIBS.some((k) => content.includes(k))) {
      hasCrypto = true;
      if (!isLowSignalFile(relativePath)) flaggedFiles.add(relativePath);
    }

    if (NETWORK_SEND_PATTERNS.some((k) => content.includes(k))) {
      hasNetwork = true;
    }

    if (EXEC_PATTERNS.some((k) => content.includes(k))) {
      hasExec = true;
      if (!isLowSignalFile(relativePath)) flaggedFiles.add(relativePath);
    }

    if (detectObfuscation(content)) {
      hasObfuscation = true;
      if (!isLowSignalFile(relativePath)) flaggedFiles.add(relativePath);
    }
  }

  // Scoring
  let score = 0;
  if (hasSecrets) score += 25;
  if (hasCrypto) score += 15; // domain sensitivity boost
  if (hasNetwork) score += 20;
  if (hasExec) score += 30;
  if (hasObfuscation) score += 40;

  // Crypto domain boost: if crypto libs + secrets, extra weight
  if (hasCrypto && hasSecrets) score += 10;

  // Library dampening for structured projects
  const isLibrary = isLikelyLibrary(files, repoDir);
  if (isLibrary && !hasObfuscation) {
    score = Math.round(score * 0.6);
  }

  // Build reasons
  if (hasSecrets) reasons.push("Accesses sensitive keys (PRIVATE_KEY, MNEMONIC, etc.)");
  if (hasCrypto) reasons.push("Uses crypto/wallet libraries");
  if (hasNetwork) reasons.push("Sends data over network");
  if (hasExec) reasons.push("Executes shell commands");
  if (hasObfuscation) reasons.push("Contains obfuscated/packed code");

  // Pattern-based risk with adjusted thresholds
  let risk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  let message = "No suspicious patterns detected";
  let note: string | undefined;

  if (hasSecrets && hasCrypto && hasNetwork) {
    risk = "HIGH";
    message = "Potential private key exfiltration pattern";
  } else if (hasExec && hasSecrets && hasNetwork) {
    risk = "HIGH";
    message = "Shell execution + secret access + network exfiltration";
  } else if (hasObfuscation && (hasNetwork || hasExec)) {
    risk = "HIGH";
    message = "Obfuscated code with network/execution capabilities";
  } else if (score >= 60) {
    risk = "HIGH";
    message = "Multiple high-risk signals detected";
  } else if (score >= 30) {
    risk = "MEDIUM";
    message = "Combination of signals warrants review";
  } else if (score > 0) {
    risk = "LOW";
    message = "Minor signals detected (likely benign)";
  }

  // Contextual notes for crypto domain
  if (hasCrypto && risk !== "HIGH") {
    note = "This is a cryptocurrency-related project. While not inherently malicious, such code interacts with sensitive assets. Ensure you trust the source.";
  }

  // Confidence: reflects signal clarity
  const signalCount = [hasSecrets, hasCrypto, hasNetwork, hasExec, hasObfuscation].filter(Boolean).length;
  let confidence: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (signalCount >= 3 && risk === "HIGH" && hasSecrets) confidence = "HIGH";
  else if (signalCount >= 2) confidence = "MEDIUM";

  return { risk, confidence, message, score, signals: { secrets: hasSecrets, crypto: hasCrypto, network: hasNetwork, exec: hasExec, obfuscation: hasObfuscation }, reasons, flaggedFiles: [...flaggedFiles], note };
}
