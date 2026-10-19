export const API_NOT_CONNECTED_MESSAGE = "业务接口尚未接入，请连接趣集后端服务";
export function isApiDataMode(): boolean {
  return import.meta.env.VITE_DATA_SOURCE?.trim().toLowerCase() === "api";
}
export function assertPrototypeWriteAllowed(operation: string): void {
  if (isApiDataMode())
    throw new Error(`${API_NOT_CONNECTED_MESSAGE}（${operation}）`);
}
export type ApiEnvelope<T> = { code: number; message: string; data: T };
export class ApiRequestError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly retryable: boolean;
  readonly fieldErrors?: Record<string, string>;
  constructor(
    message: string,
    status = 0,
    metadata: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = "ApiRequestError";
    this.status = status;
    this.requestId =
      typeof metadata.requestId === "string" ? metadata.requestId : undefined;
    this.retryable =
      metadata.retryable === true || status === 0 || status >= 500;
    if (
      metadata.fieldErrors &&
      typeof metadata.fieldErrors === "object" &&
      !Array.isArray(metadata.fieldErrors)
    ) {
      this.fieldErrors = Object.fromEntries(
        Object.entries(metadata.fieldErrors).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string"
        )
      );
    }
  }
}
function expireSession(status: number) {
  if (
    status === 401 &&
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  )
    window.dispatchEvent(new Event("quji:unauthorized"));
}
export async function requestApi<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("接口路径必须是当前服务的绝对路径");
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api";
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new ApiRequestError(
      "网络请求失败，请先查询原操作结果后再重试",
      0,
      {},
      error
    );
  }
  expireSession(response.status);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError(
      API_NOT_CONNECTED_MESSAGE,
      response.status || 502
    );
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new ApiRequestError(API_NOT_CONNECTED_MESSAGE, 502);
  const envelope = payload as Partial<ApiEnvelope<T>> & Record<string, unknown>;
  if (
    !response.ok ||
    typeof envelope.code !== "number" ||
    envelope.code !== 0 ||
    typeof envelope.message !== "string" ||
    !("data" in envelope)
  ) {
    const status =
      typeof envelope.code === "number" &&
      [401, 403, 409, 422].includes(envelope.code)
        ? envelope.code
        : response.status || 502;
    expireSession(status);
    throw new ApiRequestError(
      typeof envelope.message === "string"
        ? envelope.message
        : API_NOT_CONNECTED_MESSAGE,
      status,
      envelope
    );
  }
  return envelope.data as T;
}
