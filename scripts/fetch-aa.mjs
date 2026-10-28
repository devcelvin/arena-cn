/**
 * fetch-aa.mjs — 抓取 Artificial Analysis 免费 Data API，归一化为站点榜单格式
 *
 * 端点：/data/llms/models + /data/media/{5 个媒体竞技场}
 * 授权：免费 API，必须署名（见 boards.aa.config.mjs 的 SOURCE.attribution）
 *
 * 输出：.tmp/raw-aa/{YYYY-MM-DD}/{boardId}.json
 *   → { boardId, src, dataDate, totalVotes, modelCount, models }
 *
 * Key 来源（按优先级）：
 *   1. 环境变量 AA_API_KEY
 *   2. AA_API_KEY_FILE 指向的文件（默认读用户凭证目录）
 * 绝不把 key 写进仓库、日志或前端。
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BOARDS, ENDPOINTS, SOURCE } from './boards.aa.config.mjs';
import { orgCanonical } from './org-map.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const API_BASE = 'https://artificialanalysis.ai/api/v2';
const today = new Date().toISOString().slice(0, 10);
const outDir = `${ROOT}.tmp/raw-aa/${today}/`;

const TIMEOUT_MS = 90_000;
const RETRIES = 3;

const DEFAULT_KEY_FILE = 'D:/我的知识体系/凭证/artificial analysis_api_key.txt';

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

async function fetchEndpoint(key, path) {
  const url = `${API_BASE}${path}`;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'x-api-key': key, accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 401) throw new Error('401 API key 无效');
      if (res.status === 429) throw new Error('429 超出每日配额');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json.data)) throw new Error('响应缺少 data 数组');
      return json.data;
    } catch (err) {
      if (attempt === RETRIES || /401|429/.test(err.message)) throw err;
      await new Promise((r) => setTimeout(r, 1500 * 2 ** (attempt - 1)));
    }
  }
}

/** ci95 形如 "-10/10"，转成 ELO 上下界 */
function parseCi(elo, ci) {
  if (elo == null || !ci) return { lower: null, upper: null };
  const m = String(ci).match(/^(-?[\d.]+)\s*\/\s*([\d.]+)$/);
  if (!m) return { lower: null, upper: null };
  return { lower: Math.round((elo + Number(m[1])) * 10) / 10, upper: Math.round((elo + Number(m[2])) * 10) / 10 };
}

const round = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);

/** 把一条 AA 记录拍平成站点的 model 结构（分数稍后按榜覆盖） */
function baseModel(row, src) {
  const isMedia = src !== 'llm';
  const org = orgCanonical(row.model_creator?.name || '');
  const releaseDate = row.release_date || null;
  return {
    key: String(row.name || row.slug || '').trim(),
    name: String(row.name || row.slug || '').trim(),
    org,
    score: null,
    scoreUpper: null,
    scoreLower: null,
    votes: isMedia ? (row.appearances ?? null) : null,
    license: null,
    url: null,
    inputPrice: isMedia ? null : (row.pricing?.price_1m_input_tokens ?? null),
    outputPrice: isMedia ? null : (row.pricing?.price_1m_output_tokens ?? null),
    contextLength: null,
    pricePerImage: null,
    pricePerSecond: null,
    costPerTask: null,
    releaseType: releaseDate,
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
  if (kind === 'speed') {
    const v = row[field];
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

/**
 * 生成一个榜的 models 数组
 * rank 由 score 降序重算，严格 1,2,3… 保证通过 validate 的升序校验
 */
function buildBoard(rows, board) {
  const mapped = rows
    .map((row) => {
      const m = baseModel(row, board.src);
      m.score = pickScore(row, board);
      if (board.kind === 'elo') {
        const { lower, upper } = parseCi(m.score, row.ci95);
        m.scoreLower = lower;
        m.scoreUpper = upper;
      }
      // 仅保留该榜真正有分的记录
      return m.score == null ? null : m;
    })
    .filter(Boolean)
    .filter((m) => m.name);

  // 价格榜升序（越便宜越前），其余降序
  const asc = board.kind === 'price';
  mapped.sort((a, b) => (asc ? a.score - b.score : b.score - a.score));

  // 日期榜：score 是 YYYYMMDD，展示时换成可读日期，排序仍按降序
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
  await mkdir(outDir, { recursive: true });
  const key = await loadKey();
  console.log(`[fetch-aa] ${today} · 源 ${SOURCE.publisher} · ${SOURCE.license}`);

  // 每个端点只拉一次，多个榜共享
  const sources = [...new Set(BOARDS.map((b) => b.src))];
  const cache = {};
  for (const src of sources) {
    try {
      cache[src] = await fetchEndpoint(key, ENDPOINTS[src]);
      console.log(`  → ${src}：${cache[src].length} 条`);
    } catch (err) {
      console.log(`  ✗ ${src}：${err.message}`);
      cache[src] = null;
    }
  }
  await new Promise((r) => setTimeout(r, 100));

  let ok = 0;
  let fail = 0;
  const errors = [];

  for (const b of BOARDS) {
    const rows = cache[b.src];
    if (!rows) {
      fail++;
      errors.push(`${b.id}：端点 ${b.src} 无数据`);
      console.log(`  ✗ ${b.id}（${b.name}）端点无数据`);
      continue;
    }
    const models = buildBoard(rows, b);
    if (!models.length) {
      fail++;
      errors.push(`${b.id}：字段 ${b.field || b.kind} 无有效值`);
      console.log(`  ✗ ${b.id}（${b.name}）无有效值`);
      continue;
    }
    // AA 没有「数据发布日期」字段，所有端点都按每日刷新理解，数据日期即抓取日。
    // 媒体端点的 release_date 是「模型上线月份」，不能当榜单数据日期用（会拉出两个月跨度）。
    const dataDate = today;

    await writeFile(
      `${outDir}${b.id}.json`,
      JSON.stringify({
        boardId: b.id,
        src: b.src,
        field: b.field ?? b.kind,
        unit: b.unit || '',
        dataDate,
        totalVotes: null,
        modelCount: models.length,
        models,
      }),
      'utf8'
    );
    ok++;
    console.log(`  ✓ ${b.id}（${b.name}）${models.length} 个模型`);
  }

  console.log(`\n[fetch-aa] 完成：${ok} 个榜成功 / ${fail} 个失败`);
  if (fail) console.log('失败明细：\n  ' + errors.join('\n  '));
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error('[fetch-aa] 致命错误：', err.message);
  process.exit(1);
});
