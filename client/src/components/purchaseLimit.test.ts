import { describe, expect, it } from "vitest";
import {
  checkPurchaseLimit,
  heldByIdCard,
  isValidIdCard,
  maskIdCard,
  resolvePurchaseStatus,
  type PurchaseRecord,
} from "./purchaseLimit";
import {
  ALL_SESSIONS,
  buildSessionStock,
  refundSessionDate,
  totalTicketStock,
} from "./ticketStats";
import { EVENT_SESSIONS, PURCHASE_RECORDS } from "./ticketSamples";

const MA = "65010219980315002X";

describe("身份证号校验", () => {
  it("按校验码与出生日期判断", () => {
    expect(isValidIdCard(MA)).toBe(true);
    expect(isValidIdCard("65010219980315002x")).toBe(true);
    expect(isValidIdCard("650102199803150021")).toBe(false);
    expect(isValidIdCard("650102199802300026")).toBe(false);
    expect(isValidIdCard("65010219980315002")).toBe(false);
    expect(maskIdCard(MA)).toBe("650102********002X");
  });
});

describe("按同一身份证严格限购", () => {
  const records = resolvePurchaseStatus(PURCHASE_RECORDS, [
    {
      id: "refund-20260929-001",
      ticketId: "QT-20260628-10316",
      status: "pending_review",
    },
    {
      id: "refund-20260928-002",
      ticketId: "QT-20260629-20762",
      status: "refunded",
      channelConfirmedAt: "2026-09-28 13:39",
    },
  ]);

  it("同一身份证多个账号购买合并计算", () => {
    const held = heldByIdCard(records, MA, "2026-06-28", "普通观众票");
    expect(held.held).toBe(4);
    expect(held.accounts).toEqual(["138****9036", "139****2275"]);
  });

  it("换账号继续下单超出限购被拦截", () => {
    const result = checkPurchaseLimit(records, {
      idCard: MA,
      sessionDate: "2026-06-28",
      ticketName: "普通观众票",
      quantity: 1,
      limit: 4,
    });
    expect(result.allowed).toBe(false);
    expect(result.exceed).toBe(1);
    expect(result.message).toBe(
      "超出限购 该身份证已通过 2 个账号购买持有 4 张"
    );
  });

  it("不同场次单独计算额度", () => {
    const result = checkPurchaseLimit(records, {
      idCard: MA,
      sessionDate: "2026-06-29",
      ticketName: "普通观众票",
      quantity: 4,
      limit: 4,
    });
    expect(result.allowed).toBe(true);
    expect(result.held).toBe(0);
  });

  it("部分额度剩余时提示还可再购", () => {
    const result = checkPurchaseLimit(records, {
      idCard: "650106199711263575",
      sessionDate: "2026-06-29",
      ticketName: "普通观众票",
      quantity: 3,
      limit: 4,
    });
    expect(result.allowed).toBe(false);
    expect(result.available).toBe(2);
    expect(result.message).toBe("超出限购 该身份证还可再购 2 张");
  });

  it("退款完成释放额度 退款处理中仍计入", () => {
    const coser = checkPurchaseLimit(records, {
      idCard: "652301199902041837",
      sessionDate: "2026-06-29",
      ticketName: "Coser 专属票",
      quantity: 1,
      limit: 1,
    });
    expect(coser.allowed).toBe(true);
    const approved = resolvePurchaseStatus(PURCHASE_RECORDS, [
      {
        id: "refund-20260929-001",
        ticketId: "QT-20260628-10316",
        status: "refunded",
        channelConfirmedAt: "2026-09-29 17:00",
      },
    ]);
    expect(heldByIdCard(approved, MA, "2026-06-28", "普通观众票").held).toBe(3);
  });

  it("未知/处理/申诉状态冻结，按 ticketId 部分退款且重复成功不重复释放", () => {
    const record: PurchaseRecord = {
      ...PURCHASE_RECORDS[2],
      quantity: 2,
      ticketIds: ["ticket-a", "ticket-b"],
      refundId: undefined,
    };
    for (const status of [
      "processing",
      "failed",
      "unknown",
      "appeal_pending",
    ] as const) {
      const resolved = resolvePurchaseStatus(
        [record],
        [{ id: status, ticketId: "ticket-a", status }]
      );
      expect(resolved[0].status).toBe("refund_pending");
      expect(
        heldByIdCard(resolved, MA, record.sessionDate, record.ticketName).held
      ).toBe(2);
    }
    const callback = {
      id: "channel-1",
      ticketId: "ticket-a",
      status: "refunded" as const,
      channelConfirmedAt: "2026-09-30 10:00",
    };
    const once = resolvePurchaseStatus([record], [callback]);
    expect(once[0].status).toBe("paid");
    expect(
      heldByIdCard(once, MA, record.sessionDate, record.ticketName).held
    ).toBe(1);
    const twice = resolvePurchaseStatus(once, [callback]);
    expect(twice[0].refundedTicketIds).toEqual(["ticket-a"]);
    expect(
      heldByIdCard(twice, MA, record.sessionDate, record.ticketName).held
    ).toBe(1);
    expect(
      resolvePurchaseStatus(
        [record],
        [{ ...callback, channelConfirmedAt: undefined }]
      )[0].status
    ).toBe("refund_pending");
  });

  it("跨活动订单不会参与主活动限购，也不借用主活动样例", () => {
    const other: PurchaseRecord = {
      ...PURCHASE_RECORDS[0],
      eventId: "EVT-OTHER",
      ticketIds: ["other-ticket"],
      status: "paid",
    };
    expect(resolvePurchaseStatus([other], [], "EVT-2026-0628")).toEqual([]);
    expect(
      heldByIdCard(
        [other],
        MA,
        other.sessionDate,
        other.ticketName,
        "EVT-2026-0628"
      ).held
    ).toBe(0);
  });

  it("退款记录丢失或未知付款状态不能释放名额", () => {
    const unresolved = { ...PURCHASE_RECORDS[0], status: "paid" as const };
    expect(resolvePurchaseStatus([unresolved], [])[0].status).toBe(
      "refund_pending"
    );
    const unknown = {
      ...PURCHASE_RECORDS[0],
      status: "unexpected-status",
    } as unknown as PurchaseRecord;
    expect(
      heldByIdCard([unknown], MA, unknown.sessionDate, unknown.ticketName).held
    ).toBe(unknown.quantity);
  });

  it("身份证无效或输入不完整时不放行", () => {
    const base = {
      sessionDate: "2026-06-28",
      ticketName: "普通观众票",
      quantity: 1,
      limit: 4,
    };
    expect(checkPurchaseLimit(records, { ...base, idCard: "" }).message).toBe(
      "请输入购票人身份证号"
    );
    const wrong = checkPurchaseLimit(records, {
      ...base,
      idCard: "650102199803150021",
    });
    expect(wrong.valid).toBe(false);
    expect(wrong.allowed).toBe(false);
    expect(
      checkPurchaseLimit(records, { ...base, idCard: MA, quantity: 0 }).message
    ).toBe("购买张数需为不小于 1 的整数");
  });

  it("身份证号大小写与空格不影响合并", () => {
    const list: PurchaseRecord[] = [
      { ...PURCHASE_RECORDS[1], idCard: "650102 19980315 002x" },
    ];
    expect(heldByIdCard(list, MA, "2026-06-28", "普通观众票").held).toBe(1);
  });
});

describe("票务管理按场次日期查看", () => {
  const refunds = [
    {
      ticketName: "普通观众票",
      status: "pending_review" as const,
      amount: 88,
      ticketCode: "QT-20260628-10316",
    },
    {
      ticketName: "Coser 专属票",
      status: "refunded" as const,
      amount: 68,
      ticketCode: "QT-20260629-20762",
      channelConfirmedAt: "2026-09-28 13:39",
    },
  ];

  it("从电子票号读取场次日期", () => {
    expect(refundSessionDate(refunds[1])).toBe("2026-06-29");
    expect(
      refundSessionDate({ ...refunds[1], sessionDate: "2026-06-28" })
    ).toBe("2026-06-28");
  });

  it("全部场次合计与原口径一致", () => {
    const rows = buildSessionStock(EVENT_SESSIONS, refunds, ALL_SESSIONS);
    const total = totalTicketStock(rows);
    expect(rows.map(row => row.ticket.name)).toEqual([
      "普通观众票",
      "Coser 专属票",
      "学生早鸟票",
      "现场当日票",
    ]);
    expect(total.sold).toBe(4662);
    expect(total.inventory).toBe(8300);
    expect(
      rows.reduce((sum, row) => sum + row.sold * row.ticket.price, 0)
    ).toBe(380096);
    expect(total.refunded).toBe(1);
  });

  it("没有渠道确认的 refunded 文本仍冻结库存", () => {
    const rows = buildSessionStock(
      EVENT_SESSIONS,
      [
        {
          ticketName: "Coser 专属票",
          status: "refunded",
          amount: 68,
          ticketCode: "QT-20260629-20762",
        },
      ],
      "2026-06-29"
    );
    const coser = rows.find(row => row.ticket.name === "Coser 专属票")!;
    expect(coser.refunded).toBe(0);
    expect(coser.pending).toBe(1);
    expect(coser.remaining).toBe(250 - 150);
  });

  it("单个场次只统计当天票种与退款", () => {
    const day1 = buildSessionStock(EVENT_SESSIONS, refunds, "2026-06-28");
    const day2 = buildSessionStock(EVENT_SESSIONS, refunds, "2026-06-29");
    expect(totalTicketStock(day1).sold).toBe(2468);
    expect(totalTicketStock(day2).sold).toBe(2194);
    expect(day1[0].pending).toBe(1);
    expect(day2[0].pending).toBe(0);
    expect(day1[1].refunded).toBe(0);
    expect(day2[1].refunded).toBe(1);
    expect(day2[1].remaining).toBe(250 - 150 + 1);
  });
});
