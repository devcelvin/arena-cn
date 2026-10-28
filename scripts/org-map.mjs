/**
 * org-map.mjs — 厂商中文小注映射 + 国产厂商集合
 * 说明：界面显示厂商英文原名，首次出现处附中文小注；CN_ORGS 用于"国产"高亮。
 */

export const ORG_ZH = {
  Google: '谷歌',
  OpenAI: 'OpenAI',
  Anthropic: 'Anthropic',
  Meta: 'Meta',
  'Meta AI': 'Meta',
  xAI: 'xAI',
  Amazon: '亚马逊',
  AWS: '亚马逊',
  Microsoft: '微软',
  NVIDIA: '英伟达',
  Mistral: 'Mistral',
  'Mistral AI': 'Mistral',
  Cohere: 'Cohere',
  AI21: 'AI21',
  Reka: 'Reka',
  Databricks: 'Databricks',
  'Stability AI': 'Stability AI',
  'Black Forest Labs': '黑森林实验室',
  Recraft: 'Recraft',
  Krea: 'Krea',
  Luma: 'Luma',
  'Luma AI': 'Luma',
  Runway: 'Runway',
  Pika: 'Pika',
  Ideogram: 'Ideogram',
  'Recraft AI': 'Recraft',
  // 国产
  DeepSeek: '深度求索',
  Moonshot: '月之暗面',
  'Moonshot AI': '月之暗面',
  Zhipu: '智谱 AI',
  'Z.ai': '智谱 AI',
  ZhipuAI: '智谱 AI',
  Alibaba: '阿里巴巴',
  Qwen: '通义实验室',
  ByteDance: '字节跳动',
  MiniMax: 'MiniMax',
  StepFun: '阶跃星辰',
  '01.AI': '零一万物',
  Tencent: '腾讯',
  Baidu: '百度',
  Kuaishou: '快手',
  Shengshu: '生数科技',
  Vidu: '生数科技',
  'Shanghai AI Laboratory': '上海人工智能实验室',
  'OpenBMB': '面壁智能',
  ModelBest: '面壁智能',
  InclusiveAI: '潞晨科技',
  'SenseTime': '商汤科技',
  'iFlytek': '科大讯飞',
  // —— CC BY 4.0 数据集（HF lmarena-ai/leaderboard-dataset）里的写法 ——
  // 该数据集 organization 为小写 + 连字符（如 zai / ant-group / luma-ai），
  // 与榜单页的展示写法（Z.ai / Ant Group / Luma AI）不同，靠 orgCanonical 归一化对齐
  'Xiaomi': '小米',
  'Ant Group': '蚂蚁集团',
  'Kling': '快手',
  // —— Artificial Analysis Data API 里的写法（2026-10-28 接入时实测） ——
  // AA 用 model_creator.name，与 LMArena 的 organization 不同；漏一个就漏标「国产」。
  // 该集合与 web/assets/app.js 的副本必须同步，smoke-test 会断言一致。
  'Kimi': '月之暗面',
  'InclusionAI': '蚂蚁集团',      // Ling / Ring 系列；注意区别于潞晨科技的 InclusiveAI
  'ByteDance Seed': '字节跳动',
  'China Mobile': '中国移动',
  'KwaiKAT': '快手',
  'LongCat': '美团',
  'Nanbeige': '南北阁',
};

/** 国产厂商集合（用于金色"国产"徽章高亮） */
export const CN_ORGS = new Set([
  'DeepSeek', 'Moonshot', 'Moonshot AI', 'Zhipu', 'Z.ai', 'ZhipuAI',
  'Alibaba', 'Qwen', 'ByteDance', 'MiniMax', 'StepFun', '01.AI',
  'Tencent', 'Baidu', 'Kuaishou', 'Shengshu', 'Vidu',
  'Shanghai AI Laboratory', 'OpenBMB', 'ModelBest', 'InclusiveAI',
  'SenseTime', 'iFlytek',
  'Xiaomi', 'Ant Group', 'Kling',
  'Kimi', 'InclusionAI', 'ByteDance Seed', 'China Mobile', 'KwaiKAT', 'LongCat', 'Nanbeige',
]);

/**
 * 厂商名归一化：HF 数据集给小写连字符形式（google / zai / ant-group / luma-ai），
 * 本站统一显示 ORG_ZH 里的规范写法（Google / Z.ai / Ant Group / Luma AI）。
 * 未收录的按「首字母大写」兜底，保证界面可读。
 */
const CANON = new Map();
for (const k of Object.keys(ORG_ZH)) CANON.set(k.toLowerCase().replace(/[\s._-]/g, ''), k);

export function orgCanonical(raw) {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (ORG_ZH[s]) return s;
  const hit = CANON.get(s.toLowerCase().replace(/[\s._-]/g, ''));
  if (hit) return hit;
  // 未收录：连字符/空格后首字母大写，其余保持原样
  return s.replace(/(^|[\s-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

export function orgZh(org) {
  if (!org) return '';
  return ORG_ZH[org] || '';
}

export function isCN(org) {
  return !!org && CN_ORGS.has(org);
}
