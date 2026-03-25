# grimoire-app

Tauri 2 application package for Grimoire Atziluth.

See the [root README](../README.md) for full project documentation, setup instructions, and architecture notes.

## Development

```bash
# From this directory
npm run tauri dev     # start dev window
npm run tauri build   # produce a native installer
npm run build         # build the web frontend only (for CI)
npm test              # run Vitest unit tests
```

Output bundles land in `src-tauri/target/release/bundle/`.
