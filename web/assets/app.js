/* ============================================================
   app.js — 公共逻辑 + 首页 / 榜单页渲染
   数据全部来自本地静态 JSON（data/），无任何运行时外部依赖
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

/* ---------- 厂商色：知名品牌固定色，其余按哈希取安全色板 ---------- */
const ORG_COLOR_PIN = {
  OpenAI: '#0f9b6c', Anthropic: '#d97706', Google: '#2563eb', Meta: '#4f46e5',
  'Meta AI': '#4f46e5', Microsoft: '#0284c7', NVIDIA: '#16a34a', Amazon: '#f59e0b',
  AWS: '#f59e0b', Mistral: '#ea580c', 'Mistral AI': '#ea580c', xAI: '#334155',
  Cohere: '#7c3aed', AI21: '#0891b2', Reka: '#db2777', Databricks: '#dc2626',
  'Stability AI': '#4f46e5', 'Black Forest Labs': '#be185d', Runway: '#0369a1',
  Luma: '#be185d', 'Luma AI': '#be185d', Pika: '#db2777', Ideogram: '#7c3aed',
  DeepSeek: '#4f46e5', Moonshot: '#7c3aed', 'Moonshot AI': '#7c3aed',
  Zhipu: '#2563eb', 'Z.ai': '#2563eb', ZhipuAI: '#2563eb',
  Alibaba: '#f59e0b', Qwen: '#f59e0b', ByteDance: '#0891b2',
  MiniMax: '#db2777', StepFun: '#7c3aed', '01.AI': '#4338ca',
  Tencent: '#0284c7', Baidu: '#2563eb', Kuaishou: '#f43f5e',
  Shengshu: '#059669', Vidu: '#059669', Bytedance: '#0891b2',
  'Shanghai AI Laboratory': '#0369a1', OpenBMB: '#16a34a', ModelBest: '#16a34a',
  InclusiveAI: '#0891b2', SenseTime: '#dc2626', iFlytek: '#ea580c',
};
/* 全部色值对白字的对比度均 ≥ 3:1，可安全用于色块底 */
const ORG_PALETTE = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2',
  '#ca8a04', '#dc2626', '#4f46e5', '#059669', '#be185d', '#0369a1',
];

const SCALE_LABEL = { elo: 'ELO 评分', bt: '相对战力值' };
const SCALE_HINT = {
  elo: 'ELO 为相对战力分，分数越高代表对战表现越强；± 为 95% 置信区间。',
  bt: '相对战力值基于 Bradley-Terry 模型，0 = 平均水平，正值表示优于平均，按百分比展示。',
};

/* 榜组图标（仅为可读性，不承载语义） */
const GROUP_ICON = { 智能体: '🤖', 对话: '💬', 代码: '⌨️', 图像: '🎨', 视频: '🎬' };

/* ============================================================
   工具
   ============================================================ */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

const fmtNum = (n) => (n == null ? '—' : n.toLocaleString('zh-CN'));
const pad2 = (x) => String(x).padStart(2, '0');
const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fmtRel = (iso) => {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
};
const fmtPrice = (p) => (p == null ? '—' : '$' + p.toFixed(2));
const fmtCtx = (n) => {
  if (n == null) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M';
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return String(n);
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function orgColor(org) {
  if (ORG_COLOR_PIN[org]) return ORG_COLOR_PIN[org];
  let h = 0;
  for (let i = 0; i < org.length; i++) h = (h * 31 + org.charCodeAt(i)) >>> 0;
  return ORG_PALETTE[h % ORG_PALETTE.length];
}
function orgInitial(org) {
  const m = String(org || '?').match(/[A-Za-z0-9一-龥]/);
  return (m ? m[0] : '?').toUpperCase();
}

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

/* ============================================================
   主题 + 回到顶部
   ============================================================ */
function isDark() {
  const t = document.documentElement.dataset.theme;
  if (t) return t === 'dark';
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function initTheme() {
  const saved = localStorage.getItem('arena-theme');
  if (saved) document.documentElement.dataset.theme = saved;
  const btn = $('#theme-toggle');
  if (!btn) return;
  const sync = () => { btn.innerHTML = isDark() ? '☀️ <span>浅色</span>' : '🌙 <span>深色</span>'; };
  sync();
  btn.addEventListener('click', () => {
    document.documentElement.dataset.theme = isDark() ? 'light' : 'dark';
    localStorage.setItem('arena-theme', document.documentElement.dataset.theme);
    sync();
  });
}

function initFab() {
  if (!document.body) return;
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', '回到顶部');
  fab.innerHTML = '↑';
  document.body.appendChild(fab);
  const onScroll = () => fab.classList.toggle('show', (window.scrollY || 0) > 480);
  fab.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  if (window.addEventListener) window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   片段渲染
   ============================================================ */
function orgTileHtml(org, extraClass = '') {
  const c = ORG_COLOR_PIN[org] || orgColor(org || '?');
  const cn = CN_ORGS.has(org);
  return `<span class="org-tile ${extraClass}" style="background:${c}"
    title="${esc(org)}" aria-hidden="true">${esc(orgInitial(org))}</span>`;
}

function rankCell(rank) {
  if (rank <= 3) return `<span class="rank rank-${rank}">${rank}</span>`;
  return `<span class="rank rank-n">${rank}</span>`;
}

function modelCell(m) {
  const cn = CN_ORGS.has(m.org);
  const zh = ORG_ZH[m.org];
  const zhNote = zh && zh !== m.org ? ` · <span class="zh">${esc(zh)}</span>` : '';
  const link = m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)}</a>` : esc(m.name);
  const pre = m.releaseType === 'pre_release' ? '<span class="badge badge-pre">预览版</span>' : '';
  const lic = m.license && m.license !== 'Proprietary' ? `<span class="badge badge-license">${esc(m.license)}</span>` : '';
  return `<div class="model-cell">
    ${orgTileHtml(m.org)}
    <span class="txt">
      <span class="nm">${link}${pre}${lic}${cn ? '<span class="badge badge-cn">国产</span>' : ''}</span>
      <span class="org">${esc(m.org || '未知厂商')}${zhNote}</span>
    </span>
  </div>`;
}

/** 分数相对条形图：以本榜最高/最低分为基准做归一化 */
function scoreBarHtml(m, min, max) {
  const span = max - min;
  const p = span > 0 ? ((m.score - min) / span) * 100 : 100;
  return `<span class="scorebar" aria-hidden="true"><i style="width:${Math.max(4, Math.min(100, p)).toFixed(1)}%"></i></span>`;
}

function skeletonHtml(rows = 8) {
  let s = '';
  for (let i = 0; i < rows; i++) {
    s += `<div class="skeleton-row">
      <span class="sk sk-v"></span>
      <span class="sk"></span>
      <span class="sk sk-sm"></span>
      <span class="sk sk-sm"></span>
    </div>`;
  }
  return s;
}

function emptyStateHtml(icon, title, desc, actionHtml = '') {
  return `<div class="empty">
    <span class="ico">${icon}</span>
    <div class="t">${esc(title)}</div>
    <div class="d">${desc}</div>
    ${actionHtml}
  </div>`;
}

function freshbarHtml(status) {
  if (!status) return '';
  const t = status.lastSuccess ? fmtTime(status.lastSuccess) : '—';
  const rel = status.lastSuccess ? fmtRel(status.lastSuccess) : '—';
  const s = status.session;
  const sessionPart = s
    ? `<span>全球累计对战 <b>${fmtNum(s.sessionCount)}</b> 场</span>
       <span>最近一小时 <b>${fmtNum(s.sessionsLastHour)}</b> 场</span>`
    : '';
  return `<div class="freshbar ${status.stale ? 'stale' : ''}">
    <span><span class="dot"></span>数据更新至 <b>${t}</b>（北京时间 · ${rel}）</span>
    ${sessionPart}
    <span>数据来源 <b>arena.ai</b>，每日自动抓取</span>
  </div>${status.stale ? '<div class="banner-warn">⚠️ 数据可能过期：自动抓取已多日未成功，以下展示的是最后一次成功抓取的数据。</div>' : ''}`;
}

/* ============================================================
   榜单表格（支持排序 / 分数条形图 / 限制条数）
   ============================================================ */
function sortModels(models, key, dir) {
  const val = (m) => {
    switch (key) {
      case 'score': return m.score ?? null;
      case 'votes': return m.votes ?? null;
      case 'inputPrice': return m.inputPrice ?? null;
      case 'outputPrice': return m.outputPrice ?? null;
      case 'contextLength': return m.contextLength ?? null;
      case 'rank':
      default: return m.rank ?? null;
    }
  };
  // 空值恒排在最后（价格类常用场景中 null 代表未公开）
  const cmp = (a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    const r = typeof va === 'string' || typeof vb === 'string'
      ? String(va).localeCompare(String(vb), 'zh-CN')
      : va - vb;
    return dir === 'desc' ? -r : r;
  };
  return [...models].sort(cmp);
}

function boardTable(models, scale, opts = {}) {
  const { limit = 0, sortKey = 'rank', sortDir = 'asc' } = opts;
  const prices = scale !== 'bt';
  let list = sortModels(models, sortKey, sortDir);
  const showExpand = limit && list.length > limit;
  const visible = showExpand ? list.slice(0, limit) : list;

  const scores = list.map((m) => m.score).filter((x) => x != null);
  const min = scores.length ? Math.min(...scores) : 0;
  const max = scores.length ? Math.max(...scores) : 1;

  const th = (key, label, extra = '') => {
    const sr = sortKey === key;
    const caret = sr ? (sortDir === 'desc' ? '▼' : '▲') : '▲';
    return `<th class="sortable ${extra}" data-sort="${key}" ${sr ? `aria-sort="${sortDir === 'desc' ? 'descending' : 'ascending'}"` : ''}
      scope="col" tabindex="0" role="columnheader">${label}<span class="caret">${caret}</span></th>`;
  };

  const rows = visible.map((m) => {
    const cn = CN_ORGS.has(m.org);
    const priceCells = prices
      ? `<td class="price num" data-label="输入价">${fmtPrice(m.inputPrice)}</td>
         <td class="price num" data-label="输出价">${fmtPrice(m.outputPrice)}</td>
         <td class="ctx num" data-label="上下文">${fmtCtx(m.contextLength)}</td>`
      : `<td class="price num" data-label="单任务成本">${m.costPerTask == null ? '—' : '$' + m.costPerTask.toFixed(2)}</td>`;
    return `<tr class="${cn ? 'cn-row' : ''}${m.rank <= 3 ? ' top3' : ''}">
      <td class="rank" data-label="排名">${rankCell(m.rank)}</td>
      <td class="model" data-label="模型">${modelCell(m)}</td>
      <td class="score num" data-label="${SCALE_LABEL[scale]}">
        ${scoreText(m, scale)}
        ${scoreBarHtml(m, min, max)}
        ${ciText(m, scale) ? `<div class="ci">${ciText(m, scale)}</div>` : ''}
      </td>
      <td class="votes num" data-label="投票数">${fmtNum(m.votes)}</td>
      ${priceCells}
    </tr>`;
  }).join('');

  return `<div class="table-scroll"><table class="board">
    <thead><tr>
      ${th('rank', '排名')}
      <th scope="col">模型</th>
      ${th('score', SCALE_LABEL[scale])}
      ${th('votes', '投票数')}
      ${prices
        ? `${th('inputPrice', '输入价')}${th('outputPrice', '输出价')}${th('contextLength', '上下文')}`
        : `<th scope="col">单任务成本</th>`}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  ${showExpand ? `<div class="expand-bar"><button class="link-btn" id="expand-btn" type="button">展开全部 ${list.length} 个模型 ↓</button></div>` : ''}`;
}

function bindTableSort(container, getState, setState) {
  const table = $('.table-scroll table', container);
  if (!table || table._bound) return;
  table._bound = true;
  const onHead = (e) => {
    const cell = e.target.closest ? e.target.closest('th[data-sort]') : null;
    if (!cell) return;
    const key = cell.dataset.sort;
    const st = getState();
    const dir = st.sortKey === key ? (st.sortDir === 'asc' ? 'desc' : 'asc') : (key === 'rank' ? 'asc' : 'desc');
    setState({ sortKey: key, sortDir: dir });
  };
  table.addEventListener('click', onHead);
  table.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const cell = e.target.closest ? e.target.closest('th[data-sort]') : null;
      if (cell) { e.preventDefault(); onHead({ target: cell }); }
    }
  });
}

/* ============================================================
   首页
   ============================================================ */
async function initHome() {
  initTheme();
  initFab();

  const slots = ['#agent-slot', '#zh-slot'];
  slots.forEach((s) => { const el = $(s); if (el) el.innerHTML = `<div class="card">${skeletonHtml(6)}</div>`; });

  let index, status;
  try {
    [index, status] = await Promise.all([
      fetchJson('data/index.json'),
      fetchJson('data/status.json').catch(() => null),
    ]);
  } catch (e) {
    const el = $('#fresh-slot');
    if (el) el.innerHTML = '<div class="banner-warn">数据加载失败，请检查部署是否包含 web/data/ 目录。</div>';
    slots.forEach((s) => { const e2 = $(s); if (e2) e2.innerHTML = `<div class="card">${emptyStateHtml('📦', '数据未就绪', '请先在 CI 中运行 Daily Fetch，或本地执行 node scripts/build-data.mjs。')}</div>`; });
    return;
  }

  const fs = $('#fresh-slot');
  if (fs) fs.innerHTML = freshbarHtml(status);

  initPicker(index);

  const load = (id) => fetchJson(`data/latest/${id}.json`).catch(() => null);

  /* --- 双栏重点榜 --- */
  const panels = [
    { slot: '#agent-slot', id: 'agent', scale: 'bt', fallback: 'bt' },
    { slot: '#zh-slot', id: 'text-chinese', scale: 'elo', fallback: 'elo' },
  ];
  for (const p of panels) {
    const board = await load(p.id);
    const el = $(p.slot);
    if (!el) continue;
    if (!board || !board.models || !board.models.length) {
      el.innerHTML = `<div class="card">${emptyStateHtml('📭', '暂无数据', '该榜单本次抓取未通过校验，展示的是最后一次成功数据缺失。')}</div>`;
      continue;
    }
    const scale = (board.meta && board.meta.scale) || p.scale;
    el.innerHTML = `<div class="card">${boardTable(board.models, scale, { limit: 10 })}</div>`;
    bindExpand(el, board.models, scale);
  }

  /* --- 页脚 --- */
  const foot = $('#foot-info');
  if (foot && status) {
    foot.textContent = `最后成功抓取：${fmtTime(status.lastSuccess)}（北京时间）｜ 快照保留 ${status.snapshotRetentionDays || 45} 天｜数据仓库 ${status.repoSizeMB != null ? status.repoSizeMB + 'MB' : '—'}`;
  }
}

/* ============================================================
   榜单选择器：第一行大类（tab），第二行小类（当前大类下的榜单）
   ============================================================ */
function initPicker(index) {
  const majorBox = $('#picker-major');
  const minorBox = $('#picker-minor');
  if (!majorBox || !minorBox) return;

  const groups = index.groups || [];
  if (!groups.length) {
    majorBox.innerHTML = '<span class="picker-empty muted">暂无榜单数据</span>';
    return;
  }
  let active = groups[0];

  const boardsOf = (g) => index.boards.filter((b) => b.group === g);

  const renderMajor = () => {
    majorBox.innerHTML = groups.map((g) => {
      const n = boardsOf(g).length;
      const on = g === active;
      return `<button type="button" role="tab" class="m-item"
        data-g="${esc(g)}" aria-selected="${on ? 'true' : 'false'}"
        tabindex="${on ? '0' : '-1'}">
        <span class="ico">${GROUP_ICON[g] || '📊'}</span>${esc(g)}
        <span class="n">${n}</span>
      </button>`;
    }).join('');
  };

  const renderMinor = () => {
    const list = boardsOf(active);
    minorBox.innerHTML = list.map((b) => `
      <a class="s-item ${b.highlight ? 'hl' : ''}" href="board.html?b=${encodeURIComponent(b.id)}"
         title="${esc(b.name)} · ${b.modelCount != null ? b.modelCount + ' 个模型' : '暂无数据'}">
        <span class="nm">${esc(b.name)}</span>
        ${b.highlight ? '<span class="star" title="国内精选">★</span>' : ''}
        <span class="n">${b.modelCount != null ? b.modelCount : '—'}</span>
      </a>`).join('') + `
      <span class="picker-tip muted">${GROUP_ICON[active] || ''} ${esc(active)}类共 ${list.length} 个榜单，点名称进入</span>`;
  };

  const select = (g) => {
    if (!groups.includes(g)) return;
    active = g;
    renderMajor();
    renderMinor();
  };

  majorBox.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('.m-item') : null;
    if (btn) select(btn.dataset.g);
  });

  // 键盘：左右/Home/End 在大类间移动（tablist 语义）
  majorBox.addEventListener('keydown', (e) => {
    const items = $$('.m-item', majorBox);
    const i = items.findIndex((el) => el === document.activeElement);
    if (i < 0) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = items.length - 1;
    if (j < 0) return;
    e.preventDefault();
    items[j].focus();
    select(items[j].dataset.g);
  });

  renderMajor();
  renderMinor();
}

function bindExpand(slot, models, scale, opts = {}) {
  const btn = $('#expand-btn', slot);
  if (!btn) return;
  btn.addEventListener('click', () => {
    const wrapEl = slot.querySelector('.table-scroll');
    if (wrapEl) wrapEl.outerHTML = boardTable(models, scale, opts);
    if (btn.parentElement) btn.parentElement.remove();
  });
}

/* ============================================================
   榜单页
   ============================================================ */
async function initBoard() {
  initTheme();
  initFab();

  const id = new URLSearchParams(location.search).get('b') || 'text';
  document.title = '加载中… - AI Arena 中文榜单';
  const slot = $('#board-slot');
  if (slot) slot.innerHTML = skeletonHtml(10);

  let index, board;
  try {
    [index, board] = await Promise.all([fetchJson('data/index.json'), fetchJson(`data/latest/${id}.json`)]);
  } catch {
    if (slot) slot.innerHTML = emptyStateHtml('🔍', '榜单不存在或数据缺失', '请返回首页选择榜单。', '<a class="btn btn-primary" href="index.html">返回首页</a>');
    document.title = '榜单不存在 - AI Arena 中文榜单';
    return;
  }
  const meta = board.meta;
  document.title = `${meta.name} - AI Arena 中文榜单`;

  const crumb = $('#crumb');
  if (crumb) crumb.innerHTML = `<a href="index.html">首页</a><span class="sep">/</span>${esc(meta.group)}类<span class="sep">/</span>${esc(meta.name)}`;

  const titleEl = $('#board-title');
  if (titleEl) titleEl.innerHTML = `${GROUP_ICON[meta.group] || '📊'} ${esc(meta.name)}`;

  const metaEl = $('#board-meta');
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="pill">量纲 <b>${SCALE_LABEL[meta.scale]}</b></span>
      <span class="pill">模型数 <b>${meta.modelCount}</b></span>
      <span class="pill">更新于 <b>${fmtTime(meta.fetchedAt)}</b></span>
      <span class="pill">来源 <b><a href="${esc(meta.sourceUrl)}" target="_blank" rel="noopener">arena.ai ↗</a></b></span>`;
  }
  const hintEl = $('#scale-hint');
  if (hintEl) hintEl.textContent = SCALE_HINT[meta.scale] || '';

  /* --- 榜单快速切换 --- */
  const nav = $('#chip-nav');
  if (nav) {
    nav.innerHTML = index.groups.map((g) => {
      const items = index.boards.filter((b) => b.group === g).map((b) =>
        `<a class="chip" href="board.html?b=${encodeURIComponent(b.id)}"
            ${b.id === id ? 'aria-current="true"' : ''}>${esc(b.name)}</a>`).join('');
      return `<span class="chip-sep">${GROUP_ICON[g] || ''} ${esc(g)}</span>${items}`;
    }).join('');
  }

  /* --- 工具条 + 表格 --- */
  let query = '';
  let onlyCN = false;
  let sortKey = 'rank';
  let sortDir = 'asc';

  const apply = () => {
    let models = board.models;
    if (onlyCN) models = models.filter((m) => CN_ORGS.has(m.org));
    if (query) {
      const q = query.toLowerCase();
      models = models.filter((m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.org || '').toLowerCase().includes(q) ||
        (m.key || '').toLowerCase().includes(q) ||
        (ORG_ZH[m.org] || '').includes(query));
    }
    const sortOpts = { limit: 100, sortKey, sortDir };
    if (slot) slot.innerHTML = boardTable(models, meta.scale, sortOpts);
    bindTableSort(slot, () => ({ sortKey, sortDir }), (st) => {
      sortKey = st.sortKey; sortDir = st.sortDir;
      const s2 = $('#sort-select');
      if (s2) s2.value = `${sortKey}:${sortDir}`;
      apply();
    });
    if (slot) bindExpand(slot, models, meta.scale, { sortKey, sortDir });

    const cnt = $('#result-count');
    if (cnt) cnt.innerHTML = `共 <b>${models.length}</b> 个模型${query || onlyCN ? '（已筛选）' : ''}`;
    const field = $('#search-field');
    if (field) field.classList.toggle('has-value', !!query);
  };

  const input = $('#filter-input');
  if (input) {
    input.addEventListener('input', (e) => { query = e.target.value.trim(); apply(); });
  }
  const clearBtn = $('#filter-clear');
  if (clearBtn && input) {
    clearBtn.addEventListener('click', () => { input.value = ''; query = ''; input.focus(); apply(); });
  }
  const segAll = $('#seg-all');
  const segCN = $('#seg-cn');
  if (segAll && segCN) {
    const setSeg = (cn) => {
      onlyCN = cn;
      segAll.setAttribute('aria-pressed', String(!cn));
      segCN.setAttribute('aria-pressed', String(cn));
      apply();
    };
    segAll.addEventListener('click', () => setSeg(false));
    segCN.addEventListener('click', () => setSeg(true));
  }
  const sel = $('#sort-select');
  if (sel) {
    sel.addEventListener('change', () => {
      const [k, d] = sel.value.split(':');
      sortKey = k; sortDir = d; apply();
    });
  }
  if (input) {
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      const tag = t && t.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.key === '/' && !typing) || (e.key === 'Escape' && e.target === input)) {
        e.preventDefault();
        input.focus();
        if (e.key === 'Escape') { input.value = ''; query = ''; apply(); }
        else input.select();
      }
    });
  }

  apply();
}

/* ============================================================
   路由
   ============================================================ */
if (typeof location !== 'undefined' && location.pathname && location.pathname.endsWith('board.html')) initBoard();
else initHome();
