import { describe, expect, it } from "vitest";
import {
  approveMany,
  approveSubmission,
  batchCandidates,
  batchExcludedReason,
  clearSecurityReview,
  createSubmissionFixtures,
  isMyTurn,
  returnSubmission,
} from "./submissionReview";

const T = "2026-10-01 10:00";
const byId = (list: ReturnType<typeof createSubmissionFixtures>, id: string) =>
  list.find(item => item.id === id)!;

describe("参与者申报双层审核", () => {
  it("主办方初审通过后进入平台复核 平台复核通过后完成", () => {
    let list = createSubmissionFixtures();
    expect(byId(list, "sub-004").status).toBe("organizer_pending");
    list = approveSubmission(list, "organizer", "sub-004", T);
    expect(byId(list, "sub-004").status).toBe("platform_pending");
    expect(() => approveSubmission(list, "organizer", "sub-004", T)).toThrow(
      "当前申报不在主办方初审阶段"
    );
    list = approveSubmission(list, "platform", "sub-004", T);
    expect(byId(list, "sub-004").status).toBe("approved");
    expect(byId(list, "sub-004").logs.map(log => log.action)).toEqual([
      "用户端提交",
      "主办方初审通过",
      "平台复核通过",
    ]);
  });

  it("退回补充必须填写原因 并写入记录", () => {
    const list = createSubmissionFixtures();
    expect(() => returnSubmission(list, "organizer", "sub-005", "  ")).toThrow(
      "请填写退回补充原因"
    );
    const next = returnSubmission(
      list,
      "organizer",
      "sub-005",
      "请补充道具侧面照片",
      T
    );
    expect(byId(next, "sub-005").status).toBe("changes_required");
    expect(byId(next, "sub-005").logs.at(-1)?.comment).toBe(
      "请补充道具侧面照片"
    );
  });

  it("一键审核只包含当前层级的相似低风险完整记录", () => {
    const list = createSubmissionFixtures();
    expect(batchCandidates(list, "organizer").map(item => item.id)).toEqual([
      "sub-004",
      "sub-005",
    ]);
    expect(batchCandidates(list, "platform").map(item => item.id)).toEqual([
      "sub-002",
    ]);
    expect(batchExcludedReason(byId(list, "sub-003"))).toContain("高关注");
    const result = approveMany(
      list,
      "organizer",
      ["sub-004", "sub-005", "sub-003"],
      T
    );
    expect(result.updated).toEqual(["sub-004", "sub-005"]);
    expect(byId(result.list, "sub-003").status).toBe("security_review");
    expect(
      batchCandidates(result.list, "platform").map(item => item.id)
    ).toEqual(["sub-002", "sub-004", "sub-005"]);
  });

  it("高关注道具须现场复验后才能进入平台复核", () => {
    let list = createSubmissionFixtures();
    const target = byId(list, "sub-003");
    expect(isMyTurn("organizer", target)).toBe(true);
    expect(isMyTurn("platform", target)).toBe(false);
    expect(() => approveSubmission(list, "organizer", "sub-003", T)).toThrow(
      "请先登记现场安保复验结果"
    );
    list = clearSecurityReview(list, "sub-003", "", T);
    expect(byId(list, "sub-003").status).toBe("platform_pending");
    expect(
      batchCandidates(list, "platform").map(item => item.id)
    ).not.toContain("sub-003");
    list = approveSubmission(list, "platform", "sub-003", T);
    expect(byId(list, "sub-003").status).toBe("approved");
  });

  it("每条记录同时包含角色 服装 道具与身份证材料", () => {
    const item = byId(createSubmissionFixtures(), "sub-004");
    expect(item.materials.map(material => material.type)).toEqual([
      "character_reference",
      "costume_photo",
      "prop_photo",
      "id_front",
      "id_back",
    ]);
    expect(item.identity.faceMatchScore).toBeGreaterThanOrEqual(0.95);
  });
});
