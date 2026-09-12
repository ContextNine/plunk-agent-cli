# Plunk REST API map

This is a compact operating map for Plunk v0.12.0, not a frozen replacement for Plunk's source. Inspect the deployed version before relying on a route or payload that is not represented here.

## Authentication

The CLI uses `PLUNK_SECRET_API_KEY` by default. `/v1/track` automatically uses `PLUNK_PUBLIC_API_KEY`; `--public-key` selects it for another public-key route. Keys are sent as bearer tokens and are never included in dry-run output.

`PLUNK_API_URL` should be the API root before these paths, such as `https://plunk.example.com/api`.

## Core routes

| Area | Common routes |
| --- | --- |
| Contacts | `GET/POST /contacts`, `GET/PATCH/DELETE /contacts/:id`, lookup/import/bulk routes under `/contacts` |
| Segments | `GET/POST /segments`, `GET/PATCH/DELETE /segments/:id`, members and recompute routes under `/segments/:id` |
| Templates | `GET/POST /templates`, `GET/PATCH/DELETE /templates/:id`, duplicate and usage routes |
| Workflows | `GET/POST /workflows`, `GET/PATCH/DELETE /workflows/:id`, steps, transitions, and executions below a workflow |
| Campaigns | `GET/POST /campaigns`, `GET/PUT/DELETE /campaigns/:id`, duplicate, send, cancel, test, and stats routes |
| Transactional | `POST /v1/send`, `POST /v1/track`, `POST /v1/verify` |
| Other | `/domains`, `/events`, `/activity`, `/analytics`, `/uploads` |

## Request patterns

Read before changing:

```bash
./bin/plunk-agent-cli GET /contacts --query search=person@example.com
./bin/plunk-agent-cli GET /workflows
./bin/plunk-agent-cli GET /workflows/WORKFLOW_ID
```

Create a draft-style workflow and inspect the returned ID before adding steps:

```bash
./bin/plunk-agent-cli POST /workflows \
  --body '{"name":"Welcome sequence","eventName":"lead-magnet-confirmed","enabled":false}'
```

Add a delay or email step using an exact JSON file when the payload is substantial:

```bash
./bin/plunk-agent-cli POST /workflows/WORKFLOW_ID/steps --body-file /tmp/plunk-step.json
```

Sending a transactional template requires explicit delivery approval:

```bash
./bin/plunk-agent-cli POST /v1/send \
  --body '{"to":"person@example.com","template":"TEMPLATE_ID","data":{"confirmationUrl":"https://example.com/confirm/token"}}' \
  --allow-delivery
```

Tracking an event can enter an enabled workflow, so it is also delivery-gated and uses the public key:

```bash
./bin/plunk-agent-cli POST /v1/track \
  --body '{"email":"person@example.com","event":"lead-magnet-confirmed","data":{"list":"Newsletter"}}' \
  --allow-delivery
```

Use `--dry-run` to validate URL construction, auth selection, and safety classification without making a request. The dry run never prints a key or body.

## Lead magnets

Plunk should send the confirmation message and run the post-confirmation sequence. The application should remain responsible for recording consent, hashing and expiring one-time tokens, choosing the offer-specific destination, confirming locally, and returning the final 302. After confirmation, the application can call `/v1/track` to start the relevant enabled workflow.

Keep workflows disabled and campaigns unsent while building them. Enabling a workflow, starting an execution, tracking a trigger event, or sending/testing a campaign requires `--allow-delivery`. Resolve IDs from a fresh read rather than reusing guessed or stale values.
