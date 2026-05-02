# 🛡️ guard-install

[![npm version](https://img.shields.io/npm/v/guard-install.svg)](https://www.npmjs.com/package/guard-install)
[![downloads](https://img.shields.io/npm/dm/guard-install.svg)](https://www.npmjs.com/package/guard-install)
[![license](https://img.shields.io/npm/l/guard-install.svg)](./LICENSE)

> **guard-install checks npm packages for risk before you install them.**

A zero-backend CLI tool that analyses npm packages for risk **before** installation. No database, no auth, fully local.

---

## 🎬 Demo

![demo](./assets/demo.gif)

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

---

## 🤔 Why this exists

npm's ecosystem is under constant **supply chain attack**:

- **Postinstall malware** — packages that execute `curl | sh` or download payloads the moment you run `npm install`
- **Typosquatting** — malicious packages with names like `axois` or `reacct` that steal credentials on install
- **Hijacked maintainers** — single-maintainer packages are takeover targets (see `event-stream` incident)
- **Dependency confusion** — internal package names published publicly to poison installs

A single `npm install` can run arbitrary code on your machine via `postinstall` scripts. By the time you realize, it's too late.

`guard-install` catches these signals **before** any code runs.

---

## ⚙️ How it works

1. **Fetches npm metadata** — registry data, download counts, publish history
2. **Runs risk detectors** — recency, age, maintainers, scripts, downloads, typosquat, metadata anomalies
3. **Scans dependency tree** — depth-limited (2 levels), parallelized, with concurrency control
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

---

## 📦 Installation

```bash
# Use directly (no install needed)
npx guard-install <package>

# Or install globally
npm install -g guard-install
```

---

## 🚀 Usage

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
| `--audit`       | Scan all dependencies in current project      |
| `--ci`          | CI mode: JSON output, exit 1 on HIGH risk     |
| `-v, --version` | Show version number                           |
| `-h, --help`    | Show help                                     |

### Examples

```bash
# Standard analysis + prompt
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

# Audit entire project
guard-install --audit

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

### Project audit

```bash
$ guard-install --audit

🔍 Project Audit

✔ 5 dependencies scanned
  ⚠ 1 MEDIUM risk packages

  Top risks:

  • esbuild (Install scripts detected: postinstall: "node install.js")
```

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
git clone https://github.com/your-username/guard-install.git
cd guard-install
npm install
npm run build
node dist/cli/index.js <package>
```

---

## 📄 License

MIT
