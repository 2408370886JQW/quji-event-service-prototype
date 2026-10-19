import { afterEach, describe, expect, it, vi } from "vitest";
import { API_NOT_CONNECTED_MESSAGE, requestApi, ApiRequestError } from "./api";
import {
  getSubmissions,
  commitSubmissions,
} from "../components/submissionReview";
import { getActivityOps, commitActivityOps } from "../components/activityOps";
import {
  getTicketConfig,
  commitTicketConfig,
} from "../components/ticketConfig";
import { loadRefundRecords, saveRefundRecords } from "../components/refundData";
import {
  getEventSessions,
  getPurchaseRecords,
} from "../components/ticketSamples";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("API 模式不回落本地数据", () => {
  it("接口模式不读历史浏览器数据或样例，所有本地业务写入均拒绝", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "api");
    const read = vi.fn(() => JSON.stringify([{ id: "old-local-data" }]));
    vi.stubGlobal("window", {
      localStorage: { getItem: read, setItem: vi.fn() },
    });
    expect(getSubmissions()).toEqual([]);
    expect(loadRefundRecords()).toEqual([]);
    expect(getActivityOps().checkins).toEqual([]);
    expect(getTicketConfig().sessions).toEqual([]);
    expect(getEventSessions()).toEqual([]);
    expect(getPurchaseRecords()).toEqual([]);
    expect(read).not.toHaveBeenCalled();
    expect(() => commitSubmissions([])).toThrow(API_NOT_CONNECTED_MESSAGE);
    expect(() => saveRefundRecords([])).toThrow(API_NOT_CONNECTED_MESSAGE);
    expect(() => commitActivityOps(getActivityOps())).toThrow(
      API_NOT_CONNECTED_MESSAGE
    );
    expect(() => commitTicketConfig(getTicketConfig())).toThrow(
      API_NOT_CONNECTED_MESSAGE
    );
  });
});

describe("与 Vue3 一致的数字 code/data 契约", () => {
  it("只接受成功 HTTP 和 code=0 的完整响应", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "/api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 0, message: "ok", data: { id: "event-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(requestApi("/activities")).resolves.toEqual({ id: "event-1" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/activities");
  });

  it.each([
    null,
    [],
    { code: "OK", message: "ok", data: {} },
    { code: 0, message: "ok" },
    { code: 1, message: "失败", data: {} },
  ])("无效响应绝不当作成功：%j", async payload => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => payload })
    );
    await expect(requestApi("/activities")).rejects.toThrow();
  });

  it("HTTP 未授权即使 body 声称成功也不能放行", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ code: 0, message: "未授权", data: {} }),
      })
    );
    await expect(requestApi("/activities")).rejects.toThrow("未授权");
  });

  it("SPA HTML 或不可解析接口响应必须明确报错", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("HTML");
        },
      })
    );
    await expect(requestApi("/activities")).rejects.toThrow(
      API_NOT_CONNECTED_MESSAGE
    );
  });
});

describe("统一请求错误语义", () => {
  it("409保留版本冲突的请求追踪与字段错误，不回写本地", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 409,
          json: async () => ({
            code: 409,
            message: "版本已变化",
            requestId: "case-409",
            retryable: false,
            fieldErrors: { version: "刷新后重试", bad: 12 },
          }),
        })
    );
    const error = await requestApi("/activities/a").catch(x => x);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.status).toBe(409);
    expect(error.requestId).toBe("case-409");
    expect(error.fieldErrors).toEqual({ version: "刷新后重试" });
    expect(error.retryable).toBe(false);
  });
  it("401发出身份失效事件", async () => {
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ code: 401, message: "身份已过期" }),
        })
    );
    await expect(requestApi("/me")).rejects.toThrow("身份已过期");
    expect(dispatch).toHaveBeenCalled();
  });
});
