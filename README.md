# Plunk Agent CLI

`plunk-agent-cli` is a dependency-free REST client for agents operating a hosted or self-hosted [Plunk](https://github.com/useplunk/plunk) instance. It keeps the full API available without depending on an unofficial MCP server.

The CLI is intentionally small. Agents combine one generic request command with the API map in [`docs/api.md`](docs/api.md), so new Plunk endpoints work without waiting for a tool release.

## Use

Node.js 22 or newer is the only runtime requirement. The compiled client is checked in, so a cloned repository works immediately:

```bash
./bin/plunk-agent-cli --version
```

Provide credentials through your existing environment or secret broker. The CLI never accepts keys as command-line arguments.

```bash
export PLUNK_API_URL=https://plunk.example.com/api
export PLUNK_SECRET_API_KEY=sk_...
export PLUNK_PUBLIC_API_KEY=pk_...

./bin/plunk-agent-cli doctor
./bin/plunk-agent-cli GET /segments
./bin/plunk-agent-cli POST /contacts --body '{"email":"person@example.com","subscribed":false}'
```

Use a JSON file or stdin for large payloads and exact HTML templates:

```bash
./bin/plunk-agent-cli POST /templates --body-file /tmp/template-request.json
jq -n --rawfile body email.html '{name:"Confirmation",subject:"Confirm your email",body:$body}' \
  | ./bin/plunk-agent-cli POST /templates --stdin
```

Calls that can deliver email or trigger a workflow require `--allow-delivery`. Deletes and delete-like bulk operations require `--allow-destructive`.

```bash
./bin/plunk-agent-cli POST /v1/track \
  --body '{"email":"person@example.com","event":"lead-magnet-confirmed"}' \
  --allow-delivery
```

HTTP is rejected by default because it exposes bearer credentials in transit. Use `--allow-insecure` only for a trusted loopback or private-network endpoint.

## Agent skill

The repository owns the `plunk-agent-cli-email-marketing` skill at [`.agents/skills/plunk-agent-cli-email-marketing/`](.agents/skills/plunk-agent-cli-email-marketing/). A skill registry can link that directory into a global agent catalog while keeping this checkout as the canonical source.

## Development

```bash
corepack enable
pnpm install
pnpm check
```

Tests use a loopback mock server and never contact Plunk.

## API compatibility

The initial route map targets Plunk v0.12.0. The public [Plunk source](https://github.com/useplunk/plunk) is authoritative. The route organization in [ignytehq/plunk-mcp](https://github.com/ignytehq/plunk-mcp) was used as a secondary discovery reference, but this project does not depend on or run that MCP package.
