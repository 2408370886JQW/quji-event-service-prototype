import { describe, expect, it } from "vitest";
import {
  copyTicketsToDate,
  countActivityDays,
  createTicketType,
  defaultSessionTickets,
  formatPurchaseLimit,
  formatRealName,
  formatSessionDate,
  listActivityDates,
  suggestSaleRange,
  summarizeSessions,
  summarizeTicketTypes,
  syncSessions,
  validateActivityWindow,
  validateSessions,
  validateTicketField,
  validateTicketTypes,
  type TicketTypeDraft,
} from "./ticketTypes";
import { buildTicketStock, totalTicketStock } from "./ticketStats";

const window = { start: "2026-10-18", end: "2026-10-18" };
const TODAY = "2026-09-30";
function presale(overrides: Partial<TicketTypeDraft> = {}): TicketTypeDraft {
  return {
    ...createTicketType(),
    name: "预售票",
    category: "presale",
    price: "68",
    inventory: "1500",
    saleStart: "2026-10-01",
    saleEnd: "2026-10-17",
    ...overrides,
  };
}

describe("活动创建票种规则", () => {
  it("预售票与现场票可同时配置并通过校验", () => {
    const onsite = presale({
      name: "现场票",
      category: "onsite",
      price: "88",
      inventory: "500",
      saleStart: "2026-10-18",
      saleEnd: "2026-10-18",
      entryLimit: "unlimited",
      entryTimes: null,
    });
    const list = [presale(), onsite];
    expect(validateTicketTypes(list, window)).toEqual({});
    expect(summarizeTicketTypes(list)).toEqual({
      count: 2,
      totalInventory: 2000,
    });
  });

  it("空白票种逐项提示必填字段 限购和实名有默认值", () => {
    const empty = createTicketType();
    expect(empty.purchaseLimit).toBe(4);
    expect(empty.realNameRequired).toBe(true);
    const errors = validateTicketTypes([empty], window)[empty.id];
    expect(errors).toMatchObject({
      name: "请输入票种名称",
      category: "请选择票种类别",
      price: "请输入价格",
      inventory: "请输入单场次总库存",
      saleRange: "请选择销售时间",
    });
    expect(errors?.entryTimes).toBeUndefined();
    expect(errors?.purchaseLimit).toBeUndefined();
  });

  it("销售时间受场次日期约束", () => {
    expect(
      validateTicketField(
        presale({ saleEnd: "2026-10-19" }),
        "saleRange",
        window
      )
    ).toBe("销售截止不能晚于 2026-10-18");
    expect(
      validateTicketField(
        presale({ saleStart: "2026-10-18", saleEnd: "2026-10-18" }),
        "saleRange",
        window
      )
    ).toBe("预售票需在场次开始前开售");
    expect(
      validateTicketField(
        presale({ category: "onsite", saleStart: "2026-10-10" }),
        "saleRange",
        window
      )
    ).toBe("现场票仅在场次当天销售");
  });

  it("票种名称不可重复且数值有边界", () => {
    const a = presale();
    const b = presale({ id: "other" });
    expect(validateTicketField(b, "name", window, [a, b])).toBe(
      "同一场次票种名称不能重复"
    );
    expect(
      validateTicketField(presale({ price: "1.234" }), "price", window)
    ).toBe("价格最多保留两位小数");
    expect(
      validateTicketField(presale({ inventory: "0" }), "inventory", window)
    ).toBe("库存需为不小于 1 的整数");
    expect(
      validateTicketField(presale({ entryTimes: "11" }), "entryTimes", window)
    ).toBe("可入场次数为 1 到 10 次");
  });

  it("每人限购 1 到 10 张且不超过库存", () => {
    const check = (purchaseLimit: string, inventory = "1500") =>
      validateTicketField(
        presale({ purchaseLimit, inventory }),
        "purchaseLimit",
        window
      );
    expect(check("")).toBe("请输入每人限购张数");
    expect(check("0")).toBe("每人限购 1 到 10 张");
    expect(check("11")).toBe("每人限购 1 到 10 张");
    expect(check("6", "5")).toBe("限购张数不能超过库存");
    expect(check("2")).toBe("");
    expect(formatPurchaseLimit({ purchaseLimit: "2" })).toBe("每人限购 2 张");
    expect(formatRealName({ realNameRequired: false })).toBe("无需实名");
  });

  it("按类别建议销售区间", () => {
    expect(suggestSaleRange("onsite", window, TODAY)).toEqual({
      saleStart: "2026-10-18",
      saleEnd: "2026-10-18",
    });
    expect(suggestSaleRange("presale", window, TODAY)).toEqual({
      saleStart: "2026-09-30",
      saleEnd: "2026-10-17",
    });
    expect(suggestSaleRange("presale", window, "2026-10-18")).toBeNull();
  });
});

describe("多日活动按天生成场次", () => {
  const three = { start: "2026-10-18", end: "2026-10-20" };

  it("活动日期可选连续多天 最多 7 天", () => {
    expect(listActivityDates(three)).toEqual([
      "2026-10-18",
      "2026-10-19",
      "2026-10-20",
    ]);
    expect(countActivityDays(three)).toBe(3);
    expect(validateActivityWindow(three, TODAY)).toBe("");
    expect(validateActivityWindow({ start: "", end: "" }, TODAY)).toBe(
      "请选择活动日期"
    );
    expect(
      validateActivityWindow({ start: "2026-09-01", end: "2026-09-02" }, TODAY)
    ).toBe("活动日期不能早于今天");
    expect(
      validateActivityWindow({ start: "2026-10-01", end: "2026-10-08" }, TODAY)
    ).toBe("活动最多连续 7 天");
    expect(formatSessionDate("2026-10-18")).toBe("10月18日 周日");
  });

  it("每天默认预售票和现场票 销售时间按当天生成", () => {
    const sessions = syncSessions([], three, TODAY);
    expect(sessions).toHaveLength(3);
    const day2 = sessions[1];
    expect(day2.tickets.map(ticket => ticket.name)).toEqual([
      "预售票",
      "现场票",
    ]);
    expect(day2.tickets[0]).toMatchObject({
      saleStart: TODAY,
      saleEnd: "2026-10-18",
    });
    expect(day2.tickets[1]).toMatchObject({
      saleStart: "2026-10-19",
      saleEnd: "2026-10-19",
    });
  });

  it("修改活动日期时保留仍在范围内的场次配置", () => {
    const sessions = syncSessions([], three, TODAY);
    sessions[0].tickets[0].inventory = "800";
    const shrunk = syncSessions(
      sessions,
      { start: "2026-10-18", end: "2026-10-19" },
      TODAY
    );
    expect(shrunk.map(session => session.date)).toEqual([
      "2026-10-18",
      "2026-10-19",
    ]);
    expect(shrunk[0].tickets[0].inventory).toBe("800");
  });

  it("复制票种到其他日期时重新生成销售时间和编号", () => {
    const source = defaultSessionTickets("2026-10-18", TODAY).map(ticket => ({
      ...ticket,
      price: "68",
      inventory: "1000",
      purchaseLimit: "2",
    }));
    const copied = copyTicketsToDate(source, "2026-10-20", TODAY);
    expect(copied[0].id).not.toBe(source[0].id);
    expect(copied[0]).toMatchObject({
      inventory: "1000",
      purchaseLimit: "2",
      saleEnd: "2026-10-19",
    });
    expect(copied[1]).toMatchObject({
      saleStart: "2026-10-20",
      saleEnd: "2026-10-20",
    });
  });

  it("逐场校验并定位到第一个有问题的日期", () => {
    const sessions = syncSessions([], three, TODAY).map(session => ({
      ...session,
      tickets: session.tickets.map(ticket => ({
        ...ticket,
        price: "68",
        inventory: "500",
      })),
    }));
    sessions[1].tickets[1].inventory = "";
    sessions[2].tickets[0].purchaseLimit = "20";
    const result = validateSessions(sessions);
    expect(result.total).toBe(2);
    expect(result.firstDate).toBe("2026-10-19");
    expect(result.countByDate).toEqual({ "2026-10-19": 1, "2026-10-20": 1 });
    expect(summarizeSessions(sessions)).toEqual({
      days: 3,
      ticketCount: 6,
      totalInventory: 2500,
    });
  });
});

describe("票务管理按票种统计", () => {
  const tickets = [
    { name: "普通观众票", price: 88, inventory: 6000, sold: 3548 },
    { name: "Coser 专属票", price: 68, inventory: 500, sold: 326 },
    { name: "学生早鸟票", price: 58, inventory: 800, sold: 788 },
    { name: "现场当日票", price: 98, inventory: 1000, sold: 0 },
  ];
  const refunds = [
    { ticketName: "普通观众票", status: "pending_review" as const, amount: 88 },
    { ticketName: "Coser 专属票", status: "refunded" as const, amount: 68 },
    { ticketName: "学生早鸟票", status: "rejected" as const, amount: 58 },
  ];

  it("已售 已退款 剩余逐票种计算 退款票回到库存", () => {
    const rows = buildTicketStock(tickets, refunds);
    expect(rows.map(row => [row.sold, row.refunded, row.remaining])).toEqual([
      [3548, 0, 2452],
      [326, 1, 175],
      [788, 0, 12],
      [0, 0, 1000],
    ]);
    expect(rows[0].pending).toBe(1);
    expect(totalTicketStock(rows)).toMatchObject({
      sold: 4662,
      refunded: 1,
      refundedAmount: 68,
      pending: 1,
      remaining: 3639,
    });
  });

  it("平台同意退款后对应票种已退款和剩余同时增加", () => {
    const approved = refunds.map(item =>
      item.ticketName === "普通观众票"
        ? { ...item, status: "refunded" as const }
        : item
    );
    const row = buildTicketStock(tickets, approved)[0];
    expect(row).toMatchObject({ refunded: 1, pending: 0, remaining: 2453 });
  });
});
