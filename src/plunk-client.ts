import { readFile } from "node:fs/promises";

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface RequestOptions {
  readonly apiUrl: string;
  readonly secretApiKey: string | undefined;
  readonly publicApiKey: string | undefined;
  readonly method: HttpMethod;
  readonly path: string;
  readonly body: JsonValue | undefined;
  readonly query: readonly string[];
  readonly forcePublicKey: boolean;
  readonly allowDelivery: boolean;
  readonly allowDestructive: boolean;
  readonly allowInsecure: boolean;
  readonly dryRun: boolean;
}

export interface RequestPlan {
  readonly url: URL;
  readonly authorization: "public" | "secret";
  readonly requiresDeliveryApproval: boolean;
  readonly requiresDestructiveApproval: boolean;
}

export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 2) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export function parseJson(value: string, source: string): JsonValue {
  try {
    return JSON.parse(value) as JsonValue;
  } catch {
    throw new CliError(`${source} must contain valid JSON`);
  }
}

export async function readJsonFile(path: string): Promise<JsonValue> {
  return parseJson(await readFile(path, "utf8"), path);
}

export function parseMethod(value: string): HttpMethod {
  const method = value.toUpperCase();
  if (!HTTP_METHODS.includes(method as HttpMethod)) {
    throw new CliError(`Unsupported HTTP method: ${value}`);
  }
  return method as HttpMethod;
}

function validatePath(path: string): void {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    throw new CliError("PATH must be relative to Plunk and begin with one /");
  }
}

function createUrl(apiUrl: string, path: string, query: readonly string[]): URL {
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

function isDeleteLike(method: HttpMethod, path: string, body: JsonValue | undefined): boolean {
  if (method === "DELETE" || /(?:^|\/)bulk-delete(?:$|[/?])/.test(path)) {
    return true;
  }
  return body !== null && typeof body === "object" && !Array.isArray(body) && body.delete === true;
}

function isDeliveryLike(method: HttpMethod, path: string, body: JsonValue | undefined): boolean {
  if (method === "GET" || method === "DELETE") {
    return false;
  }
  if (
    path === "/v1/send" ||
    path === "/v1/track" ||
    /^\/campaigns\/[^/]+\/(?:send|test)(?:$|[/?])/.test(path) ||
    /^\/workflows\/[^/]+\/executions(?:$|[/?])/.test(path)
  ) {
    return true;
  }
  return (
    path.startsWith("/workflows") &&
    body !== null &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    body.enabled === true
  );
}

export function buildRequestPlan(options: RequestOptions): RequestPlan {
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

export async function requestPlunk(options: RequestOptions): Promise<Response | RequestPlan> {
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
  const request: RequestInit = {
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

export async function renderResponse(response: Response, compact: boolean): Promise<string> {
  const text = await response.text();
  if (!text) {
    return JSON.stringify({ ok: response.ok, status: response.status });
  }

  try {
    const json = JSON.parse(text) as JsonValue;
    return JSON.stringify(json, null, compact ? undefined : 2);
  } catch {
    return text;
  }
}
