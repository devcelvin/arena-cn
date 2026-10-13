/**
 * validate.mjs — 榜单数据校验（6 重）
 * 任一 error 即判定该榜单本次失败：不覆盖 latest，写 status.json，前端显示陈旧提示。
 */
export function validateBoard({ boardId, scale, models, prev }) {
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

  // 4. score 量纲区间（实测 ELO 全域约 880–1813；"排除平票"类榜单含老模型可低至 ~768，故下限放到 700；
  //    BT 相对分值约 -0.17~+0.16；index 为智能体对齐指数，实测 0–100）
  const range = scale === 'elo' ? [700, 2000] : scale === 'bt' ? [-0.5, 1] : scale === 'index' ? [0, 100] : [0, 1];
  const scaleName = scale === 'elo' ? 'ELO' : scale === 'bt' ? 'BT' : scale === 'index' ? '对齐指数' : '胜率';
  const bad = models.filter((m) => !(m.score >= range[0] && m.score <= range[1]));
  if (bad.length) {
    errors.push(`${bad.length} 个模型 score 超出${scaleName}合理区间 [${range}]，首个：${bad[0].name}=${bad[0].score}`);
  }

  // 5. 必填字段完整（org 允许空串，不允许 null）
  const missing = models.filter((m) => !m.key || !m.name || m.score == null || m.votes == null || m.org == null);
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
