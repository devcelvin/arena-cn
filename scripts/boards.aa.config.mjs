/**
 * boards.aa.config.mjs — Artificial Analysis 版榜单配置
 *
 * ============================ 数据来源与授权 ============================
 * 数据来自 Artificial Analysis 官方免费 Data API：
 *   https://artificialanalysis.ai/api-reference
 *   6 个端点：/data/llms/models + /data/media/{text-to-image,image-editing,
 *             image-to-video,text-to-video,text-to-speech}
 *
 * ⚠️ 授权不是 CC BY：AA 免费 API 的条款是「免费使用 + 必须署名」。
 *    站内必须出现「数据来源 Artificial Analysis」及官网链接（见 SOURCE.attribution）。
 *    免费层限流 1000 请求/天，禁止把 key 写进客户端代码、禁止公开分享 key。
 *
 * ============================ 字段边界（实测） ============================
 * LLM 端点只有 10 个顶层字段：
 *   id / name / slug / release_date / model_creator / evaluations / pricing /
 *   median_output_tokens_per_second / median_time_to_first_token_seconds /
 *   median_time_to_first_answer_token
 * **没有** context_length、没有 modalities、没有开源标识 —— 这些属 Pro 层，
 * 免费 key 拿不到，不要在前端假装有。
 *
 * ============================ 结构 ============================
 * 一级 group（4 个）：智能评测 / 生成竞技场 / 性价比 / 新模型
 * 二级 parent=null（10 个）：参与快照与趋势
 * 三级 parent=二级 id（20 个）：只出 latest，不写快照
 *
 * 与 LMArena 版的关键差异：LMArena 的二级榜是「同一竞技场的总榜」，三级是其
 * 人群/语言切片；AA 没有这种父子分，18 个评测项彼此平铺，模型覆盖率从 715 到
 * 77 不等。因此本配置把「有独立数据的评测项」提为二级榜，其细项挂三级。
 */

export const SOURCE = {
  publisher: 'Artificial Analysis',
  url: 'https://artificialanalysis.ai',
  apiDocs: 'https://artificialanalysis.ai/api-reference',
  license: '免费 API（须署名）',
  licenseUrl: 'https://artificialanalysis.ai/api-reference',
  attribution: '数据来源 Artificial Analysis',
  // 官方要求的署名文案与链接，页脚与各榜详情都要出现
};

export const ENDPOINTS = {
  llm: '/data/llms/models',
  'text-to-image': '/data/media/text-to-image',
  'image-editing': '/data/media/image-editing',
  'image-to-video': '/data/media/image-to-video',
  'text-to-video': '/data/media/text-to-video',
  'text-to-speech': '/data/media/text-to-speech',
};

/**
 * src   ：取哪个端点（ENDPOINTS 的 key）
 * field ：取该记录里的哪个字段作为分数（如 evaluations / pricing）
 * kind  ：'eval'（读 evaluations[field]）| 'price'（读 pricing[field]）|
 *         'speed'（顶层数值字段）| 'elo'（媒体端点的 elo）| 'date'（用发布日期排序）
 * scale ：校验量纲，见 validate.mjs
 * sub   ：二级榜的三级父 id 用 parent 表示，这里只做说明
 */
export const BOARDS = [
  // ======================= 一级：智能评测 =======================
  {
    id: 'aa-intelligence', name: '智能指数 v5.0', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_intelligence_index',
    unit: '分', note: '综合 9 项评测，v5.0 口径；仅部分模型已完成重测',
  },
  {
    id: 'aa-hle', name: 'HLE 人类最后考试', group: '智能评测',
    scale: 'rate', parent: 'aa-intelligence', src: 'llm', kind: 'eval', field: 'hle', unit: '%',
  },
  {
    id: 'aa-gpqa', name: 'GPQA 专家问答', group: '智能评测',
    scale: 'rate', parent: 'aa-intelligence', src: 'llm', kind: 'eval', field: 'gpqa', unit: '%',
  },
  {
    id: 'aa-mmlu-pro', name: 'MMLU-Pro', group: '智能评测',
    scale: 'rate', parent: 'aa-intelligence', src: 'llm', kind: 'eval', field: 'mmlu_pro', unit: '%',
  },
  {
    id: 'aa-lcr', name: 'LCR 长上下文推理', group: '智能评测',
    scale: 'rate', parent: 'aa-intelligence', src: 'llm', kind: 'eval', field: 'lcr', unit: '%',
  },

  {
    id: 'aa-coding', name: '编程指数', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_coding_index', unit: '分',
  },
  {
    id: 'aa-livecodebench', name: 'LiveCodeBench', group: '智能评测',
    scale: 'rate', parent: 'aa-coding', src: 'llm', kind: 'eval', field: 'livecodebench', unit: '%',
  },
  {
    id: 'aa-scicode', name: 'SciCode', group: '智能评测',
    scale: 'rate', parent: 'aa-coding', src: 'llm', kind: 'eval', field: 'scicode', unit: '%',
  },
  {
    id: 'aa-tb-hard', name: 'Terminal-Bench Hard', group: '智能评测',
    scale: 'rate', parent: 'aa-coding', src: 'llm', kind: 'eval', field: 'terminalbench_hard', unit: '%',
  },
  {
    id: 'aa-tb-40', name: 'Terminal-Bench 4.0', group: '智能评测',
    scale: 'rate', parent: 'aa-coding', src: 'llm', kind: 'eval', field: 'terminalbench_v4_0', unit: '%',
  },
  {
    id: 'aa-tb-21', name: 'Terminal-Bench v2.1', group: '智能评测',
    scale: 'rate', parent: 'aa-coding', src: 'llm', kind: 'eval', field: 'terminalbench_v2_1', unit: '%',
  },

  {
    id: 'aa-tau2', name: 'Tau2 工具调用', group: '智能评测',
    scale: 'rate', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'tau2', unit: '%',
    note: 'AA 免费层未提供 Agent 综合指数，以此项作为该域主榜',
  },
  {
    id: 'aa-ifbench', name: 'IFBench 指令遵循', group: '智能评测',
    scale: 'rate', parent: 'aa-tau2', src: 'llm', kind: 'eval', field: 'ifbench', unit: '%',
  },
  {
    id: 'aa-tau-banking', name: 'Tau-Banking 银行场景', group: '智能评测',
    scale: 'rate', parent: 'aa-tau2', src: 'llm', kind: 'eval', field: 'tau_banking', unit: '%',
  },

  {
    id: 'aa-math', name: '数学指数', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_math_index', unit: '分',
  },
  {
    id: 'aa-aime25', name: 'AIME 2025', group: '智能评测',
    scale: 'rate', parent: 'aa-math', src: 'llm', kind: 'eval', field: 'aime_25', unit: '%',
  },
  {
    id: 'aa-math500', name: 'MATH-500', group: '智能评测',
    scale: 'rate', parent: 'aa-math', src: 'llm', kind: 'eval', field: 'math_500', unit: '%',
  },
  {
    id: 'aa-aime', name: 'AIME', group: '智能评测',
    scale: 'rate', parent: 'aa-math', src: 'llm', kind: 'eval', field: 'aime', unit: '%',
  },

  // ======================= 一级：生成竞技场 =======================
  {
    id: 'aa-arena-image', name: '文生图', group: '生成竞技场',
    scale: 'elo', parent: null, snapshot: true,
    src: 'text-to-image', kind: 'elo', unit: 'ELO',
  },
  {
    id: 'aa-arena-image-edit', name: '图像编辑', group: '生成竞技场',
    scale: 'elo', parent: 'aa-arena-image',
    src: 'image-editing', kind: 'elo', unit: 'ELO',
  },
  {
    id: 'aa-arena-video', name: '图生视频', group: '生成竞技场',
    scale: 'elo', parent: null, snapshot: true,
    src: 'image-to-video', kind: 'elo', unit: 'ELO',
  },
  {
    id: 'aa-arena-t2v', name: '文生视频', group: '生成竞技场',
    scale: 'elo', parent: 'aa-arena-video',
    src: 'text-to-video', kind: 'elo', unit: 'ELO',
  },
  {
    id: 'aa-arena-speech', name: '语音合成', group: '生成竞技场',
    scale: 'elo', parent: null, snapshot: true,
    src: 'text-to-speech', kind: 'elo', unit: 'ELO',
    note: '该端点无对战次数与发布日期字段，样本量无法展示',
  },

  // ======================= 一级：性价比 =======================
  {
    id: 'aa-price', name: '混合价格（3:1）', group: '性价比',
    scale: 'price', parent: null, snapshot: true,
    src: 'llm', kind: 'price', field: 'price_1m_blended_3_to_1', unit: 'USD/1M',
    note: '按输入:输出 = 3:1 加权，越低越省',
  },
  {
    id: 'aa-price-input', name: '输入价格', group: '性价比',
    scale: 'price', parent: 'aa-price',
    src: 'llm', kind: 'price', field: 'price_1m_input_tokens', unit: 'USD/1M',
  },
  {
    id: 'aa-price-output', name: '输出价格', group: '性价比',
    scale: 'price', parent: 'aa-price',
    src: 'llm', kind: 'price', field: 'price_1m_output_tokens', unit: 'USD/1M',
  },
  {
    id: 'aa-speed', name: '输出速度', group: '性价比',
    scale: 'speed', parent: null, snapshot: true,
    src: 'llm', kind: 'speed', field: 'median_output_tokens_per_second', unit: 'token/s',
  },
  {
    id: 'aa-ttft', name: '首字延迟', group: '性价比',
    scale: 'seconds', parent: 'aa-speed',
    src: 'llm', kind: 'speed', field: 'median_time_to_first_token_seconds', unit: '秒',
  },
  {
    id: 'aa-ttfa', name: '首答延迟', group: '性价比',
    scale: 'seconds', parent: 'aa-speed',
    src: 'llm', kind: 'speed', field: 'median_time_to_first_answer_token', unit: '秒',
  },

  // ======================= 一级：新模型 =======================
  {
    id: 'aa-new', name: '最新发布', group: '新模型',
    scale: 'date', parent: null, snapshot: true,
    src: 'llm', kind: 'date', field: 'release_date', unit: '',
    note: '按发布日期倒序；解决「模型已发布但站上没有」的滞后',
  },
];

export const GROUP_ORDER = ['智能评测', '生成竞技场', '性价比', '新模型'];
