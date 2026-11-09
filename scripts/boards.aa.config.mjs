/**
 * boards.aa.config.mjs — Artificial Analysis 版榜单配置
 *
 * ============================ 数据来源与授权 ============================
 * 数据来自 Artificial Analysis 官方 **V2 Data API 免费层**：
 *   https://artificialanalysis.ai/data-api/docs
 *
 * 🔴 2026-11-09 迁移：旧 `/api/v2/data/*` 端点已于 2026-11-04 23:59:59 GMT 退役
 *    （返回 410 Gone，迁移说明 https://artificialanalysis.ai/data-api/migrate-v2-data）。
 *    现行 6 个免费端点见下方 ENDPOINTS，API_BASE 在 fetch-aa.mjs 里。
 *    旧 key 继续有效；Pro 端点（去掉 /free）需订阅，实测 403。
 *
 * ⚠️ 授权不是 CC BY：AA 免费 API 的条款是「免费使用 + 必须署名」。
 *    站内必须出现「数据来源 Artificial Analysis」及官网链接（见 SOURCE.attribution）。
 *    免费层限流 **100 请求 / 24h 滚动窗口**（旧文档写的 1000 是 legacy 口径），
 *    禁止把 key 写进客户端代码、禁止公开分享 key。
 *
 * ============================ 免费层字段边界（2026-11-09 实测） ============================
 * LLM 列表 `/language/models/free`：分页 page_size=200、total_pages=4，共 727 条。
 *  顶层：id / name / slug / release_date / model_creator / evaluations /
 *        artificial_analysis_intelligence_index_cost / pricing / performance / performance_v3
 *  evaluations 只有 9 个字段：智能指数 + Coding/Agentic（官方已停发，恒 null）+ 6 个能力指数。
 *    ❌ 旧 18 项 per-benchmark（HLE/GPQA/MMLU-Pro/LCR/LiveCodeBench/SciCode/
 *       Terminal-Bench/Tau2/IFBench/AIME/MATH-500 等）属 Pro 层，免费 key 拿不到，
 *       因此那 17 个细分榜已于 2026-11-09 下线（历史快照仍留在 data-aa/ 归档）。
 *  pricing：只有 input/output/cache_hit/cache_write，**没有** blended_3_to_1（改为本地按 3:1 现算）。
 *  performance：median_output_tokens_per_second / median_time_to_first_token_seconds /
 *               median_time_to_first_answer_token_seconds / median_end_to_end_response_time_seconds。
 *    performance_v3 是 mean_* 口径，统计含义不同，**不混用**（混用会造出假排名）。
 *  媒体 5 端点：无分页，字段只有 id/name/slug/model_creator/elo/ci_95。
 *    ci_95 是数值（±ELO），不再是旧端点的 "-10/10" 字符串；
 *    **没有** appearances（对战次数）与 release_date。
 *
 * ============================ 结构 ============================
 * 一级 group（4 个）：智能评测 / 生成竞技场 / 性价比 / 新模型
 * 二级 parent=null（13 个）：参与快照与趋势
 * 三级 parent=二级 id（6 个）：只出 latest，不写快照
 * 合计 19 个榜，全部有免费层真实数据。
 */

/** 上游契约版本：写进 raw / meta / status，字段换代时用来跳过「数量波动」误判 */
export const CONTRACT_VERSION = 'aa-v2-free-2026-11';

export const SOURCE = {
  publisher: 'Artificial Analysis',
  url: 'https://artificialanalysis.ai',
  apiDocs: 'https://artificialanalysis.ai/data-api/docs',
  license: '免费 API（须署名）',
  licenseUrl: 'https://artificialanalysis.ai/data-api/docs#attribution-and-licensing',
  attribution: '数据来源 Artificial Analysis',
  // 官方要求的署名文案与链接，页脚与各榜详情都要出现
};

/** 相对 API_BASE（https://artificialanalysis.ai/api/v2）的路径 */
export const ENDPOINTS = {
  llm: '/language/models/free',
  'text-to-image': '/media/text-to-image/models/free',
  'image-editing': '/media/image-editing/models/free',
  'image-to-video': '/media/image-to-video/models/free',
  'text-to-video': '/media/text-to-video/models/free',
  'text-to-speech': '/media/text-to-speech/models/free',
};

/**
 * src   ：取哪个端点（ENDPOINTS 的 key）
 * field ：取该记录里的哪个字段作为分数
 * kind  ：'eval'（evaluations[field]）| 'price'（pricing[field]）|
 *         'blended'（按 3:1 现算混合价）| 'speed'（performance[field]）|
 *         'elo'（媒体端点 elo）| 'date'（release_date）
 * scale ：校验量纲，见 validate.mjs
 * parent：二级榜 id（三级榜只出 latest，不写快照/趋势）
 */
export const BOARDS = [
  // ======================= 一级：智能评测（7 个二级榜） =======================
  {
    id: 'aa-intelligence', name: '智能指数 v5.0', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_intelligence_index',
    unit: '分', note: 'AA 智能指数 v5.0 综合口径；免费层仅部分模型已完成重测',
  },
  {
    id: 'aa-cap-finance', name: '金融与会计指数', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_finance_and_accounting_index',
    unit: '分', note: 'AA 六项能力指数之一；缺任一依赖评测的模型为 null，不参与排名',
  },
  {
    id: 'aa-cap-strategy', name: '战略与运营指数', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_strategy_and_ops_index',
    unit: '分', note: 'AA 六项能力指数之一',
  },
  {
    id: 'aa-cap-legal', name: '法律指数', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_legal_index',
    unit: '分', note: 'AA 六项能力指数之一',
  },
  {
    id: 'aa-cap-healthcare', name: '医疗健康指数', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_healthcare_and_medical_index',
    unit: '分', note: 'AA 六项能力指数之一',
  },
  {
    id: 'aa-cap-engineering', name: '工程指数', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_engineering_index',
    unit: '分', note: 'AA 六项能力指数之一',
  },
  {
    id: 'aa-cap-economics', name: '经济指数', group: '智能评测',
    scale: 'index', parent: null, snapshot: true,
    src: 'llm', kind: 'eval', field: 'artificial_analysis_economics_index',
    unit: '分', note: 'AA 六项能力指数之一',
  },

  // ======================= 一级：生成竞技场（3 二级 + 2 三级） =======================
  {
    id: 'aa-arena-image', name: '文生图', group: '生成竞技场',
    scale: 'elo', parent: null, snapshot: true,
    src: 'text-to-image', kind: 'elo', unit: 'ELO',
    note: '免费层只给 ELO 与 ci_95，不提供对战次数与发布日期',
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
  },

  // ======================= 一级：性价比（2 二级 + 4 三级） =======================
  {
    id: 'aa-price', name: '混合价格（3:1）', group: '性价比',
    scale: 'price', parent: null, snapshot: true,
    src: 'llm', kind: 'blended', field: 'blended_3_to_1', unit: 'USD/1M',
    note: '免费层无混合价字段，按 (3×输入价 + 1×输出价)/4 现算；越低越省',
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
    note: '取 performance 的中位吞吐；performance_v3 是均值口径，不混用',
  },
  {
    id: 'aa-ttft', name: '首字延迟', group: '性价比',
    scale: 'seconds', parent: 'aa-speed',
    src: 'llm', kind: 'speed', field: 'median_time_to_first_token_seconds', unit: '秒',
  },
  {
    id: 'aa-ttfa', name: '首答延迟', group: '性价比',
    scale: 'seconds', parent: 'aa-speed',
    src: 'llm', kind: 'speed', field: 'median_time_to_first_answer_token_seconds', unit: '秒',
  },

  // ======================= 一级：新模型（1 二级） =======================
  {
    id: 'aa-new', name: '最新发布', group: '新模型',
    scale: 'date', parent: null, snapshot: true,
    src: 'llm', kind: 'date', field: 'release_date', unit: '',
    note: '按发布日期倒序；免费层列表分 4 页，已翻页合并',
  },
];

export const GROUP_ORDER = ['智能评测', '生成竞技场', '性价比', '新模型'];
