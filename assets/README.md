# assets/

Holds the demo GIF referenced in the README (`![demo](./assets/demo.gif)`).

## How to re-record

```bash
# 1. Record
asciinema rec assets/demo.cast --command "node dist/cli/index.js axios --dry-run" --overwrite

# 2. Convert to GIF
agg assets/demo.cast assets/demo.gif --theme dracula --font-size 16
```

### Install dependencies

```bash
brew install asciinema agg
```
