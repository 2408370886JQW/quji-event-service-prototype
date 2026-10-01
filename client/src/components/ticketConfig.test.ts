import { describe, expect, it } from "vitest";
import {
  addTicketType,
  configuredLimit,
  createTicketConfig,
  findTicket,
  saleWindow,
  updateTicketConfig,
  validateTicketConfig,
  type TicketConfigInput,
} from "./ticketConfig";
import { buildSessionStock } from "./ticketStats";

const actor = { name: "林洁", role: "主办方活动运营人员" };
const base = (patch: Partial<TicketConfigInput> = {}): TicketConfigInput => ({
  price: "88",
  inventory: "3000",
  purchaseLimit: 4,
  realName: true,
  status: "售票中",
  saleStart: "2026-06-01 10:00",
  saleEnd: "2026-06-28 17:00",
  ...patch,
});

describe("票种配置", () => {
  it("由样例销售说明推导开售与停售时间", () => {
    const state = createTicketConfig();
    const onsite = findTicket(state, "2026-06-29", "现场当日票")!;
    expect(saleWindow(onsite, "2026-06-29")).toEqual({
      start: "2026-06-29 08:30",
      end: "2026-06-29 17:00",
    });
    const early = findTicket(state, "2026-06-28", "学生早鸟票")!;
    expect(early.saleEnd).toBe("2026-06-10 23:59");
  });

  it("库存不能少于已售出张数 限购 1-10 张 停售晚于开售", () => {
    expect(
      validateTicketConfig(base({ inventory: "1800" }), 1896, "2026-06-28")
        .inventory
    ).toContain("1,896");
    expect(
      validateTicketConfig(base({ purchaseLimit: 11 }), 0, "2026-06-28")
        .purchaseLimit
    ).toBeTruthy();
    expect(
      validateTicketConfig(
        base({ saleEnd: "2026-05-01 10:00" }),
        0,
        "2026-06-28"
      ).saleEnd
    ).toBe("停售时间需晚于开售时间");
    expect(
      validateTicketConfig(
        base({ saleEnd: "2026-06-29 10:00" }),
        0,
        "2026-06-28"
      ).saleEnd
    ).toBe("停售时间不能晚于场次当天");
    expect(validateTicketConfig(base(), 1896, "2026-06-28")).toEqual({});
  });

  it("只改当前场次 写入配置记录 限购校验读取新限额", () => {
    const state = createTicketConfig();
    const result = updateTicketConfig(state, {
      sessionDate: "2026-06-28",
      ticketName: "普通观众票",
      input: base({ inventory: "3200", purchaseLimit: 2 }),
      syncAll: false,
      netSold: { "2026-06-28": 1896, "2026-06-29": 1652 },
      actor,
      time: "2026-06-20 10:00",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      findTicket(result.state, "2026-06-28", "普通观众票")!.inventory
    ).toBe(3200);
    expect(
      findTicket(result.state, "2026-06-29", "普通观众票")!.inventory
    ).toBe(3000);
    expect(configuredLimit(result.state, "2026-06-28", "普通观众票")).toBe(2);
    expect(configuredLimit(result.state, "2026-06-29", "普通观众票")).toBe(4);
    expect(result.state.logs[0]).toMatchObject({
      action: "更新票种配置",
      actorName: "林洁",
      detail: "库存 3,000 → 3,200 · 限购 4 → 2 张",
    });
    const row = buildSessionStock(result.state.sessions, [], "2026-06-28").find(
      item => item.ticket.name === "普通观众票"
    )!;
    expect(row.remaining).toBe(3200 - 1896);
  });

  it("同步到全部场次 时间按场次保留", () => {
    const state = createTicketConfig();
    const result = updateTicketConfig(state, {
      sessionDate: "2026-06-28",
      ticketName: "现场当日票",
      input: base({
        price: "108",
        inventory: "600",
        purchaseLimit: 2,
        status: "待开售",
        saleStart: "2026-06-28 08:00",
        saleEnd: "2026-06-28 16:00",
      }),
      syncAll: true,
      netSold: { "2026-06-28": 0, "2026-06-29": 0 },
      actor,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const day2 = findTicket(result.state, "2026-06-29", "现场当日票")!;
    expect(day2.price).toBe(108);
    expect(day2.inventory).toBe(600);
    expect(day2.saleStart).toBe("2026-06-29 08:30");
    expect(result.state.logs.map(log => log.action)).toEqual([
      "更新票种配置",
      "同步票种配置",
    ]);
  });

  it("同步时任一场次库存低于已售则整体不保存", () => {
    const state = createTicketConfig();
    const result = updateTicketConfig(state, {
      sessionDate: "2026-06-29",
      ticketName: "普通观众票",
      input: base({ inventory: "1700", saleEnd: "2026-06-29 17:00" }),
      syncAll: true,
      netSold: { "2026-06-28": 1896, "2026-06-29": 1652 },
      actor,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.inventory).toContain("同步失败");
  });

  it("新增票种 名称不可重复 最多 10 个", () => {
    const state = createTicketConfig();
    const dup = addTicketType(
      state,
      { ...base(), name: "普通观众票", channel: "", dates: ["2026-06-28"] },
      actor
    );
    expect(dup.ok).toBe(false);
    const added = addTicketType(
      state,
      {
        ...base({
          price: "128",
          inventory: "200",
          saleStart: "2026-06-20 10:00",
        }),
        name: "家庭套票",
        channel: "漫圈用户端",
        dates: ["2026-06-28", "2026-06-29"],
      },
      actor
    );
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    const day2 = findTicket(added.state, "2026-06-29", "家庭套票")!;
    expect(day2).toMatchObject({
      sold: 0,
      inventory: 200,
      saleEnd: "2026-06-29 17:00",
    });
    let current = added.state;
    for (let i = 0; i < 5; i += 1) {
      const next = addTicketType(
        current,
        {
          ...base({ saleStart: "2026-06-20 10:00" }),
          name: `加场票${i}`,
          channel: "",
          dates: ["2026-06-28"],
        },
        actor
      );
      expect(next.ok).toBe(true);
      if (next.ok) current = next.state;
    }
    const over = addTicketType(
      current,
      {
        ...base({ saleStart: "2026-06-20 10:00" }),
        name: "第十一种",
        channel: "",
        dates: ["2026-06-28"],
      },
      actor
    );
    expect(over.ok).toBe(false);
  });
});
