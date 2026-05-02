# 🛡️ guard-install

[![npm version](https://img.shields.io/npm/v/guard-install.svg)](https://www.npmjs.com/package/guard-install)
[![downloads](https://img.shields.io/npm/dm/guard-install.svg)](https://www.npmjs.com/package/guard-install)
[![license](https://img.shields.io/npm/l/guard-install.svg)](./LICENSE)

> **Stop installing risky npm packages blindly.**

A zero-backend CLI tool that analyses npm packages for risk **before** installation. No database, no auth, fully local.

---

## 🎬 Demo

![demo](./assets/demo.gif)

```bash
$ npx guard-install axios

🔍 Analyzing: axios

✔ Created 12 years ago, last updated 10 days ago
⚠ Single maintainer
✔ No risky install scripts
✔ 101,100,738 weekly downloads
✔ No typosquat risk detected

📦 Dependency Analysis

  9 dependencies scanned

Risk Score: 15/100 → LOW
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

## ✨ Features

- 🔍 **Pre-install risk analysis** — analyzes package metadata, scripts, and history before anything runs
- 📊 **Weighted risk scoring** — 0-100 score with LOW/MEDIUM/HIGH classification
- 🔗 **Dependency scanning** — recursive scan of transitive deps (depth-limited, parallelized)
- 🛡️ **Script inspection** — shows actual `postinstall`/`preinstall` content, flags `curl`, `wget`, `bash`, `powershell`
- 🎭 **Typosquat detection** — Levenshtein distance check against popular packages
- 📈 **Confidence signal** — tells you how much data backs the score
- 🔒 **Safe install** — always installs with `--ignore-scripts` so postinstall malware never executes

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

| Flag        | Description                                   |
| ----------- | --------------------------------------------- |
| `-y, --yes` | Skip confirmation prompt, install immediately |
| `--dry-run` | Analyze only, do not install                  |
| `--json`    | Output machine-readable JSON (for CI)         |

### Examples

```bash
# Standard analysis + prompt
guard-install axios

# Skip prompt, install directly
guard-install axios --yes

# Analysis only, no install
guard-install axios --dry-run

# JSON output for CI pipelines
guard-install axios --json
```

---

## 📋 Output Examples

### Safe, popular package

```bash
$ guard-install express --dry-run

🔍 Analyzing: express

✔ Created 15 years ago, last updated 151 days ago
✔ Multiple maintainers (5)
✔ No risky install scripts
✔ 97,402,168 weekly downloads
✔ No typosquat risk detected

📦 Dependency Analysis

  12 dependencies scanned

Risk Score: 0/100 → LOW
Confidence: HIGH
```

### Package with install scripts

```bash
$ guard-install esbuild --dry-run

🔍 Analyzing: esbuild

✔ Created 8 years ago, last updated 29 days ago
⚠ Single maintainer
✗ Install scripts detected:
     postinstall: "node install.js"
✔ 216,460,377 weekly downloads
✔ No typosquat risk detected

📦 Dependency Analysis

  1 dependencies scanned

Risk Score: 50/100 → MEDIUM
Confidence: HIGH

Top Risk Factors:
  - scripts (+35)
  - maintainers (+15)
```

### Suspicious typosquat

```bash
$ guard-install axio --dry-run

🔍 Analyzing: axio

✔ Created 10 years ago, last updated 3818 days ago
✗ No maintainers listed
✔ No risky install scripts
⚠ Download count unavailable
✗ Name is similar to popular package "axios" (distance: 1)

📦 Dependency Analysis

  1 dependencies scanned

Risk Score: 100/100 → HIGH
Confidence: LOW

Top Risk Factors:
  - typosquat (+60)
  - maintainers (+20)
  - downloads (+20)
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
| Maintainers  | Number of maintainers               | 20        | 1.0    |
| Scripts      | Install hooks + dangerous keywords  | 80        | 1.0    |
| Downloads    | Weekly download count (log scale)   | 25        | 1.0    |
| Typosquat    | Name similarity to popular packages | 60        | 1.5    |
| Dependencies | Inherited risk from dep chain       | 30        | 1.0    |
| Anomaly      | Suspicious publish patterns         | 10        | 1.0    |

**Final score** = `min(100, sum(capped_score × weight))`

| Score | Risk Level |
| ----- | ---------- |
| ≥ 61  | 🔴 HIGH    |
| ≥ 31  | 🟡 MEDIUM  |
| ≤ 30  | 🟢 LOW     |

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
