# Repository instructions

This repository owns the public `plunk-agent-cli` REST client. Instance-specific operational skills belong to the infrastructure repository that deploys the corresponding Plunk installation.

- Keep the runtime dependency-free and compatible with Node.js 22 or newer.
- Never print, persist, or commit API keys, authorization headers, contact exports, or production response bodies used during tests.
- Tests use a loopback mock server and never contact a real Plunk instance.
- Keep delivery and destructive operations behind explicit CLI gates.
- Repository-specific documentation lives in `docs/`. Update it with API, safety, installation, or compatibility changes and keep `docs/README.md` current.
