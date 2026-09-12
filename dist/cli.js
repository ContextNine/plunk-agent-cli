#!/usr/bin/env node
import { stdin, stdout } from "node:process";
import { CliError, parseJson, parseMethod, readJsonFile, renderResponse, requestPlunk, } from "./plunk-client.js";
const VERSION = "0.1.0";
const HELP = `plunk-agent-cli ${VERSION}

Usage:
  plunk-agent-cli doctor
  plunk-agent-cli request METHOD PATH [options]
  plunk-agent-cli METHOD PATH [options]

Options:
  --body JSON              JSON request body
  --body-file PATH         Read the JSON request body from a file
  --stdin                  Read the JSON request body from stdin
  --query KEY=VALUE        Add a query parameter; repeatable
  --public-key             Use PLUNK_PUBLIC_API_KEY instead of the secret key
  --allow-delivery         Permit calls that can send email or trigger workflows
  --allow-destructive      Permit calls that can delete data
  --allow-insecure         Permit HTTP for a trusted local network
  --dry-run                Validate and print a redacted request plan
  --compact                Print JSON on one line
  --help                    Show help
  --version                 Show the version

Environment:
  PLUNK_API_URL
  PLUNK_SECRET_API_KEY
  PLUNK_PUBLIC_API_KEY
`;
async function readStdin() {
    const chunks = [];
    for await (const chunk of stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8");
}
function valueAfter(args, index, option) {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
        throw new CliError(`${option} requires a value`);
    }
    return value;
}
async function parseRequest(args) {
    const method = parseMethod(args[0] ?? "");
    const path = args[1];
    if (!path) {
        throw new CliError("Request PATH is required");
    }
    let body;
    let bodySource;
    const query = [];
    let forcePublicKey = false;
    let allowDelivery = false;
    let allowDestructive = false;
    let allowInsecure = false;
    let dryRun = false;
    let compact = false;
    for (let index = 2; index < args.length; index += 1) {
        const option = args[index];
        if (option === "--body") {
            if (bodySource)
                throw new CliError("Use only one request body source");
            body = parseJson(valueAfter(args, index, option), "--body");
            bodySource = "argument";
            index += 1;
        }
        else if (option === "--body-file") {
            if (bodySource)
                throw new CliError("Use only one request body source");
            body = await readJsonFile(valueAfter(args, index, option));
            bodySource = "file";
            index += 1;
        }
        else if (option === "--stdin") {
            if (bodySource)
                throw new CliError("Use only one request body source");
            body = parseJson(await readStdin(), "stdin");
            bodySource = "stdin";
        }
        else if (option === "--query") {
            query.push(valueAfter(args, index, option));
            index += 1;
        }
        else if (option === "--public-key") {
            forcePublicKey = true;
        }
        else if (option === "--allow-delivery") {
            allowDelivery = true;
        }
        else if (option === "--allow-destructive") {
            allowDestructive = true;
        }
        else if (option === "--allow-insecure") {
            allowInsecure = true;
        }
        else if (option === "--dry-run") {
            dryRun = true;
        }
        else if (option === "--compact") {
            compact = true;
        }
        else if (option === "--help") {
            stdout.write(HELP);
            process.exit(0);
        }
        else {
            throw new CliError(`Unknown option: ${option ?? ""}`);
        }
    }
    return {
        method,
        path,
        ...(body === undefined ? {} : { body }),
        query,
        forcePublicKey,
        allowDelivery,
        allowDestructive,
        allowInsecure,
        dryRun,
        compact,
    };
}
function doctor() {
    const apiUrl = process.env.PLUNK_API_URL;
    const result = {
        ok: Boolean(apiUrl && process.env.PLUNK_SECRET_API_KEY),
        apiUrl: apiUrl ?? null,
        secretApiKeyConfigured: Boolean(process.env.PLUNK_SECRET_API_KEY),
        publicApiKeyConfigured: Boolean(process.env.PLUNK_PUBLIC_API_KEY),
    };
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.ok)
        process.exitCode = 1;
}
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    if (!command || command === "--help" || command === "help") {
        stdout.write(HELP);
        return;
    }
    if (command === "--version" || command === "version") {
        stdout.write(`${VERSION}\n`);
        return;
    }
    if (command === "doctor") {
        doctor();
        return;
    }
    const requestArgs = command === "request" ? args.slice(1) : args;
    const request = await parseRequest(requestArgs);
    const apiUrl = process.env.PLUNK_API_URL;
    if (!apiUrl)
        throw new CliError("Missing PLUNK_API_URL");
    const result = await requestPlunk({
        apiUrl,
        secretApiKey: process.env.PLUNK_SECRET_API_KEY,
        publicApiKey: process.env.PLUNK_PUBLIC_API_KEY,
        method: request.method,
        path: request.path,
        body: request.body,
        query: request.query,
        forcePublicKey: request.forcePublicKey,
        allowDelivery: request.allowDelivery,
        allowDestructive: request.allowDestructive,
        allowInsecure: request.allowInsecure,
        dryRun: request.dryRun,
    });
    if (!(result instanceof Response)) {
        stdout.write(`${JSON.stringify({
            method: request.method,
            url: result.url.toString(),
            authorization: result.authorization,
            requiresDeliveryApproval: result.requiresDeliveryApproval,
            requiresDestructiveApproval: result.requiresDestructiveApproval,
            bodyProvided: request.body !== undefined,
        }, null, request.compact ? undefined : 2)}\n`);
        return;
    }
    stdout.write(`${await renderResponse(result, request.compact)}\n`);
    if (!result.ok)
        process.exitCode = 1;
}
main().catch((error) => {
    if (error instanceof CliError) {
        console.error(`Error: ${error.message}`);
        process.exitCode = error.exitCode;
        return;
    }
    if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
    }
    else {
        console.error("Error: Unknown failure");
    }
    process.exitCode = 1;
});
//# sourceMappingURL=cli.js.map