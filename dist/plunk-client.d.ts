export declare const HTTP_METHODS: readonly ["GET", "POST", "PUT", "PATCH", "DELETE"];
export type HttpMethod = (typeof HTTP_METHODS)[number];
export type JsonValue = null | boolean | number | string | JsonValue[] | {
    [key: string]: JsonValue;
};
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
export declare class CliError extends Error {
    readonly exitCode: number;
    constructor(message: string, exitCode?: number);
}
export declare function parseJson(value: string, source: string): JsonValue;
export declare function readJsonFile(path: string): Promise<JsonValue>;
export declare function parseMethod(value: string): HttpMethod;
export declare function buildRequestPlan(options: RequestOptions): RequestPlan;
export declare function requestPlunk(options: RequestOptions): Promise<Response | RequestPlan>;
export declare function renderResponse(response: Response, compact: boolean): Promise<string>;
