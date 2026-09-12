# Plunk Agent CLI plan

## Outcome

Create a public, API-only Plunk CLI with a globally enrollable email-marketing skill, then replace the local unofficial MCP integration with this single REST path.

## Work

1. Build and integration-test the dependency-free typed CLI.
2. Publish the repository and register its checkout and skill source.
3. Point the K3s Secret Bindings REST profile at the CLI and remove the MCP profile and Codex registration.
4. Sync and verify workspace and skill projection across the enabled fleet.
