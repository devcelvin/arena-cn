/**
 * validate.mjs — 榜单数据校验（6 重）
 * 任一 error 即判定该榜单本次失败：不覆盖 latest，写 status.json，前端显示陈旧提示。
 */
export function validateBoard({ boardId, scale, models, prev, votesOptional = false }) {
  const errors = [];
  const warnings = [];

  // 1. 非空
  if (!Array.isArray(models) || models.length === 0) {
    return { errors: ['模型数为 0'], warnings };
  }

  // 2. 与上日数量差异 < 30%
  if (prev && Array.isArray(prev.models) && prev.models.length > 0) {
    const diff = Math.abs(models.length - prev.models.length) / prev.models.length;
    if (diff >= 0.3) {
      errors.push(`模型数异常波动：${prev.models.length} → ${models.length}（${(diff * 100).toFixed(0)}%）`);
    }
  }

  // 3. rank 从 1 升序无重复
  const ranks = models.map((m) => m.rank);
  if (ranks[0] !== 1) errors.push(`rank 未从 1 开始（首个 ${ranks[0]}）`);
  for (let i = 1; i < ranks.length; i++) {
    if (ranks[i] <= ranks[i - 1]) {
      errors.push(`rank 非严格升序（位置 ${i}：${ranks[i - 1]} → ${ranks[i]}）`);
      break;
    }
  }

  // 4. score 量纲区间
  //    ELO：CC BY 4.0 数据集实测全域约 534（文本榜含老模型）–1863（Web 开发榜），故取 [500, 2000]；
  //         原下限 700 是按抓取榜单页时的分布定的，换源后会把真实数据误判为异常。
  //         注：Artificial Analysis 媒体竞技场 ELO 实测 594–1368，同区间可用。
  //    BT ：智能体榜相对分值，实测约 -0.17~+0.18。
  //    index ：AA 智能/编程/数学指数，实测 1.8–58.4，留出余量取 [0, 100]。
  //    rate  ：AA 的 HLE/GPQA 等百分比类评测，原始值为 0–1 小数。
  //    price ：AA 每百万 token 美元价，实测 0–20，留出余量取 [0, 10000]。
  //    speed ：AA 输出吞吐 token/s，实测 1–数百，取 [0, 100000]。
  //    seconds：AA 首字/首答延迟秒，取 [0, 3600]。
  //    date  ：AA 发布日期榜，score 为 YYYYMMDD 整数。
  const RANGES = {
    elo: [500, 2000],
    bt: [-0.5, 1],
    index: [0, 100],
    rate: [0, 1],
    price: [0, 10000],
    speed: [0, 100000],
    seconds: [0, 3600],
    date: [20000101, 21001231],
  };
  const NAMES = {
    elo: 'ELO', bt: 'BT', index: '对齐指数', rate: '百分比',
    price: '价格', speed: '速度', seconds: '秒', date: '日期',
  };
  const range = RANGES[scale] ?? [0, 1];
  const scaleName = NAMES[scale] ?? '胜率';
  const bad = models.filter((m) => !(m.score >= range[0] && m.score <= range[1]));
  if (bad.length) {
    errors.push(`${bad.length} 个模型 score 超出${scaleName}合理区间 [${range}]，首个：${bad[0].name}=${bad[0].score}`);
  }

  // 5. 必填字段完整（org 允许空串，不允许 null）
  //    AA 的 LLM 端点不提供对战次数，这类榜传 votesOptional=true 跳过该项
  const missing = models.filter(
    (m) => !m.key || !m.name || m.score == null || (!votesOptional && m.votes == null) || m.org == null
  );
  if (missing.length) {
    errors.push(`${missing.length} 个模型缺少必填字段，首个：${missing[0].name || missing[0].key}`);
  }

  // 6. top1 环比变化 < 10%（warning，不阻断——新模型登顶属正常）
  if (prev && prev.models && prev.models[0]) {
    const a = models[0].score;
    const b = prev.models[0].score;
    if (b && Math.abs(a - b) / b >= 0.1) {
      warnings.push(`top1 评分变化较大：${b} → ${a}（${(((a - b) / b) * 100).toFixed(1)}%）`);
    }
  }

  return { errors, warnings };
}

/** 主页会话数单调性校验 */
export function validateSession(session, prevSession) {
  if (!session || !session.sessionCount) return { errors: ['缺少会话统计'], warnings: [] };
  if (prevSession && prevSession.sessionCount && session.sessionCount < prevSession.sessionCount) {
    return { errors: [`会话数回退：${prevSession.sessionCount} → ${session.sessionCount}`], warnings: [] };
  }
  return { errors: [], warnings: [] };
}
