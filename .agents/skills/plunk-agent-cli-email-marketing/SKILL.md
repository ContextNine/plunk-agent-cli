---
name: plunk-agent-cli-email-marketing
description: Operates Plunk email automation workflows, sequences, campaigns, and broadcasts through the REST API. Use when the user asks an agent to inspect or change Plunk contacts, segments, templates, domains, lead-magnet delivery, newsletters, transactional email, workflow sequences, campaigns, or broadcasts.
---

# Plunk Agent CLI · Email Marketing

Use the owning repository's API-only CLI for Plunk administration. Do not add or depend on a Plunk MCP server.

1. Locate the `plunk-agent-cli` checkout using the active workspace or topology registry. Read its `README.md` and `docs/api.md`, then run `./bin/plunk-agent-cli --version` from that checkout.
2. Use the target application's approved environment custody. Supply `PLUNK_API_URL`, `PLUNK_SECRET_API_KEY`, and, for `/v1/track`, `PLUNK_PUBLIC_API_KEY` through the environment or its configured secret broker. Never put a key in a command argument, note, log, or committed file.
3. Read before changing. Resolve the exact contact, segment, template, workflow, campaign, domain, or event from a fresh API response. Do not retrieve or export contact bodies when counts or filtered metadata answer the request.
4. For questions and diagnosis, make read-only requests. For requested mutations, keep new workflows disabled and campaigns as drafts unless the user explicitly asks to enable, trigger, test, schedule, or send them.
5. Use `--body-file` or `--stdin` for substantial JSON and exact HTML template bodies. Use `--dry-run` to inspect a redacted request plan. Pass `--allow-delivery` only when the user authorized an action that can send email or trigger a workflow. Pass `--allow-destructive` only when the exact deletion is within scope.
6. Use the generic REST request command for every action, including endpoints not listed in the reference. Inspect the deployed Plunk version or its upstream route schema before inventing a path or payload.

The application, not Plunk, should own lead-magnet consent state, one-time confirmation tokens, and offer-specific redirects. Plunk sends the application-provided confirmation URL; after the application confirms and redirects the subscriber, it can track the confirmed event that starts the Plunk sequence.
