/**
 * fetch-aa.mjs — 抓取 Artificial Analysis V2 Data API 免费层，归一化为站点榜单格式
 *
 * 端点：见 boards.aa.config.mjs 的 ENDPOINTS（2026-11-09 起为 /api/v2/*\/free）
 * 授权：免费 API，必须署名；免费层 100 请求 / 24h 滚动窗口。
 *
 * 输出：.tmp/raw-aa/{YYYY-MM-DD}/{boardId}.json + _manifest.json
 *   → { boardId, src, field, contractVersion, dataDate, modelCount, models }
 *
 * 稳定性约定（2026-11-09 事故后加的，别删）：
 *   1. 端点退役 / key 失效 / 订阅不足 / 配额耗尽 → 明确报错并立即非零退出，
 *      **绝不**静默产出部分数据（11-05~11-08 连败 4 天就是旧版吞错导致的）。
 *   2. 自动翻页：LLM 列表 4 页共 727 条；只拿第 1 页会漏 3/4 模型。
 *   3. 每次抓取做「上游契约自检」：必需字段消失 / 配置字段全库 0 有效值 → 红灯。
 *      下次 AA 再改结构，第一天就能在 CI 里看到具体是哪个字段没了。
 *   4. `--check-only` 只探端点与契约、不写文件，可随时手动体检。
 *
 * Key 来源（按优先级）：
 *   1. 环境变量 AA_API_KEY（CI 用）
 *   2. AA_API_KEY_FILE 指向的文件（本地默认读用户凭证目录）
 * 绝不把 key 写进仓库、日志或前端。
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BOARDS, ENDPOINTS, SOURCE, CONTRACT_VERSION } from './boards.aa.config.mjs';
import { orgCanonical } from './org-map.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const API_BASE = 'https://artificialanalysis.ai/api/v2';
const today = new Date().toISOString().slice(0, 10);
const outDir = `${ROOT}.tmp/raw-aa/${today}/`;

const TIMEOUT_MS = 90_000;
const RETRIES = 4;
const MAX_PAGES = 20;
const MIN_MODELS = 10; // 任一榜低于此数视为上游字段下架（免费层实测最少 37 条）
const CHECK_ONLY = process.argv.includes('--check-only');

const DEFAULT_KEY_FILE = 'D:/我的知识体系/凭证/artificial analysis_api_key.txt';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadKey() {
  if (process.env.AA_API_KEY) return process.env.AA_API_KEY.trim();
  const file = process.env.AA_API_KEY_FILE || DEFAULT_KEY_FILE;
  try {
    const raw = await readFile(file, 'utf8');
    const key = raw.replace(/[\r\n\s]/g, '');
    if (key) return key;
  } catch (err) {
    throw new Error(`无法读取 API key（${file}）：${err.message}`);
  }
  throw new Error('未找到 AA API key：设置 AA_API_KEY 环境变量或 AA_API_KEY_FILE');
}

/** 把 HTTP 状态翻译成能直接行动的错误，fatal=不重试 */
function classify(status, url, body) {
  let hint = '';
  try {
    const j = JSON.parse(body);
    hint = j.message || j.error || '';
  } catch { /* 非 JSON 响应 */ }
  switch (status) {
    case 401: return { fatal: true, msg: '401 API key 无效或已被轮换（去 AA 后台重新生成并更新 Secret）' };
    case 403: return { fatal: true, msg: `403 订阅层级不足：${url} 需 Pro/Commercial（免费层只能用 /free 路径）${hint ? ` · ${hint}` : ''}` };
    case 410: return {
      fatal: true,
      msg: `410 端点已退役：${url}。查迁移文档 https://artificialanalysis.ai/data-api/migrate-v2-data${hint ? ` · ${hint}` : ''}`,
    };
    case 429: return { fatal: true, msg: `429 免费层配额耗尽（100 请求 / 24h 窗口），等窗口重置再跑${hint ? ` · ${hint}` : ''}` };
    default: return { fatal: false, msg: `HTTP ${status}${hint ? ` · ${hint}` : ''}` };
  }
}

/** 单次请求：网络抖动 / 5xx 指数退避重试；认证与契约类错误立刻抛 */
async function requestJson(url, key) {
  let lastErr;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'x-api-key': key, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const body = await res.text();
      if (!res.ok) {
        const { fatal, msg } = classify(res.status, url, body);
        const err = new Error(msg);
        err.fatal = fatal;
        throw err;
      }
      let json;
      try { json = JSON.parse(body); } catch { throw new Error(`响应不是 JSON（前 120 字）：${body.slice(0, 120)}`); }
      if (!Array.isArray(json.data)) {
        const err = new Error(`响应缺少 data 数组（上游契约变更）：顶层字段 ${Object.keys(json).join(',')}`);
        err.fatal = true;
        throw err;
      }
      return json;
    } catch (err) {
      lastErr = err;
      if (err.fatal || attempt === RETRIES) throw err;
      console.log(`    ↻ 第 ${attempt} 次失败（${err.message}），退避重试`);
      await sleep(1500 * 2 ** (attempt - 1));
    }
  }
  throw lastErr;
}

/**
 * 拉一个端点的全量数据。
 * 第 1 页不带 page 参数（媒体端点不接受该参数，会 400）；
 * 只有响应里 pagination.has_more=true 才继续翻页，避免硬编码页数。
 */
async function fetchEndpoint(key, src, path) {
  const rows = [];
  let pages = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${API_BASE}${path}${page === 1 ? '' : `?page=${page}`}`;
    const json = await requestJson(url, key);
    rows.push(...json.data);
    pages = page;
    if (!json.pagination?.has_more) break;
    await sleep(120);
    if (page === MAX_PAGES) {
      throw new Error(`${src}：分页超过 ${MAX_PAGES} 页仍未结束，疑似 cursor 异常`);
    }
  }
  return { rows, pages };
}

/** 端点级契约自检：结构变了一眼看出来，不让空数据混进流水线 */
function assertContract(src, rows) {
  if (!rows.length) throw new Error(`${src}：端点返回 0 条记录（上游空数据）`);
  const sample = rows.find((r) => r && typeof r === 'object');
  if (!sample) throw new Error(`${src}：响应里没有可用的对象记录`);
  const required = src === 'llm'
    ? ['evaluations', 'pricing', 'performance', 'release_date']
    : ['elo', 'ci_95'];
  const missing = required.filter((k) => !(k in sample));
  if (missing.length) {
    throw new Error(
      `${src}：上游契约变更，首条记录缺少 [${missing.join(', ')}]；` +
      `实际字段 [${Object.keys(sample).join(', ')}]。查 https://artificialanalysis.ai/data-api/docs`
    );
  }
  if (src !== 'llm' && !rows.some((r) => Number.isFinite(Number(r.elo)))) {
    throw new Error(`${src}：全库 elo 均无数值，媒体榜单无法生成`);
  }
}

/** 字段级自检：配置里声明的每个取分字段必须至少有一条有效值 */
function auditFields(rows) {
  const gaps = [];
  const coverage = {};
  for (const b of BOARDS) {
    if (b.src !== 'llm') continue;
    let n = 0;
    if (b.kind === 'eval') n = rows.filter((r) => r.evaluations?.[b.field] != null).length;
    else if (b.kind === 'price') n = rows.filter((r) => r.pricing?.[b.field] != null).length;
    else if (b.kind === 'blended') n = rows.filter((r) =>
      r.pricing?.price_1m_input_tokens != null && r.pricing?.price_1m_output_tokens != null).length;
    else if (b.kind === 'speed') n = rows.filter((r) => r.performance?.[b.field] != null).length;
    else if (b.kind === 'date') n = rows.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.release_date || '')).length;
    coverage[`${b.id}:${b.kind}.${b.field}`] = n;
    if (n === 0) gaps.push(`${b.id} → ${b.kind}.${b.field} 全库 0 条有效值`);
  }
  if (gaps.length) {
    throw new Error(`上游字段下架检测失败（疑似 AA 改了字段或调整订阅层级）：\n  ${gaps.join('\n  ')}`);
  }
  if (CHECK_ONLY) {
    for (const [k, v] of Object.entries(coverage)) console.log(`    ${v.toString().padStart(4)} 条 · ${k}`);
  }
}

/**
 * ci_95 在新免费层是数值（±ELO）；兼容旧端点 "-10/10" 字符串。
 */
function parseCi(elo, ci) {
  if (elo == null || ci == null) return { lower: null, upper: null };
  const raw = String(ci).trim();
  if (/^-?[\d.]+$/.test(raw)) {
    const n = Number(raw);
    return { lower: Math.round((elo - n) * 10) / 10, upper: Math.round((elo + n) * 10) / 10 };
  }
  const m = raw.match(/^(-?[\d.]+)\s*\/\s*([\d.]+)$/);
  if (!m) return { lower: null, upper: null };
  return { lower: Math.round((elo + Number(m[1])) * 10) / 10, upper: Math.round((elo + Number(m[2])) * 10) / 10 };
}

const round = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);

/** 把一条 AA 记录拍平成站点的 model 结构（分数稍后按榜覆盖） */
function baseModel(row, src) {
  const isMedia = src !== 'llm';
  return {
    key: String(row.name || row.slug || '').trim(),
    name: String(row.name || row.slug || '').trim(),
    org: orgCanonical(row.model_creator?.name || ''),
    score: null,
    scoreUpper: null,
    scoreLower: null,
    // 免费层媒体端点已不再返回 appearances（对战次数），全站统一为 null
    votes: null,
    license: null,
    url: null,
    inputPrice: isMedia ? null : (row.pricing?.price_1m_input_tokens ?? null),
    outputPrice: isMedia ? null : (row.pricing?.price_1m_output_tokens ?? null),
    contextLength: null,
    pricePerImage: null,
    pricePerSecond: null,
    costPerTask: null,
    releaseType: row.release_date || null,
  };
}

/** 按榜配置从一条记录里取分 */
function pickScore(row, board) {
  const { kind, field } = board;
  if (kind === 'eval') {
    const v = row.evaluations?.[field];
    return v == null ? null : Number(v);
  }
  if (kind === 'price') {
    const v = row.pricing?.[field];
    return v == null ? null : Number(v);
  }
  if (kind === 'blended') {
    // 免费层没有 price_1m_blended_3_to_1，按官方 3:1 口径现算。
    // ⚠️ 必须先判 null：Number(null) === 0，不拦会把「未定价」模型算成免费并排到价格榜首。
    const pi = row.pricing?.price_1m_input_tokens;
    const po = row.pricing?.price_1m_output_tokens;
    if (pi == null || po == null) return null;
    const i = Number(pi);
    const o = Number(po);
    if (!Number.isFinite(i) || !Number.isFinite(o)) return null;
    return (3 * i + o) / 4;
  }
  if (kind === 'speed') {
    // 只取 performance 的 median_*；performance_v3 是 mean_*，统计口径不同不混用
    const v = row.performance?.[field];
    return v == null ? null : Number(v);
  }
  if (kind === 'elo') {
    const v = row.elo;
    return v == null ? null : Number(v);
  }
  if (kind === 'date') {
    const s = String(row[field] || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    return Number(s.replace(/-/g, ''));
  }
  return null;
}

/** 生成一个榜的 models 数组；rank 由 score 重算，保证严格 1,2,3… */
function buildBoard(rows, board) {
  const mapped = rows
    .map((row) => {
      const m = baseModel(row, board.src);
      m.score = pickScore(row, board);
      if (board.kind === 'elo') {
        const { lower, upper } = parseCi(m.score, row.ci_95);
        m.scoreLower = lower;
        m.scoreUpper = upper;
      }
      // 仅保留该榜真正有分的记录
      return m.score == null || !Number.isFinite(m.score) ? null : m;
    })
    .filter(Boolean)
    .filter((m) => m.name);

  // 「越小越好」的量纲走升序：价格（含现算混合价）与秒数（首字/首答延迟）。
  // 其余（指数 / ELO / 吞吐 / 发布日期）都是越大越好，降序。
  // 按 scale 判断而非 kind：blended 与 price 同为 price 量纲，seconds 榜以前被误排成「最慢第一」。
  const asc = board.scale === 'price' || board.scale === 'seconds';
  mapped.sort((a, b) => (asc ? a.score - b.score : b.score - a.score));

  return mapped.map((m, i) => ({
    rank: i + 1,
    rankUpper: null,
    rankLower: null,
    key: m.key,
    name: m.name,
    org: m.org,
    score: board.scale === 'date' ? m.score : round(m.score, board.scale === 'rate' ? 4 : 2),
    scoreUpper: m.scoreUpper,
    scoreLower: m.scoreLower,
    votes: m.votes,
    license: m.license,
    url: m.url,
    inputPrice: m.inputPrice,
    outputPrice: m.outputPrice,
    contextLength: null,
    pricePerImage: null,
    pricePerSecond: null,
    costPerTask: null,
    releaseType: m.releaseType,
  }));
}

async function main() {
  const key = await loadKey();
  console.log(`[fetch-aa] ${today} · 源 ${SOURCE.publisher} · 契约 ${CONTRACT_VERSION}${CHECK_ONLY ? ' · 仅体检' : ''}`);

  const sources = [...new Set(BOARDS.map((b) => b.src))];
  const cache = {};
  const endpointStats = {};

  // 全端点成功才继续：任何一处失败直接抛出，绝不生成半成品数据
  for (const src of sources) {
    const { rows, pages } = await fetchEndpoint(key, src, ENDPOINTS[src]);
    assertContract(src, rows);
    if (src === 'llm') auditFields(rows);
    cache[src] = rows;
    endpointStats[src] = { path: ENDPOINTS[src], pages, rows: rows.length };
    console.log(`  → ${src}：${rows.length} 条 / ${pages} 页`);
  }

  const outputs = [];
  for (const b of BOARDS) {
    const models = buildBoard(cache[b.src], b);
    if (models.length < MIN_MODELS) {
      throw new Error(`${b.id}（${b.name}）仅 ${models.length} 个模型，低于下限 ${MIN_MODELS}；字段 ${b.field ?? b.kind} 疑似已下架`);
    }
    outputs.push({
      boardId: b.id,
      src: b.src,
      field: b.field ?? b.kind,
      contractVersion: CONTRACT_VERSION,
      unit: b.unit || '',
      dataDate: today,
      totalVotes: null,
      modelCount: models.length,
      models,
    });
    console.log(`  ✓ ${b.id}（${b.name}）${models.length} 个模型`);
  }

  if (CHECK_ONLY) {
    console.log(`\n[fetch-aa] 体检通过：${sources.length} 个端点 / ${outputs.length} 个榜，未写任何文件`);
    return;
  }

  await mkdir(outDir, { recursive: true });
  for (const o of outputs) {
    await writeFile(`${outDir}${o.boardId}.json`, JSON.stringify(o), 'utf8');
  }
  await writeFile(
    `${outDir}_manifest.json`,
    JSON.stringify({
      contractVersion: CONTRACT_VERSION,
      fetchedAt: new Date().toISOString(),
      endpoints: endpointStats,
      boards: outputs.map((o) => ({ id: o.boardId, field: o.field, count: o.modelCount })),
    }, null, 1),
    'utf8'
  );
  console.log(`\n[fetch-aa] 完成：${outputs.length}/${BOARDS.length} 个榜全部成功 → ${outDir}`);
}

main().catch((err) => {
  console.error(`[fetch-aa] 失败：${err.message}`);
  process.exit(1);
});
