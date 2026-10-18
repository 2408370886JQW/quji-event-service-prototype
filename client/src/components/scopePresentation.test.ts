import { describe, expect, it } from "vitest";
import { createEmptyActivityOps } from "./activityOpsCore";
import { buildActivityReport, type ReportInput } from "./activityReport";
import {
  addTicketType,
  commitTicketConfig,
  createTicketConfig,
  type NewTicketInput,
} from "./ticketConfig";
import { buildSessionStock } from "./ticketStats";

const PRIMARY_EVENT_ID = "EVT-2026-0628";
const OTHER_EVENT_ID = "EVT-2026-0720";
const actor = { name: "林洁", role: "主办方活动运营人员" };
const input: NewTicketInput = {
  name: "普通观众票",
  channel: "漫圈用户端",
  dates: [],
  price: "88",
  inventory: "1",
  purchaseLimit: 1,
  realName: true,
  status: "售票中",
  saleStart: "2026-07-01 10:00",
  saleEnd: "2026-07-20 17:00",
};

function reportInput(refunds: ReportInput["refunds"]): ReportInput {
  return {
    event: {
      id: OTHER_EVENT_ID,
      name: "测试活动",
      subtitle: "活动范围回归",
      date: "2026-07-20",
      venue: "测试场馆",
      organizer: "测试主办方",
      stageIndex: 3,
      tickets: 1,
      checkedIn: 0,
      pending: 0,
    },
    primary: true,
    stock: [],
    refunds,
    submissions: [],
    ops: createEmptyActivityOps(),
    actor,
    now: "2026-07-20 18:00",
  };
}

describe("活动范围与退款展示", () => {
  it("为其他活动首次创建本活动场次，且拒绝把其他活动场次改绑", () => {
    const result = addTicketType(
      { sessions: [], logs: [] },
      input,
      actor,
      "2026-07-01 10:00",
      OTHER_EVENT_ID
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.sessions).toMatchObject([
      { eventId: OTHER_EVENT_ID, date: "2026-07-20" },
    ]);
    expect(() =>
      commitTicketConfig(
        { sessions: createTicketConfig().sessions, logs: [] },
        OTHER_EVENT_ID
      )
    ).toThrow("不能把其他活动的票务场次改绑到当前活动");
  });

  it("已确认的其他活动退款只释放该活动库存；无回执 refunded 不计到账", () => {
    const created = addTicketType(
      { sessions: [], logs: [] },
      input,
      actor,
      "2026-07-01 10:00",
      OTHER_EVENT_ID
    );
    if (!created.ok) throw new Error("test ticket setup failed");
    const sessions = created.state.sessions.map(session => ({
      ...session,
      tickets: session.tickets.map(ticket => ({ ...ticket, sold: 1 })),
    }));
    const confirmed = {
      eventId: OTHER_EVENT_ID,
      ticketId: "other-ticket-1",
      ticketCode: "OTHER-1",
      ticketName: "普通观众票",
      amount: 88,
      status: "refunded" as const,
      channelConfirmedAt: "2026-07-20T18:00:00Z",
      sessionDate: "2026-07-20",
    };
    const other = buildSessionStock(
      sessions,
      [confirmed],
      "2026-07-20",
      OTHER_EVENT_ID
    )[0];
    const primary = buildSessionStock(
      createTicketConfig().sessions,
      [confirmed],
      "2026-06-28",
      PRIMARY_EVENT_ID
    ).find(row => row.ticket.name === "普通观众票");
    expect(other).toMatchObject({ refunded: 1, remaining: 1 });
    expect(primary).toMatchObject({ refunded: 0 });

    const report = buildActivityReport(
      reportInput([
        {
          requestNo: "TK-OTHER-1",
          buyerName: "测试用户",
          ticketName: "普通观众票",
          ticketId: "other-ticket-1",
          ticketCode: "OTHER-1",
          amount: 88,
          reason: "测试",
          status: "refunded",
        },
      ])
    );
    const refunds = report.sections.find(section => section.id === "refunds");
    expect(refunds?.intro).toContain("渠道确认到账 0 笔 ¥0");
    expect(refunds?.table?.rows[0]?.[5]).toBe("退款结果待核对");
  });
});
