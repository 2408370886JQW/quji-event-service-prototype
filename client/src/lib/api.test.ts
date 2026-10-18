import { afterEach, describe, expect, it, vi } from "vitest";
import { API_NOT_CONNECTED_MESSAGE, requestApi } from "./api";
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
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
      vi
        .fn()
        .mockResolvedValue({
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
