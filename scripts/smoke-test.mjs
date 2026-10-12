/**
 * smoke-test.mjs — 前端冒烟测试（开发用，不进仓库）
 * 用最小 DOM 桩在 Node 中真实执行 app.js 的 initHome / initBoard，
 * 验证：无运行时错误 + 关键内容正确渲染 + 筛选逻辑工作。
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../web/', import.meta.url));
const appCode = await readFile(ROOT + 'assets/app.js', 'utf8');

/* ---------- DOM 桩 ---------- */
function makeEl(sel) {
  return {
    _sel: sel,
    innerHTML: '',
    textContent: '',
    outerHTML: '',
    style: {},
    dataset: {},
    addEventListener(ev, fn) { (this._h ||= {})[ev] = fn; },
    remove() {},
    querySelector(s) { return makeEl(this._sel + ' ' + s); },
  };
}
const els = new Map();
const documentStub = {
  title: '',
  documentElement: { dataset: {} },
  querySelector(sel) {
    if (!els.has(sel)) els.set(sel, makeEl(sel));
    return els.get(sel);
  },
};
const store = {};
const localStorageStub = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
};
const matchMediaStub = () => ({ matches: false });

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

const runApp = (search) => {
  els.clear();
  const locationStub = { pathname: search ? '/board.html' : '/index.html', search: search || '' };
  const fn = new Function(
    'document', 'fetch', 'localStorage', 'matchMedia', 'location', 'URLSearchParams',
    appCode + '\n;return { initHome, initBoard };'
  );
  const api = fn(documentStub, fetchStub, localStorageStub, matchMediaStub, locationStub, URLSearchParams);
  return api;
};

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
};

/* ---------- 测试 1：首页 ---------- */
{
  const api = runApp('');
  await api.initHome();
  await new Promise((r) => setTimeout(r, 50));
  check('首页：新鲜度条含更新时间', els.get('#fresh-slot').innerHTML.includes('数据更新至'));
  check('首页：新鲜度条含全球对战数', els.get('#fresh-slot').innerHTML.includes('全球累计对战'));
  check('首页：智能体榜渲染 Top10', els.get('#agent-slot').innerHTML.includes('Claude Opus 5.5 (Max)'));
  check('首页：智能体榜为百分比量纲', els.get('#agent-slot').innerHTML.includes('+15.5%'));
  check('首页：中文榜渲染', els.get('#zh-slot').innerHTML.includes('gemini-4-argon-high'));
  check('首页：中文榜为 ELO 量纲', els.get('#zh-slot').innerHTML.includes('1587.7'));
  check('首页：榜单宫格含 19 个入口', (els.get('#grid-slot').innerHTML.match(/board-card/g) || []).length >= 19);
  check('首页：中文榜有国内精选标记', els.get('#grid-slot').innerHTML.includes('国内精选'));
  check('首页：国产徽章出现', els.get('#zh-slot').innerHTML.includes('badge-cn') || els.get('#grid-slot').innerHTML.includes('badge-cn'));
  check('首页：页脚信息填充', els.get('#foot-info').textContent.includes('最后成功抓取'));
}

/* ---------- 测试 2：榜单页 ---------- */
{
  const api = runApp('?b=text-chinese');
  await api.initBoard();
  await new Promise((r) => setTimeout(r, 50));
  check('榜单页：标题设置', documentStub.title.includes('中文对话榜'));
  check('榜单页：面包屑', els.get('#crumb').innerHTML.includes('中文对话榜'));
  check('榜单页：元信息', els.get('#board-meta').innerHTML.includes('arena.ai'));
  check('榜单页：表格渲染（top100）', (els.get('#board-slot').innerHTML.match(/<tr/g) || []).length >= 100);
  check('榜单页：结果计数', els.get('#result-count').textContent.includes('390'));
  // 模拟筛选
  const input = els.get('#filter-input');
  check('榜单页：筛选器已绑定', typeof input._h?.input === 'function');
  input._h.input({ target: { value: 'deepseek' } });
  await new Promise((r) => setTimeout(r, 10));
  const html = els.get('#board-slot').innerHTML;
  check('榜单页：筛选 deepseek 生效', /deepseek/i.test(html) && !/gemini-4-argon/i.test(html));
}

/* ---------- 测试 3：BT 榜单页 ---------- */
{
  const api = runApp('?b=agent');
  await api.initBoard();
  await new Promise((r) => setTimeout(r, 50));
  check('Agent 榜页：标题', documentStub.title.includes('智能体总榜'));
  check('Agent 榜页：量纲提示', els.get('#scale-hint').textContent.includes('Bradley-Terry'));
  check('Agent 榜页：百分比渲染', els.get('#board-slot').innerHTML.includes('+15.5%'));
}

console.log(failures === 0 ? '\n全部通过 ✅' : `\n${failures} 项失败 ❌`);
process.exit(failures === 0 ? 0 : 1);
