/**
 * smoke-test.mjs — 前端冒烟测试（开发用，随仓库保留，不参与线上产物）
 * 用 DOM 桩在 Node 中真实执行 app.js，验证：
 * 无运行时错误 + 选择器渲染 + 就地切换 + 筛选/排序逻辑 + 纯函数正确性。
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../web/', import.meta.url));
const appCode = await readFile(ROOT + 'assets/app.js', 'utf8');

/* 期望值从数据文件推导，不硬编码——源站数据每日在变（Agent 榜实测跨日就会变），
   硬编码值会把冒烟测试变成"源站没更新才算通过"的脆弱测试 */
const agentBoard = JSON.parse(await readFile(ROOT + 'data/latest/agent.json', 'utf8'));
const AGENT_COUNT = String(agentBoard.models.length);
const AGENT_PCT = (agentBoard.models[0].score > 0 ? '+' : '') + (agentBoard.models[0].score * 100).toFixed(1) + '%';

/* ============================================================
   DOM 桩
   ============================================================ */
function makeEl(key, tag = 'DIV') {
  const el = {
    _key: key,
    _tag: tag,
    _children: new Map(),
    _handlers: {},
    _attrs: {},
    innerHTML: '',
    textContent: '',
    outerHTML: '',
    value: '',
    tabIndex: 0,
    style: {},
    dataset: {},
    parentElement: null,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); },
      remove(c) { this._s.delete(c); },
      contains(c) { return this._s.has(c); },
      toggle(c, on) { const v = on === undefined ? !this._s.has(c) : !!on; v ? this._s.add(c) : this._s.delete(c); return v; },
    },
    addEventListener(ev, fn) { (this._handlers[ev] ||= []).push(fn); },
    removeEventListener() {},
    remove() { this._removed = true; },
    querySelector(sel) {
      if (!el._children.has(sel)) {
        const child = makeEl(key + ' ' + sel, guessTag(sel));
        child.parentElement = el;
        el._children.set(sel, child);
      }
      return el._children.get(sel);
    },
    querySelectorAll() { return []; },
    closest(sel) { return matches(sel, el) ? el : null; },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k] ?? null; },
    removeAttribute(k) { delete this._attrs[k]; },
    focus() { el._focused = true; },
    select() {},
    appendChild(c) { c.parentElement = el; return c; },
    scrollTo() {},
    fire(ev, arg) {
      const hs = this._handlers[ev] || [];
      hs.forEach((fn) => fn(arg));
      return hs.length;
    },
    hasHandler(ev) { return !!(this._handlers[ev] || []).length; },
  };
  return el;
}

function guessTag(sel) {
  const m = sel.trim().match(/^([a-zA-Z][\w-]*)/);
  return m ? m[1].toUpperCase() : 'DIV';
}
function matches(sel, el) {
  const tagPart = sel.trim().match(/^([a-zA-Z][\w-]*)/);
  if (tagPart && el._tag !== tagPart[1].toUpperCase()) return false;
  const attr = sel.match(/\[([\w-]+)/);
  if (attr) {
    const name = attr[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
    return el.dataset[name] !== undefined || el._attrs[attr[1]] !== undefined;
  }
  const cls = sel.match(/\.([\w-]+)/);
  if (cls) return el.classList.contains(cls[1]) || (el._key || '').includes(cls[1]);
  return true;
}

let els = new Map();
const body = makeEl('body', 'BODY');
const docHandlers = {};
const documentStub = {
  title: '',
  body,
  documentElement: { dataset: {} },
  activeElement: null,
  addEventListener(ev, fn) { (docHandlers[ev] ||= []).push(fn); },
  removeEventListener() {},
  createElement(tag) { return makeEl('created:' + tag + ':' + Math.random(), tag.toUpperCase()); },
  querySelector(sel) {
    if (!els.has(sel)) els.set(sel, makeEl(sel, guessTag(sel)));
    return els.get(sel);
  },
  querySelectorAll() { return []; },
};

const store = {};
const localStorageStub = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
};
const matchMediaStub = () => ({ matches: false, addEventListener() {} });
const pushed = [];
const windowStub = {
  matchMedia: matchMediaStub,
  scrollY: 0,
  addEventListener() {},
  scrollTo() {},
  history: { pushState(s, t, url) { pushed.push(url); } },
};

/* fetch 桩：从 web/ 读真实文件 */
async function fetchStub(p) {
  const path = p.startsWith('data/') ? ROOT + p : ROOT + p.replace(/^\//, '');
  try {
    const text = await readFile(path, 'utf8');
    return { ok: true, json: async () => JSON.parse(text) };
  } catch {
    return { ok: false, status: 404, json: async () => ({}) };
  }
}

function runApp(search) {
  els = new Map();
  Object.keys(docHandlers).forEach((k) => delete docHandlers[k]);
  pushed.length = 0;
  const locationStub = { pathname: '/index.html', search: search || '' };
  const fn = new Function(
    'document', 'fetch', 'localStorage', 'matchMedia', 'location', 'window', 'URLSearchParams',
    appCode + '\n;return { initApp, selectBoard, mountBoard, sortModels, boardTable, scoreText, ciText, orgColor, fmtRel, fmtTime, fmtDate };'
  );
  return fn(documentStub, fetchStub, localStorageStub, matchMediaStub, locationStub, windowStub, URLSearchParams);
}

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
};
const settling = () => new Promise((r) => setTimeout(r, 80));

/* 从渲染出的 HTML 里解析出 data-g / data-b 项，用于模拟点击分发 */
function itemsFrom(html, attr) {
  const out = [];
  const re = new RegExp(`<[^>]*\\b${attr}="([^"]*)"[^>]*>`, 'g');
  let m;
  while ((m = re.exec(html))) out.push({ dataset: { [attr === 'data-g' ? 'g' : 'b']: m[1] } });
  return out;
}

/* ============================================================
   测试 1：默认加载
   ============================================================ */
{
  const api = runApp('');
  await api.initApp();
  await settling();

  const major = els.get('#picker-major').innerHTML;
  const boardsHtml = els.get('#picker-boards').innerHTML;
  const catsHtml = els.get('#picker-cats').innerHTML;
  check('选择器：第一行含 5 个大类', (major.match(/role="tab"/g) || []).length === 5);
  check('选择器：默认选中第一个大类', /aria-selected="true"/.test(major));
  check('选择器：第二行展示该大类的二级榜单', (boardsHtml.match(/class="s-item/g) || []).length >= 3);
  check('选择器：二级榜单带模型数', boardsHtml.includes('class="n"'));
  check('选择器：默认有选中的二级榜单', /aria-current="true"/.test(boardsHtml));
  check('选择器：第三行（类别）已渲染', catsHtml.length > 0);

  check('榜单：默认加载智能体总榜', documentStub.title.includes('智能体总榜'));
  check('榜单：标题渲染', els.get('#board-title').innerHTML.includes('智能体总榜'));
  check('榜单：元信息含模型数', els.get('#board-meta').innerHTML.includes(AGENT_COUNT));
  check('榜单：表格渲染', (els.get('#board-slot').innerHTML.match(/<tr/g) || []).length >= 50);
  check('榜单：BT 量纲百分比', els.get('#board-slot').innerHTML.includes(AGENT_PCT));
  check('榜单：厂商色块', els.get('#board-slot').innerHTML.includes('org-tile'));
  check('榜单：分数条形图', els.get('#board-slot').innerHTML.includes('scorebar'));
  check('榜单：默认计数', els.get('#result-count').innerHTML.includes(AGENT_COUNT));
  check('页面：初始不 push 历史', pushed.length === 0);

  const fresh = els.get('#fresh-slot').innerHTML;
  check('新鲜度条：含数据日期（源站标注）', fresh.includes('数据日期'));
  check('新鲜度条：含镜像抓取时间', fresh.includes('镜像抓取于'));
  check('新鲜度条：含全球对战数', fresh.includes('全球累计对战'));
  check('工具条：搜索框已绑定', els.get('#filter-input').hasHandler('input'));
  check('工具条：只看国产已绑定', els.get('#seg-cn').hasHandler('click'));
  check('工具条：排序下拉已绑定', els.get('#sort-select').hasHandler('change'));
}

/* ============================================================
   测试 2：就地切换（点小类不跳页，URL 更新）
   ============================================================ */
{
  const api = runApp('');
  await api.initApp();
  await settling();

  const minorItems = itemsFrom(els.get('#picker-boards').innerHTML, 'data-b');
  check('解析出智能体类小类', minorItems.length === 3);
  els.get('#picker-boards').fire('click', {
    target: { closest: () => minorItems[1] },   // 编程智能体榜
    ctrlKey: false, metaKey: false, shiftKey: false, button: 0,
    preventDefault() {},
  });
  await settling();
  check('切换：标题更新为编程智能体榜', documentStub.title.includes('编程智能体榜'));
  check('切换：表格重渲染', (els.get('#board-slot').innerHTML.match(/<tr/g) || []).length >= 50);
  check('切换：URL 已 push', pushed.some((u) => u.includes('agent-coding')));
  check('切换：选中态更新', /aria-current="true"/.test(els.get('#picker-boards').innerHTML));
  check('切换：筛选被重置', els.get('#filter-input').value === '');

  // Ctrl+点击不拦截（保留开新标签能力）
  const before = pushed.length;
  els.get('#picker-boards').fire('click', {
    target: { closest: () => minorItems[0] },
    ctrlKey: true, metaKey: false, shiftKey: false, button: 0,
    preventDefault() { throw new Error('Ctrl+点击不应被拦截'); },
  });
  await settling();
  check('切换：Ctrl+点击不拦截', pushed.length === before);
}

/* ============================================================
   测试 3：大类切换
   ============================================================ */
{
  const api = runApp('');
  await api.initApp();
  await settling();

  const majorItems = itemsFrom(els.get('#picker-major').innerHTML, 'data-g');
  check('解析出 5 个大类', majorItems.length === 5);
  els.get('#picker-major').fire('click', { target: { closest: () => majorItems[1] }, preventDefault() {} }); // 对话
  await settling();

  const boardRow = els.get('#picker-boards').innerHTML;
  check('大类切换：第二行换成对话类二级榜单', boardRow.includes('文本对话榜') && boardRow.includes('视觉问答榜'));
  check('大类切换：不再有智能体榜', !boardRow.includes('编程智能体榜'));
  check('大类切换：自动选中第一个二级榜单', documentStub.title.includes('文档理解榜'));
  check('大类切换：URL 已 push', pushed.some((u) => u.includes('b=chat-document')));
  // 切到「文本对话榜」→ 其三级类别里的「中文」应带国内精选 ★
  const boardItems = itemsFrom(boardRow, 'data-b');
  const textBoard = boardItems.find((x) => x.dataset.b === 'chat-text');
  els.get('#picker-boards').fire('click', {
    target: { closest: () => textBoard },
    ctrlKey: false, metaKey: false, shiftKey: false, button: 0,
    preventDefault() {},
  });
  await settling();
  check('大类切换：三级类别含国内精选标记', els.get('#picker-cats').innerHTML.includes('star'));
}

/* ============================================================
   测试 4：深链 ?b=
   ============================================================ */
{
  const api = runApp('?b=text-chinese');
  await api.initApp();
  await settling();
  check('深链：旧 id 映射并加载（text-chinese → 文本对话榜·中文）', documentStub.title.includes('文本对话榜 · 中文'));
  check('深链：ELO 量纲', els.get('#board-slot').innerHTML.includes('1587.7'));
  check('深链：量纲提示', els.get('#scale-hint').textContent.includes('ELO'));
  check('深链：选中态正确', /aria-current="true"/.test(els.get('#picker-boards').innerHTML));
  check('深链：元信息含源站数据日期', /数据日期 <b>2026-10-0\d<\/b>/.test(els.get('#board-meta').innerHTML));
  check('深链：元信息含总票数', els.get('#board-meta').innerHTML.includes('总票数'));
}

/* ============================================================
   测试 5：筛选 / 只看国产 / 排序
   ============================================================ */
{
  const api = runApp('?b=text-chinese');
  await api.initApp();
  await settling();

  els.get('#filter-input').fire('input', { target: { value: 'deepseek' } });
  await settling();
  const html = els.get('#board-slot').innerHTML;
  check('筛选：deepseek 生效', /deepseek/i.test(html) && !/gemini-4-argon/i.test(html));
  check('筛选：计数更新', els.get('#result-count').innerHTML.includes('已筛选'));

  els.get('#filter-input').fire('input', { target: { value: '' } });
  await settling();
  els.get('#seg-cn').fire('click', {});
  await settling();
  check('筛选：只看国产生效', /badge-cn/.test(els.get('#board-slot').innerHTML));
  els.get('#seg-all').fire('click', {});
  await settling();

  els.get('#filter-input').fire('input', { target: { value: '月之暗面' } });
  await settling();
  check('筛选：中文厂商名生效', /moonshot/i.test(els.get('#board-slot').innerHTML));

  els.get('#filter-input').fire('input', { target: { value: '' } });
  await settling();
  const sel = els.get('#sort-select');
  sel.value = 'votes:desc';
  sel.fire('change', { target: sel });
  await settling();
  check('排序：按票数降序仍有内容', (els.get('#board-slot').innerHTML.match(/<tr/g) || []).length >= 100);
  check('排序：排序后计数恢复', !els.get('#result-count').innerHTML.includes('已筛选'));
}

/* ============================================================
   测试 6：BT 榜单 + 纯函数
   ============================================================ */
{
  const api = runApp('?b=agent');
  await api.initApp();
  await settling();
  check('Agent 榜：标题', documentStub.title.includes('智能体总榜'));
  check('Agent 榜：百分比渲染', els.get('#board-slot').innerHTML.includes(AGENT_PCT));
  check('Agent 榜：单任务成本列', els.get('#board-slot').innerHTML.includes('单任务成本'));
  // 源站对 Agent 榜也有数据时间（主页 pill 的 trends 末点 / note），
  // 取到就应显示「数据日期」；只有真的取不到时才回退「抓取于」。
  const hasAgentDate = !!agentBoard.meta.dataDate;
  const agentMeta = els.get('#board-meta').innerHTML;
  check(
    hasAgentDate ? 'Agent 榜：显示源站数据日期' : 'Agent 榜：无源站日期时回退抓取时间',
    hasAgentDate
      ? agentMeta.includes('数据日期') && !agentMeta.includes('抓取于')
      : agentMeta.includes('抓取于')
  );

  const rows = [
    { rank: 3, name: 'c', org: 'X', score: 1200, votes: 10, inputPrice: 1, outputPrice: 2, contextLength: 1000 },
    { rank: 1, name: 'a', org: 'Y', score: 1400, votes: 30, inputPrice: 3, outputPrice: 4, contextLength: 3000 },
    { rank: 2, name: 'b', org: 'Z', score: 1300, votes: null, inputPrice: null, outputPrice: null, contextLength: null },
  ];
  check('排序：按排名升序', api.sortModels(rows, 'rank', 'asc').map((m) => m.rank).join(',') === '1,2,3');
  check('排序：按排名降序', api.sortModels(rows, 'rank', 'desc').map((m) => m.rank).join(',') === '3,2,1');
  check('排序：按评分降序', api.sortModels(rows, 'score', 'desc').map((m) => m.rank).join(',') === '1,2,3');
  check('排序：票数降序空值排最后', api.sortModels(rows, 'votes', 'desc').map((m) => m.votes).join(',') === '30,10,');
  check('排序：输入价升序空值排最后', api.sortModels(rows, 'inputPrice', 'asc').map((m) => m.inputPrice).join(',') === '1,3,');
  check('格式化：相对时间', /前|刚刚/.test(api.fmtRel(new Date().toISOString())));
  check('格式化：时间固定 UTC+8（跨日）', api.fmtTime('2026-10-12T17:36:41.980Z') === '2026-10-13 01:36');
  check('格式化：时间固定 UTC+8（零点边界）', api.fmtTime('2026-10-12T16:00:00.000Z') === '2026-10-13 00:00');
  check('格式化：日期固定 UTC+8', api.fmtDate('2026-10-12T17:36:41.980Z') === '2026-10-13');
  check('格式化：空值安全', api.fmtTime(null) === '—' && api.fmtDate(null) === '—');
  check('厂商色：已知厂商固定色', api.orgColor('OpenAI') === '#0f9b6c');
  check('厂商色：未知厂商取安全色板', /^#[0-9a-f]{6}$/.test(api.orgColor('SomeUnknownOrg')));
  check('分数：BT 百分比', api.scoreText({ score: 0.155 }, 'bt') === '+15.5%');
  check('分数：ELO 原值', api.scoreText({ score: 1587.7 }, 'elo') === '1587.7');
  check('区间：BT 双侧不对称', api.ciText({ score: 0.155, scoreUpper: 0.18, scoreLower: 0.14 }, 'bt').includes('+2.5%'));
  check('表格：展开按钮出现', api.boardTable(Array.from({ length: 12 }, (_, i) => ({
    rank: i + 1, name: 'm' + i, org: 'X', score: 100 - i, votes: 1,
  })), 'elo', { limit: 10 }).includes('展开全部 12'));
}

console.log(failures === 0 ? '\n全部通过 ✅' : `\n${failures} 项失败 ❌`);
process.exit(failures === 0 ? 0 : 1);
