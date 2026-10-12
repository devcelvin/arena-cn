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
};

/** 国产厂商集合（用于金色"国产"徽章高亮） */
export const CN_ORGS = new Set([
  'DeepSeek', 'Moonshot', 'Moonshot AI', 'Zhipu', 'Z.ai', 'ZhipuAI',
  'Alibaba', 'Qwen', 'ByteDance', 'MiniMax', 'StepFun', '01.AI',
  'Tencent', 'Baidu', 'Kuaishou', 'Shengshu', 'Vidu',
  'Shanghai AI Laboratory', 'OpenBMB', 'ModelBest', 'InclusiveAI',
  'SenseTime', 'iFlytek',
]);

export function orgZh(org) {
  if (!org) return '';
  return ORG_ZH[org] || '';
}

export function isCN(org) {
  return !!org && CN_ORGS.has(org);
}
