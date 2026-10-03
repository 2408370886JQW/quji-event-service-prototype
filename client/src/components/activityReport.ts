/**
 * 活动摘要报告（React 与 Vue3 工程共用）
 * buildActivityReport 生成结构化报告：页面预览与 Word 导出使用同一份数据，保证内容一致。
 * downloadReportDocx 按需加载 docx 库生成 .docx 文件。
 */
import {
  onsiteStats,
  opsNow,
  sessionLabel,
  type ActivityOpsState,
  type OpsActor,
} from "./activityOpsCore";

export const LIFECYCLE = [
  "活动创建",
  "资料准备",
  "信息核验",
  "售票中",
  "活动进行中",
  "活动结束",
  "归档完成",
];

export interface ReportEventInput {
  id: string;
  name: string;
  subtitle: string;
  date: string;
  venue: string;
  organizer: string;
  stageIndex: number;
  tickets: number;
  checkedIn: number;
  pending: number;
}
export interface ReportStockRow {
  name: string;
  price: number;
  inventory: number;
  sold: number;
  refunded: number;
  remaining: number;
  status: string;
  purchaseLimit: number;
  realName: boolean;
}
export interface ReportRefund {
  requestNo: string;
  buyerName: string;
  ticketName: string;
  ticketCode: string;
  amount: number;
  reason: string;
  status: "pending_review" | "refunded" | "rejected";
  processedBy?: string;
}
export interface ReportSubmission {
  participant: string;
  role: string;
  source: string;
  riskLabel: string;
  statusLabel: string;
}
export interface ReportInput {
  event: ReportEventInput;
  /** 是否为已接入运行数据的活动（其余活动仅输出基础档案） */
  primary: boolean;
  stock: { session: string; rows: ReportStockRow[] }[];
  refunds: ReportRefund[];
  submissions: ReportSubmission[];
  ops: ActivityOpsState;
  actor: OpsActor;
  now?: string;
}

export interface ReportMetric {
  label: string;
  value: string;
  note?: string;
  tone?: "normal" | "warn";
}
export interface ReportTable {
  headers: string[];
  rows: string[][];
  /** 每列宽度占比 合计 100 */
  widths?: number[];
}
export interface ReportSection {
  id: string;
  title: string;
  intro?: string;
  metrics?: ReportMetric[];
  table?: ReportTable;
  bullets?: string[];
  empty?: string;
}
export interface ActivityReport {
  fileName: string;
  title: string;
  subtitle: string;
  stage: string;
  generatedAt: string;
  generatedBy: string;
  meta: { label: string; value: string }[];
  highlights: ReportMetric[];
  sections: ReportSection[];
}

const n = (value: number) => value.toLocaleString("zh-CN");
const money = (value: number) => `¥${value.toLocaleString("zh-CN")}`;
const pct = (part: number, total: number) =>
  total ? `${((part / total) * 100).toFixed(1)}%` : "—";
const REFUND_LABEL = {
  pending_review: "待平台审批",
  refunded: "已同意并退款",
  rejected: "已驳回",
} as const;

export function buildActivityReport(input: ReportInput): ActivityReport {
  const { event, ops, primary } = input;
  const now = input.now ?? opsNow();
  const stage = LIFECYCLE[event.stageIndex] ?? LIFECYCLE[0];
  const allRows = input.stock.flatMap(item => item.rows);
  const sold = allRows.reduce((sum, row) => sum + row.sold, 0);
  const revenue = allRows.reduce((sum, row) => sum + row.sold * row.price, 0);
  const inventory = allRows.reduce((sum, row) => sum + row.inventory, 0);
  const refunded = input.refunds.filter(item => item.status === "refunded");
  const refundPending = input.refunds.filter(
    item => item.status === "pending_review"
  );
  const refundAmount = refunded.reduce((sum, item) => sum + item.amount, 0);
  const sessions = input.stock.map(item => item.session);
  const onsite = sessions.map(session => ({
    session,
    ...onsiteStats(ops, session),
  }));
  const entered = primary
    ? onsite.reduce((sum, item) => sum + item.entered, 0)
    : event.checkedIn;
  const totalTickets = primary ? sold : event.tickets;
  const realName = primary
    ? onsite.reduce((sum, item) => sum + item.realName, 0)
    : event.checkedIn;
  const openIssues = primary
    ? ops.issues.filter(item => item.status !== "已完成")
    : [];
  const exceptions = primary
    ? ops.issues.filter(item => item.source === "现场异常")
    : [];
  const readyMaterials = primary
    ? ops.materials.filter(item => item.versions.length > 0)
    : [];
  const requiredMaterials = primary
    ? ops.materials.filter(item => !item.conditional)
    : [];
  const staffTotal = ops.units.reduce((sum, unit) => sum + unit.count, 0);
  const staffVerified = ops.units.reduce((sum, unit) => sum + unit.verified, 0);

  const highlights: ReportMetric[] = [
    {
      label: "已售票",
      value: `${n(totalTickets)} 张`,
      note: primary ? `售票金额 ${money(revenue)}` : undefined,
    },
    {
      label: "实名完成",
      value: `${n(realName)} 人`,
      note: totalTickets ? `实名率 ${pct(realName, totalTickets)}` : undefined,
    },
    {
      label: "现场入场",
      value: `${n(entered)} 人`,
      note: totalTickets ? `入场率 ${pct(entered, totalTickets)}` : undefined,
    },
    {
      label: "待处理问题",
      value: `${openIssues.length} 项`,
      note: `现场异常 ${exceptions.filter(item => item.status !== "已完成").length} 项`,
      tone: openIssues.length ? "warn" : "normal",
    },
  ];

  const sections: ReportSection[] = [];
  sections.push({
    id: "basic",
    title: "一 活动基本信息",
    table: {
      headers: ["项目", "内容"],
      widths: [26, 74],
      rows: [
        ["活动名称", `${event.name} ${event.subtitle}`],
        ["活动编号", event.id],
        ["活动时间", event.date],
        ["活动地点", event.venue],
        ["主办方", event.organizer],
        ["当前阶段", stage],
        ...(primary
          ? [
              ["场地额定容量", `${n(Number(ops.filing.capacity) || 0)} 人`],
              ["拟参加活动人数", `${n(Number(ops.filing.expected) || 0)} 人`],
              ["活动内容", ops.filing.content],
              [
                "备案信息更新",
                `${ops.filing.updatedAt} ${ops.filing.updatedBy}`,
              ],
            ]
          : []),
      ],
    },
  });

  sections.push({
    id: "lifecycle",
    title: "二 活动生命周期",
    table: {
      headers: ["阶段", "状态"],
      widths: [40, 60],
      rows: LIFECYCLE.map((label, index) => [
        label,
        index < event.stageIndex
          ? "已完成"
          : index === event.stageIndex
            ? "当前阶段"
            : "待进行",
      ]),
    },
    bullets: primary
      ? [
          `待处理事项 ${openIssues.length ? openIssues.map(item => item.title).join(" ") : "无"}`,
          `退款待审批 ${refundPending.length} 笔`,
        ]
      : [`待处理事项 ${event.pending} 项`],
  });

  sections.push({
    id: "tickets",
    title: "三 票务与场次",
    intro: primary
      ? `共 ${sessions.length} 个场次 总库存 ${n(inventory)} 张 已售 ${n(sold)} 张 售票金额 ${money(revenue)}`
      : undefined,
    table:
      primary && allRows.length
        ? {
            headers: [
              "场次",
              "票种",
              "票价",
              "库存",
              "已售",
              "已退款",
              "剩余",
              "销售状态",
              "每人限购",
            ],
            widths: [11, 17, 8, 9, 9, 9, 9, 14, 14],
            rows: input.stock.flatMap(item =>
              item.rows.map(row => [
                sessionLabel(item.session),
                row.name,
                money(row.price),
                n(row.inventory),
                n(row.sold),
                n(row.refunded),
                n(row.remaining),
                row.status,
                `${row.purchaseLimit} 张${row.realName ? " 实名" : ""}`,
              ])
            ),
          }
        : undefined,
    empty: primary
      ? undefined
      : event.tickets
        ? `已售票 ${n(event.tickets)} 张`
        : "尚未开售",
  });

  sections.push({
    id: "refunds",
    title: "四 退款处理",
    intro: primary
      ? `退款申请 ${input.refunds.length} 笔 已同意并退款 ${refunded.length} 笔 ${money(refundAmount)} 待平台审批 ${refundPending.length} 笔`
      : undefined,
    table:
      primary && input.refunds.length
        ? {
            headers: [
              "申请号",
              "购票人",
              "票种",
              "金额",
              "退款原因",
              "处理状态",
            ],
            widths: [19, 14, 16, 9, 20, 22],
            rows: input.refunds.map(item => [
              item.requestNo,
              item.buyerName,
              item.ticketName,
              money(item.amount),
              item.reason,
              item.processedBy
                ? `${REFUND_LABEL[item.status]} ${item.processedBy}`
                : REFUND_LABEL[item.status],
            ]),
          }
        : undefined,
    empty: primary ? undefined : "暂无退款记录",
  });

  const checkRows = primary
    ? ops.checkins
        .filter(item => !item.seeded)
        .slice(0, 20)
        .map(item => [
          item.time.slice(5),
          item.holder,
          item.code,
          item.method,
          item.result,
          item.reason,
        ])
    : [];
  sections.push({
    id: "onsite",
    title: "五 现场入场与核验",
    metrics: primary
      ? onsite.map(item => ({
          label: `${sessionLabel(item.session)} 入场`,
          value: `${n(item.entered)} 人`,
          note: `拦截 ${item.blocked} 次`,
        }))
      : [{ label: "现场入场", value: `${n(event.checkedIn)} 人` }],
    table: checkRows.length
      ? {
          headers: ["时间", "持票人", "电子票", "方式", "结果", "说明"],
          widths: [13, 13, 21, 11, 8, 34],
          rows: checkRows,
        }
      : undefined,
    empty:
      primary && !checkRows.length
        ? "本次报告期内暂无新增现场核验记录"
        : undefined,
  });

  sections.push({
    id: "costumes",
    title: "六 角色服装道具审核",
    intro: primary
      ? `本场 Coser 申报 326 份 当前审核队列 ${input.submissions.length} 份`
      : undefined,
    table:
      primary && input.submissions.length
        ? {
            headers: ["参与人", "角色", "作品来源", "风险", "审核状态"],
            widths: [18, 20, 24, 16, 22],
            rows: input.submissions.map(item => [
              item.participant,
              item.role,
              item.source,
              item.riskLabel,
              item.statusLabel,
            ]),
          }
        : undefined,
    empty: primary ? undefined : "暂无角色服装道具申报",
  });

  sections.push({
    id: "materials",
    title: "七 活动资料",
    intro: primary
      ? `必备材料 ${requiredMaterials.length} 项 已上传版本 ${readyMaterials.length} 项`
      : undefined,
    table: primary
      ? {
          headers: ["材料名称", "分类", "状态", "当前版本", "更新时间"],
          widths: [32, 14, 14, 14, 26],
          rows: ops.materials.map(item => [
            item.conditional ? `${item.name}（如适用）` : item.name,
            item.group,
            item.status,
            item.versions[0]?.version ?? "—",
            item.update,
          ]),
        }
      : undefined,
    empty: primary ? undefined : "活动资料按活动阶段归集",
  });

  sections.push({
    id: "issues",
    title: "八 问题记录与现场异常",
    intro: primary
      ? `共 ${ops.issues.length} 项 处理中或待处理 ${openIssues.length} 项`
      : undefined,
    table:
      primary && ops.issues.length
        ? {
            headers: ["编号", "等级", "问题", "来源", "责任方", "状态"],
            widths: [15, 8, 31, 12, 18, 16],
            rows: ops.issues.map(item => [
              item.no,
              item.level,
              item.title,
              item.source,
              item.owner,
              item.status,
            ]),
          }
        : undefined,
    empty: primary ? undefined : "暂无问题记录",
  });

  sections.push({
    id: "staff",
    title: "九 参展商与工作人员",
    intro: primary
      ? `共 ${n(staffTotal)} 人 资料已核验 ${n(staffVerified)} 人`
      : undefined,
    table: primary
      ? {
          headers: ["单位", "人员类型", "人数", "资料已核验"],
          widths: [40, 24, 18, 18],
          rows: ops.units.map(unit => [
            unit.name,
            unit.type,
            n(unit.count),
            n(unit.verified),
          ]),
        }
      : undefined,
    empty: primary ? undefined : "暂无工作人员登记",
  });

  sections.push({
    id: "archive",
    title: "十 档案归集",
    table: {
      headers: ["归档内容", "状态"],
      widths: [70, 30],
      rows: [
        [
          "活动资料与材料版本",
          primary ? `${readyMaterials.length} 项已归集` : "已归集",
        ],
        ["票务 订单 退款 电子票核验汇总", "已归集"],
        ["参与人员脱敏汇总与现场入场记录", "已归集"],
        [
          "问题记录 异常核验与处置过程",
          openIssues.length ? "持续更新" : "已归集",
        ],
        [
          "活动复盘摘要与操作日志",
          ops.archive.summaryAt ? `已生成 ${ops.archive.summaryAt}` : "待生成",
        ],
      ],
    },
  });

  sections.push({
    id: "notes",
    title: "数据口径说明",
    bullets: [
      "已售为支付成功张数 已退款为平台同意并原路退款的张数 剩余等于库存减已售加已退款",
      "入场人数按电子票首次核验通过计算 重复核验与拦截不计入",
      "报告中的个人信息已脱敏 完整实名信息仅在授权页面按需查看",
      "本报告为活动协同记录 不代表行政机关审批结论",
    ],
  });

  const meta = [
    { label: "活动编号", value: event.id },
    { label: "活动时间", value: event.date },
    { label: "活动地点", value: event.venue },
    { label: "主办方", value: event.organizer },
  ];
  return {
    fileName: `${event.id}_活动摘要_${now.slice(0, 10).replace(/-/g, "")}.docx`,
    title: event.name,
    subtitle: event.subtitle,
    stage,
    generatedAt: now,
    generatedBy: `${input.actor.name} · ${input.actor.role}`,
    meta,
    highlights,
    sections,
  };
}

const BRAND = "5552B4";
const INK = "2B2350";
const MUTED = "6B6790";
const LINE = "DCDAF5";
const HEAD_FILL = "EEEDFE";

/** 生成 Word 活动摘要并下载 */
export async function downloadReportDocx(report: ActivityReport) {
  const blob = await buildReportDocx(report);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = report.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function buildReportDocx(report: ActivityReport): Promise<Blob> {
  const d = await import("docx");
  const font = {
    ascii: "Arial",
    hAnsi: "Arial",
    eastAsia: "Microsoft YaHei",
    cs: "Arial",
  };
  const text = (
    value: string,
    options: { bold?: boolean; color?: string; size?: number } = {}
  ) =>
    new d.TextRun({
      text: value,
      font,
      bold: options.bold,
      color: options.color ?? INK,
      size: options.size ?? 21,
    });
  const para = (
    runs: InstanceType<typeof d.TextRun>[],
    options: { before?: number; after?: number; center?: boolean } = {}
  ) =>
    new d.Paragraph({
      children: runs,
      alignment: options.center ? d.AlignmentType.CENTER : undefined,
      spacing: {
        before: options.before ?? 0,
        after: options.after ?? 80,
        line: 320,
      },
    });
  const border = { style: d.BorderStyle.SINGLE, size: 4, color: LINE };
  const borders = {
    top: border,
    bottom: border,
    left: border,
    right: border,
    insideHorizontal: border,
    insideVertical: border,
  };
  const cell = (
    value: string,
    options: {
      head?: boolean;
      width?: number;
      fill?: string;
      bold?: boolean;
      color?: string;
      size?: number;
    } = {}
  ) =>
    new d.TableCell({
      width:
        options.width !== undefined
          ? { size: options.width, type: d.WidthType.PERCENTAGE }
          : undefined,
      shading:
        options.head || options.fill
          ? {
              type: d.ShadingType.CLEAR,
              color: "auto",
              fill: options.fill ?? HEAD_FILL,
            }
          : undefined,
      margins: { top: 70, bottom: 70, left: 110, right: 110 },
      verticalAlign: d.VerticalAlign.CENTER,
      children: [
        new d.Paragraph({
          spacing: { before: 0, after: 0, line: 300 },
          children: [
            text(value, {
              bold: options.head || options.bold,
              color: options.color ?? (options.head ? "432F6C" : INK),
              size: options.size ?? 19,
            }),
          ],
        }),
      ],
    });
  const table = (data: ReportTable) =>
    new d.Table({
      width: { size: 100, type: d.WidthType.PERCENTAGE },
      borders,
      rows: [
        new d.TableRow({
          tableHeader: true,
          children: data.headers.map((header, index) =>
            cell(header, { head: true, width: data.widths?.[index] })
          ),
        }),
        ...data.rows.map(
          row =>
            new d.TableRow({
              cantSplit: true,
              children: row.map((value, index) =>
                cell(value, { width: data.widths?.[index] })
              ),
            })
        ),
      ],
    });
  const metricTable = (metrics: ReportMetric[]) =>
    new d.Table({
      width: { size: 100, type: d.WidthType.PERCENTAGE },
      borders,
      rows: [
        new d.TableRow({
          children: metrics.map(
            metric =>
              new d.TableCell({
                width: {
                  size: Math.floor(100 / metrics.length),
                  type: d.WidthType.PERCENTAGE,
                },
                shading: {
                  type: d.ShadingType.CLEAR,
                  color: "auto",
                  fill: metric.tone === "warn" ? "FFF4E5" : "F6F5FF",
                },
                margins: { top: 120, bottom: 120, left: 140, right: 140 },
                children: [
                  new d.Paragraph({
                    spacing: { after: 40 },
                    children: [text(metric.label, { color: MUTED, size: 18 })],
                  }),
                  new d.Paragraph({
                    spacing: { after: 30 },
                    children: [
                      text(metric.value, {
                        bold: true,
                        size: 30,
                        color: metric.tone === "warn" ? "B45309" : BRAND,
                      }),
                    ],
                  }),
                  ...(metric.note
                    ? [
                        new d.Paragraph({
                          spacing: { after: 0 },
                          children: [
                            text(metric.note, { color: MUTED, size: 17 }),
                          ],
                        }),
                      ]
                    : []),
                ],
              })
          ),
        }),
      ],
    });

  const body: (
    | InstanceType<typeof d.Paragraph>
    | InstanceType<typeof d.Table>
  )[] = [
    para(
      [text("趣集 · 活动数字档案", { color: BRAND, bold: true, size: 20 })],
      {
        after: 120,
      }
    ),
    para([text(report.title, { bold: true, size: 40 })], { after: 60 }),
    para([text(report.subtitle, { color: MUTED, size: 26 })], { after: 160 }),
    para(
      [
        text("活动摘要报告", { bold: true, color: BRAND, size: 24 }),
        text(`    当前阶段 ${report.stage}`, { color: INK, size: 21 }),
      ],
      { after: 80 }
    ),
    para(
      [
        text(`生成时间 ${report.generatedAt}    生成人 ${report.generatedBy}`, {
          color: MUTED,
          size: 18,
        }),
      ],
      { after: 200 }
    ),
    table({
      headers: ["项目", "内容"],
      widths: [22, 78],
      rows: report.meta.map(item => [item.label, item.value]),
    }),
    para([text("")], { after: 120 }),
    metricTable(report.highlights),
  ];
  report.sections.forEach(section => {
    body.push(
      new d.Paragraph({
        heading: d.HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 120 },
        children: [text(section.title, { bold: true, size: 26, color: BRAND })],
      })
    );
    if (section.intro)
      body.push(para([text(section.intro, { color: INK })], { after: 120 }));
    if (section.metrics?.length) {
      body.push(metricTable(section.metrics));
      body.push(para([text("")], { after: 80 }));
    }
    if (section.table) body.push(table(section.table));
    if (section.empty)
      body.push(para([text(section.empty, { color: MUTED })], { after: 80 }));
    section.bullets?.forEach(item =>
      body.push(
        new d.Paragraph({
          bullet: { level: 0 },
          spacing: { before: 40, after: 40, line: 320 },
          children: [text(item, { size: 20 })],
        })
      )
    );
  });

  const doc = new d.Document({
    creator: "趣集",
    title: `${report.title} 活动摘要`,
    description: "趣集文化活动协同管理平台 活动摘要报告",
    styles: {
      default: {
        document: { run: { font, size: 21, color: INK } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, bottom: 1100, left: 1100, right: 1100 },
          },
        },
        headers: {
          default: new d.Header({
            children: [
              new d.Paragraph({
                alignment: d.AlignmentType.RIGHT,
                children: [
                  text(`${report.title} · 活动摘要`, {
                    color: MUTED,
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new d.Footer({
            children: [
              new d.Paragraph({
                alignment: d.AlignmentType.CENTER,
                children: [
                  new d.TextRun({
                    font,
                    size: 16,
                    color: MUTED,
                    children: [
                      "趣集文化活动协同管理平台    第 ",
                      d.PageNumber.CURRENT,
                      " 页 共 ",
                      d.PageNumber.TOTAL_PAGES,
                      " 页",
                    ],
                  }),
                ],
              }),
            ],
          }),
        },
        children: body,
      },
    ],
  });
  return d.Packer.toBlob(doc);
}
