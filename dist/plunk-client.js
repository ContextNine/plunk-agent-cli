import { readFile } from "node:fs/promises";
export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
export class CliError extends Error {
    exitCode;
    constructor(message, exitCode = 2) {
        super(message);
        this.name = "CliError";
        this.exitCode = exitCode;
    }
}
export function parseJson(value, source) {
    try {
        return JSON.parse(value);
    }
    catch {
        throw new CliError(`${source} must contain valid JSON`);
    }
}
export async function readJsonFile(path) {
    return parseJson(await readFile(path, "utf8"), path);
}
export function parseMethod(value) {
    const method = value.toUpperCase();
    if (!HTTP_METHODS.includes(method)) {
        throw new CliError(`Unsupported HTTP method: ${value}`);
    }
    return method;
}
function validatePath(path) {
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
        throw new CliError("PATH must be relative to Plunk and begin with one /");
    }
}
function createUrl(apiUrl, path, query) {
    validatePath(path);
    const base = new URL(apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`);
    if (base.protocol !== "https:" && base.protocol !== "http:") {
        throw new CliError("PLUNK_API_URL must use HTTP or HTTPS");
    }
    const url = new URL(path.slice(1), base);
    for (const item of query) {
        const separator = item.indexOf("=");
        if (separator < 1) {
            throw new CliError(`Query must use KEY=VALUE: ${item}`);
        }
        url.searchParams.append(item.slice(0, separator), item.slice(separator + 1));
    }
    return url;
}
function isDeleteLike(method, path, body) {
    if (method === "DELETE" || /(?:^|\/)bulk-delete(?:$|[/?])/.test(path)) {
        return true;
    }
    return body !== null && typeof body === "object" && !Array.isArray(body) && body.delete === true;
}
function isDeliveryLike(method, path, body) {
    if (method === "GET" || method === "DELETE") {
        return false;
    }
    if (path === "/v1/send" ||
        path === "/v1/track" ||
        /^\/campaigns\/[^/]+\/(?:send|test)(?:$|[/?])/.test(path) ||
        /^\/workflows\/[^/]+\/executions(?:$|[/?])/.test(path)) {
        return true;
    }
    return (path.startsWith("/workflows") &&
        body !== null &&
        typeof body === "object" &&
        !Array.isArray(body) &&
        body.enabled === true);
}
export function buildRequestPlan(options) {
    const url = createUrl(options.apiUrl, options.path, options.query);
    if (url.protocol === "http:" && !options.allowInsecure) {
        throw new CliError("HTTP would expose the API key; pass --allow-insecure only for a trusted local network");
    }
    const requiresDeliveryApproval = isDeliveryLike(options.method, options.path, options.body);
    const requiresDestructiveApproval = isDeleteLike(options.method, options.path, options.body);
    if (requiresDeliveryApproval && !options.allowDelivery) {
        throw new CliError("This request can send email or trigger a workflow; pass --allow-delivery");
    }
    if (requiresDestructiveApproval && !options.allowDestructive) {
        throw new CliError("This request can delete data; pass --allow-destructive");
    }
    return {
        url,
        authorization: options.forcePublicKey || options.path === "/v1/track" ? "public" : "secret",
        requiresDeliveryApproval,
        requiresDestructiveApproval,
    };
}
export async function requestPlunk(options) {
    const plan = buildRequestPlan(options);
    if (options.dryRun) {
        return plan;
    }
    const apiKey = plan.authorization === "public" ? options.publicApiKey : options.secretApiKey;
    if (!apiKey) {
        const variable = plan.authorization === "public" ? "PLUNK_PUBLIC_API_KEY" : "PLUNK_SECRET_API_KEY";
        throw new CliError(`Missing ${variable}`);
    }
    const headers = new Headers({ Authorization: `Bearer ${apiKey}` });
    const request = {
        method: options.method,
        headers,
        signal: AbortSignal.timeout(45_000),
    };
    if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
        request.body = JSON.stringify(options.body);
    }
    return fetch(plan.url, request);
}
export async function renderResponse(response, compact) {
    const text = await response.text();
    if (!text) {
        return JSON.stringify({ ok: response.ok, status: response.status });
    }
    try {
        const json = JSON.parse(text);
        return JSON.stringify(json, null, compact ? undefined : 2);
    }
    catch {
        return text;
    }
}
//# sourceMappingURL=plunk-client.js.map