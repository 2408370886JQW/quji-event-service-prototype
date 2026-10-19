import { describe, expect, it } from "vitest";
import {
  applyDemoGovernance,
  assertCanMutate,
  assertKnownEligibility,
  createActivityGovernance,
  GovernanceError,
  validateGovernance,
  writeGovernanceThroughApi,
} from "./activityGovernance";

function validConfig() {
  const config = createActivityGovernance(
    "ACT-ONE",
    "2026-10-19T00:00:00.000Z"
  );
  config.publication = {
    ...config.publication,
    title: "漫圈秋日聚会",
    summary: "公开活动摘要",
    coverUrl: "https://cdn.example.test/cover.webp",
    visibility: "login",
    allowShare: true,
  };
  config.admission = {
    ...config.admission,
    ordinaryAttireAllowed: true,
    pledgeText: "我确认普通服装符合活动安全须知。",
    propPolicy: "restricted",
    propRestrictionNote: "仿真道具须提前申报，禁止尖锐、易燃和发射类物品。",
    sessionScope: "selected",
    sessionIds: ["2026-11-01-AM"],
    validFrom: "2026-10-20",
    validUntil: "2026-11-02",
    ruleVersion: "RULE-2026-11-v1",
  };
  return config;
}

describe("活动治理配置", () => {
  it("保存校验覆盖用户端发布字段、承诺、场次范围与有效期", () => {
    const invalid = validConfig();
    invalid.publication.title = "";
    invalid.publication.coverUrl = "file:///private/cover.webp";
    invalid.admission.pledgeText = "";
    invalid.admission.sessionIds = [];
    invalid.admission.validUntil = "2026-10-01";
    const errors = validateGovernance(invalid);
    expect(errors["publication.title"]).toBeTruthy();
    expect(errors["publication.coverUrl"]).toBeTruthy();
    expect(errors["admission.pledgeText"]).toBeTruthy();
    expect(errors["admission.sessionIds"]).toBeTruthy();
    expect(errors["admission.validUntil"]).toBeTruthy();
  });

  it("Demo 保存与发布按活动隔离、递增版本并写操作记录", () => {
    const before = validConfig();
    const saved = applyDemoGovernance(before, {
      activityId: "ACT-ONE",
      expectedVersion: 1,
      role: "organizer",
      command: "save",
      candidate: before,
      now: "2026-10-19T00:01:00.000Z",
    });
    const published = applyDemoGovernance(saved, {
      activityId: "ACT-ONE",
      expectedVersion: 2,
      role: "organizer",
      command: "publish",
      candidate: saved,
      now: "2026-10-19T00:02:00.000Z",
    });
    expect(published.version).toBe(3);
    expect(published.publication.status).toBe("published");
    expect(published.audit[0]).toMatchObject({
      activityId: "ACT-ONE",
      actorRole: "organizer",
      version: 3,
    });
  });

  it("版本冲突与跨活动候选都被拒绝", () => {
    const before = validConfig();
    expect(() =>
      applyDemoGovernance(before, {
        activityId: "ACT-ONE",
        expectedVersion: 99,
        role: "platform",
        command: "save",
        candidate: before,
      })
    ).toThrow(/版本已变化/);

    const other = validConfig();
    other.activityId = "ACT-TWO";
    expect(() =>
      applyDemoGovernance(before, {
        activityId: "ACT-ONE",
        expectedVersion: 1,
        role: "platform",
        command: "save",
        candidate: other,
      })
    ).toThrow(/活动范围不一致/);
  });

  it("culture 与未获平台授权的生命周期/资格写入被拒绝", () => {
    expect(() => assertCanMutate("culture", "publish")).toThrow(
      GovernanceError
    );
    expect(() => assertCanMutate("organizer", "cancel")).toThrow(/仅限平台/);
    expect(() => assertCanMutate("organizer", "revoke")).toThrow(/仅限平台/);
  });

  it("取消要求原因和影响确认，且不能重复取消", () => {
    const before = validConfig();
    before.lifecycle = {
      ...before.lifecycle,
      reason: "场馆安全条件不满足",
      affectedSessions: ["2026-11-01-AM"],
      impactConfirmed: true,
    };
    const cancelled = applyDemoGovernance(before, {
      activityId: "ACT-ONE",
      expectedVersion: 1,
      role: "platform",
      command: "cancel",
      candidate: before,
    });
    expect(cancelled.lifecycle.state).toBe("cancelled");
    expect(cancelled.audit[0].detail).toContain("未创建退款");
    expect(() =>
      applyDemoGovernance(cancelled, {
        activityId: "ACT-ONE",
        expectedVersion: cancelled.version,
        role: "platform",
        command: "cancel",
        candidate: cancelled,
      })
    ).toThrow(/已取消/);
  });

  it("未知资格不允许被撤销，避免按姓名或其他活动猜测资格", () => {
    expect(() =>
      assertKnownEligibility("ACT-ONE", [], "eligibility-x")
    ).toThrow(/未找到当前活动/);
    expect(() =>
      assertKnownEligibility(
        "ACT-ONE",
        [
          {
            id: "eligibility-x",
            activityId: "ACT-TWO",
            kind: "coser",
            status: "valid",
          },
        ],
        "eligibility-x"
      )
    ).toThrow(/未找到当前活动/);
  });

  it("API 写入失败不回落到 Demo/localStorage，也不修改当前配置", async () => {
    const current = validConfig();
    const before = JSON.stringify(current);
    const execute = async () => {
      throw new Error("服务端 500");
    };
    await expect(
      writeGovernanceThroughApi("ACT-ONE", current, "publish", execute)
    ).rejects.toThrow("服务端 500");
    expect(JSON.stringify(current)).toBe(before);
  });
});
