export interface CoserSubmission {
  id: string;
  orderNo: string;
  eventName: string;
  ticketType: 'Coser票' | '普通票';
  price: number;
  realName: string;
  idCardMasked: string;
  phoneMasked: string;
  characterName: string;
  costumeDesc: string;
  referenceImage: string;
  submittedAt: string;
  auditStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  auditReason?: string;
  auditor?: string;
  auditTime?: string;
  riskLevel: 'low' | 'medium' | 'high';
  tags: string[];
}

export interface AccessLog {
  id: string;
  operator: string;
  department: '乌鲁木齐文旅局' | '文化市场综合执法' | '公安治安支队' | '活动主办方安保组';
  action: string;
  targetId: string;
  timestamp: string;
  ip: string;
  reason: string;
}

export const INITIAL_SUBMISSIONS: CoserSubmission[] = [
  {
    id: 'SUB-20260901',
    orderNo: 'ORD1789301148305',
    eventName: '2026 魔都动漫嘉年华 · 乌鲁木齐特别巡回展',
    ticketType: 'Coser票',
    price: 68,
    realName: '张三',
    idCardMasked: '310101******1234',
    phoneMasked: '138****8821',
    characterName: '甘雨',
    costumeDesc: '白色长袍 + 渐变蓝发 + 黑色羊角发箍 + 紫色腰间铃铛与挂饰，无锐利金属',
    referenceImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    submittedAt: '2026-09-18 10:24',
    auditStatus: 'approved',
    riskLevel: 'low',
    tags: ['二次元角色', '无锋利道具', '实名核验通过'],
    auditor: '审核员-林洁 (主办运营)',
    auditTime: '2026-09-18 10:35'
  },
  {
    id: 'SUB-20260902',
    orderNo: 'ORD1789301149112',
    eventName: '2026 丝路数字国风文创新潮博览会',
    ticketType: 'Coser票',
    price: 68,
    realName: '古丽米热·阿布都',
    idCardMasked: '650102******4321',
    phoneMasked: '189****3329',
    characterName: '敦煌伎乐飞天 (国风原创)',
    costumeDesc: '石青色配朱砂红飘带长裙，软质仿真琵琶道具（EVA泡棉材质，无金属刃件），配套发冠',
    referenceImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    submittedAt: '2026-09-18 11:15',
    auditStatus: 'approved',
    riskLevel: 'low',
    tags: ['国风传统文化', '道具已说明材质', '重点推荐项目'],
    auditor: '审核员-陈涛 (文旅直联协同)',
    auditTime: '2026-09-18 11:22'
  },
  {
    id: 'SUB-20260903',
    orderNo: 'ORD1789301150493',
    eventName: '2026 魔都动漫嘉年华 · 乌鲁木齐特别巡回展',
    ticketType: 'Coser票',
    price: 68,
    realName: '李思远',
    idCardMasked: '110105******8901',
    phoneMasked: '136****4410',
    characterName: '机甲重装佣兵',
    costumeDesc: '全身黑色仿战术背心及外骨骼臂甲，手持仿真狙击重弩模型长约1.2米',
    referenceImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
    submittedAt: '2026-09-18 11:42',
    auditStatus: 'flagged',
    riskLevel: 'high',
    tags: ['待查实物长钝器', '疑仿真装备', '转交公安安保协同'],
    auditReason: '道具外观拟真度较高且尺寸超标，需现场安检复验或提前更换软塑安全道具'
  },
  {
    id: 'SUB-20260904',
    orderNo: 'ORD1789301151870',
    eventName: '2026 天山青年数字潮玩嘉年华',
    ticketType: 'Coser票',
    price: 68,
    realName: '何晓晨',
    idCardMasked: '320106******6654',
    phoneMasked: '159****9012',
    characterName: '雷电将军',
    costumeDesc: '紫色印花振袖和服、编发发簪、长刀道具为轻质木质包裹海绵安全鞘',
    referenceImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    submittedAt: '2026-09-18 12:05',
    auditStatus: 'pending',
    riskLevel: 'medium',
    tags: ['刀剑类道具需留验', '实名通过']
  }
];

export const INITIAL_LOGS: AccessLog[] = [
  {
    id: 'LOG-001',
    operator: '王处长 (文旅市场处)',
    department: '乌鲁木齐文旅局',
    action: '调阅试点活动备案及角色申报档案',
    targetId: '魔都动漫嘉年华 (2026-06-28)',
    timestamp: '2026-09-18 09:30',
    ip: '218.31.18.92',
    reason: '例行节前大型文化活动内容导向抽查与名录核对'
  },
  {
    id: 'LOG-002',
    operator: '艾警官 (治安支队大队)',
    department: '公安治安支队',
    action: '调阅高风险/道具待查申报件 (SUB-20260903)',
    targetId: 'ORD1789301150493',
    timestamp: '2026-09-18 11:50',
    ip: '218.31.22.14',
    reason: '现场安检布防研判：机甲道具仿真尺寸核实'
  },
  {
    id: 'LOG-003',
    operator: '系统自动审计日志',
    department: '文化市场综合执法',
    action: '生成活动合规抽查周度数字底册',
    targetId: '乌鲁木齐试点3场活动',
    timestamp: '2026-09-18 12:00',
    ip: '127.0.0.1 (内网堡垒机)',
    reason: '合规留痕自动归档'
  }
];
