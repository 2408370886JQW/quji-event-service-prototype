import { useSyncExternalStore } from "react";

/**
 * 参与者申报（角色 服装 道具 实名 身份证 人脸）双层审核
 * 主办方初审 → 平台复核 → 审核通过
 * 高关注道具先由主办方登记现场安保复验结果 再进入平台复核
 * 规则与 Vue3 版本 src/stores/submissions.ts 保持一致
 */
export type ReviewerRole = "organizer" | "platform";
export type SubmissionStatus =
  | "organizer_pending"
  | "platform_pending"
  | "changes_required"
  | "security_review"
  | "approved";
export type SubmissionMaterialType =
  | "character_reference"
  | "costume_photo"
  | "prop_photo"
  | "id_front"
  | "id_back";
export interface SubmissionMaterial {
  type: SubmissionMaterialType;
  name: string;
  url: string;
}
export interface SubmissionLog {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  occurredAt: string;
  comment?: string;
}
export interface ParticipantSubmission {
  id: string;
  participant: string;
  role: string;
  source: string;
  costume: string;
  prop: string;
  riskLevel: "low" | "high";
  riskLabel: string;
  similarityScore?: number;
  materialsComplete: boolean;
  securityCleared?: boolean;
  status: SubmissionStatus;
  submittedAt: string;
  identity: {
    maskedIdNumber: string;
    realNamePassed: boolean;
    faceMatchPassed: boolean;
    faceMatchScore: number;
  };
  materials: SubmissionMaterial[];
  logs: SubmissionLog[];
}

export const SUBMISSION_STORAGE_KEY = "quji_participant_submissions_v1";
export const SIMILARITY_THRESHOLD = 0.92;

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  organizer_pending: "待主办方初审",
  platform_pending: "待平台复核",
  changes_required: "待用户补充",
  security_review: "待现场复验",
  approved: "审核通过",
};

export const REVIEWER_LABEL: Record<ReviewerRole, string> = {
  organizer: "主办方初审",
  platform: "平台复核",
};

const REVIEWER: Record<ReviewerRole, { name: string; label: string }> = {
  organizer: { name: "林洁", label: "主办方活动运营人员" },
  platform: { name: "周可", label: "平台运营人员" },
};

const VISUALS = {
  character: "/manus-storage/quji-character-reference_066e947c.webp",
  costume: "/manus-storage/quji-costume-reference_610f2304.webp",
  prop: "/manus-storage/quji-prop-reference_ca4a00a7.webp",
  idFront: "/manus-storage/quji-public-identity-sample_e55cbf71.webp",
  idBack: "/manus-storage/quji-public-identity-back-sample_4fe11174.webp",
};

const materials = (): SubmissionMaterial[] => [
  { type: "character_reference", name: "角色参考图", url: VISUALS.character },
  { type: "costume_photo", name: "服装全身图", url: VISUALS.costume },
  { type: "prop_photo", name: "道具参考图", url: VISUALS.prop },
  { type: "id_front", name: "身份证人像面", url: VISUALS.idFront },
  { type: "id_back", name: "身份证国徽面", url: VISUALS.idBack },
];

const submitted = (id: string, time: string, name: string): SubmissionLog => ({
  id: `${id}-submitted`,
  action: "用户端提交",
  actorName: name,
  actorRole: "漫圈 App 用户",
  occurredAt: time,
  comment: "角色 服装 道具 实名与人脸资料已提交",
});

export const createSubmissionFixtures = (): ParticipantSubmission[] => [
  {
    id: "sub-001",
    participant: "张三",
    role: "甘雨",
    source: "《原神》",
    costume: "白色长袍 / 渐变蓝发 / 羊角发箍",
    prop: "紫色铃铛挂饰，无锐利金属",
    riskLevel: "low",
    riskLabel: "低风险",
    similarityScore: 0.97,
    materialsComplete: true,
    status: "approved",
    submittedAt: "2026-06-20 09:18",
    identity: {
      maskedIdNumber: "6501**********0628",
      realNamePassed: true,
      faceMatchPassed: true,
      faceMatchScore: 0.98,
    },
    materials: materials(),
    logs: [
      submitted("sub-001", "2026-06-20 09:18", "张三"),
      {
        id: "sub-001-organizer",
        action: "主办方初审通过",
        actorName: "林洁",
        actorRole: "主办方活动运营人员",
        occurredAt: "2026-06-20 10:35",
      },
      {
        id: "sub-001-platform",
        action: "平台复核通过",
        actorName: "周可",
        actorRole: "平台运营人员",
        occurredAt: "2026-06-20 11:02",
      },
    ],
  },
  {
    id: "sub-002",
    participant: "古丽米热·阿布都",
    role: "敦煌伎乐飞天",
    source: "国风原创",
    costume: "石青色长裙 / 朱砂红飘带",
    prop: "EVA 泡棉琵琶，非金属材质",
    riskLevel: "low",
    riskLabel: "低风险",
    similarityScore: 0.95,
    materialsComplete: true,
    status: "platform_pending",
    submittedAt: "2026-06-20 10:46",
    identity: {
      maskedIdNumber: "6501**********1207",
      realNamePassed: true,
      faceMatchPassed: true,
      faceMatchScore: 0.97,
    },
    materials: materials(),
    logs: [
      submitted("sub-002", "2026-06-20 10:46", "古丽米热·阿布都"),
      {
        id: "sub-002-organizer",
        action: "主办方初审通过",
        actorName: "林洁",
        actorRole: "主办方活动运营人员",
        occurredAt: "2026-06-20 11:22",
      },
    ],
  },
  {
    id: "sub-003",
    participant: "李思远",
    role: "机甲重装佣兵",
    source: "原创设定",
    costume: "黑色仿战术背心 / 外骨骼臂甲",
    prop: "仿真重弩模型，长约 1.2 米",
    riskLevel: "high",
    riskLabel: "高关注",
    materialsComplete: true,
    status: "security_review",
    submittedAt: "2026-06-20 11:31",
    identity: {
      maskedIdNumber: "6501**********4431",
      realNamePassed: true,
      faceMatchPassed: true,
      faceMatchScore: 0.96,
    },
    materials: materials(),
    logs: [
      submitted("sub-003", "2026-06-20 11:31", "李思远"),
      {
        id: "sub-003-security",
        action: "转现场安保复验",
        actorName: "林洁",
        actorRole: "主办方活动运营人员",
        occurredAt: "2026-06-20 11:48",
        comment: "仿真重弩模型需核对尺寸与材质",
      },
    ],
  },
  {
    id: "sub-004",
    participant: "何晓晨",
    role: "雷电将军",
    source: "《原神》",
    costume: "紫色印花振袖 / 编发发簪",
    prop: "轻质木质长刀，海绵安全鞘",
    riskLevel: "low",
    riskLabel: "低风险",
    similarityScore: 0.96,
    materialsComplete: true,
    status: "organizer_pending",
    submittedAt: "2026-06-20 12:05",
    identity: {
      maskedIdNumber: "6501**********3812",
      realNamePassed: true,
      faceMatchPassed: true,
      faceMatchScore: 0.98,
    },
    materials: materials(),
    logs: [submitted("sub-004", "2026-06-20 12:05", "何晓晨")],
  },
  {
    id: "sub-005",
    participant: "王雨桐",
    role: "刻晴",
    source: "《原神》",
    costume: "紫白短裙 / 双马尾假发",
    prop: "EVA 泡棉单手剑，无金属刃口",
    riskLevel: "low",
    riskLabel: "低风险",
    similarityScore: 0.94,
    materialsComplete: true,
    status: "organizer_pending",
    submittedAt: "2026-06-20 12:08",
    identity: {
      maskedIdNumber: "6501**********2766",
      realNamePassed: true,
      faceMatchPassed: true,
      faceMatchScore: 0.97,
    },
    materials: materials(),
    logs: [submitted("sub-005", "2026-06-20 12:08", "王雨桐")],
  },
];

export function formatNow(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 当前角色需要处理的记录 */
export function isMyTurn(role: ReviewerRole, item: ParticipantSubmission) {
  if (role === "organizer")
    return (
      item.status === "organizer_pending" || item.status === "security_review"
    );
  return item.status === "platform_pending";
}

/** 相似低风险一键审核候选 */
export function batchCandidates(
  list: ParticipantSubmission[],
  role: ReviewerRole
) {
  const stage = role === "organizer" ? "organizer_pending" : "platform_pending";
  return list.filter(
    item =>
      item.status === stage &&
      item.riskLevel === "low" &&
      item.materialsComplete &&
      item.identity.realNamePassed &&
      item.identity.faceMatchPassed &&
      (item.similarityScore || 0) >= SIMILARITY_THRESHOLD
  );
}

/** 不能一键审核的原因 */
export function batchExcludedReason(item: ParticipantSubmission) {
  if (item.status === "security_review" || item.riskLevel === "high")
    return "高关注道具 需逐条审核";
  if (!item.materialsComplete) return "资料不完整";
  if (!item.identity.realNamePassed || !item.identity.faceMatchPassed)
    return "实名或人脸未通过";
  return "相似度不足 92%";
}

function log(
  item: ParticipantSubmission,
  action: string,
  role: ReviewerRole,
  time: string,
  comment?: string
): SubmissionLog {
  return {
    id: `${item.id}-${item.logs.length + 1}`,
    action,
    actorName: REVIEWER[role].name,
    actorRole: REVIEWER[role].label,
    occurredAt: time,
    comment,
  };
}

function replace(list: ParticipantSubmission[], next: ParticipantSubmission) {
  return list.map(item => (item.id === next.id ? next : item));
}

function find(list: ParticipantSubmission[], id: string) {
  const item = list.find(entry => entry.id === id);
  if (!item) throw new Error("未找到对应参与者申报");
  return item;
}

export function approveSubmission(
  list: ParticipantSubmission[],
  role: ReviewerRole,
  id: string,
  time = formatNow()
) {
  const item = find(list, id);
  if (!item.materialsComplete) throw new Error("资料不完整 不能审核通过");
  if (!item.identity.realNamePassed || !item.identity.faceMatchPassed)
    throw new Error("实名或人脸核验未通过");
  if (item.status === "security_review")
    throw new Error("请先登记现场安保复验结果");
  if (item.riskLevel === "high" && !item.securityCleared)
    throw new Error("高关注申报需完成现场安保复验");
  if (role === "organizer") {
    if (item.status !== "organizer_pending")
      throw new Error("当前申报不在主办方初审阶段");
    return replace(list, {
      ...item,
      status: "platform_pending",
      logs: [...item.logs, log(item, "主办方初审通过", role, time)],
    });
  }
  if (item.status !== "platform_pending")
    throw new Error("当前申报不在平台复核阶段");
  return replace(list, {
    ...item,
    status: "approved",
    logs: [...item.logs, log(item, "平台复核通过", role, time)],
  });
}

export function returnSubmission(
  list: ParticipantSubmission[],
  role: ReviewerRole,
  id: string,
  comment: string,
  time = formatNow()
) {
  const clean = comment.trim();
  if (!clean) throw new Error("请填写退回补充原因");
  const item = find(list, id);
  if (!isMyTurn(role, item)) throw new Error("当前申报不在本角色审核阶段");
  return replace(list, {
    ...item,
    status: "changes_required",
    logs: [
      ...item.logs,
      log(
        item,
        role === "organizer" ? "主办方退回补充" : "平台退回补充",
        role,
        time,
        clean
      ),
    ],
  });
}

/** 主办方登记现场安保复验通过 转平台复核 */
export function clearSecurityReview(
  list: ParticipantSubmission[],
  id: string,
  comment: string,
  time = formatNow()
) {
  const item = find(list, id);
  if (item.status !== "security_review")
    throw new Error("当前申报不在现场复验阶段");
  return replace(list, {
    ...item,
    status: "platform_pending",
    securityCleared: true,
    riskLabel: "高关注 · 现场已复验",
    logs: [
      ...item.logs,
      log(
        item,
        "现场安保复验通过",
        "organizer",
        time,
        comment.trim() || "道具尺寸与材质已现场核对 符合入场要求"
      ),
    ],
  });
}

export function approveMany(
  list: ParticipantSubmission[],
  role: ReviewerRole,
  ids: string[],
  time = formatNow()
) {
  const allowed = new Set(batchCandidates(list, role).map(item => item.id));
  let next = list;
  const updated: string[] = [];
  for (const id of ids) {
    if (!allowed.has(id)) continue;
    next = approveSubmission(next, role, id, time);
    updated.push(id);
  }
  return { list: next, updated };
}

/* ---------- 跨页面共享状态（侧栏角标 活动档案页签 审核页） ---------- */
function load(): ParticipantSubmission[] {
  if (typeof window === "undefined") return createSubmissionFixtures();
  try {
    const raw = window.localStorage.getItem(SUBMISSION_STORAGE_KEY);
    if (!raw) return createSubmissionFixtures();
    const parsed = JSON.parse(raw) as ParticipantSubmission[];
    return Array.isArray(parsed) && parsed.length
      ? parsed
      : createSubmissionFixtures();
  } catch {
    return createSubmissionFixtures();
  }
}

let state: ParticipantSubmission[] | null = null;
const listeners = new Set<() => void>();
const snapshot = () => (state ??= load());

export function commitSubmissions(next: ParticipantSubmission[]) {
  state = next;
  try {
    window.localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* 忽略存储失败 */
  }
  listeners.forEach(listener => listener());
}

export function useSubmissions() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    snapshot
  );
}
