# Agent instructions

## Node runtime

- This repository is pinned to Node 22.x; `.nvmrc` and `.node-version` currently select 22.23.1.
- Use the repository's Node 22 runtime for every npm install, rebuild, dev server, test, and build command.
- Never use the Codex bundled Node runtime for dependency installs or native-module rebuilds in this repository. Its Node ABI may differ and overwrite `better-sqlite3` with an incompatible binary.
- If `node` or `npm` is missing from the agent shell, locate the installed Node 22 runtime (normally under `~/.nvm/versions/node/`) instead of falling back to another Node major.
- Before changing dependencies, verify `node --version` reports `v22.x` and `node -p "process.versions.modules"` reports `127`.
