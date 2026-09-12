import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cli = new URL("../bin/plunk-agent-cli", import.meta.url).pathname;

function run(args, env = {}) {
  return execFileAsync(cli, args, {
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

test("doctor reports configuration without exposing API keys", async () => {
  const secret = "sk_private_value";
  const { stdout } = await run(["doctor"], {
    PLUNK_API_URL: "https://plunk.example.com/api",
    PLUNK_SECRET_API_KEY: secret,
  });

  assert.deepEqual(JSON.parse(stdout), {
    ok: true,
    apiUrl: "https://plunk.example.com/api",
    secretApiKeyConfigured: true,
    publicApiKeyConfigured: false,
  });
  assert.equal(stdout.includes(secret), false);
});

test("requests use the correct key and enforce delivery and deletion gates", async (context) => {
  const seen = [];
  const server = createServer(async (request, response) => {
    const body = [];
    for await (const chunk of request) body.push(chunk);
    seen.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body: Buffer.concat(body).toString("utf8"),
    });
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ ok: true }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  context.after(() => server.close());

  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  const env = {
    PLUNK_API_URL: `http://127.0.0.1:${address.port}`,
    PLUNK_SECRET_API_KEY: "sk_test",
    PLUNK_PUBLIC_API_KEY: "pk_test",
  };

  await run(["GET", "/contacts", "--query", "limit=5", "--allow-insecure"], env);
  await assert.rejects(run(["POST", "/v1/track", "--body", "{}", "--allow-insecure"], env), /allow-delivery/);
  await run(["POST", "/v1/track", "--body", "{\"email\":\"person@example.com\",\"event\":\"confirmed\"}", "--allow-delivery", "--allow-insecure"], env);
  await assert.rejects(run(["DELETE", "/contacts/123", "--allow-insecure"], env), /allow-destructive/);

  assert.deepEqual(seen, [
    {
      method: "GET",
      url: "/contacts?limit=5",
      authorization: "Bearer sk_test",
      body: "",
    },
    {
      method: "POST",
      url: "/v1/track",
      authorization: "Bearer pk_test",
      body: "{\"email\":\"person@example.com\",\"event\":\"confirmed\"}",
    },
  ]);
});
