import { describe, expect, it } from "vitest";
import { commitActivityOps, getActivityOps } from "./activityOps";
import { createActivityOps, createEmptyActivityOps } from "./activityOpsCore";
import {
  commitSubmissions,
  createSubmissionFixtures,
  getSubmissions,
} from "./submissionReview";
import {
  DEFAULT_REFUNDS,
  loadRefundRecords,
  saveRefundRecords,
} from "./refundData";
import {
  commitTicketConfig,
  createEmptyTicketConfig,
  createTicketConfig,
  getTicketConfig,
} from "./ticketConfig";
import { getEventSessions, getPurchaseRecords } from "./ticketSamples";

const OTHER_EVENT = "EVT-2026-0720";

describe("活动数据隔离", () => {
  it("未知/其他活动从不借用首活动样例", () => {
    expect(getSubmissions(OTHER_EVENT)).toEqual([]);
    expect(loadRefundRecords(OTHER_EVENT)).toEqual([]);
    expect(getActivityOps(OTHER_EVENT).checkins).toEqual([]);
    expect(getTicketConfig(OTHER_EVENT).sessions).toEqual([]);
    expect(getEventSessions(OTHER_EVENT)).toEqual([]);
    expect(getPurchaseRecords(OTHER_EVENT)).toEqual([]);
    expect(createSubmissionFixtures(OTHER_EVENT)).toEqual([]);
    expect(createActivityOps(OTHER_EVENT).issues).toEqual([]);
    expect(createTicketConfig(OTHER_EVENT).sessions).toEqual([]);
  });

  it("向其他活动保存不会改动主活动的提交、退款、运营或配置状态", () => {
    const primarySubmissionCount = getSubmissions().length;
    const primaryRefundCount = loadRefundRecords().length;
    const primaryOpsIssueCount = getActivityOps().issues.length;
    const primaryConfigCount = getTicketConfig().sessions.length;

    commitSubmissions(
      [
        {
          ...createSubmissionFixtures()[0],
          id: "other-event-submission",
          eventId: OTHER_EVENT,
        },
      ],
      OTHER_EVENT
    );
    saveRefundRecords(
      [
        {
          ...DEFAULT_REFUNDS[0],
          id: "other-event-refund",
          eventId: OTHER_EVENT,
          ticketId: "OTHER-EVENT-TICKET",
        },
      ],
      OTHER_EVENT
    );
    commitActivityOps(createEmptyActivityOps(), OTHER_EVENT);
    commitTicketConfig(createEmptyTicketConfig(), OTHER_EVENT);

    expect(getSubmissions(OTHER_EVENT)).toHaveLength(1);
    expect(loadRefundRecords(OTHER_EVENT)).toHaveLength(1);
    expect(getActivityOps(OTHER_EVENT).issues).toEqual([]);
    expect(getTicketConfig(OTHER_EVENT).sessions).toEqual([]);
    expect(getSubmissions()).toHaveLength(primarySubmissionCount);
    expect(loadRefundRecords()).toHaveLength(primaryRefundCount);
    expect(getActivityOps().issues).toHaveLength(primaryOpsIssueCount);
    expect(getTicketConfig().sessions).toHaveLength(primaryConfigCount);
  });

  it("明确属于其他活动的审核与退款记录不能强行改绑", () => {
    expect(() =>
      commitSubmissions([createSubmissionFixtures()[0]], OTHER_EVENT)
    ).toThrow("改绑");
    expect(() => saveRefundRecords([DEFAULT_REFUNDS[0]], OTHER_EVENT)).toThrow(
      "改绑"
    );
  });
});
