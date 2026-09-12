# Repository instructions

This repository owns the public `plunk-agent-cli` REST client and its repository-scoped email-marketing skill.

- Keep the runtime dependency-free and compatible with Node.js 22 or newer.
- Never print, persist, or commit API keys, authorization headers, contact exports, or production response bodies used during tests.
- Tests use a loopback mock server and never contact a real Plunk instance.
- Keep delivery and destructive operations behind explicit CLI gates.
- Repository-specific documentation lives in `docs/`. Update it with API, safety, installation, or compatibility changes and keep `docs/README.md` current.
- The skill source lives at `.agents/skills/plunk-agent-cli-email-marketing/` and must remain portable. Keep personal URLs, project IDs, and credential paths out of it.
