import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  Fingerprint,
  Maximize2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserRoundCheck,
  X,
} from "lucide-react";
import {
  REVIEWER_LABEL,
  SIMILARITY_THRESHOLD,
  SUBMISSION_STATUS_LABEL,
  approveMany,
  approveSubmission,
  batchCandidates,
  batchExcludedReason,
  clearSecurityReview,
  commitSubmissions,
  isMyTurn,
  returnSubmission,
  useSubmissions,
  type ParticipantSubmission,
  type ReviewerRole,
  type SubmissionMaterial,
  type SubmissionStatus,
} from "./submissionReview";

type ViewerRole = "platform" | "organizer" | "culture";
type Filter = "mine" | "all" | "approved" | "changes" | "security";

const STATUS_TONE: Record<SubmissionStatus, string> = {
  organizer_pending: "bg-amber-50 text-amber-700",
  platform_pending: "bg-amber-50 text-amber-700",
  changes_required: "bg-rose-50 text-rose-700",
  security_review: "bg-rose-50 text-rose-700",
  approved: "bg-emerald-50 text-emerald-700",
};

const NEXT_STEP: Record<SubmissionStatus, readonly string[]> = {
  organizer_pending: ["主办方初审通过后", "自动转平台复核"],
  platform_pending: ["平台复核通过后", "现场核验直接放行"],
  security_review: ["高关注道具", "需主办方登记现场安保复验结果"],
  changes_required: ["已退回用户补充", "用户在漫圈 App 重新提交后再次初审"],
  approved: ["已完成双层审核", "现场核验直接放行"],
};

const RETURN_REASONS = [
  "参考图不清晰 请重新上传",
  "请补充道具侧面照片并标注尺寸",
  "服装图需为全身正面照",
];

const primaryBtn =
  "h-10 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed";
const outlineBtn =
  "h-10 px-4 rounded-full border border-brand-200 bg-white text-[14px] font-semibold text-brand-700 hover:bg-brand-50 inline-flex items-center justify-center gap-1.5 whitespace-nowrap";

function Phrases({ parts }: { parts: readonly string[] }) {
  return (
    <>
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 && " "}
          <span className="inline-block whitespace-nowrap">{part}</span>
        </span>
      ))}
    </>
  );
}

function SlashPhrases({ text }: { text: string }) {
  const slash = text.includes(" / ");
  const parts = slash ? text.split(" / ") : text.split(/[，,]\s*/);
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 && (slash ? " / " : " ")}
          <span className="inline-block whitespace-nowrap">{part}</span>
        </span>
      ))}
    </>
  );
}

function StatusTag({ status }: { status: SubmissionStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[12px] font-semibold ${STATUS_TONE[status]}`}
    >
      {SUBMISSION_STATUS_LABEL[status]}
    </span>
  );
}

const roleImages = (item: ParticipantSubmission) =>
  item.materials.filter(material =>
    ["character_reference", "costume_photo", "prop_photo"].includes(
      material.type
    )
  );
const identityImages = (item: ParticipantSubmission) =>
  item.materials.filter(material =>
    ["id_front", "id_back"].includes(material.type)
  );

/* ---------------- 大图查看 ---------------- */
export function ImageLightbox({
  images,
  index,
  title,
  onIndex,
  onClose,
}: {
  images: SubmissionMaterial[];
  index: number;
  title?: string;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const current = images[index];
  const many = images.length > 1;
  const go = (step: number) =>
    onIndex((index + step + images.length) % images.length);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && many) go(1);
      if (event.key === "ArrowLeft" && many) go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (!current) return null;
  return (
    <div
      data-cy="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${current.name}大图`}
      className="fixed inset-0 z-[90] bg-[#1d1638]/90 flex flex-col"
      onClick={onClose}
    >
      <div
        className="h-16 shrink-0 px-4 sm:px-6 flex items-center justify-between text-white"
        onClick={event => event.stopPropagation()}
      >
        <div className="min-w-0">
          <strong className="block text-[16px] truncate">{current.name}</strong>
          <small className="block text-[13px] text-white/70">
            {title ? `${title} · ` : ""}
            {index + 1} / {images.length}
          </small>
        </div>
        <button
          data-cy="lightbox-close"
          aria-label="关闭大图"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 pb-6">
        <img
          src={current.url}
          alt={current.name}
          data-cy="lightbox-image"
          onClick={event => event.stopPropagation()}
          className="max-h-full max-w-full object-contain rounded-lg bg-white shadow-2xl"
        />
        {many && (
          <>
            <button
              data-cy="lightbox-prev"
              aria-label="上一张"
              onClick={event => {
                event.stopPropagation();
                go(-1);
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white text-brand-700 shadow-lg flex items-center justify-center"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              data-cy="lightbox-next"
              aria-label="下一张"
              onClick={event => {
                event.stopPropagation();
                go(1);
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white text-brand-700 shadow-lg flex items-center justify-center"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      {many && (
        <div
          className="shrink-0 pb-5 flex justify-center gap-2"
          onClick={event => event.stopPropagation()}
        >
          {images.map((image, imageIndex) => (
            <button
              key={image.type}
              aria-label={`查看${image.name}`}
              onClick={() => onIndex(imageIndex)}
              className={`w-12 h-14 rounded-md overflow-hidden ring-2 ${imageIndex === index ? "ring-white" : "ring-transparent opacity-60 hover:opacity-100"}`}
            >
              <img
                src={image.url}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Thumb({
  material,
  size = "sm",
  onOpen,
}: {
  material: SubmissionMaterial;
  size?: "sm" | "lg";
  onOpen: () => void;
}) {
  if (size === "sm")
    return (
      <button
        data-cy="review-thumb"
        aria-label={`查看${material.name}大图`}
        title={`查看${material.name}大图`}
        onClick={onOpen}
        className="w-10 h-12 rounded border-2 border-white bg-slate-100 overflow-hidden ring-1 ring-slate-200 hover:ring-2 hover:ring-brand-400 cursor-zoom-in"
      >
        <img
          src={material.url}
          alt={material.name}
          className="w-full h-full object-cover"
        />
      </button>
    );
  return (
    <figure className="min-w-0">
      <button
        data-cy="review-figure"
        aria-label={`查看${material.name}大图`}
        onClick={onOpen}
        className="group relative block w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-zoom-in"
      >
        <img
          src={material.url}
          alt={material.name}
          className="w-full aspect-[3/4] object-cover transition-transform duration-200 group-hover:scale-[1.03]"
        />
        <span className="absolute right-2 bottom-2 h-7 px-2 rounded-full bg-white/95 text-brand-700 text-[12px] font-semibold inline-flex items-center gap-1 shadow">
          <Maximize2 className="w-3.5 h-3.5" />
          大图
        </span>
      </button>
      <figcaption className="mt-2 text-[13px] font-medium text-slate-700 whitespace-nowrap">
        {material.name}
      </figcaption>
    </figure>
  );
}

/* ---------------- 审核流程条 ---------------- */
function ReviewFlow({ role }: { role: ViewerRole }) {
  const steps = [
    { id: "app", title: "漫圈 App 提交", text: ["角色 服装 道具", "实名人脸"] },
    { id: "organizer", title: "主办方初审", text: ["核对资料", "道具安全"] },
    { id: "platform", title: "平台复核", text: ["形成最终", "审核结论"] },
    { id: "done", title: "审核通过", text: ["现场核验", "直接放行"] },
  ];
  return (
    <section
      data-cy="review-flow"
      className="bg-white border border-slate-200 rounded-xl px-4 py-4 grid grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 items-center"
    >
      {steps.map((step, index) => {
        const mine = step.id === role;
        return (
          <div key={step.id} className="contents">
            <div
              className={`flex items-center gap-3 min-w-0 rounded-lg p-2 ${mine ? "bg-brand-50 ring-1 ring-brand-200" : ""}`}
            >
              <span
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[13px] font-semibold ${mine ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <strong className="flex items-center gap-1.5 text-[14px] text-slate-900 whitespace-nowrap">
                  {step.title}
                  {mine && (
                    <span className="hidden sm:inline px-1.5 py-0.5 rounded-full bg-brand-600 text-white text-[11px] leading-4">
                      当前身份
                    </span>
                  )}
                </strong>
                <small className="block mt-0.5 text-[12px] leading-5 text-slate-500">
                  <Phrases parts={step.text} />
                </small>
              </div>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="hidden lg:block w-4 h-4 text-slate-300" />
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ---------------- 页面 ---------------- */
export function CostumeReviewPage({
  role,
  compact = false,
}: {
  role: ViewerRole;
  compact?: boolean;
}) {
  const list = useSubmissions();
  const reviewer: ReviewerRole | null = role === "culture" ? null : role;
  const mine = reviewer ? list.filter(item => isMyTurn(reviewer, item)) : [];
  const candidates = reviewer ? batchCandidates(list, reviewer) : [];
  const [filter, setFilter] = useState<Filter>(() =>
    reviewer && list.some(item => isMyTurn(reviewer, item)) ? "mine" : "all"
  );
  const [detailId, setDetailId] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [viewer, setViewer] = useState<{
    images: SubmissionMaterial[];
    index: number;
    title: string;
  } | null>(null);

  const counts = {
    mine: mine.length,
    all: list.length,
    approved: list.filter(item => item.status === "approved").length,
    changes: list.filter(item => item.status === "changes_required").length,
    security: list.filter(item => item.status === "security_review").length,
  };
  const rows = list.filter(item => {
    if (filter === "mine") return reviewer ? isMyTurn(reviewer, item) : false;
    if (filter === "approved") return item.status === "approved";
    if (filter === "changes") return item.status === "changes_required";
    if (filter === "security") return item.status === "security_review";
    return true;
  });
  const filters: [Filter, string][] = [
    ...(reviewer
      ? ([["mine", `待我处理 ${counts.mine}`]] as [Filter, string][])
      : []),
    ["all", `全部 ${counts.all}`],
    ["approved", `审核通过 ${counts.approved}`],
    ["changes", `待用户补充 ${counts.changes}`],
    ["security", `待现场复验 ${counts.security}`],
  ];
  const detail = list.find(item => item.id === detailId) || null;
  const openImages = (
    item: ParticipantSubmission,
    images: SubmissionMaterial[],
    index: number
  ) =>
    setViewer({ images, index, title: `${item.participant} · ${item.role}` });

  const exportList = () => {
    const header = [
      "参与人",
      "角色",
      "作品来源",
      "服装",
      "道具",
      "实名",
      "人脸比对",
      "风险",
      "审核状态",
      "最新记录",
    ];
    const body = list.map(item => [
      item.participant,
      item.role,
      item.source,
      item.costume,
      item.prop,
      item.identity.realNamePassed ? "已通过" : "待核验",
      `${Math.round(item.identity.faceMatchScore * 100)}%`,
      item.riskLabel,
      SUBMISSION_STATUS_LABEL[item.status],
      item.logs.at(-1)?.action || "",
    ]);
    const csv = [header, ...body]
      .map(row => row.map(cell => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "角色服装道具与实名审核清单.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`审核清单已导出 共 ${list.length} 条`);
  };

  const actions = (
    <div className="flex flex-wrap gap-2">
      <button onClick={exportList} className={outlineBtn}>
        <Download className="w-4 h-4" />
        导出清单
      </button>
      {reviewer && (
        <button
          data-cy="batch-open"
          onClick={() => setBatchOpen(true)}
          className={primaryBtn}
        >
          <ClipboardCheck className="w-4 h-4" />
          一键审核相似申报
          <span className="min-w-5 h-5 px-1 rounded-full bg-white/25 text-[12px] inline-flex items-center justify-center">
            {candidates.length}
          </span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5" data-cy="review-page">
      {compact ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-[18px] font-semibold">角色服装道具审核</h3>
            <p className="mt-1 text-[14px] text-slate-600">
              <Phrases parts={["主办方初审", "平台复核", "全程留痕"]} />
            </p>
          </div>
          {actions}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="text-[12px] font-semibold text-slate-500 tracking-wide">
              角色服装道具 · {reviewer ? REVIEWER_LABEL[reviewer] : "结果查看"}
            </div>
            <h2 className="mt-1 text-[24px] leading-8 font-semibold tracking-[-0.04em]">
              参与者申报审核
            </h2>
            <p className="mt-2 text-[15px] leading-6 text-slate-600">
              <Phrases
                parts={[
                  "承接漫圈 App 提交的角色 服装 道具",
                  "以及实名身份证与人脸核验结果",
                ]}
              />
            </p>
          </div>
          {actions}
        </div>
      )}

      <ReviewFlow role={role} />

      {reviewer ? (
        mine.length ? (
          <section
            data-cy="review-queue"
            className="rounded-xl border border-brand-200 bg-brand-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          >
            <span className="w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Clock3 className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0">
              <strong className="block text-[17px] text-brand-900">
                待你{reviewer === "organizer" ? "初审" : "复核"}的申报{" "}
                {mine.length} 条
              </strong>
              <span className="block mt-1 text-[14px] leading-6 text-slate-600">
                <Phrases
                  parts={
                    reviewer === "organizer"
                      ? ["逐条打开查看图片和实名信息", "通过后自动转平台复核"]
                      : ["主办方已完成初审", "复核通过后形成最终结论"]
                  }
                />
              </span>
            </div>
            <button
              data-cy="start-review"
              onClick={() => {
                setFilter("mine");
                setDetailId(mine[0].id);
              }}
              className={primaryBtn}
            >
              开始审核
              <ArrowRight className="w-4 h-4" />
            </button>
          </section>
        ) : (
          <section
            data-cy="review-queue"
            className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 sm:p-5 flex items-center gap-3"
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div className="text-[14px] leading-6 text-emerald-800">
              <strong className="block text-[16px]">
                当前没有待你处理的申报
              </strong>
              <Phrases
                parts={
                  reviewer === "organizer"
                    ? ["用户在漫圈 App 提交后", "会自动出现在这里"]
                    : ["主办方初审通过后", "会自动出现在这里"]
                }
              />
            </div>
          </section>
        )
      ) : (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3 text-[14px] text-slate-600">
          <ShieldCheck className="w-5 h-5 text-brand-600 shrink-0" />
          <Phrases
            parts={["文旅业务指导人员可查看审核结果", "不参与审核决定"]}
          />
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div
            data-cy="review-filters"
            className="flex flex-wrap gap-1 bg-white border border-[#e4e3f0] p-1 rounded-2xl md:rounded-full w-fit"
          >
            {filters.map(([id, label]) => (
              <button
                key={id}
                data-cy={`review-filter-${id}`}
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={`h-8 px-3 rounded-full text-[13px] font-semibold whitespace-nowrap ${filter === id ? "bg-brand-grad text-white" : "text-slate-600 hover:bg-brand-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[13px] text-slate-500 whitespace-nowrap">
            点击图片可查看大图
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 className="mx-auto w-9 h-9 text-emerald-500" />
            <h3 className="mt-3 text-[17px] font-semibold">
              {filter === "mine"
                ? "待你处理的申报已全部完成"
                : "暂无该状态的申报"}
            </h3>
            <button
              onClick={() => setFilter("all")}
              className={`${outlineBtn} mt-4`}
            >
              查看全部记录
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[1080px] w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[13px] text-slate-600">
                    {[
                      "参与人 / 角色",
                      "资料图片",
                      "服装与道具",
                      "实名 / 人脸",
                      "审核状态",
                      "最新记录",
                    ].map(head => (
                      <th key={head} className="p-4 font-semibold">
                        {head}
                      </th>
                    ))}
                    <th className="p-4 font-semibold text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map(item => {
                    const turn = reviewer ? isMyTurn(reviewer, item) : false;
                    const last = item.logs.at(-1);
                    return (
                      <tr
                        key={item.id}
                        data-cy="review-row"
                        data-id={item.id}
                        className={`align-top ${turn ? "bg-brand-50/40" : ""}`}
                      >
                        <td className="p-4">
                          <div className="text-[15px] font-semibold">
                            {item.participant}
                          </div>
                          <div className="mt-1 text-[14px] text-slate-700 whitespace-nowrap">
                            {item.role} · {item.source}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1.5">
                            {roleImages(item).map((material, index) => (
                              <Thumb
                                key={material.type}
                                material={material}
                                onOpen={() =>
                                  openImages(item, roleImages(item), index)
                                }
                              />
                            ))}
                          </div>
                        </td>
                        <td className="p-4 max-w-[260px] text-[14px] leading-6">
                          <span className="block">
                            <SlashPhrases text={item.costume} />
                          </span>
                          <span className="block text-slate-600">
                            <SlashPhrases text={item.prop} />
                          </span>
                        </td>
                        <td className="p-4 text-[13px] leading-6 text-slate-700 whitespace-nowrap">
                          <span className="flex items-center gap-1.5">
                            <UserRoundCheck className="w-4 h-4 text-emerald-600" />
                            实名已通过
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Fingerprint className="w-4 h-4 text-emerald-600" />
                            人脸{" "}
                            {Math.round(item.identity.faceMatchScore * 100)}%
                          </span>
                        </td>
                        <td className="p-4">
                          <StatusTag status={item.status} />
                          <small
                            className={`block mt-1.5 text-[12px] whitespace-nowrap ${item.riskLevel === "high" ? "text-rose-600 font-semibold" : "text-slate-500"}`}
                          >
                            {item.riskLabel}
                          </small>
                        </td>
                        <td className="p-4 text-[13px] leading-5 text-slate-600">
                          <strong className="block text-slate-800 whitespace-nowrap">
                            {last?.action}
                          </strong>
                          <span className="block whitespace-nowrap">
                            {last?.actorName} · {last?.occurredAt}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            data-cy="review-open"
                            onClick={() => setDetailId(item.id)}
                            className={
                              turn
                                ? "h-9 px-4 rounded-full bg-brand-grad text-white text-[14px] font-semibold whitespace-nowrap"
                                : "h-9 px-3 rounded-full text-[14px] font-semibold text-brand-600 hover:bg-brand-50 whitespace-nowrap"
                            }
                          >
                            {turn
                              ? item.status === "security_review"
                                ? "登记复验"
                                : "审核"
                              : "查看详情"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-slate-200">
              {rows.map(item => {
                const turn = reviewer ? isMyTurn(reviewer, item) : false;
                return (
                  <article
                    key={item.id}
                    data-cy="review-card"
                    data-id={item.id}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-[16px]">
                          {item.participant}
                        </strong>
                        <span className="block mt-0.5 text-[14px] text-slate-600">
                          {item.role} · {item.source}
                        </span>
                      </div>
                      <StatusTag status={item.status} />
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {roleImages(item).map((material, index) => (
                        <Thumb
                          key={material.type}
                          material={material}
                          onOpen={() =>
                            openImages(item, roleImages(item), index)
                          }
                        />
                      ))}
                    </div>
                    <p className="mt-3 text-[14px] leading-6 text-slate-700">
                      <SlashPhrases text={item.prop} />
                    </p>
                    <button
                      data-cy="review-open"
                      onClick={() => setDetailId(item.id)}
                      className={`mt-3 w-full ${turn ? primaryBtn : outlineBtn}`}
                    >
                      {turn
                        ? item.status === "security_review"
                          ? "登记复验"
                          : "审核"
                        : "查看详情"}
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>

      {detail && (
        <ReviewDrawer
          item={detail}
          list={list}
          role={role}
          onOpenImages={openImages}
          onNavigate={setDetailId}
          onClose={() => setDetailId(null)}
        />
      )}
      {batchOpen && reviewer && (
        <BatchReviewDialog
          list={list}
          reviewer={reviewer}
          onReviewOne={id => {
            setBatchOpen(false);
            setDetailId(id);
          }}
          onClose={() => setBatchOpen(false)}
        />
      )}
      {viewer && (
        <ImageLightbox
          images={viewer.images}
          index={viewer.index}
          title={viewer.title}
          onIndex={index => setViewer({ ...viewer, index })}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}

/* ---------------- 详情与审核 ---------------- */
function ReviewDrawer({
  item,
  list,
  role,
  onOpenImages,
  onNavigate,
  onClose,
}: {
  item: ParticipantSubmission;
  list: ParticipantSubmission[];
  role: ViewerRole;
  onOpenImages: (
    item: ParticipantSubmission,
    images: SubmissionMaterial[],
    index: number
  ) => void;
  onNavigate: (id: string) => void;
  onClose: () => void;
}) {
  const reviewer: ReviewerRole | null = role === "culture" ? null : role;
  const turn = reviewer ? isMyTurn(reviewer, item) : false;
  const [dialog, setDialog] = useState<"return" | "security" | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const remaining = reviewer
    ? list.filter(entry => entry.id !== item.id && isMyTurn(reviewer, entry))
    : [];
  const stepIndex =
    item.status === "approved" ? 4 : item.status === "platform_pending" ? 2 : 1;
  const steps = ["用户提交", "主办方初审", "平台复核", "审核通过"];

  const run = (action: () => ParticipantSubmission[], message: string) => {
    try {
      commitSubmissions(action());
      setDialog(null);
      setComment("");
      setError("");
      toast.success(message);
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "当前申报暂不能处理"
      );
    }
  };

  const approve = () =>
    reviewer &&
    run(
      () => approveSubmission(list, reviewer, item.id),
      reviewer === "organizer"
        ? `${item.participant} 初审通过 已转平台复核`
        : `${item.participant} 复核通过 审核完成`
    );

  const readonlyText = (() => {
    if (!reviewer) return ["文旅业务指导人员可查看审核结果", "不参与审核决定"];
    if (item.status === "approved")
      return ["该申报已完成双层审核", "现场核验直接放行"];
    if (item.status === "changes_required")
      return ["已退回用户补充", "用户重新提交后再次进入初审"];
    if (item.status === "platform_pending")
      return ["主办方已初审通过", "等待平台运营人员复核"];
    if (item.status === "security_review")
      return ["等待主办方登记", "现场安保复验结果"];
    return ["等待主办方活动运营人员", "完成初审"];
  })();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="关闭申报详情"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/30"
      />
      <section
        data-cy="review-drawer"
        className="relative w-full max-w-[600px] h-full bg-white shadow-2xl flex flex-col"
      >
        <header className="shrink-0 px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] text-slate-500">
              参与者申报详情 ·{" "}
              {reviewer ? REVIEWER_LABEL[reviewer] : "结果查看"}
            </div>
            <h2 className="mt-1 text-[21px] font-semibold">
              {item.participant} · {item.role}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭申报详情"
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <section
            data-cy="review-status"
            className={`rounded-lg p-4 ${STATUS_TONE[item.status]}`}
          >
            <strong className="block text-[16px]">
              {SUBMISSION_STATUS_LABEL[item.status]}
            </strong>
            <span className="block mt-1 text-[14px] leading-6">
              <Phrases parts={NEXT_STEP[item.status]} />
            </span>
          </section>

          <ol className="grid grid-cols-4 gap-2">
            {steps.map((step, index) => {
              const done = index < stepIndex;
              const current = index === stepIndex;
              return (
                <li key={step} className="min-w-0 text-center">
                  <span
                    className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold ${done ? "bg-emerald-500 text-white" : current ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"}`}
                  >
                    {done ? <Check className="w-4 h-4" /> : index + 1}
                  </span>
                  <span
                    className={`block mt-1.5 text-[12px] whitespace-nowrap ${current ? "font-semibold text-brand-700" : "text-slate-600"}`}
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>

          <section className="grid grid-cols-2 gap-3">
            {[
              ["参与人", item.participant],
              ["作品来源", item.source],
              ["提交时间", item.submittedAt],
              ["风险提示", item.riskLabel],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 p-3">
                <div className="text-[12px] font-semibold text-slate-500">
                  {label}
                </div>
                <div
                  className={`mt-1 text-[15px] font-semibold ${label === "风险提示" && item.riskLevel === "high" ? "text-rose-700" : ""}`}
                >
                  {value}
                </div>
              </div>
            ))}
          </section>

          <section className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] font-semibold">角色 服装与道具</h3>
              <span className="text-[13px] text-slate-500 whitespace-nowrap">
                点击图片查看大图
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {roleImages(item).map((material, index) => (
                <Thumb
                  key={material.type}
                  size="lg"
                  material={material}
                  onOpen={() => onOpenImages(item, roleImages(item), index)}
                />
              ))}
            </div>
            <dl className="mt-4 grid gap-3">
              <div>
                <dt className="text-[13px] font-semibold text-slate-500">
                  服装信息
                </dt>
                <dd className="mt-1 text-[15px] leading-6">
                  <SlashPhrases text={item.costume} />
                </dd>
              </div>
              <div>
                <dt className="text-[13px] font-semibold text-slate-500">
                  道具信息
                </dt>
                <dd className="mt-1 text-[15px] leading-6">
                  <SlashPhrases text={item.prop} />
                </dd>
              </div>
            </dl>
          </section>

          <section className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] font-semibold">实名 身份证与人脸</h3>
              <span className="text-[13px] font-semibold text-emerald-700 whitespace-nowrap">
                核验已通过
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                ["身份证号", item.identity.maskedIdNumber],
                ["实名核验", "已通过"],
                [
                  "人脸比对",
                  `${Math.round(item.identity.faceMatchScore * 100)}%`,
                ],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <div className="text-[12px] font-semibold text-slate-500">
                    {label}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold break-all">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {identityImages(item).map((material, index) => (
                <button
                  key={material.type}
                  data-cy="review-figure"
                  aria-label={`查看${material.name}大图`}
                  onClick={() =>
                    onOpenImages(item, identityImages(item), index)
                  }
                  className="group relative block rounded-lg overflow-hidden border border-slate-200 bg-slate-50 cursor-zoom-in text-left"
                >
                  <img
                    src={material.url}
                    alt={material.name}
                    className="w-full aspect-[16/10] object-cover"
                  />
                  <span className="block px-2.5 py-2 text-[13px] font-medium text-slate-700">
                    {material.name}
                  </span>
                  <span className="absolute right-2 top-2 h-7 px-2 rounded-full bg-white/95 text-brand-700 text-[12px] font-semibold inline-flex items-center gap-1 shadow">
                    <Maximize2 className="w-3.5 h-3.5" />
                    大图
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-slate-500">
              <Phrases
                parts={["身份证号默认脱敏", "原始材料仅在受权审核流程内查看"]}
              />
            </p>
          </section>

          <section className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-[16px] font-semibold">审核记录</h3>
            <ol className="mt-3 space-y-3">
              {item.logs.map(entry => (
                <li key={entry.id} className="border-l-2 border-brand-200 pl-3">
                  <strong className="block text-[14px]">{entry.action}</strong>
                  <span className="block mt-0.5 text-[13px] text-slate-500">
                    {entry.actorName} · {entry.actorRole} · {entry.occurredAt}
                  </span>
                  {entry.comment && (
                    <small className="block mt-1 text-[13px] leading-5 text-slate-700">
                      {entry.comment}
                    </small>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <footer
          data-cy="review-actions"
          className="shrink-0 border-t border-slate-200 bg-white px-5 py-4"
        >
          {error && (
            <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
              {error}
            </div>
          )}
          {turn ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                data-cy="review-return"
                onClick={() => {
                  setComment("");
                  setError("");
                  setDialog("return");
                }}
                className={`${outlineBtn} h-11`}
              >
                <RotateCcw className="w-4 h-4" />
                退回补充
              </button>
              {item.status === "security_review" ? (
                <button
                  data-cy="review-security"
                  onClick={() => {
                    setComment("道具尺寸与材质已现场核对 符合入场要求");
                    setError("");
                    setDialog("security");
                  }}
                  className={`${primaryBtn} h-11`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  登记现场复验通过
                </button>
              ) : (
                <button
                  data-cy="review-approve"
                  onClick={approve}
                  className={`${primaryBtn} h-11`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {reviewer === "organizer" ? "初审通过" : "复核通过"}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span
                data-cy="review-readonly"
                className="flex-1 flex items-start gap-2 text-[14px] leading-6 text-slate-600"
              >
                {item.status === "approved" ? (
                  <CheckCircle2 className="w-4 h-4 mt-1 text-emerald-600 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 mt-1 text-brand-600 shrink-0" />
                )}
                <span>
                  <Phrases parts={readonlyText} />
                </span>
              </span>
              {remaining.length > 0 ? (
                <button
                  data-cy="review-next"
                  onClick={() => onNavigate(remaining[0].id)}
                  className={primaryBtn}
                >
                  审核下一条 · 剩余 {remaining.length}
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={onClose} className={outlineBtn}>
                  关闭
                </button>
              )}
            </div>
          )}
        </footer>
      </section>

      {dialog && reviewer && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/45 flex items-center justify-center p-4"
          onClick={() => setDialog(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-[500px] rounded-xl bg-white shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-[18px] font-semibold">
                {dialog === "return"
                  ? "退回用户补充资料"
                  : "登记现场安保复验结果"}
              </h3>
              <p className="mt-1 text-[14px] leading-6 text-slate-600">
                <Phrases
                  parts={
                    dialog === "return"
                      ? ["意见会同步到漫圈 App", "用户补充后重新进入初审"]
                      : ["复验通过后", "该申报转入平台复核"]
                  }
                />
              </p>
            </div>
            <div className="p-5 space-y-3">
              {dialog === "return" && (
                <div className="flex flex-wrap gap-2">
                  {RETURN_REASONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setComment(reason)}
                      className={`h-8 px-3 rounded-full border text-[13px] whitespace-nowrap ${comment === reason ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold" : "border-slate-200 text-slate-600 hover:border-brand-300"}`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              )}
              <label className="block">
                <span className="block mb-2 text-[14px] font-semibold">
                  {dialog === "return" ? "退回原因" : "复验说明"}
                </span>
                <textarea
                  data-cy={
                    dialog === "return" ? "return-reason" : "security-note"
                  }
                  value={comment}
                  onChange={event => setComment(event.target.value)}
                  rows={4}
                  maxLength={200}
                  placeholder={
                    dialog === "return"
                      ? "请写明需要补充的角色 服装 道具或身份资料"
                      : "可填写现场核对的尺寸 材质与安保人员"
                  }
                  className="w-full rounded-lg border border-slate-300 p-3 text-[14px] outline-none focus:border-brand-500"
                />
              </label>
              {error && (
                <div className="rounded-md bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                  {error}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setDialog(null)} className={outlineBtn}>
                取消
              </button>
              {dialog === "return" ? (
                <button
                  data-cy="confirm-return"
                  disabled={!comment.trim()}
                  onClick={() =>
                    run(
                      () => returnSubmission(list, reviewer, item.id, comment),
                      `已退回 ${item.participant} 补充资料`
                    )
                  }
                  className={primaryBtn}
                >
                  确认退回
                </button>
              ) : (
                <button
                  data-cy="confirm-security"
                  onClick={() =>
                    run(
                      () => clearSecurityReview(list, item.id, comment),
                      `${item.participant} 现场复验通过 已转平台复核`
                    )
                  }
                  className={primaryBtn}
                >
                  确认复验通过
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- 相似低风险一键审核 ---------------- */
function BatchReviewDialog({
  list,
  reviewer,
  onReviewOne,
  onClose,
}: {
  list: ParticipantSubmission[];
  reviewer: ReviewerRole;
  onReviewOne: (id: string) => void;
  onClose: () => void;
}) {
  const [candidates] = useState(() => batchCandidates(list, reviewer));
  const excluded = list.filter(
    item =>
      isMyTurn(reviewer, item) &&
      !candidates.some(candidate => candidate.id === item.id)
  );
  const [picked, setPicked] = useState<string[]>(() =>
    candidates.map(item => item.id)
  );
  const [done, setDone] = useState<string[] | null>(null);
  const toggle = (id: string) =>
    setPicked(current =>
      current.includes(id)
        ? current.filter(entry => entry !== id)
        : [...current, id]
    );
  const confirm = () => {
    const result = approveMany(list, reviewer, picked);
    commitSubmissions(result.list);
    setDone(result.updated);
    toast.success(`已通过 ${result.updated.length} 条相似申报`);
  };
  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/45 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        data-cy="batch-dialog"
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[600px] max-h-[90vh] rounded-xl bg-white shadow-2xl flex flex-col"
        onClick={event => event.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[19px] font-semibold">一键审核相似申报</h3>
            <p className="mt-1 text-[14px] leading-6 text-slate-600">
              <Phrases
                parts={[
                  `只包含待你${reviewer === "organizer" ? "初审" : "复核"}的记录`,
                  "资料完整 实名人脸已通过",
                  `低风险且相似度不低于 ${Math.round(SIMILARITY_THRESHOLD * 100)}%`,
                ]}
              />
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭一键审核"
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {done ? (
            <div className="py-6 text-center" data-cy="batch-done">
              <CheckCircle2 className="mx-auto w-11 h-11 text-emerald-500" />
              <strong className="block mt-3 text-[18px]">
                已通过 {done.length} 条申报
              </strong>
              <span className="block mt-1 text-[14px] text-slate-600">
                {reviewer === "organizer"
                  ? "已自动转平台复核 每条记录已写入审核时间线"
                  : "已形成最终审核结论 每条记录已写入审核时间线"}
              </span>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[14px] font-semibold text-slate-800">
                  符合条件 {candidates.length} 条
                </div>
                {candidates.length === 0 ? (
                  <div className="mt-2 rounded-lg bg-slate-50 p-4 text-[14px] text-slate-600">
                    当前没有可一键审核的记录
                  </div>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {candidates.map(item => {
                      const checked = picked.includes(item.id);
                      return (
                        <li key={item.id}>
                          <label
                            data-cy="batch-item"
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer ${checked ? "border-brand-300 bg-brand-50/60" : "border-slate-200"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(item.id)}
                              className="w-4 h-4 accent-[#6461c9]"
                            />
                            <img
                              src={item.materials[0].url}
                              alt=""
                              className="w-10 h-12 rounded object-cover bg-slate-100 shrink-0"
                            />
                            <span className="flex-1 min-w-0">
                              <strong className="block text-[14px]">
                                {item.participant} · {item.role}
                              </strong>
                              <small className="block mt-0.5 text-[13px] text-slate-600 truncate">
                                {item.prop}
                              </small>
                            </span>
                            <span className="text-[13px] font-semibold text-emerald-700 whitespace-nowrap">
                              相似度{" "}
                              {Math.round((item.similarityScore || 0) * 100)}%
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {excluded.length > 0 && (
                <div>
                  <div className="text-[14px] font-semibold text-slate-800">
                    需逐条审核 {excluded.length} 条
                  </div>
                  <ul className="mt-2 space-y-2">
                    {excluded.map(item => (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg bg-rose-50/70 p-3"
                      >
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="flex-1 min-w-0">
                          <strong className="block text-[14px]">
                            {item.participant} · {item.role}
                          </strong>
                          <small className="block text-[13px] text-rose-700">
                            {batchExcludedReason(item)}
                          </small>
                        </span>
                        <button
                          onClick={() => onReviewOne(item.id)}
                          className="h-8 px-3 rounded-full text-[13px] font-semibold text-brand-700 hover:bg-white whitespace-nowrap"
                        >
                          去审核
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            data-cy="batch-close"
            onClick={onClose}
            className={outlineBtn}
          >
            {done ? "完成" : "取消"}
          </button>
          {!done && (
            <button
              data-cy="confirm-batch"
              disabled={picked.length === 0}
              onClick={confirm}
              className={primaryBtn}
            >
              <ClipboardCheck className="w-4 h-4" />
              确认通过 {picked.length} 条
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 侧栏角标 待当前身份处理的申报数 */
export function useMyReviewCount(role: ViewerRole) {
  const list = useSubmissions();
  if (role === "culture") return 0;
  return list.filter(item => isMyTurn(role, item)).length;
}
