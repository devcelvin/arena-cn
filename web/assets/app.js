/* ============================================================
   app.js — 公共逻辑 + 首页/榜单页渲染
   数据全部来自本地静态 JSON（web/data/），无任何运行时外部依赖
   ============================================================ */

/* ---------- 厂商中文映射（与 scripts/org-map.mjs 保持一致） ---------- */
const ORG_ZH = {
  Google: '谷歌', OpenAI: 'OpenAI', Anthropic: 'Anthropic', Meta: 'Meta',
  'Meta AI': 'Meta', xAI: 'xAI', Amazon: '亚马逊', AWS: '亚马逊',
  Microsoft: '微软', NVIDIA: '英伟达', Mistral: 'Mistral', 'Mistral AI': 'Mistral',
  Cohere: 'Cohere', AI21: 'AI21', Reka: 'Reka', Databricks: 'Databricks',
  'Stability AI': 'Stability AI', 'Black Forest Labs': '黑森林实验室',
  Recraft: 'Recraft', Krea: 'Krea', Luma: 'Luma', 'Luma AI': 'Luma',
  Runway: 'Runway', Pika: 'Pika', Ideogram: 'Ideogram', 'Recraft AI': 'Recraft',
  DeepSeek: '深度求索', Moonshot: '月之暗面', 'Moonshot AI': '月之暗面',
  Zhipu: '智谱 AI', 'Z.ai': '智谱 AI', ZhipuAI: '智谱 AI',
  Alibaba: '阿里巴巴', Qwen: '通义实验室', ByteDance: '字节跳动',
  MiniMax: 'MiniMax', StepFun: '阶跃星辰', '01.AI': '零一万物',
  Tencent: '腾讯', Baidu: '百度', Kuaishou: '快手', Shengshu: '生数科技',
  Vidu: '生数科技', 'Shanghai AI Laboratory': '上海人工智能实验室',
  OpenBMB: '面壁智能', ModelBest: '面壁智能', InclusiveAI: '潞晨科技',
  SenseTime: '商汤科技', iFlytek: '科大讯飞',
};
const CN_ORGS = new Set([
  'DeepSeek', 'Moonshot', 'Moonshot AI', 'Zhipu', 'Z.ai', 'ZhipuAI',
  'Alibaba', 'Qwen', 'ByteDance', 'MiniMax', 'StepFun', '01.AI',
  'Tencent', 'Baidu', 'Kuaishou', 'Shengshu', 'Vidu',
  'Shanghai AI Laboratory', 'OpenBMB', 'ModelBest', 'InclusiveAI',
  'SenseTime', 'iFlytek',
]);

const SCALE_LABEL = { elo: 'ELO 评分', bt: '相对战力值' };
const SCALE_HINT = {
  elo: 'ELO 为相对战力分，分数越高代表对战表现越强；± 为 95% 置信区间。',
  bt: '相对战力值基于 Bradley-Terry 模型，0 = 平均水平，正值表示优于平均，按百分比展示。',
};

/* ---------- 工具 ---------- */
const $ = (s, el = document) => el.querySelector(s);
const fmtNum = (n) => (n == null ? '—' : n.toLocaleString('zh-CN'));
const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fmtPrice = (p) => (p == null ? '—' : '$' + (p < 1 ? p.toFixed(2) : p.toFixed(2)));
const fmtCtx = (n) => {
  if (n == null) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 ? 1 : 0) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function scoreText(m, scale) {
  if (scale === 'bt') {
    const v = (m.score * 100).toFixed(1);
    return (m.score > 0 ? '+' : '') + v + '%';
  }
  return m.score == null ? '—' : String(Math.round(m.score * 10) / 10);
}
function ciText(m, scale) {
  if (m.scoreUpper == null || m.scoreLower == null) return '';
  if (scale === 'bt') {
    const up = ((m.scoreUpper - m.score) * 100).toFixed(1);
    const lo = ((m.score - m.scoreLower) * 100).toFixed(1);
    return `+${up}% / -${lo}%`;
  }
  const up = Math.round(m.scoreUpper - m.score);
  const lo = Math.round(m.score - m.scoreLower);
  return `±${Math.max(up, lo)}`;
}

async function fetchJson(p) {
  const r = await fetch(p, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${p} → HTTP ${r.status}`);
  return r.json();
}

/* ---------- 主题 ---------- */
function initTheme() {
  const saved = localStorage.getItem('arena-theme');
  if (saved) document.documentElement.dataset.theme = saved;
  const btn = $('#theme-toggle');
  if (btn) {
    const sync = () => {
      const dark = document.documentElement.dataset.theme === 'dark' ||
        (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      btn.textContent = dark ? '☀️ 浅色' : '🌙 深色';
    };
    sync();
    btn.addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme === 'dark' ||
        (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      localStorage.setItem('arena-theme', document.documentElement.dataset.theme);
      sync();
    });
  }
}

/* ---------- 通用片段 ---------- */
function freshbarHtml(status) {
  if (!status) return '';
  const t = status.lastSuccess ? fmtTime(status.lastSuccess) : '—';
  const s = status.session;
  const sessionPart = s
    ? `<span>全球累计对战 <b>${fmtNum(s.sessionCount)}</b> 场</span>
       <span>最近一小时 <b>${fmtNum(s.sessionsLastHour)}</b> 场</span>`
    : '';
  return `<div class="freshbar ${status.stale ? 'stale' : ''}">
    <span><span class="dot"></span>数据更新至 <b>${t}</b>（北京时间）</span>
    ${sessionPart}
    <span>数据来源 <b>arena.ai</b>，每日自动抓取</span>
  </div>${status.stale ? '<div class="banner-warn">⚠️ 数据可能过期：自动抓取已多日未成功，以下展示的是最后一次成功抓取的数据。</div>' : ''}`;
}

function rankCell(rank) {
  if (rank <= 3) return `<span class="rank rank-${rank}">${rank}</span>`;
  return `<span class="rank rank-n">${rank}</span>`;
}

function modelCell(m) {
  const cn = CN_ORGS.has(m.org);
  const zh = ORG_ZH[m.org];
  const link = m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>` : esc(m.name);
  const pre = m.releaseType === 'pre_release' ? '<span class="badge badge-pre">预览版</span>' : '';
  const lic = m.license && m.license !== 'Proprietary' ? `<span class="badge badge-license">${esc(m.license)}</span>` : '';
  return `<div class="model-cell">
    <span class="nm">${link}${pre}${lic}${cn ? '<span class="badge badge-cn">国产</span>' : ''}</span>
    <span class="org">${esc(m.org || '未知厂商')}${zh ? ` <span class="zh">· ${esc(zh)}</span>` : ''}</span>
  </div>`;
}

function boardTable(models, scale, opts = {}) {
  const showExpand = opts.limit && models.length > opts.limit;
  const visible = showExpand ? models.slice(0, opts.limit) : models;
  const priceCols = scale === 'bt' ? '' : `<th>输入价</th><th>输出价</th><th>上下文</th>`;
  const costCol = scale === 'bt' ? '<th>单任务成本</th>' : '';
  const rows = visible.map((m) => {
    const cn = CN_ORGS.has(m.org);
    const priceCells = scale === 'bt'
      ? `<td class="price num" data-label="单任务成本">${m.costPerTask == null ? '—' : '$' + m.costPerTask.toFixed(2)}</td>`
      : `<td class="price num" data-label="输入价">${fmtPrice(m.inputPrice)}</td>
         <td class="price num" data-label="输出价">${fmtPrice(m.outputPrice)}</td>
         <td class="ctx num" data-label="上下文">${fmtCtx(m.contextLength)}</td>`;
    return `<tr class="${cn ? 'cn-row' : ''}">
      <td class="rank" data-label="排名">${rankCell(m.rank)}</td>
      <td class="model" data-label="模型">${modelCell(m)}</td>
      <td class="score num" data-label="评分">${scoreText(m, scale)}<div class="ci">${ciText(m, scale)}</div></td>
      <td class="votes num" data-label="投票数">${fmtNum(m.votes)}</td>
      ${priceCells}
    </tr>`;
  }).join('');
  return `<div class="table-scroll"><table class="board">
    <thead><tr><th>排名</th><th>模型</th><th>${SCALE_LABEL[scale]}</th><th>投票数</th>${priceCols}${costCol}</tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  ${showExpand ? `<div style="padding:10px 12px"><button class="link-btn" id="expand-btn">展开全部 ${models.length} 个模型 ↓</button></div>` : ''}`;
}

/* ---------- 首页 ---------- */
async function initHome() {
  initTheme();
  let index, status;
  try {
    [index, status] = await Promise.all([fetchJson('data/index.json'), fetchJson('data/status.json').catch(() => null)]);
  } catch (e) {
    $('#fresh-slot').innerHTML = '<div class="banner-warn">数据加载失败，请检查部署是否包含 web/data/ 目录。</div>';
    return;
  }
  $('#fresh-slot').innerHTML = freshbarHtml(status);

  const byId = Object.fromEntries(index.boards.map((b) => [b.id, b]));
  const load = (id) => fetchJson(`data/latest/${id}.json`).catch(() => null);

  // 1) 智能体总榜 Top10
  const agent = await load('agent');
  if (agent) {
    $('#agent-slot').innerHTML = `<div class="card">${boardTable(agent.models, 'bt', { limit: 10 })}</div>`;
    bindExpand($('#agent-slot'), agent.models, 'bt');
  }

  // 2) 中文对话榜精选 Top10（国内版核心差异）
  const zh = await load('text-chinese');
  if (zh) {
    $('#zh-slot').innerHTML = `<div class="card">${boardTable(zh.models, 'elo', { limit: 10 })}</div>`;
    bindExpand($('#zh-slot'), zh.models, 'elo');
  }

  // 3) 榜单宫格
  const groups = index.groups;
  $('#grid-slot').innerHTML = groups.map((g) => {
    const cards = index.boards.filter((b) => b.group === g).map((b) => `
      <a class="board-card ${b.highlight ? 'hl' : ''}" href="board.html?b=${encodeURIComponent(b.id)}">
        <div class="g">${esc(g)}${b.highlight ? ' · <span class="star">★ 国内精选</span>' : ''}</div>
        <div class="t">${esc(b.name)}</div>
        <div class="m">${b.modelCount != null ? b.modelCount + ' 个模型' : '暂缺数据'} · ${SCALE_LABEL[b.scale]}</div>
      </a>`).join('');
    return `<div class="section"><div class="section-head"><h2>${esc(g)}榜</h2></div><div class="grid">${cards}</div></div>`;
  }).join('');

  // 页脚动态信息
  const foot = $('#foot-info');
  if (foot && status) {
    foot.textContent = `最后成功抓取：${fmtTime(status.lastSuccess)}（北京时间）｜ 快照保留 ${status.snapshotRetentionDays || 45} 天`;
  }
}

function bindExpand(slot, models, scale) {
  const btn = $('#expand-btn', slot);
  if (!btn) return;
  btn.addEventListener('click', () => {
    slot.querySelector('.table-scroll').outerHTML = boardTable(models, scale, {});
    btn.remove();
  });
}

/* ---------- 榜单页 ---------- */
async function initBoard() {
  initTheme();
  const id = new URLSearchParams(location.search).get('b') || 'text';
  let index, board;
  try {
    [index, board] = await Promise.all([fetchJson('data/index.json'), fetchJson(`data/latest/${id}.json`)]);
  } catch {
    $('#board-slot').innerHTML = '<div class="empty">榜单不存在或数据缺失。<a href="index.html">返回首页</a></div>';
    return;
  }
  const meta = board.meta;
  document.title = `${meta.name} - AI Arena 中文榜单`;

  $('#crumb').innerHTML = `<a href="index.html">首页</a> / ${esc(meta.group)}榜 / ${esc(meta.name)}`;
  $('#board-title').textContent = meta.name;
  $('#board-meta').innerHTML = `
    <span>量纲：${SCALE_LABEL[meta.scale]}</span>
    <span>模型数：${meta.modelCount}</span>
    <span>更新时间：${fmtTime(meta.fetchedAt)}（北京时间）</span>
    <span>来源：<a href="${esc(meta.sourceUrl)}" target="_blank" rel="noopener">arena.ai ↗</a></span>`;
  $('#scale-hint').textContent = SCALE_HINT[meta.scale] || '';

  let query = '';
  const render = () => {
    const models = query
      ? board.models.filter((m) =>
          m.name.toLowerCase().includes(query) ||
          (m.org || '').toLowerCase().includes(query) ||
          (m.key || '').toLowerCase().includes(query))
      : board.models;
    $('#board-slot').innerHTML = boardTable(models, meta.scale, { limit: 100 });
    bindExpand($('#board-slot'), models, meta.scale);
    $('#result-count').textContent = `共 ${models.length} 个模型${query ? '（已筛选）' : ''}`;
  };
  $('#filter-input').addEventListener('input', (e) => {
    query = e.target.value.trim().toLowerCase();
    render();
  });
  render();
}

/* ---------- 路由 ---------- */
if (location.pathname.endsWith('board.html')) initBoard();
else initHome();
