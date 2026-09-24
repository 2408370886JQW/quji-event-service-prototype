import { useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileCheck2,
  FileText,
  IdCard,
  Image as ImageIcon,
  LockKeyhole,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Ticket,
  Upload,
  UserCheck,
  X,
} from "lucide-react";

export type AdmissionStatus =
  | "not_started"
  | "identity_completed"
  | "materials_draft"
  | "submitted"
  | "changes_required"
  | "approved";
export type ApplicantIdentity = "legal_representative" | "authorized_agent";
export type MaterialKey =
  | "license"
  | "id_front"
  | "id_back"
  | "authorization"
  | "safety"
  | "permit";
export interface AdmissionMaterial {
  key: MaterialKey;
  name: string;
  required: boolean;
  fileName: string;
  preview: string;
  updatedAt: string;
  status: "待上传" | "已上传" | "需补充" | "已核验";
  note: string;
}
export interface AdmissionState {
  status: AdmissionStatus;
  phone: string;
  realName: string;
  idNumber: string;
  agentIdentity: ApplicantIdentity | "";
  organizationName: string;
  socialCreditCode: string;
  legalRepresentativeName: string;
  establishedAt: string;
  businessTerm: string;
  registeredAddress: string;
  safetyOfficer: string;
  safetyPhone: string;
  submittedAt: string;
  reviewedAt: string;
  reviewNote: string;
  materials: AdmissionMaterial[];
}

const SAMPLE_VISUALS: Record<Exclude<MaterialKey, "safety">, string> = {
  license: "/manus-storage/quji-public-license-sample_4ac90af5.webp",
  id_front: "/manus-storage/quji-public-identity-sample_e55cbf71.webp",
  id_back: "/manus-storage/quji-public-identity-back-sample_4fe11174.webp",
  authorization:
    "/manus-storage/quji-public-authorization-sample_1d330ce1.webp",
  permit: "/manus-storage/quji-public-permit-sample_dfdc1faf.webp",
};
const STEPS = ["账号注册", "实名核验", "主体材料", "平台审核", "入驻完成"];

export const createEmptyAdmission = (): AdmissionState => ({
  status: "not_started",
  phone: "",
  realName: "",
  idNumber: "",
  agentIdentity: "",
  organizationName: "",
  socialCreditCode: "",
  legalRepresentativeName: "",
  establishedAt: "",
  businessTerm: "",
  registeredAddress: "",
  safetyOfficer: "",
  safetyPhone: "",
  submittedAt: "",
  reviewedAt: "",
  reviewNote: "",
  materials: [
    {
      key: "license",
      name: "营业执照或主体登记证明",
      required: true,
      fileName: "",
      preview: "",
      updatedAt: "",
      status: "待上传",
      note: "请上传清晰完整的证照页面",
    },
    {
      key: "id_front",
      name: "法定代表人身份证正面",
      required: true,
      fileName: "",
      preview: "",
      updatedAt: "",
      status: "待上传",
      note: "上传法定代表人身份证人像面",
    },
    {
      key: "id_back",
      name: "法定代表人身份证反面",
      required: true,
      fileName: "",
      preview: "",
      updatedAt: "",
      status: "待上传",
      note: "上传同一张身份证国徽面",
    },
    {
      key: "authorization",
      name: "经办授权书",
      required: true,
      fileName: "",
      preview: "",
      updatedAt: "",
      status: "待上传",
      note: "仅被授权经办人办理时上传",
    },
    {
      key: "safety",
      name: "主体安全责任人信息",
      required: true,
      fileName: "",
      preview: "",
      updatedAt: "",
      status: "待上传",
      note: "填写责任人姓名与联系电话后自动形成材料",
    },
    {
      key: "permit",
      name: "经营性业务相关许可",
      required: false,
      fileName: "",
      preview: "",
      updatedAt: "",
      status: "待上传",
      note: "仅在活动性质或属地规则要求时上传",
    },
  ],
});

export const createApprovedAdmission = (): AdmissionState => {
  const state = createEmptyAdmission();
  return {
    ...state,
    status: "approved",
    phone: "13800008821",
    realName: "林洁",
    idNumber: "650102199001018821",
    agentIdentity: "authorized_agent",
    organizationName: "新疆星河文化传媒有限公司",
    socialCreditCode: "91650100XXXXXXXXXX",
    legalRepresentativeName: "穆合塔尔·阿不都热依木",
    establishedAt: "2021-05-18",
    businessTerm: "2021-05-18 至长期",
    registeredAddress: "新疆乌鲁木齐市水磨沟区会展大道 88 号",
    safetyOfficer: "林洁",
    safetyPhone: "13800008821",
    submittedAt: "2026-06-10 14:15",
    reviewedAt: "2026-06-11 10:20",
    reviewNote: "主体材料核验通过",
    materials: state.materials.map(item => {
      const fileNames: Partial<Record<MaterialKey, string>> = {
        license: "营业执照.pdf",
        id_front: "法定代表人身份证正面.webp",
        id_back: "法定代表人身份证反面.webp",
        authorization: "经办授权书.webp",
        safety: "主体安全责任人信息表.pdf",
      };
      return {
        ...item,
        fileName: fileNames[item.key] || "",
        preview:
          item.key === "safety" || item.key === "permit"
            ? ""
            : SAMPLE_VISUALS[item.key],
        updatedAt: item.key === "permit" ? "" : "2026-06-10 14:15",
        status: item.key === "permit" ? "待上传" : "已核验",
      };
    }),
  };
};

function nowText() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replaceAll("/", "-");
}
function activeStep(status: AdmissionStatus) {
  if (status === "approved") return 4;
  if (status === "submitted" || status === "changes_required") return 3;
  if (status === "identity_completed" || status === "materials_draft") return 2;
  return 0;
}
export function canSubmitAdmission(state: AdmissionState) {
  return Boolean(
    state.agentIdentity &&
      state.organizationName &&
      state.socialCreditCode &&
      state.materials
        .filter(
          item =>
            item.required &&
            (item.key !== "authorization" ||
              state.agentIdentity === "authorized_agent")
        )
        .every(item => item.fileName)
  );
}
export function canCreateActivity(state: AdmissionState) {
  return state.status === "approved";
}
export function submitAdmission(state: AdmissionState): AdmissionState {
  return canSubmitAdmission(state)
    ? { ...state, status: "submitted", submittedAt: nowText(), reviewNote: "" }
    : state;
}
export function reviewAdmission(
  state: AdmissionState,
  approved: boolean,
  note: string
): AdmissionState {
  if (state.status !== "submitted") return state;
  return {
    ...state,
    status: approved ? "approved" : "changes_required",
    reviewedAt: nowText(),
    reviewNote: note,
    materials: approved
      ? state.materials.map(item =>
          item.fileName ? { ...item, status: "已核验" } : item
        )
      : state.materials,
  };
}
function statusCopy(status: AdmissionStatus) {
  return {
    not_started: ["尚未开始", "请先完成手机号注册与实名核验"],
    identity_completed: [
      "待上传主体材料",
      "身份与实名信息已完成 继续上传身份证和主体材料",
    ],
    materials_draft: ["主体材料准备中", "完成全部必填材料后提交平台审核"],
    submitted: ["平台审核中", "材料已提交 平台运营人员可查看同一份资料"],
    changes_required: ["需要补充材料", "请根据平台审核意见补充后重新提交"],
    approved: ["主体认证已通过", "现在可以创建活动并配置票务与现场工作"],
  }[status];
}
function guideLines(key: MaterialKey) {
  if (key === "license")
    return ["上传清晰完整的证照页面", "确保证照名称", "主体名称和有效期可辨认"];
  if (key === "id_front")
    return ["上传法定代表人身份证人像面", "证件边缘 姓名和身份证号清晰可辨"];
  if (key === "id_back")
    return ["上传同一张身份证国徽面", "签发机关和有效期限清晰可辨"];
  if (key === "authorization")
    return [
      "仅被授权经办人办理时上传",
      "确保委托主体 经办人和授权事项清晰可辨",
    ];
  if (key === "safety")
    return ["填写主体安全责任人姓名和联系电话", "保存后自动形成责任人信息材料"];
  return ["仅在活动性质或属地规则要求时上传", "没有相关要求可暂不提交"];
}

function AdmissionProgress({ status }: { status: AdmissionStatus }) {
  const current = activeStep(status);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid min-w-[720px] grid-cols-5">
        {STEPS.map((label, index) => (
          <div key={label} className="relative flex items-center">
            {index > 0 && (
              <div
                className={`absolute right-1/2 left-[-50%] top-4 h-px ${index <= current ? "bg-[#245fc4]" : "bg-slate-200"}`}
              />
            )}
            <div className="relative z-10 flex flex-1 flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold ${index < current || status === "approved" ? "border-[#245fc4] bg-[#245fc4] text-white" : index === current ? "border-[#245fc4] bg-blue-50 text-[#1c4c9e]" : "border-slate-300 bg-white text-slate-500"}`}
              >
                {index < current || status === "approved" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <div
                className={`mt-2 text-[13px] font-semibold whitespace-nowrap ${index <= current ? "text-slate-900" : "text-slate-500"}`}
              >
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  lines,
}: {
  eyebrow: string;
  title: string;
  lines: string[];
}) {
  return (
    <div>
      <div className="text-[13px] font-semibold text-slate-500">{eyebrow}</div>
      <h1 className="mt-1 text-[28px] leading-9 font-semibold tracking-[-0.04em]">
        {title}
      </h1>
      <p className="mt-2 text-[15px] leading-6 text-slate-600">
        {lines.map(line => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </p>
    </div>
  );
}
function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-semibold text-slate-800">{label}</span>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-[15px] outline-none focus:border-[#245fc4] focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export function OrganizerRegistration({
  onBack,
  onComplete,
}: {
  onBack: () => void;
  onComplete: (state: AdmissionState) => void;
}) {
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [agentIdentity, setAgentIdentity] = useState<ApplicantIdentity | "">(
    ""
  );
  const [realName, setRealName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [error, setError] = useState("");
  const next = () => {
    if (step === 0) {
      if (!/^1\d{10}$/.test(phone)) return setError("请输入正确的 11 位手机号");
      if (code !== "246810") return setError("请输入验证码 246810");
      setError("");
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!agentIdentity)
        return setError("请先选择您是法定代表人还是被授权经办人");
      setError("");
      setStep(2);
      return;
    }
    if (!realName.trim() || idNumber.trim().length < 8)
      return setError("请完整填写本人实名信息");
    if (!agreement) return setError("请确认办理身份与信息真实性承诺");
    onComplete({
      ...createEmptyAdmission(),
      status: "identity_completed",
      phone,
      realName,
      idNumber,
      agentIdentity,
      organizationName,
    });
  };
  const registrationTitle = [
    "注册主办方账号",
    "先确认您的办理身份",
    "填写本人实名信息",
  ][step];
  const registrationLines = [
    ["填写手机号并完成验证码校验", "验证后由您本人选择办理身份"],
    ["请选择您与本次入驻主办方的关系", "系统不会默认把首次使用人认定为经办人"],
    ["填写本人实名信息", "主办方主体信息将在上传营业执照后自动关联"],
  ][step];
  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-900">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8">
        <button
          onClick={onBack}
          className="flex h-10 items-center gap-2 rounded-md px-3 text-[14px] font-semibold hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登录
        </button>
        <div className="text-[14px] text-slate-500">已有账号可直接登录</div>
      </header>
      <main className="mx-auto max-w-[980px] px-5 py-8 sm:py-12">
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid min-w-[540px] grid-cols-3">
            {["手机验证", "身份选择", "实名与主体"].map((label, index) => (
              <div key={label} className="relative flex items-center">
                {index > 0 && (
                  <div
                    className={`absolute right-1/2 left-[-50%] top-4 h-px ${index <= step ? "bg-[#245fc4]" : "bg-slate-200"}`}
                  />
                )}
                <div className="relative z-10 flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold ${index < step ? "border-[#245fc4] bg-[#245fc4] text-white" : index === step ? "border-[#245fc4] bg-blue-50 text-[#1c4c9e]" : "border-slate-300 bg-white text-slate-500"}`}
                  >
                    {index < step ? <Check className="h-4 w-4" /> : index + 1}
                  </div>
                  <div
                    className={`mt-2 text-[13px] font-semibold whitespace-nowrap ${index <= step ? "text-slate-900" : "text-slate-500"}`}
                  >
                    {label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-[#245fc4]">
              {step === 0 ? (
                <Phone className="h-5 w-5" />
              ) : (
                <IdCard className="h-5 w-5" />
              )}
            </div>
            <h2 className="mt-4 text-[18px] font-semibold">
              {step === 0
                ? "手机号注册"
                : step === 1
                  ? "选择办理身份"
                  : "本人实名与主体信息"}
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              {step === 0
                ? "手机号作为账号与审核通知联系方式"
                : step === 1
                  ? "由首次使用人主动确认自己与主办方的关系"
                  : "本人实名信息用于核验当前申请人 主体名称对应营业执照"}
            </p>
            <div className="mt-5 rounded-md bg-slate-50 p-4 text-[13px] leading-6 text-slate-600">
              <span className="block font-semibold text-slate-800">
                当前流程只收集必要信息
              </span>
              <span className="block">身份信息默认脱敏展示</span>
              <span className="block">查看与操作均保留记录</span>
            </div>
          </aside>
          <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <Heading
              eyebrow={`首次入驻 · 第 ${step + 1} 步 共 3 步`}
              title={registrationTitle}
              lines={registrationLines}
            />
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {step === 0 ? (
                <>
                  <TextInput
                    label="手机号"
                    value={phone}
                    onChange={setPhone}
                    placeholder="请输入手机号"
                  />
                  <TextInput
                    label="验证码"
                    value={code}
                    onChange={setCode}
                    placeholder="验证码 246810"
                  />
                </>
              ) : step === 1 ? (
                <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                  <button
                    type="button"
                    data-cy="identity-legal-representative"
                    onClick={() => {
                      setAgentIdentity("legal_representative");
                      setAgreement(false);
                      setError("");
                    }}
                    className={`min-h-[144px] rounded-lg border p-5 text-left transition-colors ${agentIdentity === "legal_representative" ? "border-[#245fc4] bg-blue-50 ring-1 ring-[#245fc4]" : "border-slate-200 bg-white hover:border-slate-400"}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-[#245fc4]">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <strong className="mt-4 block text-[16px]">
                      我是法定代表人
                    </strong>
                    <span className="mt-2 block text-[13px] leading-6 text-slate-600">
                      由本人直接办理 后续上传法定代表人身份证正反面
                      无需经办授权书
                    </span>
                  </button>
                  <button
                    type="button"
                    data-cy="identity-authorized-agent"
                    onClick={() => {
                      setAgentIdentity("authorized_agent");
                      setAgreement(false);
                      setError("");
                    }}
                    className={`min-h-[144px] rounded-lg border p-5 text-left transition-colors ${agentIdentity === "authorized_agent" ? "border-[#245fc4] bg-blue-50 ring-1 ring-[#245fc4]" : "border-slate-200 bg-white hover:border-slate-400"}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-[#245fc4]">
                      <UserCheck className="h-5 w-5" />
                    </span>
                    <strong className="mt-4 block text-[16px]">
                      我是被授权经办人
                    </strong>
                    <span className="mt-2 block text-[13px] leading-6 text-slate-600">
                      受主办方授权办理
                      后续需上传法定代表人身份证正反面和经办授权书
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 p-4">
                    <div>
                      <div className="text-[14px] font-semibold text-slate-900">
                        {agentIdentity === "legal_representative"
                          ? "我是法定代表人"
                          : "我是被授权经办人"}
                      </div>
                      <div className="mt-1 text-[13px] leading-5 text-slate-600">
                        {agentIdentity === "legal_representative"
                          ? "本人直接办理 不需要经办授权书"
                          : "受主办方授权办理 需要上传经办授权书"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="h-9 rounded-md bg-white px-3 text-[13px] font-semibold text-[#1c4c9e]"
                    >
                      重新选择
                    </button>
                  </div>
                  <TextInput
                    label={
                      agentIdentity === "legal_representative"
                        ? "法定代表人姓名"
                        : "被授权经办人姓名"
                    }
                    value={realName}
                    onChange={setRealName}
                    placeholder="请输入本人真实姓名"
                  />
                  <TextInput
                    label="本人身份证号"
                    value={idNumber}
                    onChange={setIdNumber}
                    placeholder="请输入证件号码"
                  />
                  <div className="sm:col-span-2">
                    <TextInput
                      label="主办方主体名称（可不填）"
                      value={organizationName}
                      onChange={setOrganizationName}
                      placeholder="上传营业执照后自动识别"
                    />
                  </div>
                  <label className="sm:col-span-2 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-[14px] leading-6">
                    <input
                      type="checkbox"
                      checked={agreement}
                      onChange={event => setAgreement(event.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#245fc4]"
                    />
                    <span>
                      {agentIdentity === "legal_representative"
                        ? "我确认本人为该主办方的法定代表人 并对所提交信息的真实性负责"
                        : "我确认已获得该主办方授权 并对所提交信息的真实性负责"}
                    </span>
                  </label>
                </>
              )}
            </div>
            {error && (
              <div className="mt-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">
                {error}
              </div>
            )}
            <div className="mt-7 flex justify-between gap-3">
              <button
                onClick={() =>
                  step === 0 ? onBack() : setStep(current => current - 1)
                }
                className="h-11 rounded-md border border-slate-300 px-5 text-[14px] font-semibold"
              >
                {step === 0 ? "返回登录" : "上一步"}
              </button>
              <button
                onClick={next}
                data-cy="registration-next"
                className="flex h-11 items-center gap-2 rounded-md bg-[#245fc4] px-5 text-[14px] font-semibold text-white"
              >
                {step === 0
                  ? "下一步 选择身份"
                  : step === 1
                    ? "确认身份并继续"
                    : "保存并上传材料"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function MaterialPreview({ material }: { material: AdmissionMaterial }) {
  return (
    <div
      data-cy="uploaded-material-detail"
      className="overflow-hidden rounded-md border border-slate-200 bg-white"
    >
      <div className="relative flex h-56 items-center justify-center bg-slate-50">
        {material.preview ? (
          <img
            src={material.preview}
            alt={`${material.name}公开样例`}
            className="h-full w-full object-contain"
          />
        ) : (
          <FileText className="h-12 w-12 text-slate-400" />
        )}
        {material.preview && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/72 px-3 py-2 text-center text-[12px] font-semibold tracking-wide text-white">
            趣集公开样例 · 非真实证照
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 p-4">
        <div className="text-[15px] font-semibold">{material.name}</div>
        <div className="mt-1 text-[14px] text-slate-600">
          {material.fileName || "尚未选择文件"}
        </div>
        {material.updatedAt && (
          <div className="mt-1 text-[13px] text-slate-500">
            上传时间 {material.updatedAt}
          </div>
        )}
      </div>
    </div>
  );
}
function MaterialDrawer({
  material,
  editable,
  onClose,
  onUseSample,
  onUpload,
}: {
  material: AdmissionMaterial;
  editable: boolean;
  onClose: () => void;
  onUseSample: () => void;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        onClick={onClose}
        aria-label="关闭材料详情"
        className="absolute inset-0 bg-black/25"
      />
      <aside className="relative flex h-full w-full max-w-[580px] flex-col bg-white shadow-xl">
        <header className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <div className="text-[13px] font-semibold text-slate-500">
              主体材料
            </div>
            <h2 className="mt-1 text-[21px] font-semibold">{material.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">
          <MaterialPreview material={material} />
          <div className="mt-5 rounded-md bg-blue-50 p-4 text-[14px] leading-6 text-blue-950">
            <span className="block font-semibold">政府公开样例</span>
            <span className="block">用于说明材料版式与上传范围</span>
          </div>
          <div className="mt-5 rounded-md border border-slate-200 p-4">
            <div className="text-[14px] font-semibold">上传要求</div>
            <div className="mt-2 text-[14px] leading-6 text-slate-600">
              {guideLines(material.key).map(line => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
          <button
            onClick={onClose}
            className="h-10 rounded-md border border-slate-300 px-4 text-[14px] font-semibold"
          >
            关闭
          </button>
          {editable && material.key !== "safety" && (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                }}
              />
              <button
                onClick={onUseSample}
                className="h-10 rounded-md border border-blue-200 bg-blue-50 px-4 text-[14px] font-semibold text-[#1c4c9e]"
              >
                使用公开样例
              </button>
              <button
                onClick={() => inputRef.current?.click()}
                className="flex h-10 items-center gap-2 rounded-md bg-[#245fc4] px-4 text-[14px] font-semibold text-white"
              >
                <Upload className="h-4 w-4" />
                选择本地文件
              </button>
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

export function OrganizerOnboarding({
  state,
  onChange,
  onCreateActivity,
}: {
  state: AdmissionState;
  onChange: (next: AdmissionState) => void;
  onCreateActivity: () => void;
}) {
  const [selectedKey, setSelectedKey] = useState<MaterialKey | null>(null);
  const [error, setError] = useState("");
  const [organizationName, setOrganizationName] = useState(
    state.organizationName
  );
  const [socialCreditCode, setSocialCreditCode] = useState(
    state.socialCreditCode
  );
  const [safetyOfficer, setSafetyOfficer] = useState(state.safetyOfficer);
  const [safetyPhone, setSafetyPhone] = useState(state.safetyPhone);
  const selected =
    state.materials.find(item => item.key === selectedKey) || null;
  const editable = state.status !== "submitted" && state.status !== "approved";
  const [statusTitle, statusText] = statusCopy(state.status);
  const visibleMaterials = state.materials.filter(
    item =>
      item.key !== "authorization" || state.agentIdentity === "authorized_agent"
  );
  const requiredMaterials = visibleMaterials.filter(item => item.required);
  const identityMaterials = visibleMaterials.filter(
    item => item.key === "id_front" || item.key === "id_back"
  );
  const authorizationMaterial = visibleMaterials.find(
    item => item.key === "authorization"
  );
  const licenseMaterial = visibleMaterials.find(item => item.key === "license");
  const remainingMaterials = visibleMaterials.filter(
    item => item.key === "safety" || item.key === "permit"
  );

  const updateMaterial = (
    key: MaterialKey,
    patch: Partial<AdmissionMaterial>
  ) =>
    onChange({
      ...state,
      status:
        state.status === "changes_required"
          ? "changes_required"
          : "materials_draft",
      materials: state.materials.map(item =>
        item.key === key ? { ...item, ...patch } : item
      ),
    });
  const saveRecognizedLicense = (fileName: string, preview: string) => {
    const linkedOrganizationName =
      organizationName.trim() || "新疆新潮文化活动有限公司";
    const linkedSocialCreditCode =
      socialCreditCode.trim() || "91650100MA7QJ2026X";
    setOrganizationName(linkedOrganizationName);
    setSocialCreditCode(linkedSocialCreditCode);
    onChange({
      ...state,
      status: "materials_draft",
      organizationName: linkedOrganizationName,
      socialCreditCode: linkedSocialCreditCode,
      legalRepresentativeName: "穆合塔尔·阿不都热依木",
      establishedAt: "2021-05-18",
      businessTerm: "2021-05-18 至长期",
      registeredAddress: "新疆乌鲁木齐市水磨沟区会展大道 88 号",
      materials: state.materials.map(item =>
        item.key === "license"
          ? {
              ...item,
              fileName,
              preview,
              updatedAt: nowText(),
              status: "已上传",
            }
          : item
      ),
    });
  };
  const useSample = (key: MaterialKey) => {
    if (key === "safety") return;
    if (key === "license") {
      saveRecognizedLicense("license-公开样例.webp", SAMPLE_VISUALS.license);
      return;
    }
    updateMaterial(key, {
      fileName: `${key}-公开样例.webp`,
      preview: SAMPLE_VISUALS[key],
      updatedAt: nowText(),
      status: "已上传",
    });
  };
  const uploadFile = (key: MaterialKey, file: File) => {
    if (file.size > 4 * 1024 * 1024)
      return setError("单个文件请控制在 4MB 以内");
    if (key === "license") {
      saveRecognizedLicense(
        file.name,
        file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
      );
      setError("");
      return;
    }
    updateMaterial(key, {
      fileName: file.name,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      updatedAt: nowText(),
      status: "已上传",
    });
    setError("");
  };
  const saveSafety = () => {
    if (!safetyOfficer.trim() || !/^1\d{10}$/.test(safetyPhone))
      return setError("请填写安全责任人姓名与正确手机号");
    onChange({
      ...state,
      organizationName,
      socialCreditCode,
      safetyOfficer,
      safetyPhone,
      status: "materials_draft",
      materials: state.materials.map(item =>
        item.key === "safety"
          ? {
              ...item,
              fileName: "主体安全责任人信息表.pdf",
              updatedAt: nowText(),
              status: "已上传",
            }
          : item
      ),
    });
    setError("");
  };
  const submit = () => {
    const prepared = {
      ...state,
      organizationName,
      socialCreditCode,
      safetyOfficer,
      safetyPhone,
    };
    if (!canSubmitAdmission(prepared))
      return setError("请填写主体信息并完成全部必填材料");
    onChange(submitAdmission(prepared));
    setError("");
  };
  const renderMaterialCard = (
    item: AdmissionMaterial,
    options?: { embedded?: boolean; license?: boolean }
  ) => (
    <article
      key={item.key}
      data-cy={`admission-material-${item.key}`}
      className={`${options?.embedded ? "min-w-0 p-4" : "rounded-lg border border-slate-200 p-4"} ${options?.license ? "h-fit" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-semibold">{item.name}</h3>
            {!item.required && (
              <span className="whitespace-nowrap rounded bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-600">
                如适用
              </span>
            )}
            {item.key === "authorization" && (
              <span className="whitespace-nowrap rounded bg-blue-50 px-2 py-1 text-[12px] font-semibold text-[#1c4c9e]">
                经办人必填
              </span>
            )}
          </div>
          <p className="mt-2 text-[14px] leading-6 text-slate-600">
            {item.note}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-1 text-[12px] font-semibold ${item.status === "已上传" || item.status === "已核验" ? "bg-emerald-50 text-emerald-700" : item.status === "需补充" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
        >
          {item.status}
        </span>
      </div>
      {item.key === "safety" && editable && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextInput
            label="安全责任人"
            value={safetyOfficer}
            onChange={setSafetyOfficer}
            placeholder="请输入姓名"
          />
          <TextInput
            label="联系电话"
            value={safetyPhone}
            onChange={setSafetyPhone}
            placeholder="请输入手机号"
          />
        </div>
      )}
      {item.fileName && (
        <div className="mt-4 flex items-center gap-3 rounded-md bg-slate-50 p-3">
          <FileCheck2 className="h-5 w-5 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold">
              {item.fileName}
            </div>
            <div className="mt-0.5 text-[12px] text-slate-500">
              {item.updatedAt}
            </div>
          </div>
        </div>
      )}
      {options?.license && item.fileName && (
        <section
          data-cy="license-recognition"
          className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1c4c9e]">
                <BadgeCheck className="h-4 w-4" />
                营业执照信息已自动关联
              </div>
              <div className="mt-1 text-[14px] font-semibold text-slate-900">
                无需再次逐项录入 请核对后直接继续
              </div>
            </div>
            <span className="rounded bg-white px-2 py-1 text-[12px] font-semibold text-[#1c4c9e]">
              识别度 98%
            </span>
          </div>
          <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            {[
              ["主体名称", state.organizationName],
              ["统一社会信用代码", state.socialCreditCode],
              ["法定代表人", state.legalRepresentativeName],
              ["成立日期", state.establishedAt],
              ["营业期限", state.businessTerm],
              ["登记住所", state.registeredAddress],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[12px] font-semibold text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 break-words text-[13px] font-semibold leading-5 text-slate-800">
                  {value || "待识别"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedKey(item.key)}
          className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-[14px] font-semibold"
        >
          <Eye className="h-4 w-4" />
          {item.fileName ? "查看已上传文件" : "查看要求"}
        </button>
        {editable && item.key === "safety" && (
          <button
            onClick={saveSafety}
            className="h-10 rounded-md bg-[#245fc4] px-3 text-[14px] font-semibold text-white"
          >
            保存责任人信息
          </button>
        )}
        {editable && item.key !== "safety" && (
          <>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md bg-[#245fc4] px-3 text-[14px] font-semibold text-white">
              <Upload className="h-4 w-4" />
              {item.key === "license" ? "一键上传并识别" : "选择本地文件"}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) uploadFile(item.key, file);
                }}
              />
            </label>
            <button
              onClick={() => useSample(item.key)}
              className="h-10 rounded-md border border-blue-200 bg-blue-50 px-3 text-[14px] font-semibold text-[#1c4c9e]"
            >
              使用公开样例
            </button>
          </>
        )}
      </div>
    </article>
  );

  return (
    <section className="space-y-6" data-cy="organizer-onboarding">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <Heading
          eyebrow="主办方入驻"
          title="账号认证与主体材料"
          lines={[
            "从注册实名到主体审核按步骤完成",
            "审核通过后开放活动创建与票务配置",
          ]}
        />
        {state.status === "approved" && (
          <button
            onClick={onCreateActivity}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#245fc4] px-5 text-[14px] font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            创建活动
          </button>
        )}
      </div>
      <AdmissionProgress status={state.status} />
      <div
        className={`rounded-lg border p-5 ${state.status === "approved" ? "border-emerald-200 bg-emerald-50" : state.status === "changes_required" ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-[#245fc4]" />
          <div>
            <h2 className="text-[17px] font-semibold">{statusTitle}</h2>
            <p className="mt-1 text-[14px] leading-6 text-slate-700">
              {statusText}
            </p>
            {state.reviewNote && (
              <p className="mt-2 text-[14px] font-semibold text-amber-800">
                平台意见 {state.reviewNote}
              </p>
            )}
          </div>
        </div>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-[18px] font-semibold">实名与主体信息</h2>
          <p className="mt-1 text-[14px] text-slate-600">
            实名信息自动带入 继续补充主体登记信息
          </p>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
          <TextInput
            label="主办方主体名称"
            value={organizationName}
            onChange={setOrganizationName}
            placeholder="请输入主体名称"
          />
          <TextInput
            label="统一社会信用代码"
            value={socialCreditCode}
            onChange={setSocialCreditCode}
            placeholder="请输入统一社会信用代码"
          />
          <div>
            <div className="text-[14px] font-semibold">
              {state.agentIdentity === "legal_representative"
                ? "法定代表人"
                : "被授权经办人"}
            </div>
            <div className="mt-2 flex h-11 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-[14px]">
              {state.realName || "待实名"} ·{" "}
              {state.idNumber
                ? `${state.idNumber.slice(0, 4)}********${state.idNumber.slice(-4)}`
                : "待补充"}
            </div>
          </div>
        </div>
      </section>
      <section
        className="rounded-lg border border-slate-200 bg-white"
        data-cy="material-list"
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-5">
          <div>
            <h2 className="text-[18px] font-semibold">主体材料</h2>
            <p className="mt-1 text-[14px] leading-6 text-slate-600">
              <span className="block">逐项上传并查看实际文件内容</span>
              <span className="block">标注如适用的材料可根据活动性质补充</span>
            </p>
          </div>
          <div className="text-[14px] font-semibold text-slate-600">
            必填完成 {requiredMaterials.filter(item => item.fileName).length} /{" "}
            {requiredMaterials.length}
          </div>
        </div>
        <div className="grid items-start gap-4 p-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
          <section
            data-cy="identity-material-column"
            className="min-w-0 rounded-lg border border-blue-200 bg-blue-50/40 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#1c4c9e]">
                  <IdCard className="h-4 w-4" />
                  身份材料
                </div>
                <h3 className="mt-2 text-[17px] font-semibold">
                  法定代表人身份证
                </h3>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">
                  正面和反面放在同一栏内 分别选择文件即可
                </p>
              </div>
              <span className="rounded bg-blue-100 px-2 py-1 text-[12px] font-semibold text-[#1c4c9e]">
                {state.agentIdentity === "authorized_agent"
                  ? "经办人办理 需授权书"
                  : "本人办理 无需授权书"}
              </span>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <div className="text-[14px] font-semibold">身份证正反面</div>
                  <div className="mt-0.5 text-[12px] text-slate-500">
                    两个上传位属于同一份身份证材料
                  </div>
                </div>
                <span className="text-[12px] font-semibold text-[#1c4c9e]">
                  已完成{" "}
                  {identityMaterials.filter(item => item.fileName).length} / 2
                </span>
              </div>
              <div className="grid divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                {identityMaterials.map(item =>
                  renderMaterialCard(item, { embedded: true })
                )}
              </div>
            </div>
            {authorizationMaterial && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-white">
                {renderMaterialCard(authorizationMaterial, { embedded: true })}
              </div>
            )}
          </section>

          {licenseMaterial && (
            <div data-cy="business-license-column" className="min-w-0">
              {renderMaterialCard(licenseMaterial, { license: true })}
            </div>
          )}

          {remainingMaterials.map(item => renderMaterialCard(item))}
        </div>
        {error && (
          <div className="mx-5 mb-5 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-[14px] text-rose-700">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-5">
          <p className="text-[14px] text-slate-600">
            提交后平台运营人员将收到同一份材料并进行核验
          </p>
          {editable && (
            <button
              onClick={submit}
              data-cy="submit-admission"
              className="flex h-11 items-center gap-2 rounded-md bg-[#245fc4] px-5 text-[14px] font-semibold text-white"
            >
              <Send className="h-4 w-4" />
              提交平台审核
            </button>
          )}
        </div>
      </section>
      {selected && (
        <MaterialDrawer
          material={selected}
          editable={editable}
          onClose={() => setSelectedKey(null)}
          onUseSample={() => useSample(selected.key)}
          onUpload={file => uploadFile(selected.key, file)}
        />
      )}
    </section>
  );
}

function ReviewMaterial({ material }: { material: AdmissionMaterial }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-20 w-full items-center gap-3 rounded-md border border-slate-200 p-3 text-left hover:border-blue-300"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
          {material.preview ? (
            <ImageIcon className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold">{material.name}</div>
          <div className="mt-1 truncate text-[13px] text-slate-500">
            {material.fileName || "未上传"}
          </div>
        </div>
        <span className="text-[13px] font-semibold text-[#245fc4]">查看</span>
      </button>
      {open && (
        <MaterialDrawer
          material={material}
          editable={false}
          onClose={() => setOpen(false)}
          onUseSample={() => undefined}
          onUpload={() => undefined}
        />
      )}
    </>
  );
}
export function AdmissionReview({
  state,
  onChange,
}: {
  state: AdmissionState;
  onChange: (next: AdmissionState) => void;
}) {
  const [note, setNote] = useState(state.reviewNote);
  const canReview = state.status === "submitted";
  const [title, text] = statusCopy(state.status);
  const reviewMaterials = state.materials.filter(
    item =>
      item.key !== "authorization" || state.agentIdentity === "authorized_agent"
  );
  return (
    <section className="space-y-6" data-cy="admission-review">
      <Heading
        eyebrow="平台运营"
        title="主办方入驻审核"
        lines={[
          "查看主办方刚刚提交的同一份实名与材料数据",
          "审核意见会立即回到主办方入驻流程",
        ]}
      />
      {state.status === "not_started" ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-4 text-[19px] font-semibold">暂无待审核主体</h2>
          <p className="mt-2 text-[14px] text-slate-600">
            主办方提交主体材料后将在此处形成审核任务
          </p>
        </div>
      ) : (
        <>
          <AdmissionProgress status={state.status} />
          <section className="rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <h2 className="text-[20px] font-semibold">
                  {state.organizationName || "待补充主体名称"}
                </h2>
                <p className="mt-1 text-[14px] text-slate-600">
                  提交人 {state.realName || "—"} · 手机 {state.phone || "—"} ·
                  提交时间 {state.submittedAt || "—"}
                </p>
              </div>
              <span
                className={`rounded px-3 py-1.5 text-[13px] font-semibold ${state.status === "approved" ? "bg-emerald-50 text-emerald-700" : state.status === "changes_required" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-[#1c4c9e]"}`}
              >
                {title}
              </span>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-md border border-slate-200 p-4">
                  <div className="text-[13px] font-semibold text-slate-500">
                    实名信息
                  </div>
                  <div className="mt-3 space-y-2 text-[14px]">
                    <div>
                      <span className="text-slate-500">
                        {state.agentIdentity === "legal_representative"
                          ? "法定代表人"
                          : "被授权经办人"}
                      </span>
                      <strong className="ml-3">{state.realName || "—"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">办理身份</span>
                      <strong className="ml-3">
                        {state.agentIdentity === "legal_representative"
                          ? "本人办理"
                          : "授权办理"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">证件号</span>
                      <strong className="ml-3">
                        {state.idNumber
                          ? `${state.idNumber.slice(0, 4)}********${state.idNumber.slice(-4)}`
                          : "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">信用代码</span>
                      <strong className="ml-3">
                        {state.socialCreditCode || "—"}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 p-4">
                  <div className="text-[13px] font-semibold text-slate-500">
                    当前处理状态
                  </div>
                  <div className="mt-2 text-[16px] font-semibold">{title}</div>
                  <div className="mt-1 text-[14px] leading-6 text-slate-600">
                    {text}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-[16px] font-semibold">
                  主体材料{" "}
                  {reviewMaterials.filter(item => item.fileName).length} 项
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {reviewMaterials.map(item => (
                    <ReviewMaterial key={item.key} material={item} />
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 p-5">
              <label className="text-[14px] font-semibold">审核意见</label>
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder="填写通过说明或需要补充的具体内容"
                className="mt-2 min-h-24 w-full resize-none rounded-md border border-slate-300 p-3 text-[14px] leading-6 outline-none focus:border-[#245fc4]"
              />
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button
                  disabled={!canReview}
                  onClick={() =>
                    onChange(
                      reviewAdmission(
                        state,
                        false,
                        note || "请补充或更新主体材料"
                      )
                    )
                  }
                  className="h-11 rounded-md border border-amber-300 px-5 text-[14px] font-semibold text-amber-800 disabled:opacity-40"
                >
                  退回补充
                </button>
                <button
                  disabled={!canReview}
                  onClick={() =>
                    onChange(
                      reviewAdmission(state, true, note || "主体材料核验通过")
                    )
                  }
                  data-cy="approve-admission"
                  className="flex h-11 items-center gap-2 rounded-md bg-[#245fc4] px-5 text-[14px] font-semibold text-white disabled:opacity-40"
                >
                  <BadgeCheck className="h-4 w-4" />
                  审核通过
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
      <div className="text-[#245fc4]">{icon}</div>
      <div>
        <div className="text-[12px] text-slate-500">{label}</div>
        <div className="mt-0.5 text-[14px] font-semibold">{value}</div>
      </div>
    </div>
  );
}
export function ActivityCreationWizard({
  approved,
  onBack,
  onFinish,
}: {
  approved: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [ticketName, setTicketName] = useState("普通票");
  const [price, setPrice] = useState("68");
  const [stock, setStock] = useState("2000");
  const [error, setError] = useState("");
  const steps = ["基本信息", "活动资料", "票务设置", "提交发布"];
  const next = () => {
    if (step === 0 && (!name.trim() || !venue.trim() || !date))
      return setError("请完整填写活动名称 时间和场地");
    setError("");
    if (step < 3) setStep(step + 1);
    else onFinish();
  };
  if (!approved)
    return (
      <div className="rounded-lg border border-amber-200 bg-white px-6 py-16 text-center">
        <LockKeyhole className="mx-auto h-10 w-10 text-amber-700" />
        <h1 className="mt-4 text-[22px] font-semibold">
          主体认证通过后才能创建活动
        </h1>
        <p className="mt-2 text-[14px] text-slate-600">
          请先完成实名核验 主体材料上传与平台运营审核
        </p>
        <button
          onClick={onBack}
          className="mt-6 h-11 rounded-md bg-[#245fc4] px-5 text-[14px] font-semibold text-white"
        >
          去完善主体材料
        </button>
      </div>
    );
  return (
    <section
      className="mx-auto max-w-[980px] space-y-6"
      data-cy="activity-creation-wizard"
    >
      <Heading
        eyebrow="活动创建"
        title="新建文化活动"
        lines={["主体认证已通过", "按步骤完善活动资料与票务设置后提交发布"]}
      />
      <div className="grid grid-cols-4 gap-2 rounded-lg border border-slate-200 bg-white p-3">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`rounded-md px-3 py-3 text-center text-[13px] font-semibold ${index === step ? "bg-blue-50 text-[#1c4c9e]" : index < step ? "bg-emerald-50 text-emerald-700" : "text-slate-500"}`}
          >
            0{index + 1} {label}
          </div>
        ))}
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        {step === 0 && (
          <div>
            <h2 className="text-[19px] font-semibold">活动基本信息</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <TextInput
                  label="活动名称"
                  value={name}
                  onChange={setName}
                  placeholder="请输入活动名称"
                />
              </div>
              <TextInput
                label="活动日期"
                value={date}
                onChange={setDate}
                placeholder="请选择日期"
                type="date"
              />
              <TextInput
                label="活动场地"
                value={venue}
                onChange={setVenue}
                placeholder="请输入活动场地"
              />
            </div>
          </div>
        )}
        {step === 1 && (
          <div>
            <h2 className="text-[19px] font-semibold">活动资料</h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              <span className="block">
                上传活动方案 场地证明 安全工作方案和现场平面图
              </span>
              <span className="block">
                此处先建立活动档案 提交后仍可继续补充
              </span>
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "活动方案与内容说明",
                "场所使用证明",
                "安全工作方案",
                "现场平面图",
              ].map(item => (
                <button
                  key={item}
                  className="flex min-h-16 items-center gap-3 rounded-md border border-slate-200 px-4 text-left"
                >
                  <Upload className="h-5 w-5 text-[#245fc4]" />
                  <span className="text-[14px] font-semibold">{item}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <h2 className="text-[19px] font-semibold">票务设置</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <TextInput
                label="票种名称"
                value={ticketName}
                onChange={setTicketName}
                placeholder="例如 普通票"
              />
              <TextInput
                label="票价"
                value={price}
                onChange={setPrice}
                placeholder="0"
              />
              <TextInput
                label="库存"
                value={stock}
                onChange={setStock}
                placeholder="0"
              />
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <h2 className="text-[19px] font-semibold">提交发布</h2>
            <div className="mt-5 rounded-md border border-slate-200 p-5">
              <div className="text-[20px] font-semibold">{name}</div>
              <div className="mt-2 text-[14px] text-slate-600">
                {date} · {venue}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <SummaryItem
                  label="主体认证"
                  value="已通过"
                  icon={<BadgeCheck className="h-5 w-5" />}
                />
                <SummaryItem
                  label="活动资料"
                  value="4 项待归档"
                  icon={<FileText className="h-5 w-5" />}
                />
                <SummaryItem
                  label="票务"
                  value={`${ticketName} ¥${price} / ${stock}张`}
                  icon={<Ticket className="h-5 w-5" />}
                />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-md bg-rose-50 px-4 py-3 text-[14px] text-rose-700">
            {error}
          </div>
        )}
        <div className="mt-7 flex justify-between gap-3">
          <button
            onClick={() => (step === 0 ? onBack() : setStep(step - 1))}
            className="h-11 rounded-md border border-slate-300 px-5 text-[14px] font-semibold"
          >
            {step === 0 ? "返回" : "上一步"}
          </button>
          <button
            onClick={next}
            className="flex h-11 items-center gap-2 rounded-md bg-[#245fc4] px-5 text-[14px] font-semibold text-white"
          >
            {step === 3 ? "提交并发布" : "下一步"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </section>
  );
}
export function ActivityPublished({
  onWorkspace,
  onTickets,
}: {
  onWorkspace: () => void;
  onTickets: () => void;
}) {
  return (
    <div className="mx-auto max-w-[720px] rounded-lg border border-emerald-200 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-[24px] font-semibold">活动已提交发布</h1>
      <p className="mt-2 text-[14px] leading-6 text-slate-600">
        活动档案已建立 可以继续管理活动资料 票种库存和现场工作
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          onClick={onWorkspace}
          className="h-11 rounded-md border border-slate-300 px-5 text-[14px] font-semibold"
        >
          进入活动管理
        </button>
        <button
          onClick={onTickets}
          className="h-11 rounded-md bg-[#245fc4] px-5 text-[14px] font-semibold text-white"
        >
          配置票务
        </button>
      </div>
    </div>
  );
}
export function OnboardingWorkspaceGate({
  state,
  onContinue,
}: {
  state: AdmissionState;
  onContinue: () => void;
}) {
  const [title, text] = statusCopy(state.status);
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-lg border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <UserCheck className="mt-0.5 h-5 w-5 text-[#245fc4]" />
        <div>
          <div className="text-[16px] font-semibold">{title}</div>
          <div className="mt-1 text-[14px] leading-6 text-slate-700">
            {text}
          </div>
        </div>
      </div>
      <button
        onClick={onContinue}
        className="h-10 shrink-0 rounded-md bg-[#245fc4] px-4 text-[14px] font-semibold text-white"
      >
        继续办理
      </button>
    </div>
  );
}
export function ApplicantSummary({ state }: { state: AdmissionState }) {
  const [title] = statusCopy(state.status);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-[#245fc4]" />
        <div>
          <div className="text-[15px] font-semibold">
            {state.organizationName || "新主办方主体"}
          </div>
          <div className="mt-1 text-[13px] text-slate-500">{title}</div>
        </div>
      </div>
    </div>
  );
}
