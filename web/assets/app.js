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

/* 旧链接兼容：2026-10-13 改为三级结构后榜单 id 加了路径前缀，老的 ?b= 仍可打开 */
const LEGACY_ID = {
  text: 'chat-text',
  'text-chinese': 'chat-text-chinese',
  'text-coding': 'chat-text-coding',
  'text-math': 'chat-text-math',
  'text-creative': 'chat-text-creative-writing',
  'text-instruction': 'chat-text-instruction-following',
  vision: 'chat-vision',
  'vision-chinese': 'chat-vision-chinese',
  document: 'chat-document',
  search: 'chat-search',
  webdev: 'code-webdev',
  'image-to-webdev': 'code-image-to-webdev',
  'text-to-image': 'image-text-to-image',
  'text-to-video': 'video-text-to-video',
  'image-to-video': 'video-image-to-video',
  'video-edit': 'video-video-edit',
};
const resolveId = (id) => (id && LEGACY_ID[id]) || id;

/* ============================================================
   工具
   ============================================================ */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

const fmtNum = (n) => (n == null ? '—' : n.toLocaleString('zh-CN'));
const pad2 = (x) => String(x).padStart(2, '0');
/* 固定按 UTC+8 取部件：页面标注「北京时间」，不能用浏览器本地时区
   （海外访客会把当地时间误标成北京时间）。中国无夏令时，+8 恒定。 */
const bj = (d) => new Date(d.getTime() + 8 * 3600_000);
const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = bj(new Date(iso));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = bj(new Date(iso));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
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

/* 数据日期区间：源站在每个榜单页标注该榜数据时间（排名与票数冻结于该日），
   各榜日期不同（如文本榜 10-08、搜索榜 08-24），这里展示区间并提示以各榜为准 */
function dataDateRangeHtml() {
  const dates = (INDEX && INDEX.boards || [])
    .map((b) => b.dataDate)
    .filter(Boolean)
    .sort();
  if (!dates.length) return '';
  const lo = fmtDate(dates[0]);
  const hi = fmtDate(dates[dates.length - 1]);
  const text = lo === hi ? `<b>${lo}</b>` : `<b>${lo}</b> ~ <b>${hi}</b>`;
  return `<span><span class="dot"></span>数据日期 ${text}（源站标注，以各榜为准）</span>`;
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
    ${dataDateRangeHtml()}
    <span>镜像抓取于 <b>${t}</b>（北京时间 · ${rel}）</span>
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
   单页榜单查看器
   结构：选择器（大类 + 小类）→ 当前榜单（就地切换，不跳页）
   ============================================================ */
let INDEX = null;        // data/index.json
let ACTIVE = null;       // 当前榜单实例 { meta, models, query, onlyCN, sortKey, sortDir, apply }
let activeGroup = '';    // 选择器当前大类（一级）
let activeBoard = '';    // 当前选中的榜单（二级或三级）
let activeParent = '';   // 当前二级榜单 id（三级类别的归属）
let toolbarBound = false;

async function initApp() {
  initTheme();
  initFab();

  const slot = $('#board-slot');
  if (slot) slot.innerHTML = skeletonHtml(10);

  let status;
  try {
    [INDEX, status] = await Promise.all([
      fetchJson('data/index.json'),
      fetchJson('data/status.json').catch(() => null),
    ]);
  } catch {
    const el = $('#fresh-slot');
    if (el) el.innerHTML = '<div class="banner-warn">数据加载失败，请检查部署是否包含 web/data/ 目录。</div>';
    const t = $('#board-title');
    if (t) t.textContent = '数据未就绪';
    if (slot) slot.innerHTML = emptyStateHtml('📦', '数据未就绪', '请先在 CI 中运行 Daily Fetch，或本地执行 node scripts/build-data.mjs。');
    return;
  }

  const fs = $('#fresh-slot');
  if (fs) fs.innerHTML = freshbarHtml(status);

  initPicker();
  bindToolbar();

  // 初始榜单：URL ?b= 优先（兼容旧 id），否则第一个二级榜单
  const wanted = resolveId(new URLSearchParams(location.search).get('b'));
  const fallback = (INDEX.boards.find((b) => b.isBoard) || INDEX.boards[0]).id;
  const initial = INDEX.boards.some((b) => b.id === wanted) ? wanted : fallback;
  await selectBoard(initial, { push: false });

  // 浏览器前进/后退同步
  window.addEventListener('popstate', () => {
    const b = resolveId(new URLSearchParams(location.search).get('b'));
    if (b && INDEX.boards.some((x) => x.id === b)) selectBoard(b, { push: false });
  });
}

/* ---------- 选择器 ---------- */
/* 二级榜单 = 无 parent 的榜；三级类别 = 带 parent 的榜（严格对齐源站三级结构） */
const boardsOf = (group) => (INDEX ? INDEX.boards.filter((b) => b.group === group && b.isBoard) : []);
const catsOf = (parentId) => (INDEX ? INDEX.boards.filter((b) => b.parent === parentId) : []);
const boardById = (id) => (INDEX ? INDEX.boards.find((b) => b.id === id) : null);

function renderPicker() {
  const majorBox = $('#picker-major');
  const boardBox = $('#picker-boards');
  const catBox = $('#picker-cats');
  if (!majorBox || !boardBox) return;

  const groups = (INDEX && INDEX.groups) || [];
  if (!groups.length) {
    majorBox.innerHTML = '<span class="picker-empty muted">暂无榜单数据</span>';
    boardBox.innerHTML = '';
    if (catBox) catBox.innerHTML = '';
    return;
  }

  /* 一级：大类 */
  majorBox.innerHTML = groups.map((g) => {
    const on = g === activeGroup;
    return `<button type="button" role="tab" class="m-item" data-g="${esc(g)}"
      aria-selected="${on ? 'true' : 'false'}" tabindex="${on ? '0' : '-1'}">
      <span class="ico">${GROUP_ICON[g] || '📊'}</span>${esc(g)}
      <span class="n">${boardsOf(g).length}</span>
    </button>`;
  }).join('');

  /* 二级：该大类下的榜单 */
  boardBox.innerHTML = boardsOf(activeGroup).map((b) => {
    const kids = catsOf(b.id).length;
    return `<a class="s-item ${b.highlight ? 'hl' : ''}" href="?b=${encodeURIComponent(b.id)}"
       data-b="${esc(b.id)}" ${b.id === activeParent ? 'aria-current="true"' : ''}
       title="${esc(b.name)} · ${b.modelCount != null ? b.modelCount + ' 个模型' : '暂无数据'}${kids ? ` · ${kids} 个子类别` : ''}">
      <span class="nm">${esc(b.name)}</span>
      ${b.highlight ? '<span class="star" title="国内精选">★</span>' : ''}
      <span class="n">${b.modelCount != null ? b.modelCount : '—'}</span>
      ${kids ? `<span class="kids">${kids} 类 ›</span>` : ''}
    </a>`;
  }).join('');

  /* 三级：当前榜单下的类别 */
  if (catBox) {
    const cats = catsOf(activeParent);
    const cur = boardById(activeParent);
    catBox.innerHTML = cats.length
      ? cats.map((c) => `
        <a class="t-item ${c.highlight ? 'hl' : ''}" href="?b=${encodeURIComponent(c.id)}" data-b="${esc(c.id)}"
           ${c.id === activeBoard ? 'aria-current="true"' : ''}
           title="${esc(c.name)} · ${c.modelCount != null ? c.modelCount + ' 个模型' : '暂无数据'}">
          <span class="nm">${esc(c.name)}</span>
          ${c.highlight ? '<span class="star" title="国内精选">★</span>' : ''}
          <span class="n">${c.modelCount != null ? c.modelCount : '—'}</span>
        </a>`).join('')
      : `<span class="picker-tip muted">${esc(cur ? cur.name : '')} 没有细分小类，点上面任一榜单即可查看完整排名</span>`;
  }
}

function initPicker() {
  const majorBox = $('#picker-major');
  const boardBox = $('#picker-boards');
  const catBox = $('#picker-cats');
  if (!majorBox || !boardBox) return;

  const groups = (INDEX && INDEX.groups) || [];
  if (!groups.includes(activeGroup)) activeGroup = groups[0] || '';

  const pickMajor = (g) => {
    if (g === activeGroup) return;
    activeGroup = g;
    renderPicker();
    const first = boardsOf(g)[0];   // 切大类只落到二级榜单，三级由用户再选
    if (first) selectBoard(first.id);
  };

  majorBox.addEventListener('click', (e) => {
    const btn = e.target.closest ? e.target.closest('.m-item') : null;
    if (btn) pickMajor(btn.dataset.g);
  });

  // 键盘：左右/Home/End 在大类间移动
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
    pickMajor(items[j].dataset.g);
  });

  // 二级榜单 / 三级类别：普通左键就地切换；Ctrl/⌘/中键点击保留原生行为（可开新标签）
  const bindSwitch = (box) => {
    if (!box) return;
    box.addEventListener('click', (e) => {
      const a = e.target.closest ? e.target.closest('.s-item, .t-item') : null;
      if (!a) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      selectBoard(a.dataset.b);
    });
  };
  bindSwitch(boardBox);
  bindSwitch(catBox);

  renderPicker();
}

/* ---------- 切换榜单（就地） ---------- */
async function selectBoard(id, opts = {}) {
  const push = opts.push !== false;
  const info = boardById(id);
  if (!info) return;

  activeGroup = info.group;
  activeBoard = id;
  activeParent = info.parent || info.id;   // 三级类别归入其所属二级榜单
  renderPicker();   // 一级选中态 + 二级 + 三级类别，三者一次对齐

  const titleEl = $('#board-title');
  const parentInfo = info.parent ? boardById(info.parent) : null;
  const fullName = parentInfo ? `${parentInfo.name} · ${info.name}` : info.name;
  if (titleEl) titleEl.innerHTML = `${GROUP_ICON[info.group] || '📊'} ${esc(fullName)}`;
  const metaEl = $('#board-meta');
  if (metaEl) {
    // 源站标注了数据日期 → 展示数据日期 + 总票数（与源站头部一致）；
    // 未标注（Agent 三榜）→ 回退显示抓取时间，至少说明镜像新旧
    const datePill = info.dataDate
      ? `<span class="pill">数据日期 <b>${fmtDate(info.dataDate)}</b></span>`
      : `<span class="pill">抓取于 <b>${fmtTime(info.updatedAt)}</b></span>`;
    const votesPill = info.totalVotes != null
      ? `<span class="pill">总票数 <b>${fmtNum(info.totalVotes)}</b></span>`
      : '';
    metaEl.innerHTML = `
      <span class="pill">量纲 <b>${SCALE_LABEL[info.scale]}</b></span>
      <span class="pill">模型数 <b>${info.modelCount != null ? info.modelCount : '—'}</b></span>
      ${datePill}
      ${votesPill}`;
  }

  const slot = $('#board-slot');
  if (slot) slot.innerHTML = skeletonHtml(10);
  document.title = `${fullName} - AI Arena 中文榜单`;
  if (push && window.history && window.history.pushState) {
    window.history.pushState({ b: id }, '', `?b=${encodeURIComponent(id)}`);
  }

  let board;
  try {
    board = await fetchJson(`data/latest/${id}.json`);
  } catch {
    if (slot) slot.innerHTML = emptyStateHtml('📭', '暂无数据', '该榜单本次抓取未通过校验，展示的是上一次成功的数据缺失。', '<a class="btn btn-primary" href="index.html">回到首页</a>');
    return;
  }
  mountBoard(slot, board);
}

/* ---------- 挂载榜单（工具条 + 表格） ---------- */
function mountBoard(slot, board) {
  const meta = board.meta;
  const st = {
    meta,
    models: board.models || [],
    query: '',
    onlyCN: false,
    sortKey: 'rank',
    sortDir: 'asc',
  };

  const hint = $('#scale-hint');
  if (hint) hint.textContent = SCALE_HINT[meta.scale] || '';

  const input = $('#filter-input');
  const field = $('#search-field');
  if (input) input.value = '';
  if (field) field.classList.remove('has-value');
  const segAll = $('#seg-all');
  const segCN = $('#seg-cn');
  if (segAll && segCN) {
    segAll.setAttribute('aria-pressed', 'true');
    segCN.setAttribute('aria-pressed', 'false');
  }
  const sel = $('#sort-select');
  if (sel) sel.value = 'rank:asc';

  const syncSortSelect = () => {
    const s2 = $('#sort-select');
    if (s2) s2.value = `${st.sortKey}:${st.sortDir}`;
  };

  const apply = () => {
    let models = st.models;
    if (st.onlyCN) models = models.filter((m) => CN_ORGS.has(m.org));
    if (st.query) {
      const q = st.query.toLowerCase();
      models = models.filter((m) =>
        (m.name || '').toLowerCase().includes(q) ||
        (m.org || '').toLowerCase().includes(q) ||
        (m.key || '').toLowerCase().includes(q) ||
        (ORG_ZH[m.org] || '').includes(st.query));
    }
    if (slot) slot.innerHTML = boardTable(models, meta.scale, { limit: 100, sortKey: st.sortKey, sortDir: st.sortDir });
    bindTableSort(slot, () => st, (s) => { Object.assign(st, s); syncSortSelect(); apply(); });
    if (slot) bindExpand(slot, models, meta.scale, { sortKey: st.sortKey, sortDir: st.sortDir });

    const cnt = $('#result-count');
    if (cnt) cnt.innerHTML = `共 <b>${models.length}</b> 个模型${st.query || st.onlyCN ? '（已筛选）' : ''}`;
    const f = $('#search-field');
    if (f) f.classList.toggle('has-value', !!st.query);
  };

  st.apply = apply;
  ACTIVE = st;
  apply();
}

/* ---------- 工具条（只绑一次，动作作用于当前 ACTIVE） ---------- */
function bindToolbar() {
  if (toolbarBound) return;
  toolbarBound = true;

  const input = $('#filter-input');
  const clearBtn = $('#filter-clear');
  const segAll = $('#seg-all');
  const segCN = $('#seg-cn');
  const sel = $('#sort-select');

  if (input) {
    input.addEventListener('input', (e) => {
      if (!ACTIVE) return;
      ACTIVE.query = e.target.value.trim();
      ACTIVE.apply();
    });
  }
  if (clearBtn && input) {
    clearBtn.addEventListener('click', () => {
      if (!ACTIVE) return;
      input.value = '';
      ACTIVE.query = '';
      input.focus();
      ACTIVE.apply();
    });
  }
  if (segAll && segCN) {
    segAll.addEventListener('click', () => {
      if (!ACTIVE || !ACTIVE.onlyCN) return;
      ACTIVE.onlyCN = false;
      segAll.setAttribute('aria-pressed', 'true');
      segCN.setAttribute('aria-pressed', 'false');
      ACTIVE.apply();
    });
    segCN.addEventListener('click', () => {
      if (!ACTIVE || ACTIVE.onlyCN) return;
      ACTIVE.onlyCN = true;
      segAll.setAttribute('aria-pressed', 'false');
      segCN.setAttribute('aria-pressed', 'true');
      ACTIVE.apply();
    });
  }
  if (sel) {
    sel.addEventListener('change', () => {
      if (!ACTIVE) return;
      const [k, d] = sel.value.split(':');
      ACTIVE.sortKey = k;
      ACTIVE.sortDir = d;
      ACTIVE.apply();
    });
  }
  if (input) {
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      const tag = t && t.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === '/' && !typing) {
        e.preventDefault();
        input.focus();
        input.select();
      } else if (e.key === 'Escape' && e.target === input) {
        e.preventDefault();
        input.value = '';
        if (ACTIVE) { ACTIVE.query = ''; ACTIVE.apply(); }
      }
    });
  }
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
   路由
   404 页也会加载本脚本（为了主题切换按钮可用），但它没有榜单容器，
   必须用 #board-picker 存在与否作为入口判据 —— 否则 initApp() 会跑一遍
   无用的数据请求，并在 selectBoard() 里把 404 的标题覆盖成某个榜单名。
   ============================================================ */
if (typeof location !== 'undefined' && document.querySelector('#board-picker')) initApp();
