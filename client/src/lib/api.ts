export const API_NOT_CONNECTED_MESSAGE = "业务接口尚未接入，请连接趣集后端服务";

/** `api` must be explicit; other values preserve the existing frontend workspace. */
export function isApiDataMode(): boolean {
  return import.meta.env.VITE_DATA_SOURCE?.trim().toLowerCase() === "api";
}

/** No local operation may stand in for an authoritative API result. */
export function assertPrototypeWriteAllowed(operation: string): void {
  if (isApiDataMode())
    throw new Error(`${API_NOT_CONNECTED_MESSAGE}（${operation}）`);
}

/** Same v1 envelope as the existing Vue3 docs/API_CONTRACT.md. */
export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

export async function requestApi<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("接口路径必须是当前服务的绝对路径");
  const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/api";
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers,
    credentials: "include",
    signal: init.signal ?? AbortSignal.timeout(15_000),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(API_NOT_CONNECTED_MESSAGE);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new Error(API_NOT_CONNECTED_MESSAGE);
  const envelope = payload as Partial<ApiEnvelope<T>>;
  if (
    !response.ok ||
    typeof envelope.code !== "number" ||
    envelope.code !== 0 ||
    typeof envelope.message !== "string" ||
    !("data" in envelope)
  )
    throw new Error(
      typeof envelope.message === "string"
        ? envelope.message
        : API_NOT_CONNECTED_MESSAGE
    );
  return envelope.data as T;
}
