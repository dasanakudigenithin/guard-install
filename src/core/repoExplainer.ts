export type Explanation = {
  icon: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "danger";
};

type Signals = {
  secrets: boolean;
  crypto: boolean;
  network: boolean;
  exec: boolean;
  obfuscation: boolean;
  isLibrary: boolean;
};

function explainNetwork(isLibrary: boolean): Explanation {
  return {
    icon: "🌐",
    title: "Network activity detected",
    description: isLibrary
      ? "The code makes outbound HTTP requests. This is expected for an HTTP client or API library."
      : "The code makes outbound network requests. This could be used to send data externally.",
    severity: isLibrary ? "info" : "warning",
  };
}

function explainExec(isLibrary: boolean): Explanation {
  if (isLibrary) {
    return {
      icon: "⚡",
      title: "Shell execution capability",
      description: "This project runs system commands. This is expected for build tools and process runners.",
      severity: "info",
    };
  }
  return {
    icon: "⚡",
    title: "Shell execution detected",
    description: "The code executes system commands. Combined with other signals, this could enable harmful operations.",
    severity: "warning",
  };
}

function explainSecrets(): Explanation {
  return {
    icon: "🔐",
    title: "Sensitive data patterns found",
    description: "References to sensitive data patterns (e.g., PRIVATE_KEY, MNEMONIC) were found. These may appear in examples or configuration, but should be reviewed in unfamiliar code.",
    severity: "warning",
  };
}

function explainCrypto(): Explanation {
  return {
    icon: "💰",
    title: "Cryptocurrency functionality",
    description: "Uses crypto/wallet libraries which may interact with sensitive assets. Review carefully if you don't expect this.",
    severity: "warning",
  };
}

function explainObfuscation(): Explanation {
  return {
    icon: "🎭",
    title: "Obfuscated code patterns",
    description: "Some code appears intentionally obscured. This can hide malicious behavior and warrants manual review.",
    severity: "danger",
  };
}

function explainExfiltration(): Explanation {
  return {
    icon: "🚨",
    title: "Potential secret exfiltration pattern",
    description: "The code accesses sensitive data and makes network requests. This combination is commonly used to send private data to external servers.",
    severity: "danger",
  };
}

function explainExecNetwork(): Explanation {
  return {
    icon: "⚠️",
    title: "Remote execution risk",
    description: "The code executes system commands and communicates over the network. This could allow remote control or data transfer.",
    severity: "warning",
  };
}

export function buildExplanations(signals: Signals): Explanation[] {
  const explanations: Explanation[] = [];

  // Detect patterns first (suppress individual signals if pattern matches)
  const hasExfilPattern = signals.secrets && signals.network && signals.crypto;
  const hasExecNetPattern = signals.exec && signals.network && !hasExfilPattern;

  if (hasExfilPattern) {
    explanations.push(explainExfiltration());
    explanations.push(explainCrypto());
  } else {
    if (signals.secrets) explanations.push(explainSecrets());
    if (signals.crypto) explanations.push(explainCrypto());
    if (signals.network) explanations.push(explainNetwork(signals.isLibrary));
  }

  if (hasExecNetPattern) {
    explanations.push(explainExecNetwork());
  } else if (signals.exec && !hasExfilPattern) {
    explanations.push(explainExec(signals.isLibrary));
  }

  if (signals.obfuscation) explanations.push(explainObfuscation());

  return explanations;
}

export function buildSummary(signals: Pick<Signals, "crypto" | "exec" | "network">, risk: string): string | null {
  if (signals.crypto && risk !== "HIGH") {
    return "Crypto-related projects may interact with wallets and private keys. Even legitimate libraries should be reviewed before running unfamiliar code.";
  }
  if (signals.exec && signals.network && risk === "MEDIUM") {
    return "Projects that combine shell execution with network access require careful review, even when they appear legitimate.";
  }
  return null;
}
