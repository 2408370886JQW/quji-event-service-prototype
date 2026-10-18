import { describe, expect, it } from "vitest";
import {
  addException,
  addIssue,
  addStaff,
  buildNotices,
  checkRealName,
  createActivityOps,
  markNoticeRead,
  onsiteStats,
  restoreActivityOps,
  saveFiling,
  unreadNotices,
  updateIssue,
  uploadMaterial,
  validateFiling,
  validateIssue,
  validateStaff,
  verifyStaff,
  verifyTicket,
  type RefundStateMap,
  type TicketEligibility,
  type TicketVerificationOptions,
  E_TICKETS,
} from "./activityOpsCore";
import {
  createSubmissionFixtures,
  type ParticipantSubmission,
} from "./submissionReview";
import { buildActivityReport, buildReportDocx } from "./activityReport";

const actor = { name: "林洁", role: "主办方活动运营人员" };
const refunds: RefundStateMap = {
  "refund-20260929-001": "pending_review",
  "refund-20260929-004": "pending_review",
  "refund-20260928-002": "refunded",
  "refund-20260927-003": "rejected",
};
const primaryEventId = "EVT-2026-0628";
const submissions = createSubmissionFixtures();
const eligibilityFor = (
  code: string,
  patch: Partial<TicketEligibility> = {}
) => {
  const ticket = E_TICKETS.find(item => item.code === code)!;
  return {
    eventId: ticket.eventId,
    userId: ticket.userId,
    attendeeId: ticket.attendeeId,
    submissionId: ticket.submissionId,
    ruleVersion: ticket.ruleVersion,
    status: "valid" as const,
    attire: "costume" as const,
    verifiedAt: "2026-06-20 11:02",
    ...patch,
  };
};
const verify = (
  code: string,
  session = "2026-06-28",
  patch: Partial<TicketVerificationOptions> = {}
) =>
  verifyTicket(createActivityOps(), code, {
    session,
    refunds,
    method: "扫码核验",
    operator: "林洁",
    eventId: primaryEventId,
    submissions,
    eligibility: [eligibilityFor("QT-20260628-48305")],
    ...patch,
  });

describe("现场电子票核验", () => {
  it("仅在匹配活动、已支付、最终资格和冻结规则版本同时成立时通过", () => {
    const state = createActivityOps();
    const out = verifyTicket(state, "qt-20260628-48305", {
      session: "2026-06-28",
      refunds,
      method: "扫码核验",
      operator: "林洁",
      eventId: primaryEventId,
      submissions,
      eligibility: [eligibilityFor("QT-20260628-48305")],
    });
    expect(out.result).toBe("通过");
    expect(out.ticket?.holder).toBe("张三");
    const next = { ...state, checkins: [out.record, ...state.checkins] };
    expect(onsiteStats(next, "2026-06-28").entered).toBe(2187);
    expect(verify("ORD1789301148305").result).toBe("通过");
  });

  it("无活动范围、跨活动、支付未知、姓名或 Coser role 都不能替代最终资格", () => {
    expect(
      verifyTicket(createActivityOps(), "QT-20260628-48305", {
        session: "2026-06-28",
        refunds,
        method: "扫码核验",
        operator: "林洁",
      }).result
    ).toBe("拦截");
    expect(
      verify("QT-20260628-48305", "2026-06-28", { eventId: "EVT-OTHER" }).result
    ).toBe("拦截");
    expect(verify("QT-20260628-49112").reason).toContain("资格查询");
    const coser = E_TICKETS.find(item => item.code === "QT-20260628-48305")!;
    const oldStatus = coser.paymentStatus;
    coser.paymentStatus = "payment_unknown";
    expect(verify(coser.code).reason).toContain("支付状态未确认");
    coser.paymentStatus = oldStatus;
  });

  it("审批撤销、过期、规则版本不一致和普通服装未承诺均 fail closed", () => {
    expect(
      verify("QT-20260628-48305", "2026-06-28", {
        eligibility: [
          eligibilityFor("QT-20260628-48305", { revokedAt: "2026-06-21" }),
        ],
      }).result
    ).toBe("拦截");
    expect(
      verify("QT-20260628-48305", "2026-06-28", {
        eligibility: [
          eligibilityFor("QT-20260628-48305", {
            validUntil: "2026-06-20 11:00",
          }),
        ],
      }).result
    ).toBe("拦截");
    expect(
      verify("QT-20260628-48305", "2026-06-28", {
        eligibility: [
          eligibilityFor("QT-20260628-48305", { ruleVersion: "RULE-OLD" }),
        ],
      }).result
    ).toBe("拦截");
    const ordinaryTicket = E_TICKETS.find(
      item => item.code === "QT-20260628-20588"
    )!;
    const ordinary: ParticipantSubmission = {
      ...submissions[0],
      id: ordinaryTicket.submissionId,
      userId: ordinaryTicket.userId,
      attendeeId: ordinaryTicket.attendeeId,
      eventId: ordinaryTicket.eventId,
      ruleVersion: ordinaryTicket.ruleVersion,
      attire: "ordinary",
      undertakingAccepted: true,
    };
    expect(
      verify(ordinaryTicket.code, "2026-06-28", {
        submissions: [ordinary],
        eligibility: [
          eligibilityFor(ordinaryTicket.code, {
            attire: "ordinary",
            undertakingAccepted: false,
          }),
        ],
      }).result
    ).toBe("拦截");
    expect(
      verify(ordinaryTicket.code, "2026-06-28", {
        submissions: [ordinary],
        eligibility: [
          eligibilityFor(ordinaryTicket.code, {
            attire: "ordinary",
            undertakingAccepted: true,
          }),
        ],
      }).result
    ).toBe("通过");
  });

  it("同一申报资料更新后不能凭旧规则通过记录放行", () => {
    const latest: ParticipantSubmission = {
      ...submissions[0],
      ruleVersion: "RULE-NEW",
      status: "changes_required",
      logs: [
        {
          id: "changed",
          action: "资料更新",
          actorName: "用户",
          actorRole: "用户",
          occurredAt: "2026-06-21 10:00",
        },
      ],
    };
    expect(
      verify("QT-20260628-48305", "2026-06-28", {
        submissions: [submissions[0], latest],
      }).result
    ).toBe("拦截");
  });

  it("同日 ISO 到期时间与本地格式核验时间按实际时间比较", () => {
    expect(
      verify("QT-20260628-48305", "2026-06-28", {
        now: "2026-06-28T14:00:00Z",
        eligibility: [
          eligibilityFor("QT-20260628-48305", {
            validUntil: "2026-06-28T13:00:00Z",
          }),
        ],
      }).result
    ).toBe("拦截");
    expect(
      verify("QT-20260628-48305", "2026-06-28", {
        eligibility: [
          eligibilityFor("QT-20260628-48305", { validUntil: "not-a-date" }),
        ],
      }).result
    ).toBe("拦截");
  });

  it("未实名、退款冻结或未知、已退款、重复入场、跨场次和未知票码均拦截", () => {
    expect(verify("QT-20260628-60218").reason).toContain("实名认证未完成");
    expect(verify("QT-20260628-10316").reason).toContain("待审批的退款");
    expect(verify("QT-20260629-20762", "2026-06-29").reason).toContain(
      "已退款"
    );
    expect(verify("QT-20260628-98175").reason).toContain("请勿重复核验");
    expect(verify("QT-20260629-51870").reason).toContain("6月29日");
    expect(verify("QT-00000000-00000").result).toBe("拦截");
  });

  it("高关注道具在最终批准后仍须复验", () => {
    const ticket = E_TICKETS.find(item => item.code === "QT-20260628-47720")!;
    const approved = {
      ...submissions.find(item => item.id === "sub-003")!,
      status: "approved" as const,
      securityCleared: true,
    };
    expect(
      verify(ticket.code, "2026-06-28", {
        submissions: [approved],
        eligibility: [eligibilityFor(ticket.code)],
      }).result
    ).toBe("复验");
  });

  it("实名核对 比对姓名与证件号后 4 位", () => {
    const ok = checkRealName(
      { code: "QT-20260628-49112", name: "古丽米热·阿布都", idTail: "1312" },
      { session: "2026-06-28", operator: "林洁", eventId: primaryEventId }
    );
    expect(ok.match).toBe(true);
    const bad = checkRealName(
      { code: "QT-20260628-49112", name: "古丽米热·阿布都", idTail: "0000" },
      { session: "2026-06-28", operator: "林洁", eventId: primaryEventId }
    );
    expect(bad.match).toBe(false);
    expect(bad.reason).toContain("后 4 位");
  });
});

describe("问题记录与现场异常", () => {
  it("登记问题校验必填", () => {
    const errors = validateIssue({
      title: "",
      detail: "",
      category: "",
      level: "中",
      owner: "",
      deadline: "",
    });
    expect(Object.keys(errors)).toEqual(
      expect.arrayContaining([
        "title",
        "detail",
        "category",
        "owner",
        "deadline",
      ])
    );
  });
  it("登记 处理 完成 重新打开 均写入处理记录", () => {
    let state = addIssue(
      createActivityOps(),
      {
        title: "2号入口排队过长",
        detail: "高峰期排队约 20 分钟",
        category: "现场服务",
        level: "中",
        owner: "主办方运营组",
        deadline: "2026-06-28",
      },
      actor
    );
    const issue = state.issues[0];
    expect(issue.status).toBe("待处理");
    expect(issue.logs).toHaveLength(2);
    state = updateIssue(
      state,
      issue.id,
      "progress",
      { comment: "已增开通道" },
      actor
    );
    expect(state.issues[0].status).toBe("处理中");
    state = updateIssue(
      state,
      issue.id,
      "assign",
      { owner: "场馆协调组" },
      actor
    );
    expect(state.issues[0].owner).toBe("场馆协调组");
    state = updateIssue(
      state,
      issue.id,
      "complete",
      { comment: "排队恢复正常" },
      actor
    );
    expect(state.issues[0].status).toBe("已完成");
    state = updateIssue(
      state,
      issue.id,
      "reopen",
      { comment: "再次拥堵" },
      actor
    );
    expect(state.issues[0].status).toBe("处理中");
    expect(state.issues[0].logs.map(log => log.action)).toEqual([
      "登记问题",
      "分派给 主办方运营组",
      "记录处理进展",
      "改派给 场馆协调组",
      "处置完成",
      "重新打开",
    ]);
  });
  it("现场异常同步进入问题记录并计入异常数", () => {
    const base = createActivityOps();
    const before = onsiteStats(base, "2026-06-28").exceptions;
    const state = addException(
      base,
      {
        type: "实名不一致",
        related: "QT-20260628-49112",
        session: "2026-06-28",
        level: "中",
        action: "证件号后 4 位不一致 已引导至实名核对台",
      },
      actor
    );
    expect(state.issues[0].source).toBe("现场异常");
    expect(onsiteStats(state, "2026-06-28").exceptions).toBe(before + 1);
  });
});

describe("参展商与工作人员", () => {
  it("新增后单位人数加一 核验后已核验加一", () => {
    const input = {
      name: "吐尔洪",
      unit: "天山安保服务有限公司",
      post: "入口安检",
      phone: "13912345678",
      idTail: "123x",
      area: "1号入口",
    };
    expect(validateStaff({ ...input, phone: "123" }).phone).toBeTruthy();
    const base = createActivityOps();
    const unit = base.units.find(item => item.name === input.unit)!;
    let state = addStaff(base, input, actor);
    expect(state.staff[0].phone).toBe("139****5678");
    expect(state.staff[0].idTail).toBe("123X");
    expect(state.units.find(item => item.name === input.unit)!.count).toBe(
      unit.count + 1
    );
    state = verifyStaff(state, state.staff[0].id, actor);
    expect(state.staff[0].status).toBe("资料已核验");
    expect(state.units.find(item => item.name === input.unit)!.verified).toBe(
      unit.verified + 1
    );
  });
});

describe("活动资料与备案信息", () => {
  it("上传新版本 版本号递增并写入记录", () => {
    const state = uploadMaterial(
      createActivityOps(),
      "活动方案与内容说明",
      { fileName: "方案_v2.1.pdf", size: 2 * 1024 * 1024, note: "补充时间表" },
      actor
    );
    const item = state.materials.find(m => m.name === "活动方案与内容说明")!;
    expect(item.versions[0].version).toBe("v2.1");
    expect(item.versions[0].size).toBe("2.0 MB");
    expect(item.status).toBe("待资料核对");
    expect(item.logs[0].action).toBe("上传新版本 v2.1");
  });
  it("备案信息校验 拟参加人数不能超过容量 保存后生成新版本", () => {
    const base = createActivityOps();
    expect(
      validateFiling({ ...base.filing, expected: "7000" }).expected
    ).toContain("不能超过");
    const state = saveFiling(base, { ...base.filing, expected: "5200" }, actor);
    expect(state.filing.expected).toBe("5200");
    const filing = state.materials.find(m => m.name === "活动备案信息表")!;
    expect(filing.versions[0].version).toBe("v1.2");
  });
});

describe("通知中心", () => {
  it("按角色生成并可标记已读", () => {
    const state = createActivityOps();
    const notices = buildNotices({
      role: "platform",
      permissions: ["costumes", "tickets"],
      state,
      pendingRefunds: 2,
      myReviews: 1,
    });
    expect(notices.map(item => item.page)).toContain("tickets");
    const read = markNoticeRead(state, "platform", [notices[0].id]);
    expect(unreadNotices(notices, read, "platform")).toHaveLength(
      notices.length - 1
    );
    const culture = buildNotices({
      role: "culture",
      permissions: [],
      state,
      pendingRefunds: 2,
      myReviews: 0,
    });
    expect(culture.some(item => item.page === "tickets")).toBe(false);
  });
  it("旧版本存储数据回退为初始数据", () => {
    expect(restoreActivityOps('{"version":0}').issues).toHaveLength(4);
    expect(restoreActivityOps("bad json").materials).toHaveLength(9);
  });
});

describe("活动摘要报告", () => {
  const report = () =>
    buildActivityReport({
      event: {
        id: "EVT-2026-0628",
        name: "2026 魔都动漫嘉年华",
        subtitle: "乌鲁木齐特别巡回展",
        date: "2026-06-28—06-29 09:00—18:00",
        venue: "新疆国际会展中心 3号馆",
        organizer: "新疆星河文化传媒有限公司",
        stageIndex: 3,
        tickets: 4662,
        checkedIn: 0,
        pending: 3,
      },
      primary: true,
      stock: [
        {
          session: "2026-06-28",
          rows: [
            {
              name: "普通观众票",
              price: 88,
              inventory: 3000,
              sold: 1896,
              refunded: 0,
              remaining: 1104,
              status: "售票中",
              purchaseLimit: 4,
              realName: true,
            },
          ],
        },
      ],
      refunds: [
        {
          requestNo: "TK1",
          buyerName: "艾力江·买买提",
          ticketName: "Coser 专属票",
          ticketCode: "QT-20260629-20762",
          amount: 68,
          reason: "行程变化",
          status: "refunded",
          channelConfirmedAt: "2026-06-28T11:58:00+08:00",
          processedBy: "周可",
        },
      ],
      submissions: [],
      ops: createActivityOps(),
      actor,
      now: "2026-06-28 12:00",
    });
  it("包含完整章节与一致的汇总数字", () => {
    const r = report();
    expect(r.fileName).toBe("EVT-2026-0628_活动摘要_20260628.docx");
    expect(r.sections.map(section => section.id)).toEqual([
      "basic",
      "lifecycle",
      "tickets",
      "refunds",
      "onsite",
      "costumes",
      "materials",
      "issues",
      "staff",
      "archive",
      "notes",
    ]);
    expect(r.highlights[0].value).toBe("1,896 张");
    expect(r.sections[3].intro).toContain("渠道确认到账 1 笔 ¥68");
  });
  it("生成可打开的 Word 文件", async () => {
    const blob = await buildReportDocx(report());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(blob.size).toBeGreaterThan(6000);
  });
});
