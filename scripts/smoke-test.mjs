/**
 * smoke-test.mjs — 前端冒烟测试（开发用，随仓库保留，不参与线上产物）
 * 用 DOM 桩在 Node 中真实执行 app.js 的 initHome / initBoard 与纯函数，
 * 验证：无运行时错误 + 关键内容正确渲染 + 筛选/排序逻辑工作。
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../web/', import.meta.url));
const appCode = await readFile(ROOT + 'assets/app.js', 'utf8');

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
      const k = key + ' ' + sel;
      if (!el._children.has(sel)) {
        const child = makeEl(k, guessTag(sel));
        child.parentElement = el;
        el._children.set(sel, child);
      }
      return el._children.get(sel);
    },
    querySelectorAll() { return []; },
    closest(sel) {
      // 仅支持必要的自匹配（用于表头排序 / 按钮点击的分发）
      return matches(sel, el) ? el : null;
    },
    setAttribute(k, v) { this._attrs[k] = String(v); },
    getAttribute(k) { return this._attrs[k] ?? null; },
    focus() { el._focused = true; },
    select() {},
    appendChild(c) { c.parentElement = el; return c; },
    scrollTo() {},
    fire(ev, arg) {
      (this._handlers[ev] || []).forEach((fn) => fn(arg));
      return (this._handlers[ev] || []).length;
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
const documentStub = {
  title: '',
  body,
  documentElement: { dataset: {} },
  _handlers: {},
  addEventListener(ev, fn) { (this._handlers[ev] ||= []).push(fn); },
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
const windowStub = {
  matchMedia: matchMediaStub,
  scrollY: 0,
  addEventListener() {},
  scrollTo() {},
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
  Object.keys(documentStub._handlers).forEach((k) => delete documentStub._handlers[k]);
  const locationStub = {
    pathname: search ? '/board.html' : '/index.html',
    search: search || '',
  };
  const fn = new Function(
    'document', 'fetch', 'localStorage', 'matchMedia', 'location', 'window', 'URLSearchParams',
    appCode + '\n;return { initHome, initBoard, sortModels, boardTable, scoreText, ciText, orgColor };'
  );
  return fn(documentStub, fetchStub, localStorageStub, matchMediaStub, locationStub, windowStub, URLSearchParams);
}

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
};
const settling = () => new Promise((r) => setTimeout(r, 60));

/* ============================================================
   测试 1：首页
   ============================================================ */
{
  const api = runApp('');
  await api.initHome();
  await settling();

  const fresh = els.get('#fresh-slot').innerHTML;
  check('首页：新鲜度条含更新时间', fresh.includes('数据更新至'));
  check('首页：新鲜度条含相对时间', /分钟前|小时前|天前|刚刚/.test(fresh));
  check('首页：新鲜度条含全球对战数', fresh.includes('全球累计对战'));

  const major = els.get('#picker-major').innerHTML;
  const minor = els.get('#picker-minor').innerHTML;
  check('首页：选择器第一行含 5 个大类', (major.match(/role="tab"/g) || []).length === 5);
  check('首页：大类默认选中第一个', /aria-selected="true"/.test(major));
  check('首页：第二行展示当前大类的榜单', (minor.match(/class="s-item/g) || []).length >= 3);
  check('首页：选择器含模型数', minor.includes('class="n"'));

  /* 切到「对话」大类，验证国内精选标记 */
  els.get('#picker-major').fire('click', { target: { closest: () => ({ dataset: { g: '对话' } }) } });
  await settling();
  const minorChat = els.get('#picker-minor').innerHTML;
  check('首页：对话类含中文对话榜', minorChat.includes('中文对话榜'));
  check('首页：中文对话榜标为国内精选', minorChat.includes('star'));
  els.get('#picker-major').fire('click', { target: { closest: () => ({ dataset: { g: '智能体' } }) } });
  await settling();

  check('首页：智能体榜渲染 Top10', els.get('#agent-slot').innerHTML.includes('Claude Opus 5.5 (Max)'));
  check('首页：智能体榜为百分比量纲', els.get('#agent-slot').innerHTML.includes('+15.5%'));
  check('首页：中文榜渲染', els.get('#zh-slot').innerHTML.includes('gemini-4-argon-high'));
  check('首页：中文榜为 ELO 量纲', els.get('#zh-slot').innerHTML.includes('1587.7'));
  check('首页：含厂商色块', els.get('#zh-slot').innerHTML.includes('org-tile'));
  check('首页：含分数条形图', els.get('#zh-slot').innerHTML.includes('scorebar'));
  check('首页：国产徽章出现', els.get('#zh-slot').innerHTML.includes('badge-cn'));
  check('首页：页脚信息填充', els.get('#foot-info').textContent.includes('最后成功抓取'));

  /* 大类切换 */
  els.get('#picker-major').fire('click', { target: { closest: () => ({ dataset: { g: '视频' } }) } });
  await settling();
  const minorVideo = els.get('#picker-minor').innerHTML;
  check('首页：切换到视频大类后刷新小类', minorVideo.includes('文生视频榜'));
  check('首页：切换后不再出现文本类榜单', !minorVideo.includes('代码能力榜'));
}

/* ============================================================
   测试 2：榜单页（ELO）
   ============================================================ */
{
  const api = runApp('?b=text-chinese');
  await api.initBoard();
  await settling();

  check('榜单页：标题设置', documentStub.title.includes('中文对话榜'));
  check('榜单页：面包屑', els.get('#crumb').innerHTML.includes('中文对话榜'));
  check('榜单页：元信息', els.get('#board-meta').innerHTML.includes('arena.ai'));
  check('榜单页：元信息为 chip 样式', els.get('#board-meta').innerHTML.includes('class="pill"'));

  const nav = els.get('#chip-nav').innerHTML;
  check('榜单页：切换条含 19 个榜', (nav.match(/class="chip"/g) || []).length >= 19);
  check('榜单页：当前榜高亮', nav.includes('aria-current="true"'));

  const boardHtml = els.get('#board-slot').innerHTML;
  check('榜单页：表格渲染（top100）', (boardHtml.match(/<tr/g) || []).length >= 100);
  check('榜单页：表头可排序', (boardHtml.match(/data-sort="/g) || []).length >= 4);
  check('榜单页：结果计数', els.get('#result-count').innerHTML.includes('390'));

  check('榜单页：搜索框已绑定', els.get('#filter-input').hasHandler('input'));
  check('榜单页：清除按钮已绑定', els.get('#filter-clear').hasHandler('click'));
  check('榜单页：全部/国产分段控件已绑定', els.get('#seg-all').hasHandler('click') && els.get('#seg-cn').hasHandler('click'));
  check('榜单页：排序下拉已绑定', els.get('#sort-select').hasHandler('change'));

  // 模拟筛选
  els.get('#filter-input').fire('input', { target: { value: 'deepseek' } });
  await settling();
  const html = els.get('#board-slot').innerHTML;
  check('榜单页：筛选 deepseek 生效', /deepseek/i.test(html) && !/gemini-4-argon/i.test(html));

  // 模拟只看国产
  els.get('#seg-cn').fire('click', {});
  await settling();
  check('榜单页：只看国产生效', /badge-cn/.test(els.get('#board-slot').innerHTML));
  els.get('#seg-all').fire('click', {});
  await settling();

  // 模拟中文厂商搜索
  els.get('#filter-input').fire('input', { target: { value: '月之暗面' } });
  await settling();
  check('榜单页：支持中文厂商名搜索', /moonshot/i.test(els.get('#board-slot').innerHTML));

  // 模拟排序（下拉）
  els.get('#filter-input').fire('input', { target: { value: '' } });
  await settling();
  const sel = els.get('#sort-select');
  sel.value = 'votes:desc';
  sel.fire('change', { target: sel });
  await settling();
  check('榜单页：按票数降序不报错且仍有内容', (els.get('#board-slot').innerHTML.match(/<tr/g) || []).length >= 100);
}

/* ============================================================
   测试 3：BT 榜单页
   ============================================================ */
{
  const api = runApp('?b=agent');
  await api.initBoard();
  await settling();
  check('Agent 榜页：标题', documentStub.title.includes('智能体总榜'));
  check('Agent 榜页：量纲提示', els.get('#scale-hint').textContent.includes('Bradley-Terry'));
  check('Agent 榜页：百分比渲染', els.get('#board-slot').innerHTML.includes('+15.5%'));
  check('Agent 榜页：单任务成本列', els.get('#board-slot').innerHTML.includes('单任务成本'));
}

/* ============================================================
   测试 4：纯函数
   ============================================================ */
{
  const api = runApp('');
  const rows = [
    { rank: 3, name: 'c', org: 'X', score: 1200, votes: 10, inputPrice: 1, outputPrice: 2, contextLength: 1000 },
    { rank: 1, name: 'a', org: 'Y', score: 1400, votes: 30, inputPrice: 3, outputPrice: 4, contextLength: 3000 },
    { rank: 2, name: 'b', org: 'Z', score: 1300, votes: null, inputPrice: null, outputPrice: null, contextLength: null },
  ];
  check('排序：按排名升序', api.sortModels(rows, 'rank', 'asc').map((m) => m.rank).join(',') === '1,2,3');
  check('排序：按排名降序', api.sortModels(rows, 'rank', 'desc').map((m) => m.rank).join(',') === '3,2,1');
  check('排序：按评分降序', api.sortModels(rows, 'score', 'desc').map((m) => m.rank).join(',') === '1,2,3');
  check('排序：按票数降序空值排最后', api.sortModels(rows, 'votes', 'desc').map((m) => m.votes).join(',') === '30,10,');
  check('排序：按输入价升序空值排最后', api.sortModels(rows, 'inputPrice', 'asc').map((m) => m.inputPrice).join(',') === '1,3,');
  check('厂商色：已知厂商取固定色', api.orgColor('OpenAI') === '#0f9b6c');
  check('厂商色：未知厂商取安全色板', /^#[0-9a-f]{6}$/.test(api.orgColor('SomeUnknownOrg')));
  check('分数：BT 量纲百分比', api.scoreText({ score: 0.155 }, 'bt') === '+15.5%');
  check('分数：ELO 量纲原值', api.scoreText({ score: 1587.7 }, 'elo') === '1587.7');
  check('区间：BT 双侧不对称', api.ciText({ score: 0.155, scoreUpper: 0.18, scoreLower: 0.14 }, 'bt').includes('+2.5%'));
  check('表格：展开按钮出现', api.boardTable(Array.from({ length: 12 }, (_, i) => ({
    rank: i + 1, name: 'm' + i, org: 'X', score: 100 - i, votes: 1,
  })), 'elo', { limit: 10 }).includes('展开全部 12'));
}

console.log(failures === 0 ? '\n全部通过 ✅' : `\n${failures} 项失败 ❌`);
process.exit(failures === 0 ? 0 : 1);
