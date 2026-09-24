import { describe, expect, it } from "vitest";
import {
  canCreateActivity,
  canSubmitAdmission,
  createEmptyAdmission,
  reviewAdmission,
  submitAdmission,
  type AdmissionState,
} from "./OnboardingFlow";

function readyState(): AdmissionState {
  const state = createEmptyAdmission();
  return {
    ...state,
    status: "materials_draft",
    agentIdentity: "authorized_agent",
    organizationName: "新疆星河文化传媒有限公司",
    socialCreditCode: "91650100XXXXXXXXXX",
    materials: state.materials.map(item =>
      item.required
        ? { ...item, fileName: `${item.key}.pdf`, status: "已上传" }
        : item
    ),
  };
}

describe("organizer admission state machine", () => {
  it("does not submit when required materials are missing", () => {
    const state = createEmptyAdmission();
    expect(canSubmitAdmission(state)).toBe(false);
    expect(submitAdmission(state).status).toBe("not_started");
  });

  it("submits a complete organizer record for platform review", () => {
    const submitted = submitAdmission(readyState());
    expect(canSubmitAdmission(submitted)).toBe(true);
    expect(submitted.status).toBe("submitted");
    expect(submitted.submittedAt).not.toBe("");
  });

  it("does not allow activity creation before approval", () => {
    expect(canCreateActivity(submitAdmission(readyState()))).toBe(false);
  });

  it("does not require an authorization letter when the legal representative applies personally", () => {
    const state = readyState();
    state.agentIdentity = "legal_representative";
    state.materials = state.materials.map(item =>
      item.key === "authorization" ? { ...item, fileName: "" } : item
    );
    expect(canSubmitAdmission(state)).toBe(true);
  });

  it("shares approval result with organizer activity gate", () => {
    const approved = reviewAdmission(
      submitAdmission(readyState()),
      true,
      "核验通过"
    );
    expect(approved.status).toBe("approved");
    expect(approved.reviewNote).toBe("核验通过");
    expect(canCreateActivity(approved)).toBe(true);
  });

  it("returns review comments to the organizer flow", () => {
    const returned = reviewAdmission(
      submitAdmission(readyState()),
      false,
      "请补充授权材料有效期"
    );
    expect(returned.status).toBe("changes_required");
    expect(returned.reviewNote).toContain("有效期");
  });
});
