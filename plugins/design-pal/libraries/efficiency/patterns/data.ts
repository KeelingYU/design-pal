// 示例数据（示例页共用）
export type Status = '未开始' | '进行中' | '有风险' | '已完成';
export const STATUSES: Status[] = ['未开始', '进行中', '有风险', '已完成'];
export const STATUS_TONE = { 未开始: 'neutral', 进行中: 'primary', 有风险: 'warning', 已完成: 'success' } as const;
export const OWNERS = ['陈思远', '林晓', '王磊', '赵一鸣', '周宁', '孙悦'];

export interface Project { id: string; name: string; desc: string; owner: string; status: Status; progress: number; due: string }

export const seedProjects = (): Project[] =>
  ([
    ['P-128', '官网改版', '首页与产品页视觉升级，统一品牌语言。', '陈思远', '进行中', 68, '2026-10-12'],
    ['P-127', '移动端 2.0', '重构导航与消息中心。', '林晓', '进行中', 42, '2026-11-03'],
    ['P-125', '年度用户调研', '覆盖 1,200 名付费用户的深度访谈。', '王磊', '有风险', 25, '2026-09-30'],
    ['P-121', '客服知识库', '整理 320 条常见问题。', '赵一鸣', '已完成', 100, '2026-09-02'],
    ['P-119', '数据看板重构', '接入实时指标，替换旧报表。', '周宁', '进行中', 81, '2026-10-08'],
    ['P-118', 'Q4 市场活动', '双十一联合推广。', '孙悦', '未开始', 0, '2026-12-01'],
    ['P-116', '支付流程优化', '下单步骤从 5 步减到 3 步。', '陈思远', '有风险', 37, '2026-10-20'],
    ['P-112', '新员工入职手册', 'Onboarding guide v3', '林晓', '已完成', 100, '2026-08-28'],
    ['P-109', '权限系统升级', '支持按项目分配角色。', '周宁', '进行中', 55, '2026-11-15'],
    ['P-104', 'API 文档站', 'Developer portal & SDK docs', '赵一鸣', '未开始', 0, '2026-12-20']
  ] as const).map(([id, name, desc, owner, status, progress, due]) => ({ id, name, desc, owner, status, progress, due }));
