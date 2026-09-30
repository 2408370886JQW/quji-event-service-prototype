import { describe, expect, it } from "vitest";
import {
  createTicketType,
  suggestSaleRange,
  summarizeTicketTypes,
  validateTicketField,
  validateTicketTypes,
  type TicketTypeDraft,
} from "./ticketTypes";

const window = { start: "2026-10-18", end: "2026-10-18" };

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

  it("空白票种逐项提示必填字段", () => {
    const empty = createTicketType();
    const errors = validateTicketTypes([empty], window)[empty.id];
    expect(errors).toMatchObject({
      name: "请输入票种名称",
      category: "请选择票种类别",
      price: "请输入价格",
      inventory: "请输入单场次总库存",
      saleRange: "请选择销售时间",
    });
    expect(errors?.entryTimes).toBeUndefined();
  });

  it("销售时间受活动日期约束", () => {
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
    ).toBe("预售票需在活动开始前开售");
    expect(
      validateTicketField(
        presale({ category: "onsite", saleStart: "2026-10-10" }),
        "saleRange",
        window
      )
    ).toBe("现场票仅在活动举办期间销售");
  });

  it("票种名称不可重复且数值有边界", () => {
    const a = presale();
    const b = presale({ id: "other" });
    expect(validateTicketField(b, "name", window, [a, b])).toBe(
      "票种名称不能重复"
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

  it("按类别建议销售区间", () => {
    expect(suggestSaleRange("onsite", window, "2026-09-30")).toEqual({
      saleStart: "2026-10-18",
      saleEnd: "2026-10-18",
    });
    expect(suggestSaleRange("presale", window, "2026-09-30")).toEqual({
      saleStart: "2026-09-30",
      saleEnd: "2026-10-17",
    });
    expect(suggestSaleRange("presale", window, "2026-10-18")).toBeNull();
  });
});
